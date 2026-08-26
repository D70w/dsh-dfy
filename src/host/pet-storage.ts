import type { Context } from '@deepseek-ai/cordis'
import {
  defineDomain,
  domainTable,
  type Domain,
  type DomainFacility,
} from '@deepseek-ai/dsh-storage-domain'
import {
  applyPetCommand,
  applyWorkTurnSettlement,
  toPetView,
  type PetCommand,
  type PetCommandResult,
  type PetView,
  type WorkTurnSettlement,
} from '../domain/commands.ts'
import {
  createPetSave,
  migratePetSave,
  petSaveV1Schema,
  snapshotPetSave,
  storedPetSaveSchema,
  type PetSaveV1,
  type StoredPetSave,
} from '../domain/pet-save.ts'

type BackupKey = string & { readonly __whaleBackupKey: unique symbol }

export const whalePetDomainSpec = defineDomain({
  name: 'dsh_whale_pet',
  // Keep this medium version stable while storedPetSaveSchema supports its
  // explicit historical union; application schemaVersion owns migrations.
  version: 1,
  global: {
    schema: storedPetSaveSchema,
    initial: snapshotPetSave(createPetSave(0)),
  },
  tables: {
    backups: domainTable<BackupKey, StoredPetSave>(storedPetSaveSchema),
  },
})

export interface PetStore {
  readonly persistence: 'durable' | 'temporary'
  view(): PetView
  dispatch(command: PetCommand, now?: number): Promise<PetCommandResult>
  settleWorkTurn(settlement: WorkTurnSettlement): Promise<PetCommandResult>
  close(): Promise<void>
}

type WhaleDomain = Domain<typeof whalePetDomainSpec>

/** Durable profile-local PetSave owner over one Storage Domain handle. */
export class DurablePetStore implements PetStore {
  readonly persistence = 'durable' as const
  private current: Readonly<PetSaveV1>
  private tail: Promise<void> = Promise.resolve()
  private admissionOpen = true
  private disposal: Promise<void> | undefined

  private constructor(private readonly domain: WhaleDomain, current: Readonly<PetSaveV1>) {
    this.current = current
  }

  static async open(facility: DomainFacility, now = Date.now()): Promise<DurablePetStore> {
    const domain = await facility.open(whalePetDomainSpec)
    try {
      const stored = domain.global.get()
      let current: Readonly<PetSaveV1>
      if (stored.schemaVersion === 0) {
        const backups = domain.table('backups')
        const key = `${String(now).padStart(13, '0')}-${stored.revision}` as BackupKey
        await backups.put(key, structuredClone(stored))
        const keys = [...backups.keys()].toSorted()
        await Promise.all(keys.slice(0, Math.max(0, keys.length - 3)).map(old => backups.delete(old)))
        const migrated = migratePetSave(stored)
        migrated.revision += 1
        current = snapshotPetSave(migrated)
        await domain.global.set(current)
      } else if (stored.pet.createdAt === 0) {
        current = snapshotPetSave(createPetSave(now))
        await domain.global.set(current)
      } else {
        current = snapshotPetSave(petSaveV1Schema.parse(stored))
      }
      return new DurablePetStore(domain, current)
    } catch (error) {
      await domain.close()
      throw error
    }
  }

  view(): PetView {
    return toPetView(this.current as PetSaveV1)
  }

  dispatch(command: PetCommand, now = Date.now()): Promise<PetCommandResult> {
    return this.enqueue(async () => {
      const result = applyPetCommand(this.current as PetSaveV1, command, now)
      if (result.reason !== 'duplicate') {
        await this.domain.global.set(result.save)
        this.current = result.save
      }
      const { save: _save, ...wire } = result
      return wire
    })
  }

  settleWorkTurn(settlement: WorkTurnSettlement): Promise<PetCommandResult> {
    return this.enqueue(async () => {
      const result = applyWorkTurnSettlement(this.current as PetSaveV1, settlement)
      if (result.reason !== 'duplicate') {
        await this.domain.global.set(result.save)
        this.current = result.save
      }
      const { save: _save, ...wire } = result
      return wire
    })
  }

  close(): Promise<void> {
    this.disposal ??= this.runClose()
    return this.disposal
  }

  private async runClose(): Promise<void> {
    this.admissionOpen = false
    await this.tail
    await this.domain.close()
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.admissionOpen) return Promise.reject(new Error('whale pet store is disposing'))
    const result = this.tail.then(operation)
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }
}

/** Session-only fallback used when the durable domain cannot be opened. */
export class TemporaryPetStore implements PetStore {
  readonly persistence = 'temporary' as const
  private current: Readonly<PetSaveV1>
  private tail: Promise<void> = Promise.resolve()
  private admissionOpen = true

  constructor(now = Date.now()) {
    this.current = snapshotPetSave(createPetSave(now))
  }

  view(): PetView {
    return toPetView(this.current as PetSaveV1)
  }

  dispatch(command: PetCommand, now = Date.now()): Promise<PetCommandResult> {
    if (!this.admissionOpen) return Promise.reject(new Error('temporary whale pet store is disposing'))
    const result = this.tail.then(() => {
      const reduced = applyPetCommand(this.current as PetSaveV1, command, now)
      this.current = reduced.save
      const { save: _save, ...wire } = reduced
      return wire
    })
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }

  settleWorkTurn(settlement: WorkTurnSettlement): Promise<PetCommandResult> {
    if (!this.admissionOpen) return Promise.reject(new Error('temporary whale pet store is disposing'))
    const result = this.tail.then(() => {
      const reduced = applyWorkTurnSettlement(this.current as PetSaveV1, settlement)
      this.current = reduced.save
      const { save: _save, ...wire } = reduced
      return wire
    })
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }

  async close(): Promise<void> {
    this.admissionOpen = false
    await this.tail
  }
}

/** Open durable state or contain the failure inside a clearly temporary store. */
export async function openPetStore(ctx: Context, facility: DomainFacility): Promise<PetStore> {
  try {
    return await DurablePetStore.open(facility)
  } catch (error) {
    ctx.logger.warn(error instanceof Error ? error : new Error(String(error)))
    return new TemporaryPetStore()
  }
}

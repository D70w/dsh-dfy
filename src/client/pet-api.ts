import { useCallback, useEffect, useRef, useState } from 'react'
import {
  petCommandResponseSchema,
  petStateResponseSchema,
  type PetCommand,
  type PetCommandResponse,
  type PetView,
} from '../domain/commands.ts'
import {
  PET_API_COMMANDS_PATH,
  PET_API_REQUEST_HEADER,
  PET_API_STATE_PATH,
} from '../api-paths.ts'
import type { FoodId, StoryId, StoryOutcome } from '../domain/pet-save.ts'

export type PetSaveStatus = 'loading' | 'ready' | 'unavailable'

export interface PetApiState {
  status: PetSaveStatus
  persistence: 'durable' | 'temporary' | 'unavailable'
  state: PetView | undefined
  refresh(): Promise<void>
  pet(): Promise<PetCommandResponse>
  feed(foodId?: FoodId): Promise<PetCommandResponse>
  clearDiaryHistory(): Promise<PetCommandResponse>
  recordStoryOutcome(storyId: StoryId, outcome: StoryOutcome): Promise<PetCommandResponse>
}

function requestId(): string {
  return crypto.randomUUID()
}

/** Browser owner for non-polled PetSave snapshots and idempotent commands. */
export function usePetApi(): PetApiState {
  const [status, setStatus] = useState<PetSaveStatus>('loading')
  const [persistence, setPersistence] = useState<PetApiState['persistence']>('unavailable')
  const [state, setState] = useState<PetView>()
  const revision = useRef(-1)
  const controllers = useRef(new Set<AbortController>())
  const mounted = useRef(true)

  const accept = useCallback((next: PetView, nextPersistence: 'durable' | 'temporary'): void => {
    if (!mounted.current || next.revision < revision.current) return
    revision.current = next.revision
    setState(next)
    setPersistence(nextPersistence)
    setStatus('ready')
  }, [])

  const withController = useCallback(async <T,>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    const controller = new AbortController()
    controllers.current.add(controller)
    try {
      return await operation(controller.signal)
    } finally {
      controllers.current.delete(controller)
    }
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const response = await withController(signal => fetch(PET_API_STATE_PATH, {
        signal, credentials: 'same-origin', cache: 'no-store',
      }))
      if (!response.ok) throw new Error(`pet state returned ${response.status}`)
      const value = petStateResponseSchema.parse(await response.json())
      accept(value.state, value.persistence)
    } catch (error) {
      if (!mounted.current || (error instanceof DOMException && error.name === 'AbortError')) return
      setStatus('unavailable')
      setPersistence('unavailable')
    }
  }, [accept, withController])

  const dispatch = useCallback(async (command: PetCommand): Promise<PetCommandResponse> => {
    const response = await withController(signal => fetch(PET_API_COMMANDS_PATH, {
      method: 'POST',
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        [PET_API_REQUEST_HEADER]: '1',
      },
      body: JSON.stringify(command),
    }))
    if (!response.ok) throw new Error(`pet command returned ${response.status}`)
    const value = petCommandResponseSchema.parse(await response.json())
    accept(value.state, value.persistence)
    return value
  }, [accept, withController])

  useEffect(() => {
    mounted.current = true
    void refresh()
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      mounted.current = false
      document.removeEventListener('visibilitychange', onVisibility)
      for (const controller of controllers.current) controller.abort()
      controllers.current.clear()
    }
  }, [refresh])

  return {
    status,
    persistence,
    state,
    refresh,
    pet: () => dispatch({ id: requestId(), type: 'pet' }),
    feed: (foodId = 'plain_rice') => dispatch({ id: requestId(), type: 'feed', foodId }),
    clearDiaryHistory: () => dispatch({ id: requestId(), type: 'clear-diary-history' }),
    recordStoryOutcome: (storyId, outcome) => dispatch({
      id: requestId(), type: 'record-story-outcome', storyId, outcome,
    }),
  }
}

import { useEffect, useRef, useState } from 'react'
import type { PetView } from '../domain/commands.ts'
import type { WhaleLocaleKey } from './locales.ts'
import { buildDiaryFacts, recentLedgerDays, type DiaryFactKind } from './ledger.ts'
import { relationshipProfile } from '../relationship.ts'
import {
  billingSummaryForDay, createLocalBillingState, recentBillingHours,
  type BillingPriceProfile, type LocalBillingState,
} from './billing.ts'
import type { OfficialBalanceState } from '../balance.ts'

export interface WhaleLedgerProps {
  state: PetView | undefined
  persistence: 'durable' | 'temporary' | 'unavailable'
  today: string
  t(key: WhaleLocaleKey): string
  onClose(): void
  onClearHistory(): Promise<void>
  billing?: LocalBillingState
  priceProfile?: BillingPriceProfile
  officialBalance?: OfficialBalanceState
  onRefreshBalance?(): void
  style?: React.CSSProperties
}

const FACT_COPY: Readonly<Record<DiaryFactKind, WhaleLocaleKey>> = {
  quiet: 'ledger.diary.quiet',
  completed: 'ledger.diary.completed',
  work: 'ledger.diary.work',
  feeds: 'ledger.diary.feeds',
  interactions: 'ledger.diary.interactions',
  stories: 'ledger.diary.stories',
  days: 'ledger.diary.days',
}

function format(template: string, value: number): string {
  return template.replace('{count}', String(value))
}

/** Compact, bounded detail/diary panel over the Host-owned PetView snapshot. */
export function WhaleLedger({
  state, persistence, today, t, onClose, onClearHistory,
  billing = createLocalBillingState(), priceProfile = 'deepseek-v4-flash',
  officialBalance = { status: 'loading' }, onRefreshBalance, style,
}: WhaleLedgerProps): React.JSX.Element {
  const closeRef = useRef<HTMLButtonElement>(null)
  const clearRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const restoreClearFocus = useRef(false)
  const [clearState, setClearState] = useState<'idle' | 'confirm' | 'clearing' | 'cleared' | 'error'>('idle')
  const relationship = state === undefined ? undefined : relationshipProfile(state.pet.stats.affection)
  const hasDiaryHistory = state !== undefined && (
    Object.keys(state.daily).length > 0
    || Object.keys(state.monthly).length > 0
    || Object.keys(state.memories.storyMemory).length > 0
  )
  const billingToday = billingSummaryForDay(billing, today)
  const billingHours = recentBillingHours(billing, 8)
  useEffect(() => { closeRef.current?.focus() }, [])
  useEffect(() => {
    if (clearState === 'confirm') cancelRef.current?.focus()
    if (clearState === 'error') retryRef.current?.focus()
    if (clearState === 'cleared') closeRef.current?.focus()
    if (clearState === 'idle' && restoreClearFocus.current) {
      restoreClearFocus.current = false
      clearRef.current?.focus()
    }
  }, [clearState])

  const cancelClear = (): void => {
    restoreClearFocus.current = true
    setClearState('idle')
  }

  const clearHistory = async (): Promise<void> => {
    if (clearState === 'clearing') return
    setClearState('clearing')
    try {
      await onClearHistory()
      setClearState('cleared')
    } catch {
      setClearState('error')
    }
  }

  return (
    <section
      data-whale-ledger
      role="dialog"
      aria-labelledby="whale-ledger-title"
      style={style}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        if (clearState === 'confirm' || clearState === 'error') {
          cancelClear()
          return
        }
        if (clearState === 'clearing') return
        onClose()
      }}
    >
      <header data-whale-ledger-header>
        <div>
          <h2 id="whale-ledger-title">{t('ledger.title')}</h2>
          <span data-whale-ledger-persistence={persistence}>
            {t(persistence === 'durable'
              ? 'ledger.persistence.durable'
              : persistence === 'temporary'
                ? 'ledger.persistence.temporary'
                : 'ledger.persistence.unavailable')}
          </span>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t('ledger.close')}>×</button>
      </header>
      <div data-whale-ledger-section data-whale-billing>
        <h3>{t('ledger.billing')}</h3>
        <div data-whale-billing-balance>
          <span>{t('ledger.billing.balance')}</span>
          <strong>{formatOfficialBalance(officialBalance)}</strong>
          <small>{balanceStatusCopy(officialBalance, t)}</small>
          {onRefreshBalance === undefined ? null : (
            <button type="button" onClick={onRefreshBalance} disabled={officialBalance.status === 'loading'}>
              {t('ledger.billing.balance.refresh')}
            </button>
          )}
        </div>
        <p data-whale-billing-today>{t('ledger.billing.today')} <strong>¥{billingToday.costCny.toFixed(4)}</strong></p>
        <dl data-whale-billing-tokens>
          <BillingToken label={t('ledger.billing.cacheHit')} value={billingToday.cacheReadTokens} />
          <BillingToken
            label={t('ledger.billing.cacheMiss')}
            value={billingToday.uncachedInputTokens + billingToday.cacheWriteTokens}
          />
          <BillingToken label={t('ledger.billing.output')} value={billingToday.outputTokens} />
        </dl>
        <h4>{t('ledger.billing.hourly')}</h4>
        {billingHours.length === 0 ? (
          <p data-whale-ledger-empty>{t('ledger.billing.empty')}</p>
        ) : (
          <ol data-whale-billing-hours>
            {billingHours.map(row => (
              <li key={row.hour}>
                <time dateTime={row.hour}>{row.hour.slice(0, 10) === today ? `${row.hour.slice(11)}:00` : row.hour.replace('T', ' ') + ':00'}</time>
                <span>{formatTokens(row.cacheReadTokens)} / {formatTokens(row.uncachedInputTokens + row.cacheWriteTokens)} / {formatTokens(row.outputTokens)}</span>
                <strong>¥{row.costCny.toFixed(4)}</strong>
              </li>
            ))}
          </ol>
        )}
        <small data-whale-billing-note>
          {t('ledger.billing.note')} · {t(`settings.billing.profile.${priceProfile === 'deepseek-v4-pro' ? 'pro' : 'flash'}`)}
        </small>
      </div>
      {state === undefined ? <p data-whale-ledger-empty>{t('ledger.loading')}</p> : (
        <>
          <dl data-whale-ledger-stats>
            <Stat label={t('ledger.hunger')} value={state.pet.stats.hunger} />
            <Stat label={t('ledger.mood')} value={state.pet.stats.mood} />
            <Stat label={t('ledger.energy')} value={state.pet.stats.energy} />
            <Stat label={t('ledger.affection')} value={state.pet.stats.affection} />
          </dl>
          {relationship === undefined ? null : (
            <div
              data-whale-relationship-card
              data-stage={relationship.stage}
              data-automatic-cursor={relationship.automaticCursorVisit ? 'true' : 'false'}
            >
              <span>{t('ledger.relationship')}</span>
              <strong>{t(`ledger.relationship.${relationship.stage}`)}</strong>
              <small>
                {relationship.nextAt === undefined
                  ? t('ledger.relationship.max')
                  : format(t('ledger.relationship.next'), relationship.nextAt - state.pet.stats.affection)}
              </small>
            </div>
          )}
          <div data-whale-ledger-section>
            <h3>{t('ledger.today')}</h3>
            <ul data-whale-diary-lines>
              {buildDiaryFacts(state, today).map(fact => (
                <li key={fact.kind}>{format(t(FACT_COPY[fact.kind]), fact.value)}</li>
              ))}
            </ul>
          </div>
          <div data-whale-ledger-section>
            <h3>{t('ledger.recent')}</h3>
            {recentLedgerDays(state).length === 0 ? <p data-whale-ledger-empty>{t('ledger.noHistory')}</p> : (
              <ol data-whale-ledger-days>
                {recentLedgerDays(state).map(day => (
                  <li key={day.day}>
                    <time dateTime={day.day}>{day.day}</time>
                    <span>{format(t('ledger.daySummary'), day.completedTurns)
                      .replace('{minutes}', String(day.workMinutes))
                      .replace('{rice}', String(day.feeds))}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div data-whale-ledger-section>
            <h3>{t('ledger.achievements')}</h3>
            <ul data-whale-achievements>
              {(['first_meal', 'first_week', 'workmate'] as const).map(id => (
                <li key={id} data-unlocked={state.achievements[id] === undefined ? 'false' : 'true'}>
                  <span aria-hidden="true">{state.achievements[id] === undefined ? '○' : '●'}</span>
                  {t(`ledger.achievement.${id}`)}
                </li>
              ))}
            </ul>
          </div>
          <div data-whale-ledger-section data-whale-ledger-privacy>
            <h3>{t('ledger.privacy')}</h3>
            {clearState === 'confirm' || clearState === 'clearing' || clearState === 'error' ? (
              <div
                data-whale-ledger-clear-confirmation
                role="group"
                aria-labelledby="whale-ledger-clear-title"
                aria-describedby="whale-ledger-clear-description"
              >
                <strong id="whale-ledger-clear-title">{t('ledger.clear.title')}</strong>
                <p id="whale-ledger-clear-description">{t('ledger.clear.description')}</p>
                {clearState === 'error' ? <p role="alert">{t('ledger.clear.error')}</p> : null}
                <div data-whale-ledger-clear-actions>
                  <button
                    ref={cancelRef}
                    type="button"
                    disabled={clearState === 'clearing'}
                    onClick={cancelClear}
                  >
                    {t('ledger.clear.cancel')}
                  </button>
                  <button
                    ref={retryRef}
                    type="button"
                    data-danger="true"
                    disabled={clearState === 'clearing'}
                    onClick={() => { void clearHistory() }}
                  >
                    {clearState === 'clearing' ? t('ledger.clear.clearing') : t('ledger.clear.confirm')}
                  </button>
                </div>
              </div>
            ) : (
              <div data-whale-ledger-clear-summary>
                <p>{t('ledger.clear.scope')}</p>
                <button
                  ref={clearRef}
                  type="button"
                  disabled={!hasDiaryHistory || persistence === 'unavailable'}
                  onClick={() => setClearState('confirm')}
                >
                  {t('ledger.clear.action')}
                </button>
                {clearState === 'cleared' ? (
                  <p data-whale-ledger-clear-result role="status" aria-live="polite">
                    {t('ledger.clear.success')}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`
  return String(value)
}

function formatOfficialBalance(balance: OfficialBalanceState): string {
  if (balance.status !== 'ready' || balance.totalBalance === undefined) return '—'
  return `${balance.currency === 'USD' ? '$' : '¥'}${balance.totalBalance.toFixed(2)}`
}

function balanceStatusCopy(balance: OfficialBalanceState, t: (key: WhaleLocaleKey) => string): string {
  if (balance.status === 'loading') return t('ledger.billing.balance.loading')
  if (balance.status === 'unconfigured') return t('ledger.billing.balance.unconfigured')
  if (balance.status === 'unavailable') return t('ledger.billing.balance.unavailable')
  if (balance.stale) return t('ledger.billing.balance.stale')
  if (balance.fetchedAt === undefined) return t('ledger.billing.balance.updated')
  return `${t('ledger.billing.balance.updated')} · ${new Date(balance.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function BillingToken({ label, value }: { label: string; value: number }): React.JSX.Element {
  return <div><dt>{label}</dt><dd>{formatTokens(value)}</dd></div>
}

function Stat({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <meter min="0" max="100" value={value} aria-label={`${label} ${value}`}>{value}</meter>
        <span>{value}</span>
      </dd>
    </div>
  )
}

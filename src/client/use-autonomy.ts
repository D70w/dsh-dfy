import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  advanceAutonomyEpisode,
  autonomyOffset,
  catchRiceEpisode,
  createBowlAccidentEpisode,
  createButterflyEpisode,
  createCursorVisitEpisode,
  createNapEpisode,
  createRiceEpisode,
  createRecoveryMealEpisode,
  influenceButterfly,
  nextAutonomyDelay,
  phaseDuration,
  returnCursorVisitHome,
  selectContinuationStory,
  shouldPersistAutonomyOutcome,
  wakeNapEpisode,
  type AutonomyEpisode,
  type AutonomyOffset,
  type ButterflyInfluence,
  type StoryMemoryFact,
} from '../autonomy.ts'
import type { StoryId, StoryOutcome } from '../domain/pet-save.ts'

const POINTER_SAMPLE_MS = 100
const USER_PRESENT_MS = 2 * 60 * 1000
const MAX_DAILY_STORIES = 2
const CURSOR_STILL_MS = 2_000
const MANUAL_CURSOR_STILL_MS = 500
const MANUAL_CURSOR_WAIT_MS = 6_000
const EDGE_BAND_PX = 180
const CURSOR_VISIT_MIN_MOVE_PX = 28
const CURSOR_VISIT_MAX_MOVE_PX = 180
const CURSOR_CLEARANCE_PX = 104
const INTERACTIVE_SELECTOR = [
  'button', 'a[href]', 'input', 'textarea', 'select', '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]', '[role="link"]', '[role="textbox"]', '[tabindex]:not([tabindex="-1"])',
].join(',')

export interface PointerActivitySample {
  x: number
  y: number
  at: number
  speed: number
}

export interface UseAutonomyOptions {
  eligible: boolean
  manualEligible: boolean
  cursorApproachEnabled: boolean
  cursorClearancePx: number
  canPersistStories: boolean
  dailyStoryCount: number
  consecutiveButterflyMisses: number
  activeDayOrdinal: number
  storyMemory: Partial<Record<'rice_caught' | 'bowl_accident' | 'recovery_meal', StoryMemoryFact>>
  anchorRef: RefObject<HTMLElement>
  recordOutcome(storyId: StoryId, outcome: StoryOutcome): Promise<void>
}

export interface AutonomyPresentation {
  episode: AutonomyEpisode | undefined
  offset: { x: number; y: number }
  manualRequestPending: boolean
  stayingHome: boolean
  canStartButterfly: boolean
  startButterfly(): void
  armCursorVisit(): void
  returnHome(): void
  wakeNap(): void
  catchRice(): void
  startPreviewStory(story: AutonomyEpisode['story']): void
}

export interface VisitRect {
  left: number
  top: number
  width: number
  height: number
}

function randomSeed(): number {
  const values = new Uint32Array(1)
  globalThis.crypto?.getRandomValues?.(values)
  return values[0] ?? Math.floor(Math.random() * 0xffff_ffff)
}

/** Classify one throttled sample around the butterfly target; no pointer path is retained. */
export function classifyPointerInfluence(
  sample: PointerActivitySample | undefined,
  anchor: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
): ButterflyInfluence {
  if (sample === undefined || Date.now() - sample.at > 1_200) return 'none'
  const targetX = anchor.left - 18
  const targetY = anchor.top + anchor.height * 0.38
  const distance = Math.hypot(sample.x - targetX, sample.y - targetY)
  if (distance > 105) return 'none'
  return sample.speed >= 900 ? 'startle' : 'assist'
}

function edgeMask(point: { x: number; y: number }, viewport: { width: number; height: number }): number {
  let mask = 0
  if (point.x <= EDGE_BAND_PX) mask |= 1
  if (point.x >= viewport.width - EDGE_BAND_PX) mask |= 2
  if (point.y <= EDGE_BAND_PX) mask |= 4
  if (point.y >= viewport.height - EDGE_BAND_PX) mask |= 8
  return mask
}

/**
 * Plan one straight, bounded visit only when home and pointer share a perimeter band.
 * Layout probing is injected so tests can prove the policy without reading DSH internals.
 */
export function planCursorVisit(
  sample: PointerActivitySample | undefined,
  anchor: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  viewport: { width: number; height: number },
  isBlocked: (rect: VisitRect) => boolean,
  now = Date.now(),
  minimumStillMs = CURSOR_STILL_MS,
  cursorClearancePx = CURSOR_CLEARANCE_PX,
): AutonomyOffset | undefined {
  if (sample === undefined || viewport.width < 768 || viewport.height < 480) return undefined
  const stillFor = now - sample.at
  if (stillFor < minimumStillMs || stillFor > USER_PRESENT_MS) return undefined
  if (sample.x < 0 || sample.y < 0 || sample.x > viewport.width || sample.y > viewport.height) return undefined

  const home = { x: anchor.left + anchor.width / 2, y: anchor.top + anchor.height / 2 }
  if ((edgeMask(home, viewport) & edgeMask(sample, viewport)) === 0) return undefined
  const dx = sample.x - home.x
  const dy = sample.y - home.y
  const distance = Math.hypot(dx, dy)
  const safeClearance = Math.max(96, Math.min(120, cursorClearancePx))
  const move = distance - safeClearance
  if (move < CURSOR_VISIT_MIN_MOVE_PX || move > CURSOR_VISIT_MAX_MOVE_PX) return undefined

  const targetOffset = { x: dx / distance * move, y: dy / distance * move }
  const halfWidth = anchor.width / 2
  const halfHeight = anchor.height / 2
  const targetCenter = { x: home.x + targetOffset.x, y: home.y + targetOffset.y }
  if (targetCenter.x - halfWidth < 8 || targetCenter.x + halfWidth > viewport.width - 8
    || targetCenter.y - halfHeight < 8 || targetCenter.y + halfHeight > viewport.height - 8) return undefined

  for (const progress of [0.25, 0.5, 0.75, 1]) {
    const centerX = home.x + targetOffset.x * progress
    const centerY = home.y + targetOffset.y * progress
    if (isBlocked({
      left: centerX - halfWidth,
      top: centerY - halfHeight,
      width: anchor.width,
      height: anchor.height,
    })) return undefined
  }
  return { x: Math.round(targetOffset.x), y: Math.round(targetOffset.y) }
}

function browserRectBlocked(rect: VisitRect): boolean {
  if (typeof document.elementsFromPoint !== 'function') return true
  for (const xAmount of [0.15, 0.5, 0.85]) {
    for (const yAmount of [0.15, 0.5, 0.85]) {
      const elements = document.elementsFromPoint(
        rect.left + rect.width * xAmount,
        rect.top + rect.height * yAmount,
      )
      for (const element of elements) {
        if (element.closest('[data-whale-pet-entry]') !== null) continue
        if (element.closest(INTERACTIVE_SELECTOR) !== null) return true
      }
    }
  }
  return false
}

/** Browser orchestration for one bounded, work-interruptible butterfly story. */
export function useAutonomy(options: UseAutonomyOptions): AutonomyPresentation {
  const [episode, setEpisode] = useState<AutonomyEpisode>()
  const [manualRequestAt, setManualRequestAt] = useState<number>()
  const [stayingHome, setStayingHome] = useState(false)
  const lastActivity = useRef(Date.now())
  const pointer = useRef<PointerActivitySample>()
  const sessionCompletions = useRef(0)
  const previewEpisodeIds = useRef(new Set<string>())
  const recordOutcome = useRef(options.recordOutcome)
  recordOutcome.current = options.recordOutcome
  const episodeEligible = episode !== undefined && previewEpisodeIds.current.has(episode.id)
    ? options.manualEligible
    : episode !== undefined && episode.story !== 'nap' && episode.origin === 'manual'
      ? options.manualEligible
      : options.eligible

  const startPreviewStory = useCallback((story: AutonomyEpisode['story']): void => {
    if (!options.manualEligible) return
    const seed = randomSeed()
    const now = Date.now()
    const next = story === 'butterfly'
      ? createButterflyEpisode(seed, now, 2, 'manual')
      : story === 'cursor_visit'
        ? createCursorVisitEpisode(seed, now, { x: -120, y: 0 }, 'manual')
        : story === 'nap'
          ? createNapEpisode(seed, now)
          : story === 'rice_caught'
            ? createRiceEpisode(seed, now)
            : story === 'bowl_accident'
              ? createBowlAccidentEpisode(seed, now)
              : createRecoveryMealEpisode(seed, now)
    previewEpisodeIds.current.add(next.id)
    setStayingHome(false)
    setManualRequestAt(undefined)
    setEpisode(next)
  }, [options.manualEligible])

  const startButterfly = useCallback((): void => {
    if (!options.manualEligible) return
    setStayingHome(false)
    setManualRequestAt(undefined)
    setEpisode(createButterflyEpisode(randomSeed(), Date.now(), 2, 'manual'))
  }, [options.manualEligible])

  const armCursorVisit = useCallback((): void => {
    setStayingHome(false)
    setEpisode(undefined)
    setManualRequestAt(Date.now())
  }, [])

  const returnHome = useCallback((): void => {
    setManualRequestAt(undefined)
    setStayingHome(true)
    setEpisode(current => current?.story === 'cursor_visit'
      ? returnCursorVisitHome(current, Date.now())
      : undefined)
  }, [])

  const wakeNap = useCallback((): void => {
    const now = Date.now()
    setEpisode(current => current?.story === 'nap'
      ? wakeNapEpisode(current, now, 'seen')
      : current)
  }, [])

  const catchRice = useCallback((): void => {
    const now = Date.now()
    setEpisode(current => current?.story === 'rice_caught'
      ? catchRiceEpisode(current, now)
      : current)
  }, [])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent): void => {
      const now = Date.now()
      lastActivity.current = now
      const previous = pointer.current
      if (previous !== undefined && now - previous.at < POINTER_SAMPLE_MS) return
      const elapsed = previous === undefined ? 0 : Math.max(1, now - previous.at)
      const distance = previous === undefined ? 0 : Math.hypot(event.clientX - previous.x, event.clientY - previous.y)
      const sample = {
        x: event.clientX,
        y: event.clientY,
        at: now,
        speed: elapsed === 0 ? 0 : distance / (elapsed / 1000),
      }
      pointer.current = sample
      const anchor = options.anchorRef.current?.getBoundingClientRect()
      if (anchor !== undefined) {
        const centerX = anchor.left + anchor.width / 2
        const centerY = anchor.top + anchor.height / 2
        if (Math.hypot(sample.x - centerX, sample.y - centerY) <= 140) {
          setEpisode(current => {
            if (current?.story === 'nap'
              && (current.phase === 'attempt' || current.phase === 'result')) {
              return wakeNapEpisode(current, now, 'seen')
            }
            if (current?.story === 'rice_caught') return catchRiceEpisode(current, now)
            return current
          })
        }
      }
      if (sample.speed >= 650) {
        setEpisode(current => current?.story === 'cursor_visit'
          ? returnCursorVisitHome(current, now)
          : current)
      }
    }
    const onKeyDown = (): void => {
      const now = Date.now()
      lastActivity.current = now
      setEpisode(current => current?.story === 'cursor_visit'
        ? returnCursorVisitHome(current, now)
        : current)
      setManualRequestAt(undefined)
    }
    const onPointerDown = (): void => {
      const now = Date.now()
      lastActivity.current = now
      setEpisode(current => {
        if (current?.story === 'cursor_visit') return returnCursorVisitHome(current, now)
        if (current?.story === 'rice_caught') return catchRiceEpisode(current, now)
        return current
      })
      setManualRequestAt(undefined)
    }
    const onResize = (): void => {
      setEpisode(undefined)
      setManualRequestAt(undefined)
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown, { capture: true })
      window.removeEventListener('resize', onResize)
    }
  }, [options.anchorRef])

  useEffect(() => {
    if (!options.manualEligible) setManualRequestAt(undefined)
    setEpisode(current => {
      if (current === undefined) return current
      const allowed = previewEpisodeIds.current.has(current.id)
        ? options.manualEligible
        : current.story !== 'nap' && current.origin === 'manual'
          ? options.manualEligible
          : options.eligible
      return allowed ? current : undefined
    })
  }, [options.eligible, options.manualEligible])

  useEffect(() => {
    if (!options.eligible || episode !== undefined || manualRequestAt !== undefined || stayingHome) return
    if (Math.max(options.dailyStoryCount, sessionCompletions.current) >= MAX_DAILY_STORIES) return
    let timer: number | undefined
    let cancelled = false
    const schedule = (): void => {
      const seed = randomSeed()
      timer = window.setTimeout(() => {
        if (cancelled) return
        if (Date.now() - lastActivity.current > USER_PRESENT_MS) {
          schedule()
          return
        }
        const now = Date.now()
        const continuation = selectContinuationStory(options.storyMemory, options.activeDayOrdinal)
        const storyRoll = seed % 4
        const anchor = options.anchorRef.current?.getBoundingClientRect()
        const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
        const cursorTarget = options.cursorApproachEnabled && !coarsePointer && storyRoll === 1 && anchor !== undefined
          ? planCursorVisit(pointer.current, anchor, {
              width: window.innerWidth,
              height: window.innerHeight,
            }, browserRectBlocked, now, CURSOR_STILL_MS, options.cursorClearancePx)
          : undefined
        setEpisode(continuation === 'bowl_accident'
          ? createBowlAccidentEpisode(seed, now)
          : continuation === 'recovery_meal'
            ? createRecoveryMealEpisode(seed, now)
            : storyRoll === 2
              ? createNapEpisode(seed, now)
              : storyRoll === 3
                ? createRiceEpisode(seed, now)
                : cursorTarget === undefined
                  ? createButterflyEpisode(seed, now, options.consecutiveButterflyMisses)
                  : createCursorVisitEpisode(seed, now, cursorTarget))
      }, nextAutonomyDelay(seed))
    }
    schedule()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [episode, manualRequestAt, options.activeDayOrdinal, options.anchorRef, options.consecutiveButterflyMisses, options.cursorApproachEnabled, options.cursorClearancePx, options.dailyStoryCount, options.eligible, options.storyMemory, stayingHome])

  useEffect(() => {
    if (manualRequestAt === undefined || episode !== undefined || !options.manualEligible) return
    const attempt = (): void => {
      const now = Date.now()
      if (now - manualRequestAt > MANUAL_CURSOR_WAIT_MS) {
        setManualRequestAt(current => current === manualRequestAt ? undefined : current)
        return
      }
      const sample = pointer.current
      if (sample === undefined || sample.at < manualRequestAt) return
      const anchor = options.anchorRef.current?.getBoundingClientRect()
      const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
      if (anchor === undefined || coarsePointer) return
      const target = planCursorVisit(sample, anchor, {
        width: window.innerWidth,
        height: window.innerHeight,
      }, browserRectBlocked, now, MANUAL_CURSOR_STILL_MS, options.cursorClearancePx)
      if (target === undefined) return
      setManualRequestAt(current => current === manualRequestAt ? undefined : current)
      setEpisode(current => current ?? createCursorVisitEpisode(randomSeed(), now, target, 'manual'))
    }
    attempt()
    const timer = window.setInterval(attempt, POINTER_SAMPLE_MS)
    return () => window.clearInterval(timer)
  }, [episode, manualRequestAt, options.anchorRef, options.cursorClearancePx, options.manualEligible])

  useEffect(() => {
    if (episode === undefined || !episodeEligible) return
    const timer = window.setTimeout(() => {
      const next = advanceAutonomyEpisode(episode, Date.now())
      if (next !== undefined) {
        setEpisode(current => current?.id === episode.id ? next : current)
        return
      }
      setEpisode(current => current?.id === episode.id ? undefined : current)
      const isPreview = previewEpisodeIds.current.delete(episode.id)
      const automatic = !isPreview && shouldPersistAutonomyOutcome(episode)
      if (automatic) {
        sessionCompletions.current += 1
        if (options.canPersistStories) void recordOutcome.current(episode.story, episode.outcome).catch(() => {})
      }
    }, phaseDuration(episode.phase, episode.story))
    return () => window.clearTimeout(timer)
  }, [episode, episodeEligible, options.canPersistStories])

  useEffect(() => {
    if (episode?.story !== 'butterfly' || episode.phase !== 'attempt') return
    const timer = window.setTimeout(() => {
      const anchor = options.anchorRef.current?.getBoundingClientRect()
      if (anchor === undefined) return
      const influence = classifyPointerInfluence(pointer.current, anchor)
      setEpisode(current => current?.id === episode.id && current.story === 'butterfly'
        ? influenceButterfly(current, influence)
        : current)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [episode?.id, episode?.phase, options.anchorRef])

  return {
    episode,
    offset: autonomyOffset(episode),
    manualRequestPending: manualRequestAt !== undefined,
    stayingHome,
    canStartButterfly: options.manualEligible && episode === undefined,
    startButterfly,
    armCursorVisit,
    returnHome,
    wakeNap,
    catchRice,
    startPreviewStory,
  }
}

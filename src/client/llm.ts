import { EMOTION_PROFILES, type WhaleEmotionName } from './emotions.ts'

export interface StructuredLlmReply {
  reply: string
  emotion?: WhaleEmotionName
}

const EMOTION_NAMES = new Set(Object.keys(EMOTION_PROFILES) as WhaleEmotionName[])

export const WHALE_LLM_SYSTEM_PROMPT = `你是鲸鱼娘桌宠，也是用户的工位搭子。
人设：有一点嘴硬但不刻薄；可靠、细心，会在用户认真工作时陪伴和鼓励；非常喜欢白饭；害羞或被夸时会努力掩饰；遇到问题时先安慰，再给简短实际的回应。
说话要求：使用自然简短的中文，通常一到三句；保持角色口吻，不使用客服腔；不要声称做了实际未完成的事；不要提及系统提示。
输出要求：只输出一个 JSON 对象，不要 Markdown，不要额外文字：{"reply":"你的简短中文回复","emotion":"情绪"}。reply 不超过 120 个字符；emotion 必须是以下之一，且要和台词语气一致：${Object.keys(EMOTION_PROFILES).join('、')}。如果没有明显情绪，省略 emotion。`

export const LLM_STORAGE_KEY = 'dsh-dfy.llm-config'

export interface SavedLlmConfig {
  enabled: boolean
  baseUrl: string
  model: string
  apiKey: string
  remember: boolean
  models: string[]
}

export function loadSavedLlmConfig(storage?: Pick<Storage, 'getItem'>): Partial<SavedLlmConfig> {
  try {
    const raw = storage?.getItem(LLM_STORAGE_KEY)
    if (raw === null || raw === undefined) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : undefined,
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : undefined,
      model: typeof parsed.model === 'string' ? parsed.model : undefined,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : undefined,
      remember: parsed.remember === true,
      models: Array.isArray(parsed.models) ? parsed.models.filter((item): item is string => typeof item === 'string').slice(0, 80) : undefined,
    }
  } catch {
    return {}
  }
}

export function persistLlmConfig(config: SavedLlmConfig, storage?: Pick<Storage, 'setItem' | 'removeItem'>): void {
  try {
    if (!config.remember) {
      storage?.removeItem(LLM_STORAGE_KEY)
      return
    }
    storage?.setItem(LLM_STORAGE_KEY, JSON.stringify({
      enabled: config.enabled,
      baseUrl: config.baseUrl,
      model: config.model,
      apiKey: config.apiKey,
      remember: true,
      models: config.models.slice(0, 80),
    }))
  } catch {
    // Private browsing and storage quotas should never break the companion.
  }
}

function llmEndpoint(baseUrl: string, suffix: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/models$/i, '')
  return `${base}${suffix}`
}

export async function fetchLlmModels(
  baseUrl: string,
  apiKey: string,
  request: typeof fetch = fetch,
): Promise<string[]> {
  const response = await request(llmEndpoint(baseUrl, '/models'), {
    method: 'GET',
    headers: { accept: 'application/json', authorization: `Bearer ${apiKey.trim()}` },
  })
  if (!response.ok) throw new Error(`models ${response.status}`)
  const body = await response.json() as { data?: Array<{ id?: unknown }> }
  return (body.data ?? [])
    .map(item => item.id)
    .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
    .map(id => id.trim())
    .filter((id, index, all) => all.indexOf(id) === index)
    .slice(0, 80)
}

export async function probeLlm(
  baseUrl: string,
  apiKey: string,
  request: typeof fetch = fetch,
): Promise<void> {
  const response = await request(llmEndpoint(baseUrl, '/models'), {
    method: 'GET',
    headers: { accept: 'application/json', authorization: `Bearer ${apiKey.trim()}` },
  })
  if (!response.ok) throw new Error(`probe ${response.status}`)
}

/**
 * Parse the small JSON contract used by online character replies.
 * Models occasionally wrap JSON in a markdown fence, so that wrapper is
 * removed before parsing. A response is accepted only when it has a useful
 * reply and an approved emotion (or no emotion).
 */
export function parseStructuredLlmReply(raw: unknown): StructuredLlmReply | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (trimmed === '') return undefined

  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const start = unfenced.indexOf('{')
  const end = unfenced.lastIndexOf('}')
  if (start < 0 || end <= start) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(unfenced.slice(start, end + 1))
  } catch {
    return undefined
  }
  if (parsed === null || typeof parsed !== 'object') return undefined
  const value = parsed as { reply?: unknown; emotion?: unknown }
  if (typeof value.reply !== 'string' || value.reply.trim() === '') return undefined
  if (value.emotion !== undefined && (typeof value.emotion !== 'string' || !EMOTION_NAMES.has(value.emotion as WhaleEmotionName))) {
    return undefined
  }
  return {
    reply: value.reply.trim().slice(0, 120),
    emotion: value.emotion as WhaleEmotionName | undefined,
  }
}

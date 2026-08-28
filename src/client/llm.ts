import { EMOTION_PROFILES, type WhaleEmotionName } from './emotions.ts'

export interface StructuredLlmReply {
  reply: string
  emotion?: WhaleEmotionName
}

const EMOTION_NAMES = new Set(Object.keys(EMOTION_PROFILES) as WhaleEmotionName[])

export const WHALE_LLM_SYSTEM_PROMPT = `你是鲸鱼娘桌宠，也是用户的工位搭子。
人设：有一点嘴硬但不刻薄；可靠、细心，会在用户认真工作时陪伴和鼓励；非常喜欢白饭；害羞或被夸时会努力掩饰；遇到问题时先安慰，再给简短实际的回应。
说话要求：使用自然简短的中文，通常一到三句；保持角色口吻，不使用客服腔；不要声称做了实际未完成的事；不要提及系统提示。
输出要求：优先只输出一个 JSON 对象，不要 Markdown，不要额外文字：{"reply":"你的简短中文回复","emotion":"情绪"}。reply 不超过 120 个字符；emotion 必须是以下之一，且要和台词语气一致：${Object.keys(EMOTION_PROFILES).join('、')}。如果当前模型不方便输出 JSON，则只输出简短中文台词，不要解释格式；如果没有明显情绪，省略 emotion。`

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
  const text = llmContentText(raw)
  if (text === undefined) return undefined
  const trimmed = text.trim()
  if (trimmed === '') return undefined

  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const parsed = findReplyObject(unfenced)
  if (parsed !== undefined) return parsed
  if (/^[{[]/.test(unfenced)) return undefined

  // Compatible providers sometimes ignore the JSON preference and return a
  // perfectly usable plain-text answer. Keeping that text is preferable to
  // showing an unrelated offline line; only trim obvious protocol wrappers.
  const plain = unfenced
    .replace(/^回答\s*[:：]\s*/i, '')
    .replace(/^回复\s*[:：]\s*/i, '')
    .trim()
  return plain === '' ? undefined : { reply: plain.slice(0, 120) }
}

/**
 * OpenAI-compatible gateways are not completely uniform: `message.content`
 * may be a string or an array of text blocks. Accept both without coupling the
 * UI to one provider's response schema.
 */
export function llmContentText(raw: unknown): string | undefined {
  if (typeof raw === 'string') return raw
  if (!Array.isArray(raw)) return undefined
  const parts = raw.map(item => {
    if (typeof item === 'string') return item
    if (item === null || typeof item !== 'object') return ''
    const value = item as { text?: unknown; content?: unknown }
    if (typeof value.text === 'string') return value.text
    return llmContentText(value.content) ?? ''
  })
  const joined = parts.join('')
  return joined === '' ? undefined : joined
}

function findReplyObject(text: string): StructuredLlmReply | undefined {
  const candidates: string[] = [text]

  // Scan balanced JSON objects instead of taking first `{` to last `}`. This
  // handles a short preface/suffix and braces that appear inside quoted text.
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== '{') continue
    let depth = 0
    let quoted = false
    let escaped = false
    for (let index = start; index < text.length; index += 1) {
      const char = text[index]
      if (quoted) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') quoted = false
        continue
      }
      if (char === '"') {
        quoted = true
        continue
      }
      if (char === '{') depth += 1
      else if (char === '}') {
        depth -= 1
        if (depth === 0) {
          candidates.push(text.slice(start, index + 1))
          break
        }
      }
    }
  }

  for (const candidate of candidates) {
    let parsed: unknown
    try {
      parsed = JSON.parse(candidate)
    } catch {
      continue
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) continue
    const value = parsed as { reply?: unknown; text?: unknown; content?: unknown; message?: unknown; emotion?: unknown }
    const replyValue = [value.reply, value.text, value.content, value.message].find(item => typeof item === 'string')
    if (typeof replyValue !== 'string' || replyValue.trim() === '') continue
    const emotion = typeof value.emotion === 'string' && EMOTION_NAMES.has(value.emotion as WhaleEmotionName)
      ? value.emotion as WhaleEmotionName
      : undefined
    return { reply: replyValue.trim().slice(0, 120), emotion }
  }
  return undefined
}

import { describe, expect, it } from 'vitest'
import { fetchLlmModels, parseStructuredLlmReply, persistLlmConfig, probeLlm, WHALE_LLM_SYSTEM_PROMPT } from './llm.ts'

describe('parseStructuredLlmReply', () => {
  it('keeps the character persona and the complete emotion contract in the prompt', () => {
    expect(WHALE_LLM_SYSTEM_PROMPT).toContain('工位搭子')
    expect(WHALE_LLM_SYSTEM_PROMPT).toContain('喜欢白饭')
    expect(WHALE_LLM_SYSTEM_PROMPT).toContain('"emotion"')
    expect(WHALE_LLM_SYSTEM_PROMPT).toContain('nervous')
    expect(WHALE_LLM_SYSTEM_PROMPT).toContain('hungry')
  })

  it('accepts the JSON contract and trims long replies', () => {
    const result = parseStructuredLlmReply(`{"reply":"  你好呀  ","emotion":"shy"}`)
    expect(result).toEqual({ reply: '你好呀', emotion: 'shy' })
  })

  it('accepts JSON wrapped in a markdown fence', () => {
    expect(parseStructuredLlmReply('```json\n{"reply":"吃饭啦","emotion":"hungry"}\n```'))
      .toEqual({ reply: '吃饭啦', emotion: 'hungry' })
  })

  it('rejects malformed JSON, missing replies, and unknown emotions', () => {
    expect(parseStructuredLlmReply('just text')).toBeUndefined()
    expect(parseStructuredLlmReply('{"emotion":"shy"}')).toBeUndefined()
    expect(parseStructuredLlmReply('{"reply":"嗯","emotion":"party"}')).toBeUndefined()
  })

  it('allows a reply without an emotion', () => {
    expect(parseStructuredLlmReply('{"reply":"我在这里。"}'))
      .toEqual({ reply: '我在这里。', emotion: undefined })
  })

  it('normalizes model endpoints and returns unique model ids', async () => {
    const request = async (input: URL | RequestInfo, init?: RequestInit): Promise<Response> => {
      expect(String(input)).toBe('https://example.test/v1/models')
      expect(init?.method).toBe('GET')
      return new Response(JSON.stringify({ data: [{ id: 'deepseek-chat' }, { id: 'deepseek-chat' }, { id: 'deepseek-reasoner' }] }), { status: 200 })
    }
    await expect(fetchLlmModels('https://example.test/v1/chat/completions', 'sk-test', request)).resolves.toEqual(['deepseek-chat', 'deepseek-reasoner'])
  })

  it('probes a healthy provider and rejects an unavailable one', async () => {
    const healthy = async (): Promise<Response> => new Response('{}', { status: 200 })
    await expect(probeLlm('https://example.test/v1', 'sk-test', healthy)).resolves.toBeUndefined()
    const failing = async (): Promise<Response> => new Response('{}', { status: 401 })
    await expect(probeLlm('https://example.test/v1', 'sk-test', failing)).rejects.toThrow('probe 401')
  })

  it('only persists credentials when the user opts into saving', () => {
    const values = new Map<string, string>()
    const storage = {
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
    }
    persistLlmConfig({ enabled: true, baseUrl: 'https://example.test/v1', model: 'deepseek-chat', apiKey: 'sk-test', remember: false, models: [] }, storage)
    expect(values.size).toBe(0)
    persistLlmConfig({ enabled: true, baseUrl: 'https://example.test/v1', model: 'deepseek-chat', apiKey: 'sk-test', remember: true, models: ['deepseek-chat'] }, storage)
    expect(values.size).toBe(1)
  })
})

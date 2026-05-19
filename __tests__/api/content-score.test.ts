/**
 * Tests for /api/content/score route
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock fetch for OpenAI calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const makeRequest = (body: any) =>
  new NextRequest('http://localhost/api/content/score', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })

const makeOpenAIResponse = (scoreJson: string) => ({
  ok: true,
  json: async () => ({
    choices: [{ message: { content: scoreJson } }],
  }),
  text: async () => scoreJson,
})

describe('POST /api/content/score', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-key'
  })

  it('returns 400 when content is empty', async () => {
    const { POST } = await import('../../app/api/content/score/route')
    const req = makeRequest({ content: '', type: 'script' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Content is required')
  })

  it('returns 400 when content exceeds 20,000 characters', async () => {
    const { POST } = await import('../../app/api/content/score/route')
    const req = makeRequest({ content: 'x'.repeat(20001), type: 'script' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Content too long')
  })

  it('returns 503 when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY
    const { POST } = await import('../../app/api/content/score/route')
    const req = makeRequest({ content: 'Some content', type: 'script' })
    const res = await POST(req)
    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.error).toContain('OPENAI_API_KEY')
  })

  it('scores a script successfully', async () => {
    const scoreData = {
      hook: 8,
      clarity: 7,
      value: 9,
      retention: 8,
      cta: 7,
      overall: 82,
      summary: 'Great script with strong hook.',
      top_tip: 'Add a stronger CTA.',
    }
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse(JSON.stringify(scoreData)))

    const { POST } = await import('../../app/api/content/score/route')
    const req = makeRequest({ content: 'This is a test script.', type: 'script' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.score).toEqual(scoreData)
    expect(json.type).toBe('script')
  })

  it('scores a linkedin_post successfully', async () => {
    const scoreData = {
      hook: 7,
      value: 8,
      authenticity: 9,
      engagement: 6,
      cta: 5,
      overall: 70,
      summary: 'Good post.',
      top_tip: 'Improve the hook.',
    }
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse(JSON.stringify(scoreData)))

    const { POST } = await import('../../app/api/content/score/route')
    const req = makeRequest({ content: 'LinkedIn post content here.', type: 'linkedin_post' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.score.hook).toBe(7)
    expect(json.type).toBe('linkedin_post')
  })

  it('handles OpenAI JSON wrapped in markdown code fences', async () => {
    const scoreData = { hook: 8, overall: 75, summary: 'Good.', top_tip: 'Improve CTA.' }
    const wrapped = '```json\n' + JSON.stringify(scoreData) + '\n```'
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse(wrapped))

    const { POST } = await import('../../app/api/content/score/route')
    const req = makeRequest({ content: 'Test content', type: 'reel_script' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.score.hook).toBe(8)
  })

  it('handles OpenAI API failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Rate limit exceeded',
    })

    const { POST } = await import('../../app/api/content/score/route')
    const req = makeRequest({ content: 'Test content', type: 'script' })
    const res = await POST(req)

    expect(res.status).toBe(500)
  })

  it('handles unparseable AI response gracefully', async () => {
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse('not valid json'))

    const { POST } = await import('../../app/api/content/score/route')
    const req = makeRequest({ content: 'Test content', type: 'caption' })
    const res = await POST(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toContain('Failed to parse')
  })

  it('uses caption prompt as fallback for unknown type', async () => {
    const scoreData = { hook: 6, overall: 60, summary: 'OK.', top_tip: 'Be more specific.' }
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse(JSON.stringify(scoreData)))

    const { POST } = await import('../../app/api/content/score/route')
    const req = makeRequest({ content: 'Some text', type: 'unknown_type' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.type).toBe('unknown_type')
  })
})

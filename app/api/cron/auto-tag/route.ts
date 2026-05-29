import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/backend/db'
import { getMediaVideoUrl } from '@/lib/backend/instagram'

// Self-hosted (standalone) server — no Vercel function cap. The izan-cron
// sidecar curls this with a generous -m timeout; every post commits
// independently, so a mid-run abort is safe and the next run resumes.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

// Transcription is delegated to the existing n8n Groq-Whisper workflow so we
// don't re-download/re-upload audio in-process. Override via env if the path
// ever changes. (webhook-test/ only works while the n8n editor is listening.)
const N8N_TRANSCRIBE_URL =
  process.env.N8N_TRANSCRIBE_URL || 'https://n8n.ahmadhameed.com/webhook/instagram-transcribe'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

// Taxonomy MUST match the manual /dashboard/tag UI + the tag-posts skill, or
// the dashboard breakdown fragments into near-duplicate buckets.
const HOOK_TYPES = [
  'Question',
  'Contrast / Before-After',
  'Proof / Result',
  'Curiosity Gap',
  'Bold Statement',
  'Story',
  'Tutorial / How-to',
]
const CONTENT_TYPES = [
  'Talking head',
  'Text overlay',
  'Voiceover + B-roll',
  'Tutorial / Screen record',
  'Montage',
]
const LAYOUTS = [
  'Single clip',
  'Split screen',
  'Carousel / slides',
  'Talking head + text',
  'Full screen text',
]

// New posts per run are rare; this bound just keeps any first-run backlog
// inside the curl timeout. Leftovers drain over subsequent 3h runs.
const BATCH = Math.max(1, parseInt(process.env.AUTO_TAG_BATCH || '6', 10))

interface UntaggedRow {
  instagram_media_id: string
  caption: string | null
  media_type: string | null
  transcript: string | null
}

// Calls the n8n webhook with the fresh video URL. Returns the transcript text,
// or null on any failure (the run then falls back to the caption).
async function transcribeViaN8n(videoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(N8N_TRANSCRIBE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ audio_url: videoUrl }),
      signal: AbortSignal.timeout(120_000),
    })
    if (!res.ok) return null
    const json = (await res.json().catch(() => null)) as { transcript?: string } | null
    const t = json?.transcript?.trim()
    return t || null
  } catch {
    return null
  }
}

// CTA keyword from "Comment WORD" / "DM WORD" / "DM me WORD". Requires the
// captured token to be all-caps so ordinary prose ("comment below") never
// matches a keyword.
function extractCta(text: string | null | undefined): string | null {
  if (!text) return null
  const m = text.match(/\b(?:comment|dm(?:\s+me)?)\s+["']?([A-Za-z][A-Za-z0-9]{2,})\b/i)
  if (!m) return null
  const word = m[1]
  return word === word.toUpperCase() ? word : null
}

interface Classification {
  hook_type: string | null
  content_type: string | null
  layout: string | null
}

// Returns null on any Groq failure so the caller can leave the post untagged
// and retry next run (rather than committing null tags that exclude it forever).
async function classifyViaGroq(text: string): Promise<Classification | null> {
  const key = process.env.GROQ_API_KEY
  if (!key) return null
  const system =
    'You classify short-form Instagram video content for a creator analytics ' +
    'dashboard. Given a transcript (or caption when no speech), return STRICT ' +
    'JSON with exactly three fields. Pick exactly one allowed value per field, ' +
    'or null if genuinely unclear. Never invent values outside the lists.\n\n' +
    `hook_type: ${HOOK_TYPES.join(' | ')}\n` +
    `content_type: ${CONTENT_TYPES.join(' | ')}\n` +
    `layout: ${LAYOUTS.join(' | ')}\n\n` +
    'content_type and layout describe the visual format — infer the most likely ' +
    'from the transcript style (first-person direct address -> Talking head; ' +
    'step-by-step instructions -> Tutorial / Screen record; minimal/no speech -> ' +
    'Text overlay). Respond ONLY with: ' +
    '{"hook_type":...,"content_type":...,"layout":...}'
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text.slice(0, 6000) },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const raw = data.choices?.[0]?.message?.content
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const pick = (v: unknown, allowed: string[]) =>
      typeof v === 'string' && allowed.includes(v) ? v : null
    return {
      hook_type: pick(parsed.hook_type, HOOK_TYPES),
      content_type: pick(parsed.content_type, CONTENT_TYPES),
      layout: pick(parsed.layout, LAYOUTS),
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Hard gate: with no real brain we'd burn n8n/Groq calls every run and risk
  // committing null tags. A placeholder is a non-empty string, so check the
  // real Groq prefix (`gsk_`) rather than mere presence.
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey || !groqKey.startsWith('gsk_')) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY not configured (no real gsk_ key) — nothing tagged' },
      { status: 503 }
    )
  }

  const { rows } = await pool.query<UntaggedRow>(
    `SELECT cp.instagram_media_id, cp.caption, cp.media_type, cp.transcript
       FROM content_performance cp
       LEFT JOIN content_posts p ON p.instagram_media_id = cp.instagram_media_id
      WHERE p.instagram_media_id IS NULL
      ORDER BY cp.post_timestamp DESC
      LIMIT $1`,
    [BATCH]
  )

  const results: {
    id: string
    tagged: boolean
    source: string
    hook_type: string | null
    cta: string | null
  }[] = []
  let tagged = 0
  let skipped = 0

  for (const row of rows) {
    const isVideo = ['VIDEO', 'REELS'].includes(row.media_type ?? '')
    let transcript = row.transcript?.trim() || ''
    let source = transcript ? 'cached' : 'none'

    // 1. Transcribe video via n8n (skip if we already cached a transcript).
    if (!transcript && isVideo) {
      const videoUrl = await getMediaVideoUrl(row.instagram_media_id)
      if (videoUrl) {
        const t = await transcribeViaN8n(videoUrl)
        if (t) {
          transcript = t
          source = 'transcribed'
        }
      }
    }
    // 2. Fall back to the caption (text-overlay reels, images, carousels).
    if (!transcript && row.caption?.trim()) {
      transcript = row.caption.trim()
      source = 'caption'
    }
    // 3. Nothing usable — leave untagged so a future run can retry once the
    //    sync has refreshed media_url / caption.
    if (!transcript) {
      skipped++
      results.push({ id: row.instagram_media_id, tagged: false, source: 'none', hook_type: null, cta: null })
      continue
    }

    // Cache ONLY real transcriptions, so a Groq failure doesn't force a costly
    // re-transcribe next run. Never write the caption into the transcript
    // column — that would lock a video with a transient n8n miss to
    // caption-based tagging forever (it'd read as 'cached' next run).
    if (source === 'transcribed') {
      await pool.query(
        `UPDATE content_performance SET transcript = $1 WHERE instagram_media_id = $2`,
        [transcript, row.instagram_media_id]
      )
    }

    const cls = await classifyViaGroq(transcript)
    if (!cls) {
      // Transient Groq failure — keep the post untagged so it retries next run.
      skipped++
      results.push({ id: row.instagram_media_id, tagged: false, source, hook_type: null, cta: null })
      continue
    }

    const cta = extractCta(transcript) || extractCta(row.caption)

    // Plain INSERT (matches /api/posts/tag): the untagged filter above already
    // guarantees no existing content_posts row for this media.
    await pool.query(
      `INSERT INTO content_posts (instagram_media_id, hook_type, content_type, layout, cta_keyword)
       VALUES ($1, $2, $3, $4, $5)`,
      [row.instagram_media_id, cls.hook_type, cls.content_type, cls.layout, cta]
    )

    tagged++
    results.push({
      id: row.instagram_media_id,
      tagged: true,
      source,
      hook_type: cls.hook_type,
      cta,
    })
  }

  return NextResponse.json({ batch: BATCH, processed: rows.length, tagged, skipped, results })
}

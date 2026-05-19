import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHISPER_SIZE_LIMIT = 25 * 1024 * 1024 // 25MB

/** Format seconds → MM:SS */
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Group Whisper segments into ~60s chapters for YouTube description */
function buildChapters(segments: Array<{ start: number; text: string }>): string {
  if (!segments.length) return ''
  const chapters: string[] = []
  let lastChapterTime = -999

  for (const seg of segments) {
    // New chapter every ~60 seconds
    if (seg.start - lastChapterTime >= 60) {
      const text = seg.text.trim().replace(/^[-–—\s]+/, '').slice(0, 60)
      if (text) {
        chapters.push(`${formatTime(seg.start)} ${text}`)
        lastChapterTime = seg.start
      }
    }
  }
  return chapters.join('\n')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: videoId } = await params

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file type — only audio/video allowed
  const allowedTypes = ['video/', 'audio/']
  if (!allowedTypes.some(t => file.type.startsWith(t))) {
    return NextResponse.json({ error: `Invalid file type: ${file.type}. Only video and audio files are accepted.` }, { status: 400 })
  }

  if (file.size > WHISPER_SIZE_LIMIT) {
    return NextResponse.json({
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Whisper limit is 25MB. Please export audio-only (M4A/MP3) and upload that instead.`,
    }, { status: 413 })
  }

  // Create transcription record in DB
  const { data: record, error: insertErr } = await supabase
    .from('video_transcriptions')
    .insert({ video_id: videoId, status: 'processing' })
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const transcriptionId = record.id

  try {
    // Upload to storage for reference
    const ext = file.name.split('.').pop() ?? 'mp4'
    const storagePath = `${videoId}/${transcriptionId}.${ext}`
    const bytes = await file.arrayBuffer()

    await supabase.storage
      .from('video-uploads')
      .upload(storagePath, bytes, { contentType: file.type, upsert: false })

    // Send to Whisper API
    const whisperForm = new FormData()
    whisperForm.append('file', new Blob([bytes], { type: file.type }), file.name)
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('response_format', 'verbose_json')
    whisperForm.append('timestamp_granularities[]', 'segment')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: whisperForm,
    })

    if (!whisperRes.ok) {
      const err = await whisperRes.text()
      await supabase.from('video_transcriptions').update({
        status: 'error',
        error_message: `Whisper API error: ${err}`,
      }).eq('id', transcriptionId)
      return NextResponse.json({ error: `Whisper error: ${err}` }, { status: 500 })
    }

    const whisperData = await whisperRes.json()
    const segments: Array<{ start: number; end: number; text: string }> = whisperData.segments ?? []
    const fullText: string = whisperData.text ?? ''
    const duration: number = whisperData.duration ?? 0

    const chapters = buildChapters(segments)

    // Save full transcript
    await supabase.from('video_transcriptions').update({
      status: 'done',
      storage_path: storagePath,
      transcript_text: fullText,
      transcript_json: whisperData,
      duration_seconds: duration,
    }).eq('id', transcriptionId)

    return NextResponse.json({
      id: transcriptionId,
      transcript: fullText,
      chapters,
      segments: segments.map(s => ({
        start: s.start,
        end: s.end,
        startFormatted: formatTime(s.start),
        text: s.text.trim(),
      })),
      duration,
      durationFormatted: formatTime(duration),
    })

  } catch (err: any) {
    await supabase.from('video_transcriptions').update({
      status: 'error',
      error_message: err.message,
    }).eq('id', transcriptionId)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: videoId } = await params
  const { data } = await supabase
    .from('video_transcriptions')
    .select('*')
    .eq('video_id', videoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json(data ?? null)
}

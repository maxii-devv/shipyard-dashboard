import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Fetch post with media files
  const { data: post, error } = await supabase
    .from('social_posts')
    .select('*, media_files:social_media_files(*)')
    .eq('id', id)
    .single()

  if (error || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // Build content context from the actual content (not the caption)
  let contentContext = ''
  if (post.script) contentContext += `Script/voiceover:\n${post.script}\n\n`
  if (post.body) contentContext += `Post body/slides:\n${post.body}\n\n`
  if (post.media_files?.length) {
    contentContext += `Media files: ${post.media_files.map((f: any) => f.filename).join(', ')}\n`
  }
  if (post.notes) contentContext += `Context notes: ${post.notes}\n`
  if (post.title) contentContext += `Working title: ${post.title}\n`

  if (!contentContext.trim()) {
    return NextResponse.json({ error: 'No content found to generate caption from. Add a script, body text, or media files first.' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Anthropic not configured. Set ANTHROPIC_API_KEY in .env.local' }, { status: 503 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const platformGuide = post.platform === 'instagram'
    ? 'Instagram caption. Keep it punchy. Use line breaks for readability. Can include a call to action. No hashtags.'
    : 'LinkedIn post text. Professional but not corporate. Can be longer. Use line breaks and spacing. No hashtags.'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are writing a ${platformGuide}

You are writing for a content creator. Keep the tone casual, direct, and confident. Not corporate. Not sycophantic.

Based on the following content, write a caption/post text that promotes or describes this content:

${contentContext}

Write ONLY the caption text. No quotes, no explanations, no "Here's a caption:" prefix. Just the caption itself.`
    }]
  })

  const captionText = message.content[0].type === 'text' ? message.content[0].text : ''

  return NextResponse.json({ caption: captionText.trim() })
}

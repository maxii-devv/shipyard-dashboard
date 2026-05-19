import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { prompt, tags, sourceThumbId } = await req.json()

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }
  if (prompt.length > 1000) {
    return NextResponse.json({ error: 'Prompt too long (max 1,000 characters)' }, { status: 400 })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured.' },
      { status: 503 }
    )
  }

  // Build the final prompt — YouTube thumbnail optimized
  const finalPrompt = `A professional YouTube video thumbnail in 16:9 aspect ratio (1792x1024).

CONCEPT: ${prompt}

PERSON (if relevant to the concept):
If the concept includes a person, place them on the right side of the frame, taking up approximately 40% of the width. Show from the waist up or shoulders up. Dramatic, natural lighting on the face with the dark background behind them. Expression should match the emotional feeling of the video topic.

BACKGROUND:
Dark, moody, cinematic background — NOT a solid black void. Use a darkened real-world scene or environment relevant to the video concept. The scene should feel like dramatic night photography or heavy cinematic color grading — dark overall but with real environmental detail, texture, and depth. No bright or white backgrounds. No glow effects. Subtle gradient and texture add depth.

VISUAL ELEMENTS (left side of frame):
Relevant icons, dashboards, app interfaces, screenshots, code windows, or other visual elements that represent the video concept. Maximum 3 distinct elements. Each should be clearly legible. Slightly layered/overlapping for depth.

TEXT TREATMENT (if the concept includes text):
Bold, large, white text. Heavy modern sans-serif font. Maximum 3-5 words. Must be readable at small sizes (320x180px). Text must complement the concept — trigger the feeling, pain point, or solution. Never repeat the title word-for-word. No text in the bottom-right corner (YouTube timestamp overlay).

COLOR & CONTRAST:
High contrast between foreground elements and dark background. Bright, saturated accent colors against the dark environment. Choose accent colors that fit the concept topic and make the thumbnail pop in a crowded YouTube feed.

STYLE:
Professional, high-contrast, clean composition. Similar to top YouTube tech/business channel thumbnails. No clutter — maximum 3 visual stun gun elements. Polished and modern. No watermarks.`

  try {
    // Call DALL-E 3
    const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: finalPrompt,
        n: 1,
        size: '1792x1024',
        quality: 'hd',
        style: 'vivid',
        response_format: 'url',
      }),
    })

    if (!dalleRes.ok) {
      const err = await dalleRes.text()
      return NextResponse.json({ error: `DALL-E error: ${err}` }, { status: 500 })
    }

    const dalleData = await dalleRes.json()
    const imageUrl: string = dalleData.data?.[0]?.url
    const revisedPrompt: string = dalleData.data?.[0]?.revised_prompt ?? prompt

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image returned from DALL-E' }, { status: 500 })
    }

    // Download the generated image
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      return NextResponse.json({ error: 'Failed to download generated image' }, { status: 500 })
    }
    const imgBuffer = await imgRes.arrayBuffer()

    // Upload to Supabase storage
    const filename = `generated-${Date.now()}.png`
    const { error: uploadError } = await supabase.storage
      .from('thumbnails')
      .upload(filename, imgBuffer, { contentType: 'image/png', upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Register in thumbnails table
    const thumbTags = tags?.length ? tags : ['ai-generated', 'dalle-3']
    const { data: newThumb, error: dbError } = await supabase
      .from('thumbnails')
      .insert({
        storage_path: filename,
        url: null,
        tags: thumbTags,
        ai_analysis: `Generated via DALL-E 3. Prompt: ${prompt}`,
        ai_analysis_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Build public URL
    const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(filename)

    return NextResponse.json({
      thumbnail: { ...newThumb, _publicUrl: urlData.publicUrl },
      revisedPrompt,
    }, { status: 201 })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

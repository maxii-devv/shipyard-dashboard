import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RATING_TAG_PREFIX = '_rating:'

/**
 * PATCH /api/thumbnails/[id]
 * Body: { rating: 1-5 | null }
 *
 * Rating is stored as a special tag "_rating:N" in the tags array.
 * Setting rating to null removes the rating tag.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { rating } = await req.json()

  if (rating !== null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
    return NextResponse.json({ error: 'rating must be 1-5 or null' }, { status: 400 })
  }

  // Fetch current thumbnail
  const { data: thumb, error: fetchErr } = await supabase
    .from('thumbnails')
    .select('id, tags')
    .eq('id', id)
    .single()

  if (fetchErr || !thumb) {
    return NextResponse.json({ error: 'Thumbnail not found' }, { status: 404 })
  }

  // Strip any existing _rating:N tag, then add new one if rating provided
  const cleanedTags = ((thumb.tags as string[]) ?? []).filter(
    (t: string) => !t.startsWith(RATING_TAG_PREFIX)
  )
  const newTags = rating !== null
    ? [...cleanedTags, `${RATING_TAG_PREFIX}${rating}`]
    : cleanedTags

  const { data, error } = await supabase
    .from('thumbnails')
    .update({ tags: newTags })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

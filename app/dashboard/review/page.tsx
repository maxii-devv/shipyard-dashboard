import { revalidatePath } from 'next/cache'
import pool from '@/lib/backend/db'
import styles from './page.module.css'
import Link from 'next/link'
import { SubmitButton } from '@/app/components/SubmitButton'

export const dynamic = 'force-dynamic'

interface UnreviewedPost {
  instagram_media_id: string
  caption: string | null
  permalink: string
  post_timestamp: string
  views: number
  likes: number
  comments: number
  saves: number
  engagement_rate: number | null
  transcript: string | null
  hook_type: string | null
  content_type: string | null
  layout: string | null
  cta_keyword: string | null
}

async function getUnreviewedPosts(): Promise<UnreviewedPost[]> {
  const res = await pool.query<UnreviewedPost>(
    `SELECT cp.instagram_media_id, cp.caption, cp.permalink, cp.post_timestamp,
            cp.views, cp.likes, cp.comments, cp.saves, cp.engagement_rate, cp.transcript,
            p.hook_type, p.content_type, p.layout, p.cta_keyword
     FROM content_posts p
     JOIN content_performance cp ON cp.instagram_media_id = p.instagram_media_id
     WHERE p.drove_sales IS NULL
     ORDER BY cp.post_timestamp DESC`
  )
  return res.rows
}

async function saveReview(formData: FormData) {
  'use server'
  const instagram_media_id = formData.get('instagram_media_id') as string
  const drove_sales = formData.get('drove_sales') === 'yes'
  const notes = ((formData.get('notes') as string) ?? '').trim() || null

  await pool.query(
    `UPDATE content_posts
       SET drove_sales = $1,
           conversion_notes = $2,
           reviewed_at = NOW()
     WHERE instagram_media_id = $3`,
    [drove_sales, notes, instagram_media_id]
  )

  revalidatePath('/dashboard/review')
  revalidatePath('/dashboard')
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default async function ReviewPage() {
  const posts = await getUnreviewedPosts()

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard" className={styles.back}>← Dashboard</Link>
          <h1 className={styles.title}>Review Conversions</h1>
        </div>
        <p className={styles.subtitle}>{posts.length} unreviewed</p>
      </header>

      <p className={styles.intro}>
        For each tagged post, mark whether it drove DMs, sales, or high-ticket inquiries.
        The feedback loop uses this to weight which patterns actually convert — not just which get views.
      </p>

      {posts.length === 0 ? (
        <div className={styles.done}>
          <p className={styles.doneText}>All tagged posts reviewed ✓</p>
          <Link href="/dashboard/tag" className={styles.doneLink}>Tag more posts →</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {posts.map(post => (
            <div key={post.instagram_media_id} className={styles.card}>
              <div className={styles.postInfo}>
                {post.transcript ? (
                  <p className={styles.transcript}>{post.transcript}</p>
                ) : (
                  <p className={styles.caption}>
                    {post.caption
                      ? post.caption.slice(0, 200) + (post.caption.length > 200 ? '…' : '')
                      : '(no caption)'}
                  </p>
                )}

                <div className={styles.tags}>
                  {post.hook_type && <span className={styles.tag}>{post.hook_type}</span>}
                  {post.content_type && <span className={styles.tag}>{post.content_type}</span>}
                  {post.layout && <span className={styles.tag}>{post.layout}</span>}
                  {post.cta_keyword && <span className={styles.ctaTag}>CTA: {post.cta_keyword}</span>}
                </div>

                <div className={styles.meta}>
                  <span>{new Date(post.post_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>{fmt(post.views)} views</span>
                  <span>{fmt(post.likes)} likes</span>
                  <span>{fmt(post.comments)} comments</span>
                  <span>{fmt(post.saves)} saves</span>
                  {post.engagement_rate != null && (
                    <span>{(post.engagement_rate * 100).toFixed(1)}% ER</span>
                  )}
                  <a href={post.permalink} target="_blank" rel="noopener noreferrer" className={styles.igLink}>
                    View on Instagram ↗
                  </a>
                </div>
              </div>

              <form action={saveReview} className={styles.form}>
                <input type="hidden" name="instagram_media_id" value={post.instagram_media_id} />

                <div className={styles.fields}>
                  <input
                    name="notes"
                    className={styles.input}
                    placeholder="Notes (optional, e.g. 3 DMs, 1 sale)"
                  />
                  <div className={styles.actions}>
                    <SubmitButton
                      className={styles.noBtn}
                      pendingLabel="…"
                      name="drove_sales"
                      value="no"
                    >
                      ✗ No
                    </SubmitButton>
                    <SubmitButton
                      className={styles.yesBtn}
                      pendingLabel="…"
                      name="drove_sales"
                      value="yes"
                    >
                      ✓ Drove sales
                    </SubmitButton>
                  </div>
                </div>
              </form>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

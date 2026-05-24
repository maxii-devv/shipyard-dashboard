import { revalidatePath } from 'next/cache'
import pool from '@/lib/backend/db'
import styles from './page.module.css'
import Link from 'next/link'
import { SubmitButton } from '@/app/components/SubmitButton'

export const dynamic = 'force-dynamic'

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

interface UntaggedPost {
  instagram_media_id: string
  caption: string | null
  permalink: string
  post_timestamp: string
  views: number
  saves: number
  transcript: string | null
}

async function getUntaggedPosts(): Promise<UntaggedPost[]> {
  const res = await pool.query<UntaggedPost>(
    `SELECT cp.instagram_media_id, cp.caption, cp.permalink, cp.post_timestamp, cp.views, cp.saves, cp.transcript
     FROM content_performance cp
     LEFT JOIN content_posts p ON p.instagram_media_id = cp.instagram_media_id
     WHERE p.instagram_media_id IS NULL
     ORDER BY cp.post_timestamp DESC`
  )
  return res.rows
}

async function saveTag(formData: FormData) {
  'use server'
  const instagram_media_id = formData.get('instagram_media_id') as string
  const hook_type = (formData.get('hook_type') as string) || null
  const content_type = (formData.get('content_type') as string) || null
  const layout = (formData.get('layout') as string) || null
  const cta_keyword = ((formData.get('cta_keyword') as string) ?? '').trim() || null

  await pool.query(
    `INSERT INTO content_posts (instagram_media_id, hook_type, content_type, layout, cta_keyword)
     VALUES ($1, $2, $3, $4, $5)`,
    [instagram_media_id, hook_type, content_type, layout, cta_keyword]
  )

  revalidatePath('/dashboard/tag')
  revalidatePath('/dashboard')
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default async function TagPage() {
  const posts = await getUntaggedPosts()

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard" className={styles.back}>← Dashboard</Link>
          <h1 className={styles.title}>Tag Posts</h1>
        </div>
        <p className={styles.subtitle}>{posts.length} untagged</p>
      </header>

      {posts.length === 0 ? (
        <div className={styles.done}>
          <p className={styles.doneText}>All posts tagged ✓</p>
          <Link href="/dashboard/review" className={styles.doneLink}>Review tagged posts →</Link>
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
                      ? post.caption.slice(0, 140) + (post.caption.length > 140 ? '…' : '')
                      : '(no caption)'}
                  </p>
                )}
                <div className={styles.meta}>
                  <span>{new Date(post.post_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>{fmt(post.views)} views</span>
                  <span>{fmt(post.saves)} saves</span>
                  {post.transcript && <span className={styles.transcriptBadge}>Transcribed</span>}
                  <a href={post.permalink} target="_blank" rel="noopener noreferrer" className={styles.igLink}>
                    View on Instagram ↗
                  </a>
                </div>
              </div>

              <form action={saveTag} className={styles.form}>
                <input type="hidden" name="instagram_media_id" value={post.instagram_media_id} />

                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label className={styles.label}>Hook type</label>
                    <select name="hook_type" className={styles.select}>
                      <option value="">— skip —</option>
                      {HOOK_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Content type</label>
                    <select name="content_type" className={styles.select}>
                      <option value="">— skip —</option>
                      {CONTENT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Layout</label>
                    <select name="layout" className={styles.select}>
                      <option value="">— skip —</option>
                      {LAYOUTS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>CTA keyword</label>
                    <input
                      name="cta_keyword"
                      className={styles.input}
                      placeholder="e.g. ACADEMY"
                    />
                  </div>

                  <SubmitButton className={styles.saveBtn} pendingLabel="Saving…">Save →</SubmitButton>
                </div>
              </form>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

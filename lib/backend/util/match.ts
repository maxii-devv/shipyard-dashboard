// Pure text-matching helpers shared by the linking + conversion services.
// No DB / network so they can be unit-tested directly.

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// How many comments contain the CTA keyword as a whole word (case-insensitive).
// This is the signal that decides whether a post "drove sales".
export function countKeywordMatches(
  comments: { text?: string | null }[],
  keyword: string
): number {
  const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i')
  let n = 0
  for (const c of comments) {
    if (c.text && pattern.test(c.text)) n++
  }
  return n
}

// Pulls KEYWORD out of a "Comment KEYWORD ..." caption. Used to link an
// Instagram post back to the content_posts row that owns that keyword.
export function extractKeyword(caption: string): string | null {
  const match = caption.match(/comment\s+([A-Z]{2,})\b/i)
  return match ? match[1].toUpperCase() : null
}

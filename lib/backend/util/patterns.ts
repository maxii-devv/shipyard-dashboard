// Pure pattern-aggregation math: given the outlier posts joined with their
// tags, work out which hook / CTA / content-type / layout performs best.
// This is the core of the "what's working" recommendation, kept DB-free so
// it can be unit-tested.

export interface PatternPostRow {
  hook_type: string | null
  cta_keyword: string | null
  content_type: string | null
  layout: string | null
  views: number
  drove_sales: boolean | null
}

export interface AggregatedBucket {
  avg_views: number
  count: number
  reviewed_count: number
  drove_sales_count: number
  drove_sales_rate: number | null
}

const KEY_NAME = {
  hook_type: 'style',
  cta_keyword: 'keyword',
  content_type: 'type',
  layout: 'layout',
} as const

export function aggregatePatterns(
  rows: PatternPostRow[],
  field: 'hook_type' | 'cta_keyword' | 'content_type' | 'layout'
): (AggregatedBucket & Record<string, string | number | null>)[] {
  const map: Record<
    string,
    { total_views: number; count: number; reviewed_count: number; drove_sales_count: number }
  > = {}

  for (const row of rows) {
    const val = row[field]
    if (!val) continue
    if (!map[val]) {
      map[val] = { total_views: 0, count: 0, reviewed_count: 0, drove_sales_count: 0 }
    }
    map[val].total_views += row.views
    map[val].count++
    if (row.drove_sales !== null) map[val].reviewed_count++
    if (row.drove_sales === true) map[val].drove_sales_count++
  }

  const keyName = KEY_NAME[field]
  return Object.entries(map)
    .map(([key, v]) => ({
      [keyName]: key,
      avg_views: Math.round(v.total_views / v.count),
      count: v.count,
      reviewed_count: v.reviewed_count,
      drove_sales_count: v.drove_sales_count,
      drove_sales_rate:
        v.reviewed_count > 0
          ? Math.round((v.drove_sales_count / v.reviewed_count) * 1000) / 1000
          : null,
    }))
    .sort((a, b) => b.avg_views - a.avg_views)
}

export function sampleSizeWarning(postCount: number, days: number): string | null {
  return postCount < 5
    ? `Only ${postCount} posts in the last ${days} days — patterns may not be reliable yet. Keep posting.`
    : null
}

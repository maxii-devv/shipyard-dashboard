// ─── Shared types for analytics ──────────────────────────────────────────────

export interface InstagramPost {
  postId: string
  type: string
  publishedAt: { dateTime: string; timezone: string }
  content: string
  imageUrl: string | null
  url: string
  likes: number
  comments: number
  shares: number
  interactions: number
  engagement: number
  reach: number
  saved: number
  impressionsTotal: number
  views: number
}

export interface InstagramStory {
  postId: string
  type: string
  publishedAt: { dateTime: string; timezone: string }
  owner: string
  content: string
  thumbnailUrl: string | null
  permalink: string
  exits: number
  impressions: number
  reach: number
  replies: number
  tapsForward: number
  tapsBack: number
}

export interface TwitterPost {
  tweetId: string
  text: string
  createdAt: { dateTime: string }
  totalImpressions: number
  totalLikes: number
  totalRetweets: number | null
  totalReplies: number | null
  totalProfileClicks: number
  totalLinkClicks: number | null
  totalEngagement: number
}

export interface LinkedInPost {
  postId: string
  text: string
  createdAt: { dateTime: string }
  totalImpressions: number
  totalLikes: number
  totalComments: number
  totalShares: number
  totalClicks: number
  totalEngagement: number
  picture?: string
  url?: string
}

export interface InstagramStats {
  Followers: number
  Friends: number
  Posts: number
  reach: number
  views: number
}

export interface TwitterStats {
  Followers: number
  Friends: number
  Posts: number
}

export interface LinkedInStats {
  Followers: number
  Friends: number
  Posts: number
}

export interface YouTubeStats {
  Subscribers: number
  Videos: number
  Views: number
}

export interface YouTubePost {
  postId: string
  title: string
  publishedAt: { dateTime: string; timezone?: string }
  views: number
  likes: number
  comments: number
  thumbnailUrl: string | null
  url: string
  engagement: number
  estimatedMinutesWatched: number
}

export interface TimelinePoint {
  date: string
  value: number
}

export type Tab = 'overview' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'roi'
export type SortKey = 'engagement' | 'reach' | 'likes' | 'saved' | 'comments'

export interface AnalyticsData {
  igPosts: InstagramPost[]
  igReels: InstagramPost[]
  igStories: InstagramStory[]
  igStats: InstagramStats | null
  twPosts: TwitterPost[]
  twStats: TwitterStats | null
  liPosts: LinkedInPost[]
  liStats: LinkedInStats | null
  ytStats: YouTubeStats | null
  ytPosts: YouTubePost[]
  ytTimeline: TimelinePoint[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function toIso(d: Date) {
  return d.toISOString().split('.')[0]
}

export function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fmtNum(n: number | null | undefined) {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(Math.round(n))
}

export function avg(arr: number[]) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export function scorePost(post: InstagramPost, allPosts: InstagramPost[]): number {
  if (!allPosts.length) return 0
  const maxEng = Math.max(...allPosts.map(p => p.engagement), 0.01)
  const maxReach = Math.max(...allPosts.map(p => p.reach), 1)
  const maxSaved = Math.max(...allPosts.map(p => p.saved), 1)
  const engScore = (post.engagement / maxEng) * 50
  const reachScore = (post.reach / maxReach) * 30
  const savedScore = (post.saved / maxSaved) * 20
  return Math.round(engScore + reachScore + savedScore)
}

export const IG_TYPE_LABELS: Record<string, string> = {
  FEED_CAROUSEL_ALBUM: 'Carousel',
  VIDEO: 'Video',
  IMAGE: 'Photo',
  REEL: 'Reel',
}

export const PRESETS = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

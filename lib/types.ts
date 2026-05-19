export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'linkedin'
export type VideoStatus = 'in_progress' | 'ready_to_create' | 'editing' | 'ready' | 'published'

// ─── Competitor types ─────────────────────────────────────────────────────────

export type CompetitorPlatform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'linkedin' | 'skool'

export type CompetitorAlertType = 'bio_changed' | 'follower_spike' | 'follower_drop' | 'new_post' | 'profile_pic_changed' | 'handle_changed'

export interface Competitor {
  id: string
  name: string
  slug: string
  niche: string | null
  brand: string | null
  location: string | null
  background: string | null
  is_friend: boolean
  business_notes: Record<string, string>
  content_style: string | null
  notable: string | null
  links: { label: string; url: string }[]
  avatar_url: string | null
  active: boolean
  created_at: string
  updated_at: string
  socials?: CompetitorSocial[]
}

export interface CompetitorSocial {
  id: string
  competitor_id: string
  platform: CompetitorPlatform
  handle: string
  profile_url: string | null
  follower_count: number | null
  bio: string | null
  profile_pic_url: string | null
  extra_metrics: Record<string, unknown>
  last_checked_at: string | null
  data_source: string
  created_at: string
  updated_at: string
  snapshots?: CompetitorSocialSnapshot[]
}

export interface CompetitorSocialSnapshot {
  id: string
  social_id: string
  follower_count: number | null
  bio: string | null
  profile_pic_url: string | null
  extra_metrics: Record<string, unknown>
  snapshot_date: string
  created_at: string
}

export interface CompetitorPost {
  id: string
  competitor_id: string
  social_id: string | null
  platform: CompetitorPlatform
  external_id: string | null
  title: string | null
  url: string | null
  content_preview: string | null
  content_type: string | null
  published_at: string | null
  metrics: Record<string, unknown>
  thumbnail_url: string | null
  discovered_via: string
  created_at: string
  updated_at: string
  competitor?: Competitor
}

export interface CompetitorAlert {
  id: string
  competitor_id: string
  social_id: string | null
  alert_type: CompetitorAlertType
  title: string
  details: Record<string, unknown>
  is_read: boolean
  created_at: string
  competitor?: Competitor
  social?: CompetitorSocial
}

export const COMPETITOR_PLATFORM_COLORS: Record<CompetitorPlatform, string> = {
  youtube: '#dc2626',
  instagram: '#e1306c',
  tiktok: '#010101',
  twitter: '#1da1f2',
  linkedin: '#0077b5',
  skool: '#facc15',
}

export const COMPETITOR_PLATFORM_LABELS: Record<CompetitorPlatform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
  skool: 'Skool',
}
export type AssetType = 'title' | 'intro' | 'structure' | 'outro' | 'script' | 'description' | 'tags' | 'thumbnail'
export type AssetStatus = 'draft' | 'pending_review' | 'approved' | 'revision_requested'

export interface Video {
  id: string
  title: string
  platform: Platform
  status: VideoStatus
  youtube_url: string | null
  published_at: string | null
  scheduled_at: string | null
  sort_order: number
  target_date: string | null
  created_at: string
  updated_at: string
  assets?: Asset[]
}

export interface Asset {
  id: string
  video_id: string
  type: AssetType
  content: string | null
  storage_path: string | null
  status: AssetStatus
  revision_notes: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface Thumbnail {
  id: string
  storage_path: string | null
  url: string | null
  tags: string[]
  ai_analysis: string | null
  ai_analysis_at: string | null
  created_at: string
}

// Social media types
export type SocialPlatform = 'instagram' | 'linkedin' | 'tiktok'

export type InstagramPostType = 'reel' | 'carousel' | 'thread_carousel' | 'story' | 'post'
export type LinkedInPostType = 'post' | 'article' | 'carousel'
export type SocialPostType = InstagramPostType | LinkedInPostType

export type SocialPostStatus = 'draft' | 'in_progress' | 'ready_to_create' | 'ready' | 'scheduled' | 'published' | 'backlog'

export type ReelFormat = 'talking-head' | 'faceless' | 'story-style' | 'b-roll' | 'trend' | 'split-screen'

export const REEL_FORMATS: { value: ReelFormat; label: string }[] = [
  { value: 'talking-head', label: 'Talking Head' },
  { value: 'faceless', label: 'Faceless' },
  { value: 'story-style', label: 'Story Style' },
  { value: 'b-roll', label: 'B-Roll' },
  { value: 'trend', label: 'Trend' },
  { value: 'split-screen', label: 'Split Screen' },
]

export interface SocialPost {
  id: string
  title: string
  platform: SocialPlatform
  type: SocialPostType
  format: ReelFormat | null
  caption: string | null
  hashtags: string[]
  status: SocialPostStatus
  scheduled_at: string | null
  published_at: string | null
  body: string | null
  has_lead_magnet: boolean
  lead_magnet_url: string | null
  notes: string | null
  script: string | null
  sound_song: string | null
  text_overlay: string | null
  sort_order: number
  target_date: string | null
  metricool_post_id: number | null
  metricool_scheduled_at: string | null
  created_at: string
  updated_at: string
  media_files?: SocialMediaFile[]
}

export interface SocialMediaFile {
  id: string
  post_id: string
  storage_path: string | null
  url: string | null
  filename: string
  file_type: 'image' | 'video' | 'audio' | 'pdf' | 'other'
  order_index: number
  notes: string | null
  created_at: string
}

export const INSTAGRAM_POST_TYPES: { value: InstagramPostType; label: string; description: string }[] = [
  { value: 'reel', label: 'Reel', description: 'Short-form vertical video' },
  { value: 'carousel', label: 'Carousel', description: 'Multiple slides, swipeable' },
  { value: 'thread_carousel', label: 'Thread Carousel', description: 'Twitter-thread style carousel' },
  { value: 'story', label: 'Story', description: '24hr ephemeral content' },
  { value: 'post', label: 'Post', description: 'Static image or video' },
]

export const LINKEDIN_POST_TYPES: { value: LinkedInPostType; label: string; description: string }[] = [
  { value: 'post', label: 'Post', description: 'Text + media post' },
  { value: 'article', label: 'Article', description: 'Long-form LinkedIn article' },
  { value: 'carousel', label: 'Carousel', description: 'Document-style carousel' },
]

export const SOCIAL_POST_STATUS_COLORS: Record<SocialPostStatus, string> = {
  draft: 'badge-ghost',
  in_progress: 'badge-warning',
  ready_to_create: 'badge-accent',
  ready: 'badge-success',
  scheduled: 'badge-info',
  published: 'badge-primary',
  backlog: 'badge-secondary',
}

// Topics
export type TopicStatus = 'active' | 'graduated' | 'archived'

export interface Topic {
  id: string
  name: string
  description: string | null
  source_url: string | null
  source_name: string | null
  status: TopicStatus
  linked_idea_id: string | null
  target_posts: number
  idea_count?: number
  created_at: string
  updated_at: string
}

export const TOPIC_STATUS_COLORS: Record<TopicStatus, string> = {
  active: 'badge-info',
  graduated: 'badge-success',
  archived: 'badge-ghost',
}

export type SupportingMediaType = 'image' | 'video' | 'pdf' | 'other'

export interface SupportingMedia {
  id: string
  video_id: string
  storage_path: string | null
  url: string | null
  filename: string
  file_type: SupportingMediaType
  notes: string | null
  created_at: string
}

export interface VideoThumbnail {
  id: string
  video_id: string
  thumbnail_id: string
  is_chosen: boolean
  created_at: string
  thumbnail?: Thumbnail
}

export type ABVariantLabel = 'A' | 'B' | 'C'

export interface VideoABVariant {
  id: string
  video_id: string
  variant: ABVariantLabel
  title: string
  thumbnail_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  thumbnail?: Thumbnail
}

// Video Attachments
export type VideoAttachmentType = 'presentation' | 'diagram' | 'image' | 'link'

export interface VideoAttachment {
  id: string
  video_id: string
  type: VideoAttachmentType
  title: string
  url: string | null
  storage_path: string | null
  file_name: string | null
  file_size: number | null
  metadata: Record<string, unknown>
  sort_order: number
  created_at: string
  updated_at: string
}


'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ExternalLink, Heart, MessageCircle, Bookmark, Eye, Share2, Repeat2, MousePointerClick, Instagram, Twitter, Youtube, Clock, TrendingUp, ThumbsUp, LayoutGrid, Linkedin, Send, Gift, ChevronLeft, ChevronRight } from 'lucide-react'

function fmtNum(n: number | null | undefined) {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(Math.round(n))
}

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface IgPost {
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

interface IgStory {
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

interface Tweet {
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

interface YTVideo {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  views: number
  watchMinutes: number
  avgViewPct: number
  likes: number
  comments: number
}

interface LinkedInPost {
  id: string
  title: string
  type: string
  caption: string | null
  body: string | null
  hashtags: string[]
  has_lead_magnet: boolean
  lead_magnet_url: string | null
  media_files: { url: string | null; file_type: string; order_index: number; filename: string }[]
  created_at: string
  status: string
}

export type ContentItem =
  | { platform: 'ig_post'; data: IgPost }
  | { platform: 'ig_story'; data: IgStory }
  | { platform: 'ig_reel'; data: IgPost }
  | { platform: 'tweet'; data: Tweet }
  | { platform: 'youtube'; data: YTVideo }
  | { platform: 'linkedin'; data: LinkedInPost }

interface ContentDetailModalProps {
  item: ContentItem | null
  onClose: () => void
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function MetricCell({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />}
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
      </div>
      <p className="text-sm font-mono font-bold text-white">{typeof value === 'number' ? fmtNum(value) : value}</p>
    </div>
  )
}

function PlatformBadge({ platform, labelOverride }: { platform: ContentItem['platform']; labelOverride?: string }) {
  const config = {
    ig_post: { label: 'Instagram Post', bg: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', icon: Instagram },
    ig_story: { label: 'Instagram Story', bg: 'linear-gradient(135deg, #f09433, #e6683c)', icon: Instagram },
    ig_reel: { label: 'Instagram Reel', bg: 'linear-gradient(135deg, #c13584, #833ab4)', icon: Instagram },
    tweet: { label: 'Twitter / X', bg: '#1d9bf0', icon: Twitter },
    youtube: { label: 'YouTube', bg: '#dc2626', icon: Youtube },
    linkedin: { label: 'LinkedIn', bg: '#0077b5', icon: Linkedin },
  }[platform]

  const IconComp = labelOverride === 'Instagram Carousel' ? LayoutGrid : config.icon

  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: config.bg }}>
        <IconComp className="w-3 h-3 text-white" />
      </div>
      <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{labelOverride ?? config.label}</span>
    </div>
  )
}

// ─── Instagram carousel embed ────────────────────────────────────────────────

function getIgShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/)
  return match ? match[1] : null
}

function IgEmbed({ url, fallbackImage }: { url: string; fallbackImage: string | null }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const shortcode = getIgShortcode(url)
  const embedUrl = shortcode ? `https://www.instagram.com/p/${shortcode}/embed` : null

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!loaded) setError(true)
    }, 5000)
    return () => clearTimeout(timerRef.current)
  }, [loaded])

  if (!embedUrl || error) {
    return fallbackImage ? (
      <img src={fallbackImage} alt="" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <Instagram className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.08)' }} />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}
      <iframe
        src={embedUrl}
        className="w-full h-full border-0"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
        allowTransparency
        scrolling="no"
        onLoad={() => { setLoaded(true); clearTimeout(timerRef.current) }}
        onError={() => setError(true)}
      />
    </div>
  )
}

// ─── LinkedIn post preview ───────────────────────────────────────────────────

function LinkedInCarousel({ images }: { images: { url: string | null; filename: string }[] }) {
  const [idx, setIdx] = useState(0)
  const count = images.length
  if (!count) return null

  return (
    <div className="relative w-full" style={{ aspectRatio: '1/1', background: '#1c1b1a' }}>
      {images[idx]?.url ? (
        <img src={images[idx].url!} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-white/20">{images[idx]?.filename}</span>
        </div>
      )}
      {count > 1 && (
        <>
          {/* Arrows */}
          {idx > 0 && (
            <button onClick={() => setIdx(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-colors" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
          )}
          {idx < count - 1 && (
            <button onClick={() => setIdx(i => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-colors" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          )}
          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full transition-colors" style={{ background: i === idx ? '#fff' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
          {/* Counter */}
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ background: 'rgba(0,0,0,0.6)' }}>
            {idx + 1}/{count}
          </div>
        </>
      )}
    </div>
  )
}

function LinkedInPreview({ post, dateStr }: { post: LinkedInPost; dateStr: string }) {
  const fullText = post.body || post.caption || ''
  const images = (post.media_files || [])
    .filter(f => f.file_type === 'image')
    .sort((a, b) => a.order_index - b.order_index)
  const hashtagStr = (post.hashtags || []).join(' ')

  const TYPE_LABELS: Record<string, string> = { post: 'Post', article: 'Article', carousel: 'Carousel' }

  return (
    <div className="w-full h-full overflow-y-auto p-4">
      <div
        className="w-full max-w-[420px] mx-auto rounded-xl overflow-hidden"
        style={{ background: '#1b1f23', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Profile header */}
        <div className="p-4 pb-3">
          <div className="flex items-start gap-3">
            <img
              src="/avatar.png"
              alt="Your Name"
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              style={{ border: '2px solid rgba(255,255,255,0.08)' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Your Name</p>
              <p className="text-[11px] leading-tight" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Content Creator
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {dateStr} · <span style={{ color: 'rgba(255,255,255,0.25)' }}>🌐</span>
              </p>
            </div>
            <Linkedin className="w-4 h-4 flex-shrink-0" style={{ color: '#0077b5' }} />
          </div>
        </div>

        {/* Post text */}
        {fullText && (
          <div className="px-4 pb-3">
            <p className="text-[13px] text-white/90 leading-relaxed whitespace-pre-wrap">
              {fullText}
            </p>
          </div>
        )}

        {/* Lead magnet indicator */}
        {post.has_lead_magnet && (
          <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(0,119,181,0.1)', border: '1px solid rgba(0,119,181,0.2)' }}>
            <Gift className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#0077b5' }} />
            <span className="text-[11px] font-medium" style={{ color: '#0ea5e9' }}>
              {post.lead_magnet_url || 'Lead magnet attached'}
            </span>
          </div>
        )}

        {/* Hashtags */}
        {hashtagStr && (
          <div className="px-4 pb-3">
            <p className="text-[12px]" style={{ color: '#0a66c2' }}>
              {hashtagStr}
            </p>
          </div>
        )}

        {/* Images / Carousel */}
        {images.length > 0 && (
          <LinkedInCarousel images={images} />
        )}

        {/* Engagement bar */}
        <div className="px-4 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            {[
              { icon: ThumbsUp, label: 'Like' },
              { icon: MessageCircle, label: 'Comment' },
              { icon: Repeat2, label: 'Repost' },
              { icon: Send, label: 'Send' },
            ].map(({ icon: Icon, label }) => (
              <button key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5">
                <Icon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Type badge */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: 'rgba(0,119,181,0.12)', color: '#0ea5e9' }}>
            {TYPE_LABELS[post.type] || post.type}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
            {post.status}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Tweet preview card ──────────────────────────────────────────────────────

function TweetPreview({ tweet, dateStr }: { tweet: Tweet; dateStr: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div
        className="w-full max-w-[380px] rounded-2xl p-5 space-y-4"
        style={{ background: '#000', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        {/* Header — X logo + handle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#1d9bf0' }}>
              <Twitter className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Your Name</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>@yourhandle</p>
            </div>
          </div>
          <Twitter className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.3)' }} />
        </div>

        {/* Tweet body */}
        <p className="text-[15px] text-white leading-relaxed whitespace-pre-wrap">
          {tweet.text}
        </p>

        {/* Date */}
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {dateStr}
        </p>

        {/* Engagement row */}
        <div
          className="flex items-center gap-5 pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{fmtNum(tweet.totalReplies ?? 0)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Repeat2 className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{fmtNum(tweet.totalRetweets ?? 0)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{fmtNum(tweet.totalLikes)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{fmtNum(tweet.totalImpressions)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export function ContentDetailModal({ item, onClose }: ContentDetailModalProps) {
  if (!item) return null

  const externalUrl = item.platform === 'tweet'
    ? `https://x.com/i/status/${item.data.tweetId}`
    : item.platform === 'youtube'
    ? `https://youtu.be/${item.data.videoId}`
    : item.platform === 'linkedin'
    ? null
    : item.platform === 'ig_story'
    ? item.data.permalink
    : item.data.url

  const dateStr = item.platform === 'tweet'
    ? fmtDate(item.data.createdAt.dateTime)
    : item.platform === 'youtube'
    ? (item.data.publishedAt ? fmtDate(item.data.publishedAt) : '')
    : item.platform === 'linkedin'
    ? fmtDate(item.data.created_at)
    : fmtDate(item.data.publishedAt.dateTime)

  const platformLabel = item.platform === 'tweet' ? 'X'
    : item.platform === 'youtube' ? 'YouTube'
    : item.platform === 'linkedin' ? 'LinkedIn'
    : 'Instagram'

  // ─── Determine left-panel content ───────────────────────────────────────────

  const isVertical = item.platform === 'ig_story' || item.platform === 'ig_reel'
  const isCarousel = item.platform === 'ig_post' && item.data.type === 'FEED_CAROUSEL_ALBUM'
  const isIgPhoto = item.platform === 'ig_post' && !isCarousel

  const badgeLabel = isCarousel ? 'Instagram Carousel' : undefined

  // Left panel rendering
  let leftPanel: React.ReactNode

  if (item.platform === 'linkedin') {
    // LinkedIn post preview
    leftPanel = (
      <div className="flex-shrink-0 overflow-y-auto" style={{ width: 460, background: '#0d0f11' }}>
        <LinkedInPreview post={item.data} dateStr={dateStr} />
      </div>
    )
  } else if (item.platform === 'tweet') {
    // Tweet preview card
    leftPanel = (
      <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 440, background: '#1c1b1a' }}>
        <TweetPreview tweet={item.data} dateStr={dateStr} />
      </div>
    )
  } else if (item.platform === 'youtube') {
    // YouTube thumbnail — 16:9
    leftPanel = (
      <div className="flex-shrink-0 bg-black flex items-center justify-center p-4" style={{ width: 480 }}>
        <div className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9', background: '#1c1b1a' }}>
          {item.data.thumbnail ? (
            <img src={item.data.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Youtube className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.08)' }} />
            </div>
          )}
        </div>
      </div>
    )
  } else if (isVertical) {
    // Reels / Stories — 9:16
    const imageUrl = item.platform === 'ig_story' ? item.data.thumbnailUrl : item.data.imageUrl
    leftPanel = (
      <div className="flex-shrink-0 bg-black flex items-center justify-center p-4">
        <div className="w-[340px] rounded-2xl overflow-hidden" style={{ aspectRatio: '9/16', background: '#1c1b1a' }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Instagram className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.08)' }} />
            </div>
          )}
        </div>
      </div>
    )
  } else if (isCarousel) {
    // Carousel — embed with swipe
    const postUrl = item.data.url
    leftPanel = (
      <div className="flex-shrink-0 bg-black flex items-center justify-center p-4">
        <div className="w-[420px] rounded-2xl overflow-hidden" style={{ aspectRatio: '1/1', background: '#1c1b1a' }}>
          <IgEmbed url={postUrl} fallbackImage={item.data.imageUrl} />
        </div>
      </div>
    )
  } else {
    // Regular IG photo — square
    leftPanel = (
      <div className="flex-shrink-0 bg-black flex items-center justify-center p-4">
        <div className="w-[420px] rounded-2xl overflow-hidden" style={{ aspectRatio: '1/1', background: '#1c1b1a' }}>
          {item.data.imageUrl ? (
            <img src={item.data.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Instagram className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.08)' }} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Right panel — metrics ─────────────────────────────────────────────────

  let rightPanel: React.ReactNode

  if (item.platform === 'ig_story') {
    const retention = item.data.impressions > 0
      ? 100 - (item.data.exits / item.data.impressions) * 100
      : null

    rightPanel = (
      <>
        {item.data.content && (
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
            {item.data.content}
          </p>
        )}
        <div className="space-y-3">
          {retention !== null && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Story Retention</span>
                <span className="text-sm font-mono font-bold" style={{
                  color: retention >= 70 ? '#22c55e' : retention >= 50 ? '#f59e0b' : '#ef4444'
                }}>
                  {retention.toFixed(0)}%
                </span>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', height: 6 }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, retention)}%`,
                    background: retention >= 70 ? '#22c55e' : retention >= 50 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {retention >= 70 ? 'Great — most viewers stayed' : retention >= 50 ? 'Average retention' : 'Many viewers swiped away'}
              </p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <MetricCell icon={Eye} label="Reach" value={item.data.reach} />
            <MetricCell label="Impressions" value={item.data.impressions} />
            <MetricCell icon={MessageCircle} label="Replies" value={item.data.replies} />
            <MetricCell label="Exits" value={item.data.exits} />
            <MetricCell label="Taps Forward" value={item.data.tapsForward} />
            <MetricCell label="Taps Back" value={item.data.tapsBack} />
          </div>
        </div>
      </>
    )
  } else if (item.platform === 'ig_post' || item.platform === 'ig_reel') {
    rightPanel = (
      <>
        {item.data.content && (
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
            {item.data.content}
          </p>
        )}
        <div className="space-y-3">
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Engagement Rate</span>
              <span className="text-sm font-mono font-bold" style={{
                color: item.data.engagement > 5 ? '#22c55e' : item.data.engagement > 2 ? '#f59e0b' : '#ef4444'
              }}>
                {item.data.engagement.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MetricCell icon={Heart} label="Likes" value={item.data.likes} />
            <MetricCell icon={MessageCircle} label="Comments" value={item.data.comments} />
            <MetricCell icon={Bookmark} label="Saves" value={item.data.saved} />
            <MetricCell icon={Eye} label="Reach" value={item.data.reach} />
            <MetricCell icon={Share2} label="Shares" value={item.data.shares} />
            {(isCarousel || isIgPhoto) && (
              <MetricCell label="Impressions" value={item.data.impressionsTotal} />
            )}
            {item.data.views > 0 && (
              <MetricCell icon={Eye} label="Views" value={item.data.views} />
            )}
          </div>
        </div>
      </>
    )
  } else if (item.platform === 'tweet') {
    rightPanel = (
      <div className="space-y-3">
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Engagement Rate</span>
            <span className="text-sm font-mono font-bold" style={{
              color: item.data.totalEngagement > 5 ? '#22c55e' : item.data.totalEngagement > 2 ? '#f59e0b' : '#ef4444'
            }}>
              {item.data.totalEngagement.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MetricCell icon={Eye} label="Impressions" value={item.data.totalImpressions} />
          <MetricCell icon={Heart} label="Likes" value={item.data.totalLikes} />
          <MetricCell icon={Repeat2} label="Retweets" value={item.data.totalRetweets ?? 0} />
          <MetricCell icon={MessageCircle} label="Replies" value={item.data.totalReplies ?? 0} />
          <MetricCell icon={MousePointerClick} label="Profile Clicks" value={item.data.totalProfileClicks} />
          <MetricCell icon={MousePointerClick} label="Link Clicks" value={item.data.totalLinkClicks ?? 0} />
        </div>
      </div>
    )
  } else if (item.platform === 'linkedin') {
    const TYPE_LABELS: Record<string, string> = { post: 'Post', article: 'Article', carousel: 'Carousel' }
    rightPanel = (
      <>
        <h3 className="text-base font-semibold text-white leading-snug">
          {item.data.title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: 'rgba(0,119,181,0.12)', color: '#0ea5e9' }}>
            {TYPE_LABELS[item.data.type] || item.data.type}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
            {item.data.status}
          </span>
          {item.data.has_lead_magnet && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: 'rgba(0,119,181,0.1)', color: '#0ea5e9' }}>
              <Gift className="w-3 h-3" />
              Lead Magnet
            </span>
          )}
        </div>
        {item.data.has_lead_magnet && item.data.lead_magnet_url && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Lead Magnet URL</span>
            <p className="text-xs font-mono break-all" style={{ color: '#0ea5e9' }}>{item.data.lead_magnet_url}</p>
          </div>
        )}
        {item.data.hashtags?.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Hashtags</span>
            <p className="text-xs" style={{ color: '#0a66c2' }}>{item.data.hashtags.join(' ')}</p>
          </div>
        )}
        {item.data.media_files?.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Media</span>
            <p className="text-xs text-white/40">{item.data.media_files.length} file{item.data.media_files.length !== 1 ? 's' : ''} attached</p>
          </div>
        )}
      </>
    )
  } else if (item.platform === 'youtube') {
    rightPanel = (
      <>
        <h3 className="text-base font-semibold text-white leading-snug">
          {item.data.title ?? 'Untitled'}
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <MetricCell icon={Eye} label="Views" value={item.data.views} />
            <MetricCell icon={ThumbsUp} label="Likes" value={item.data.likes} />
            <MetricCell icon={MessageCircle} label="Comments" value={item.data.comments} />
            <MetricCell icon={Clock} label="Watch Time" value={
              item.data.watchMinutes >= 60
                ? `${(item.data.watchMinutes / 60).toFixed(1)}h`
                : `${Math.round(item.data.watchMinutes)}m`
            } />
            <MetricCell icon={TrendingUp} label="Retention" value={`${item.data.avgViewPct}%`} />
            <MetricCell label="Avg View" value={
              item.data.views > 0
                ? `${((item.data.watchMinutes / item.data.views) * 60).toFixed(0)}s`
                : '—'
            } />
          </div>
          {/* Retention bar */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Avg % Viewed</span>
              <span className="text-xs font-mono font-bold" style={{
                color: item.data.avgViewPct >= 50 ? '#22c55e' : item.data.avgViewPct >= 30 ? '#f59e0b' : '#ef4444'
              }}>
                {item.data.avgViewPct}%
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', height: 6 }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, item.data.avgViewPct)}%`,
                  background: item.data.avgViewPct >= 50 ? '#22c55e' : item.data.avgViewPct >= 30 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {item.data.avgViewPct >= 50 ? 'Excellent retention' : item.data.avgViewPct >= 40 ? 'Good retention' : item.data.avgViewPct >= 30 ? 'Average retention' : 'Below average — consider improving hooks'}
            </p>
          </div>
        </div>
      </>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl"
        style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <X className="w-4 h-4 text-white/60" />
        </button>

        <div className="flex h-full">
          {/* Left — media / preview */}
          {leftPanel}

          {/* Right — metrics panel */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <PlatformBadge platform={item.platform} labelOverride={badgeLabel} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{dateStr}</span>
            </div>

            {/* Platform-specific content */}
            {rightPanel}

            {/* External link */}
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-medium transition-colors hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on {platformLabel}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

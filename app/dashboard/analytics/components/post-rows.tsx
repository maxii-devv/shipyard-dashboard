'use client'

import { Instagram, Heart, MessageCircle, Bookmark, Eye, Repeat2, MousePointerClick, BookOpen, ThumbsUp, Share2 } from 'lucide-react'
import { fmtDate, fmtNum, type InstagramPost, type InstagramStory, type TwitterPost, type LinkedInPost } from './analytics-types'
import { TypeBadge } from './section-helpers'

export function IgPostRow({ post, onSelect }: { post: InstagramPost; onSelect?: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="flex items-start gap-3 p-3 rounded-xl group transition-all w-full text-left cursor-pointer hover:border-white/[0.06]"
      style={{ border: '1px solid transparent' }}
    >
      {post.imageUrl ? (
        <img src={post.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" style={{ background: '#1a1a1a' }} />
      ) : (
        <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center" style={{ background: '#1a1a1a' }}>
          <Instagram className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.1)' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <TypeBadge type={post.type} />
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{fmtDate(post.publishedAt?.dateTime ?? '')}</span>
        </div>
        <p className="text-xs text-white/70 line-clamp-2 leading-relaxed mb-2">{post.content || '(no caption)'}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Heart className="w-3 h-3" /> {fmtNum(post.likes)}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><MessageCircle className="w-3 h-3" /> {fmtNum(post.comments)}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Bookmark className="w-3 h-3" /> {fmtNum(post.saved)}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Eye className="w-3 h-3" /> {fmtNum(post.reach)} reach</span>
          <span className="text-[11px] font-semibold" style={{ color: post.engagement > 5 ? '#10b981' : post.engagement > 2 ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}>
            {post.engagement.toFixed(1)}% eng
          </span>
        </div>
      </div>
    </button>
  )
}

export function ReelRow({ post, onSelect }: { post: InstagramPost; onSelect?: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="flex items-start gap-3 p-3 rounded-xl group transition-all w-full text-left cursor-pointer hover:border-white/[0.06]"
      style={{ border: '1px solid transparent' }}
    >
      {post.imageUrl ? (
        <img src={post.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" style={{ background: '#1a1a1a' }} />
      ) : (
        <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center" style={{ background: '#1a1a1a' }}>
          <span className="text-lg">🎬</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>Reel</span>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{fmtDate(post.publishedAt?.dateTime ?? '')}</span>
        </div>
        <p className="text-xs text-white/70 line-clamp-2 leading-relaxed mb-2">{post.content || '(no caption)'}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Heart className="w-3 h-3" /> {fmtNum(post.likes)}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Eye className="w-3 h-3" /> {fmtNum(post.views)} views</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Eye className="w-3 h-3" /> {fmtNum(post.reach)} reach</span>
          <span className="text-[11px] font-semibold" style={{ color: post.engagement > 5 ? '#10b981' : post.engagement > 2 ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}>
            {post.engagement.toFixed(1)}% eng
          </span>
        </div>
      </div>
    </button>
  )
}

export function StoryRow({ story, onSelect }: { story: InstagramStory; onSelect?: () => void }) {
  const retentionRate = story.impressions > 0
    ? (100 - (story.exits / story.impressions) * 100).toFixed(0)
    : '—'

  return (
    <button
      onClick={onSelect}
      className="flex items-start gap-3 p-3 rounded-xl group w-full text-left cursor-pointer hover:border-white/[0.06]"
      style={{ border: '1px solid rgba(255,255,255,0.04)' }}
    >
      {story.thumbnailUrl ? (
        <img src={story.thumbnailUrl} alt="" className="w-10 h-16 rounded-lg object-cover shrink-0" style={{ background: '#1a1a1a' }} />
      ) : (
        <div className="w-10 h-16 rounded-lg shrink-0 flex items-center justify-center" style={{ background: '#1a1a1a' }}>
          <BookOpen className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>{story.type}</span>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{fmtDate(story.publishedAt?.dateTime ?? '')}</span>
        </div>
        {story.content && <p className="text-[11px] text-white/50 line-clamp-1 mb-1.5">{story.content}</p>}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Eye className="w-3 h-3 inline mr-0.5" />{fmtNum(story.reach)} reach</span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><MessageCircle className="w-3 h-3 inline mr-0.5" />{fmtNum(story.replies)}</span>
          <span className="text-[11px] font-semibold" style={{ color: Number(retentionRate) > 70 ? '#10b981' : 'rgba(255,255,255,0.4)' }}>
            {retentionRate}% retention
          </span>
        </div>
      </div>
    </button>
  )
}

export function TweetRow({ tweet, onSelect }: { tweet: TwitterPost; onSelect?: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="flex items-start gap-3 p-3 rounded-xl group transition-all w-full text-left cursor-pointer hover:border-white/[0.06]"
      style={{ border: '1px solid transparent' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{fmtDate(tweet.createdAt?.dateTime ?? '')}</span>
        </div>
        <p className="text-xs text-white/70 line-clamp-2 leading-relaxed mb-2">{tweet.text}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Eye className="w-3 h-3" /> {fmtNum(tweet.totalImpressions)}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Heart className="w-3 h-3" /> {fmtNum(tweet.totalLikes)}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Repeat2 className="w-3 h-3" /> {fmtNum(tweet.totalRetweets)}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><MessageCircle className="w-3 h-3" /> {fmtNum(tweet.totalReplies)}</span>
          {tweet.totalLinkClicks != null && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><MousePointerClick className="w-3 h-3" /> {fmtNum(tweet.totalLinkClicks)}</span>
          )}
          <span className="text-[11px] font-semibold" style={{ color: tweet.totalEngagement > 3 ? '#10b981' : 'rgba(255,255,255,0.4)' }}>
            {tweet.totalEngagement.toFixed(1)}% eng
          </span>
        </div>
      </div>
    </button>
  )
}

export function LinkedInPostRow({ post, onSelect }: { post: LinkedInPost; onSelect?: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="flex items-start gap-3 p-3 rounded-xl group transition-all w-full text-left cursor-pointer hover:border-white/[0.06]"
      style={{ border: '1px solid transparent' }}
    >
      {post.picture && (
        <img src={post.picture} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" style={{ background: '#1a1a1a' }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(10,102,194,0.15)', color: '#60a5fa' }}>LinkedIn</span>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{fmtDate(post.createdAt?.dateTime ?? '')}</span>
        </div>
        <p className="text-xs text-white/70 line-clamp-2 leading-relaxed mb-2">{post.text}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Eye className="w-3 h-3" /> {fmtNum(post.totalImpressions)}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><ThumbsUp className="w-3 h-3" /> {fmtNum(post.totalLikes)}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><MessageCircle className="w-3 h-3" /> {fmtNum(post.totalComments)}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><Share2 className="w-3 h-3" /> {fmtNum(post.totalShares)}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}><MousePointerClick className="w-3 h-3" /> {fmtNum(post.totalClicks)}</span>
          <span className="text-[11px] font-semibold" style={{ color: post.totalEngagement > 3 ? '#10b981' : 'rgba(255,255,255,0.4)' }}>
            {post.totalEngagement.toFixed(1)}% eng
          </span>
        </div>
      </div>
    </button>
  )
}

import { ArrowUp, ArrowDown, Minus, Sparkles, Play, Bookmark, MessageCircle, Share2 } from 'lucide-react'
import type { LastPostCoaching, LastPostSignal } from '@/lib/services/coachInsightsService'
import type { LatestPost } from '@/lib/services/postingActivityService'

interface LastPostCoachProps {
  post: LatestPost
  coaching: LastPostCoaching
}

const SIGNAL_ICON: Record<string, React.ElementType> = {
  Views: Play,
  Saves: Bookmark,
  Comments: MessageCircle,
  Shares: Share2,
}

const KIND_COLOR: Record<LastPostSignal['kind'], string> = {
  win: '#34d399',
  fix: '#f87171',
  neutral: '#94a3b8',
}

export function LastPostCoach({ post, coaching }: LastPostCoachProps) {
  const tags = [
    post.hook_type && { label: post.hook_type, color: '#f87171' },
    post.content_type && { label: post.content_type, color: '#6366f1' },
    post.layout && { label: post.layout, color: '#f59e0b' },
    post.cta_keyword && { label: `CTA: ${post.cta_keyword}`, color: '#ec4899' },
  ].filter(Boolean) as { label: string; color: string }[]

  return (
    <section
      className="rounded-xl p-4 flex items-start gap-4"
      style={{
        background: 'linear-gradient(135deg, rgba(167,139,250,0.05), rgba(99,102,241,0.03))',
        border: '1px solid rgba(167,139,250,0.18)',
      }}
    >
      {/* Thumbnail */}
      <a
        href={post.permalink}
        target="_blank"
        rel="noopener noreferrer"
        className="block flex-shrink-0 group"
      >
        <div
          className="relative w-20 aspect-[9/16] rounded-lg overflow-hidden"
          style={{ background: '#1c1b1a', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {post.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.thumbnail_url}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(225,48,108,0.2), rgba(131,58,180,0.2))',
              }}
            />
          )}
          <div
            className="absolute top-1 left-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.9)' }}
          >
            {coaching.mediaLabel}
          </div>
        </div>
      </a>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />
          <p className="text-[10px] uppercase tracking-widest font-semibold text-white/45">
            Your last {coaching.mediaLabel.toLowerCase()}
          </p>
          <span
            className="text-[10px]"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            · {coaching.postedAgo}
          </span>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map(t => (
                <span
                  key={t.label}
                  className="text-[8.5px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                  style={{
                    background: `${t.color}18`,
                    color: t.color,
                    border: `1px solid ${t.color}28`,
                  }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {coaching.caption && (
          <p
            className="text-[12px] mt-1.5 line-clamp-2 leading-snug"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {coaching.caption}
          </p>
        )}

        {coaching.signals.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {coaching.signals.map((sig, i) => (
              <SignalChip key={`${sig.label}-${i}`} sig={sig} />
            ))}
          </div>
        )}

        <p
          className="text-[12.5px] leading-snug mt-2.5 font-medium"
          style={{ color: 'rgba(255,255,255,0.88)' }}
        >
          <span style={{ color: '#a78bfa', fontWeight: 700 }}>→ </span>
          {coaching.advice}
        </p>
      </div>
    </section>
  )
}

function SignalChip({ sig }: { sig: LastPostSignal }) {
  const color = KIND_COLOR[sig.kind]
  const Icon = SIGNAL_ICON[sig.label] ?? Sparkles
  const Arrow = sig.kind === 'win' ? ArrowUp : sig.kind === 'fix' ? ArrowDown : Minus

  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-md"
      style={{
        background: `${color}10`,
        border: `1px solid ${color}25`,
        color: 'rgba(255,255,255,0.85)',
      }}
    >
      <Icon className="w-3 h-3" style={{ color }} />
      <span className="font-semibold" style={{ color }}>
        {sig.label}
      </span>
      <Arrow className="w-3 h-3" style={{ color }} />
      <span style={{ color: 'rgba(255,255,255,0.65)' }}>{sig.detail}</span>
    </span>
  )
}

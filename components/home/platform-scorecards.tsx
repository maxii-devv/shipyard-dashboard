import Link from 'next/link'
import { Youtube, Instagram, Linkedin } from 'lucide-react'

interface PlatformStats {
  total: number
  drafts: number
  inProgress: number
  scheduled: number
  published: number
}

interface PlatformScorecardProps {
  youtube: PlatformStats
  instagram: PlatformStats
  linkedin: PlatformStats
}

const platforms = [
  { key: 'youtube' as const, label: 'YouTube', icon: Youtube, color: '#dc2626', href: '/dashboard/youtube' },
  { key: 'instagram' as const, label: 'Instagram', icon: Instagram, color: '#e1306c', href: '/dashboard/instagram' },
  { key: 'linkedin' as const, label: 'LinkedIn', icon: Linkedin, color: '#0077b5', href: '/dashboard/linkedin' },
]

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  if (value === 0) return null
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      <span className="text-[12px] font-mono font-semibold" style={{ color }}>{value}</span>
    </div>
  )
}

export function PlatformScorecards({ youtube, instagram, linkedin }: PlatformScorecardProps) {
  const stats: Record<string, PlatformStats> = { youtube, instagram, linkedin }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {platforms.map(({ key, label, icon: Icon, color, href }) => {
        const s = stats[key]
        const hasContent = s.total > 0

        return (
          <Link key={key} href={href} className="group">
            <div
              className="rounded-xl p-4 h-full transition-all hover:bg-white/[0.04]"
              style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color }} />
                <h3 className="text-[12px] font-semibold text-white">{label}</h3>
                <span
                  className="text-[10px] font-mono font-bold ml-auto px-1.5 py-0.5 rounded"
                  style={{ background: `${color}15`, color }}
                >
                  {s.total}
                </span>
              </div>

              {hasContent ? (
                <div className="space-y-0.5">
                  <StatRow label="Drafts" value={s.drafts} color="#94a3b8" />
                  <StatRow label="In Progress" value={s.inProgress} color="#f59e0b" />
                  <StatRow label="Scheduled" value={s.scheduled} color="#3b82f6" />
                  <StatRow label="Published" value={s.published} color="#10b981" />
                </div>
              ) : (
                <p className="text-[11px] py-2 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  No content yet
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

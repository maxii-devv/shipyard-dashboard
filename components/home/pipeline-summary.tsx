import Link from 'next/link'

interface PipelineStage {
  label: string
  count: number
  platforms: { platform: string; count: number }[]
  href: string
}

interface PipelineSummaryProps {
  stages: PipelineStage[]
}

const STAGE_COLORS: Record<string, string> = {
  Drafts: '#6366f1',
  'In Dev': '#f59e0b',
  Ready: '#3b82f6',
  Scheduled: '#8b5cf6',
  Published: '#10b981',
}

export function PipelineSummary({ stages }: PipelineSummaryProps) {
  const maxCount = Math.max(...stages.map(s => s.count), 1)
  const total = stages.reduce((sum, s) => sum + s.count, 0)

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-white">Content Pipeline</h2>
        <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {total} total
        </span>
      </div>

      <div className="space-y-3">
        {stages.map((stage) => {
          const color = STAGE_COLORS[stage.label] ?? '#666'
          const pct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0

          return (
            <Link key={stage.label} href={stage.href} className="block group">
              <div className="flex items-center gap-3">
                {/* Label */}
                <span
                  className="text-[11px] font-medium w-20 shrink-0 text-right"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {stage.label}
                </span>

                {/* Bar track */}
                <div className="flex-1 h-7 rounded-md relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {/* Bar fill */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-all duration-500 group-hover:brightness-125"
                    style={{
                      width: `${Math.max(pct, stage.count > 0 ? 3 : 0)}%`,
                      background: `${color}30`,
                      borderRight: stage.count > 0 ? `2px solid ${color}` : 'none',
                    }}
                  />

                  {/* Count inside bar */}
                  <div className="absolute inset-y-0 left-0 flex items-center px-3">
                    <span
                      className="text-[12px] font-bold font-mono"
                      style={{ color: stage.count > 0 ? color : 'rgba(255,255,255,0.15)' }}
                    >
                      {stage.count}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

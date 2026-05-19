'use client'

import { Sparkline, TrendBadge } from '@/components/sparkline'
import { fmtNum } from './analytics-types'

export function StatPill({ label, value, sub, color = 'text-white', sparkData, sparkColor }: {
  label: string; value: string | number; sub?: string; color?: string; sparkData?: number[]; sparkColor?: string
}) {
  const hasSparkline = sparkData && sparkData.length > 1 && sparkData.some(v => v > 0)

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="relative z-10 px-4 py-3 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {label}
          </p>
          {hasSparkline && <TrendBadge data={sparkData} />}
        </div>
        <p className={`text-xl font-bold font-mono ${color}`}>
          {typeof value === 'number' ? fmtNum(value) : value}
        </p>
        {sub && <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{sub}</p>}
      </div>

      {hasSparkline && (
        <div className="absolute bottom-0 left-0 right-0 z-0 opacity-50">
          <Sparkline
            data={sparkData}
            color={sparkColor ?? '#dc2626'}
            width="100%"
            height={32}
            strokeWidth={1.5}
            showDot={false}
            fill={true}
          />
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface SparklineProps {
  data: number[]
  /** Width — use '100%' for fluid or a number for fixed px */
  width?: number | string
  height?: number
  color?: string
  fill?: boolean
  strokeWidth?: number
  showDot?: boolean
  className?: string
  /** Style for the wrapper SVG */
  style?: React.CSSProperties
  /** Labels parallel to data (same length). When set with `interactive`, hover shows the date */
  dates?: string[]
  /** Enable hover tooltip showing value + (optional) date */
  interactive?: boolean
  /** Formatter for the hovered value in the tooltip */
  valueFormatter?: (n: number) => string
}

export function Sparkline({
  data,
  width = '100%',
  height = 40,
  color = '#dc2626',
  fill = true,
  strokeWidth = 2,
  showDot = true,
  className,
  style,
  dates,
  interactive = false,
  valueFormatter,
}: SparklineProps) {
  const gradientId = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [hoverScreen, setHoverScreen] = useState<{ x: number; y: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const vbWidth = 200
  const vbHeight = height

  const { path, fillPath, lastPoint, points, values } = useMemo(() => {
    if (!data.length) return { path: '', fillPath: '', lastPoint: null, points: [], values: [] }

    const vals = data.filter(v => v != null && isFinite(v))
    if (vals.length < 2) return { path: '', fillPath: '', lastPoint: null, points: [], values: [] }

    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const range = max - min || 1

    const padY = 6
    const plotH = vbHeight - padY * 2

    const pts = vals.map((v, i) => ({
      x: (i / (vals.length - 1)) * vbWidth,
      y: padY + plotH - ((v - min) / range) * plotH,
    }))

    const linePath = catmullRomToBezier(pts)
    const last = pts[pts.length - 1]
    const fp = `${linePath} L ${last.x},${vbHeight} L ${pts[0].x},${vbHeight} Z`

    return { path: linePath, fillPath: fp, lastPoint: last, points: pts, values: vals }
  }, [data, vbHeight])

  if (!path) return null

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !svgRef.current || values.length < 2 || points.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const idx = Math.round(frac * (values.length - 1))
    setHoverIdx(idx)
    const pt = points[idx]
    if (pt) {
      setHoverScreen({
        x: rect.left + (pt.x / vbWidth) * rect.width,
        y: rect.top + (pt.y / vbHeight) * rect.height,
      })
    }
  }

  const handleLeave = () => {
    setHoverIdx(null)
    setHoverScreen(null)
  }

  const hoverPoint = hoverIdx != null ? points[hoverIdx] : null
  const hoverValue = hoverIdx != null ? values[hoverIdx] : null
  const hoverDate = hoverIdx != null && dates ? dates[hoverIdx] : null
  const formatValue = valueFormatter ?? defaultFormat

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${vbWidth} ${vbHeight}`}
        preserveAspectRatio="none"
        style={{ display: 'block', cursor: interactive ? 'crosshair' : undefined }}
        onMouseMove={interactive ? handleMove : undefined}
        onMouseLeave={interactive ? handleLeave : undefined}
      >
        {fill && (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={fillPath} fill={`url(#${gradientId})`} />
          </>
        )}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {showDot && lastPoint && hoverPoint == null && (
          <>
            <circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={color} opacity={0.2} />
            <circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill={color} />
          </>
        )}
        {hoverPoint && (
          <>
            <line
              x1={hoverPoint.x}
              y1={0}
              x2={hoverPoint.x}
              y2={vbHeight}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="2,2"
              opacity={0.5}
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r={5} fill={color} opacity={0.25} />
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r={3} fill={color} />
          </>
        )}
      </svg>
      {mounted && hoverScreen && hoverValue != null &&
        createPortal(
          <div
            className="pointer-events-none whitespace-nowrap"
            style={{
              position: 'fixed',
              left: hoverScreen.x,
              top: hoverScreen.y - 10,
              transform: 'translate(-50%, -100%)',
              background: 'rgba(20,20,20,0.96)',
              border: `1px solid ${color}40`,
              borderRadius: 6,
              padding: '3px 7px',
              fontSize: 10,
              color: '#fff',
              boxShadow: `0 4px 12px rgba(0,0,0,0.4), 0 0 8px ${color}30`,
              lineHeight: 1.3,
              zIndex: 9999,
            }}
          >
            <span style={{ color, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>
              {formatValue(hoverValue)}
            </span>
            {hoverDate && (
              <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 6 }}>{hoverDate}</span>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}

function defaultFormat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

/** Trend badge — colored pill with arrow + percentage */
export function TrendBadge({
  data,
  className,
}: {
  data: number[]
  className?: string
}) {
  const { pct, direction } = useMemo(() => {
    if (data.length < 2) return { pct: 0, direction: 'flat' as const }
    // Compare last half average to first half average for stability
    const mid = Math.floor(data.length / 2)
    const firstHalf = data.slice(0, mid)
    const secondHalf = data.slice(mid)
    const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length
    if (firstAvg === 0) return { pct: secondAvg > 0 ? 100 : 0, direction: secondAvg > 0 ? 'up' as const : 'flat' as const }
    const change = ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100
    return {
      pct: Math.abs(Math.round(change)),
      direction: change > 2 ? 'up' as const : change < -2 ? 'down' as const : 'flat' as const,
    }
  }, [data])

  if (direction === 'flat' || pct === 0) return null

  const isUp = direction === 'up'

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${className ?? ''}`}
      style={{
        background: isUp ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        color: isUp ? '#34d399' : '#f87171',
        border: `1px solid ${isUp ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
        {isUp ? (
          <path d="M4 1L7 5H1L4 1Z" />
        ) : (
          <path d="M4 7L1 3H7L4 7Z" />
        )}
      </svg>
      {pct}%
    </span>
  )
}

function catmullRomToBezier(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`
  }

  const tension = 0.3
  let d = `M ${points[0].x},${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }

  return d
}

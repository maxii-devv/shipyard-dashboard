import type { CSSProperties } from 'react'

// ─── Recharts dark theme ─────────────────────────────────────────────────────

export const CHART_COLORS = {
  // Platform colors
  instagram: '#e1306c',
  twitter: '#1d9bf0',
  linkedin: '#0a66c2',
  youtube: '#dc2626',

  // Metric colors
  reach: '#3b82f6',
  likes: '#ef4444',
  engagement: '#10b981',
  saves: '#f59e0b',
  comments: '#8b5cf6',
  impressions: '#06b6d4',
  views: '#3b82f6',
  watchMinutes: '#f59e0b',
  subscribers: '#10b981',
}

export const TOOLTIP_STYLE: CSSProperties = {
  background: '#1a1a1a',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  color: '#fff',
  fontSize: 12,
  padding: '8px 12px',
}

export const AXIS_TICK = {
  fill: 'rgba(255,255,255,0.25)',
  fontSize: 10,
}

export const GRID_STYLE = {
  stroke: 'rgba(255,255,255,0.04)',
  strokeDasharray: '3 3',
}

export const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 0 }

// Gradient definition helper — use inside an SVG <defs> block
export function gradientId(color: string) {
  return `grad-${color.replace('#', '')}`
}

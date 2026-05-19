'use client'

import { type ReactNode, type CSSProperties } from 'react'

type Align = 'left' | 'center' | 'right'

interface TooltipProps {
  children: ReactNode
  align?: Align
}

const alignTransform: Record<Align, string> = {
  left: 'translateX(-20%)',
  center: 'translateX(-50%)',
  right: 'translateX(-80%)',
}

/**
 * Dark tooltip that appears above its parent on hover.
 * Wrap any element — the parent just needs `position: relative`.
 *
 * Usage:
 *   <div className="relative" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
 *     <Tooltip align="center">
 *       <span>Feb 12</span> · <span style={{ color: '#dc2626' }}>1,234</span> views
 *     </Tooltip>
 *   </div>
 *
 * Or use the convenience wrapper <WithTooltip> to get hover behavior for free:
 *   <WithTooltip tooltip={<>Feb 12 · <strong>1,234</strong> views</>}>
 *     <div className="bar" />
 *   </WithTooltip>
 */
export function Tooltip({ children, align = 'center' }: TooltipProps) {
  const style: CSSProperties = {
    opacity: 0,
    bottom: 'calc(100% + 8px)',
    left: '50%',
    transform: alignTransform[align],
    background: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    color: '#fff',
  }

  return (
    <div
      data-tooltip
      className="pointer-events-none absolute z-50 rounded-lg px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition-opacity duration-150"
      style={style}
    >
      {children}
    </div>
  )
}

/**
 * Wrapper that adds hover-to-show tooltip behavior to its children.
 * Renders a relative-positioned container with the tooltip inside.
 */
interface WithTooltipProps {
  tooltip: ReactNode
  align?: Align
  children: ReactNode
  className?: string
  style?: CSSProperties
  as?: keyof HTMLElementTagNameMap
}

export function WithTooltip({ tooltip, align = 'center', children, className, style, ...rest }: WithTooltipProps & Record<string, any>) {
  return (
    <div
      className={`relative ${className ?? ''}`}
      style={style}
      onMouseEnter={e => {
        const el = e.currentTarget.querySelector('[data-tooltip]') as HTMLElement
        if (el) el.style.opacity = '1'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget.querySelector('[data-tooltip]') as HTMLElement
        if (el) el.style.opacity = '0'
      }}
    >
      {children}
      <Tooltip align={align}>{tooltip}</Tooltip>
    </div>
  )
}

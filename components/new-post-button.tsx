'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Instagram, Linkedin, Youtube } from 'lucide-react'

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: '#e1306c', href: '/dashboard/instagram' },
  { value: 'linkedin',  label: 'LinkedIn',  icon: Linkedin,  color: '#0077b5', href: '/dashboard/linkedin' },
  { value: 'youtube',   label: 'YouTube',   icon: Youtube,   color: '#dc2626', href: '/dashboard/youtube' },
] as const

export function NewPostButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
        style={{ background: '#dc2626' }}
      >
        <Plus className="w-4 h-4" /> New Post
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-48 rounded-xl py-1.5 shadow-xl z-50"
          style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Select platform
          </p>
          {PLATFORMS.map(({ value, label, icon: Icon, color, href }) => (
            <button
              key={value}
              onClick={() => {
                setOpen(false)
                router.push(href)
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Icon className="w-4 h-4" style={{ color }} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

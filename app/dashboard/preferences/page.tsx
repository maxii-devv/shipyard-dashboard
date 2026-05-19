'use client'

import { Settings as SettingsIcon, Moon, Sun, MousePointer2 } from 'lucide-react'
import { useSettings, type Theme } from '@/components/settings-context'

const THEMES: { key: Theme; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'dark', label: 'Dark', icon: Moon, desc: 'Default near-black theme' },
  { key: 'light', label: 'Light', icon: Sun, desc: 'Light background, dark text' },
]

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {children}
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="relative inline-flex items-center rounded-full transition-all"
      style={{
        width: 46,
        height: 26,
        background: on ? 'var(--app-accent)' : 'rgba(255,255,255,0.12)',
      }}
    >
      <span
        className="absolute rounded-full bg-white transition-all"
        style={{ width: 20, height: 20, top: 3, left: on ? 23 : 3 }}
      />
    </button>
  )
}

export default function PreferencesPage() {
  const { theme, hoverHint, set } = useSettings()

  return (
    <div className="p-8 space-y-6" style={{ minHeight: '100vh' }}>
      <div className="flex items-center gap-2.5">
        <SettingsIcon className="w-5 h-5" style={{ color: 'var(--app-accent)' }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>
            Settings
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(128,128,128,0.9)' }}>
            Saved to this browser
          </p>
        </div>
      </div>

      {/* ── Theme ───────────────────────────────────────────────────────── */}
      <Card>
        <h2 className="text-[11px] uppercase tracking-widest font-semibold text-white/45 mb-4">
          Theme
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {THEMES.map(t => {
            const Icon = t.icon
            const active = theme === t.key
            return (
              <button
                key={t.key}
                onClick={() => set('theme', t.key)}
                className="rounded-lg p-4 text-left transition-all"
                style={{
                  background: active
                    ? 'color-mix(in srgb, var(--app-accent) 14%, transparent)'
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'var(--app-accent)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <Icon
                  className="w-5 h-5 mb-2"
                  style={{ color: active ? 'var(--app-accent)' : 'rgba(255,255,255,0.5)' }}
                />
                <div
                  className="text-[13px] font-semibold"
                  style={{ color: active ? 'var(--app-accent)' : 'var(--app-text)' }}
                >
                  {t.label}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'rgba(128,128,128,0.9)' }}>
                  {t.desc}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* ── Mouse hover ─────────────────────────────────────────────────── */}
      <Card>
        <h2 className="text-[11px] uppercase tracking-widest font-semibold text-white/45 mb-4">
          Interaction
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <MousePointer2 className="w-4 h-4 mt-0.5" style={{ color: 'var(--app-accent)' }} />
            <div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--app-text)' }}>
                Mouse hover
              </div>
              <div className="text-[12px] mt-0.5" style={{ color: 'rgba(128,128,128,0.9)' }}>
                Show a suggested question next to the cursor on the &ldquo;Ask the Coach&rdquo; bar
              </div>
            </div>
          </div>
          <Toggle on={hoverHint} onClick={() => set('hoverHint', !hoverHint)} />
        </div>
      </Card>
    </div>
  )
}

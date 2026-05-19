'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'dark' | 'light' | 'custom'

export interface Settings {
  theme: Theme
  customColor: string
  hoverHint: boolean
  sidebarHidden: boolean
}

const DEFAULTS: Settings = {
  theme: 'dark',
  customColor: '#a78bfa',
  hoverHint: true,
  sidebarHidden: false,
}

const STORAGE_KEY = 'viral-coach-settings'

interface Ctx extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  toggleSidebar: () => void
}

const SettingsContext = createContext<Ctx | null>(null)

/** Push theme + accent to the document so plain CSS/inline styles can react. */
function applyTheme(s: Settings) {
  const root = document.documentElement
  // 'custom' rides on the dark base palette but with a user accent.
  const themeAttr = s.theme === 'light' ? 'light' : 'dark'
  root.setAttribute('data-theme', themeAttr)
  root.classList.toggle('dark', themeAttr === 'dark')
  root.style.colorScheme = themeAttr
  // Keep one accent value for dark + light; the light-mode inversion
  // filter (globals.css) flips it along with the rest of the UI, so a
  // separate light accent would invert to the wrong colour.
  const accent = s.theme === 'custom' ? s.customColor : '#a78bfa'
  root.style.setProperty('--app-accent', accent)
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const next = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
      setSettings(next)
      applyTheme(next)
    } catch {
      applyTheme(DEFAULTS)
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {}
    applyTheme(settings)
  }, [settings, loaded])

  const set = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) =>
      setSettings(prev => ({ ...prev, [key]: value })),
    []
  )

  const toggleSidebar = useCallback(
    () => setSettings(prev => ({ ...prev, sidebarHidden: !prev.sidebarHidden })),
    []
  )

  return (
    <SettingsContext.Provider value={{ ...settings, set, toggleSidebar }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

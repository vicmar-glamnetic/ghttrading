'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Mode = 'light' | 'dark' | 'system'
type Resolved = 'light' | 'dark'

interface ThemeCtx {
  mode: Mode
  resolved: Resolved
  setMode: (m: Mode) => void
  toggle: () => void
}

const Ctx = createContext<ThemeCtx>({
  mode: 'system',
  resolved: 'dark',
  setMode: () => {},
  toggle: () => {},
})

function systemTheme(): Resolved {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('system')
  const [resolved, setResolved] = useState<Resolved>('dark')

  const apply = useCallback((m: Mode) => {
    const r: Resolved = m === 'system' ? systemTheme() : m
    document.documentElement.dataset.theme = r
    setResolved(r)
  }, [])

  // Read the saved preference once on mount (boot script already applied it).
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const initial: Mode = stored === 'light' || stored === 'dark' ? stored : 'system'
    setModeState(initial)
    apply(initial)
  }, [apply])

  // Follow the OS when in system mode.
  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => apply('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode, apply])

  const setMode = useCallback((m: Mode) => {
    if (m === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', m)
    setModeState(m)
    apply(m)
  }, [apply])

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved, setMode])

  return <Ctx.Provider value={{ mode, resolved, setMode, toggle }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)

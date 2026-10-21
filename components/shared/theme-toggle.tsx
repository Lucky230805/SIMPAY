'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    }
    syncTheme()

    window.addEventListener('simpay-theme-change', syncTheme)
    return () => window.removeEventListener('simpay-theme-change', syncTheme)
  }, [])

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark')
    const nextTheme = isCurrentlyDark ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('simpay_theme', nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    window.dispatchEvent(new Event('simpay-theme-change'))
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-9 h-9 rounded-xl text-muted-foreground"
        aria-label="Ganti tema tampilan"
      >
        <span className="w-4 h-4 opacity-0" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors relative"
      title={theme === 'light' ? 'Beralih ke Mode Gelap (Dark Mode)' : 'Beralih ke Mode Terang (Light Mode)'}
      aria-label="Toggle tema tampilan"
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 transition-transform duration-200 hover:-rotate-12 text-slate-700 dark:text-slate-300" />
      ) : (
        <Sun className="w-4 h-4 transition-transform duration-200 hover:rotate-45 text-amber-400" />
      )}
    </Button>
  )
}

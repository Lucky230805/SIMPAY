'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check stored theme in localStorage
    const stored = localStorage.getItem('simpay_theme')
    const hasDarkClass = document.documentElement.classList.contains('dark')

    if (stored === 'dark' || (!stored && hasDarkClass)) {
      document.documentElement.classList.add('dark')
      setTheme('dark')
      document.cookie = 'simpay_theme=dark; path=/; max-age=31536000; SameSite=Lax'
    } else if (stored === 'light') {
      document.documentElement.classList.remove('dark')
      setTheme('light')
      document.cookie = 'simpay_theme=light; path=/; max-age=31536000; SameSite=Lax'
    } else {
      setTheme(hasDarkClass ? 'dark' : 'light')
    }

    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    }

    window.addEventListener('simpay-theme-change', syncTheme)
    return () => window.removeEventListener('simpay-theme-change', syncTheme)
  }, [])

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark')
    const nextTheme = isCurrentlyDark ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('simpay_theme', nextTheme)
    document.cookie = `simpay_theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`

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
      className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors relative cursor-pointer"
      title={theme === 'light' ? 'Beralih ke Mode Gelap (Dark Mode)' : 'Beralih ke Mode Terang (Light Mode)'}
      aria-label="Toggle tema tampilan"
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 transition-transform duration-200 hover:-rotate-12 text-slate-700 dark:text-slate-300" />
      ) : (
        <Sun className="w-4 h-4 transition-transform duration-200 hover:rotate-45 text-amber-500" />
      )}
    </Button>
  )
}

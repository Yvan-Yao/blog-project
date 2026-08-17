/**
 * @file src/components/ui/ThemeSwitcher.jsx
 * @description 主题切换按钮 — 下拉选择 4 套主题（翠绿/暗夜/暖黄/深海）
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette } from 'lucide-react'
import useThemeStore, { themeLabels, themeIcons } from '@/store/themeStore'

const themes = ['mint', 'dark', 'sepia', 'ocean']

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useThemeStore()
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold
                   transition-all duration-200"
        style={{
          color: 'hsl(var(--muted-fg))',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.08)'
          e.currentTarget.style.color = 'hsl(var(--primary))'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'hsl(var(--muted-fg))'
        }}
        title="切换主题"
      >
        <Palette size={14} />
        <span className="hidden sm:inline">{themeIcons[theme]} {themeLabels[theme]}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-36 rounded-xl shadow-lg border py-1 overflow-hidden z-50"
            style={{
              backgroundColor: 'hsl(var(--surface))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            {themes.map((t) => (
              <button
                key={t}
                onClick={() => { setTheme(t); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                  theme === t ? 'font-semibold' : ''
                }`}
                style={{
                  color: theme === t
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--foreground))',
                  backgroundColor: theme === t
                    ? 'hsl(var(--primary) / 0.08)'
                    : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (theme !== t) {
                    e.currentTarget.style.backgroundColor = 'hsl(var(--muted))'
                  }
                }}
                onMouseLeave={(e) => {
                  if (theme !== t) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <span className="text-base">{themeIcons[t]}</span>
                <span>{themeLabels[t]}</span>
                {theme === t && (
                  <span className="ml-auto text-[10px]">✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

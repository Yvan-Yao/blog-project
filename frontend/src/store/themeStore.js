/**
 * @file src/store/themeStore.js
 * @description 主题状态管理 — 4 套主题（翠绿/暗夜/暖黄/深海）+ localStorage 持久化
 */

import { create } from 'zustand'

const THEMES = ['mint', 'dark', 'sepia', 'ocean']
const THEME_KEY = 'blog-theme'

/**
 * 主题显示名称映射
 */
export const themeLabels = {
  mint:  '翠绿',
  dark:  '暗夜',
  sepia: '暖黄',
  ocean: '深海',
}

/**
 * 主题图标 emoji
 */
export const themeIcons = {
  mint:  '🌿',
  dark:  '🌙',
  sepia: '☀️',
  ocean: '🌊',
}

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved && THEMES.includes(saved)) return saved
  } catch {}
  return 'mint'
}

const useThemeStore = create((set) => ({
  theme: getInitialTheme(),

  setTheme: (theme) => {
    if (!THEMES.includes(theme)) return
    try { localStorage.setItem(THEME_KEY, theme) } catch {}
    set({ theme })
  },
}))

export default useThemeStore

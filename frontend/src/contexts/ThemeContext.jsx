/**
 * @file src/contexts/ThemeContext.jsx
 * @description 主题 Provider — 在 <html> 上设置 data-theme 属性，驱动 CSS 变量切换
 */

import { useEffect } from 'react'
import useThemeStore from '@/store/themeStore'

/**
 * ThemeProvider
 * 监听 theme store 变化，同步到 document.documentElement.dataset.theme
 */
export default function ThemeProvider({ children }) {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return children
}

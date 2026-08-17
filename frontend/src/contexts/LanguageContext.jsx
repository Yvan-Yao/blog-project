/**
 * @file src/contexts/LanguageContext.jsx
 * @description 多语言上下文 Provider（支持中英文切换）
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import translations from '@/i18n/translations'

const SUPPORTED_LANGS = ['zh', 'en', 'ja']
const DEFAULT_LANG = 'zh'
const STORAGE_KEY = 'blog-lang'

function getBrowserLang() {
  if (typeof navigator === 'undefined') return DEFAULT_LANG
  const nav = navigator.language || navigator.userLanguage || ''
  const lang = nav.split('-')[0]
  return SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG
}

function getInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (SUPPORTED_LANGS.includes(saved)) return saved
  } catch { /* ignore */ }
  return getBrowserLang()
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang)

  const t = useCallback((key, params = {}) => {
    const keys = key.split('.')
    let result = translations[lang]
    for (const k of keys) {
      if (result == null) break
      result = result[k]
    }
    // 兜底用中文
    if (result == null) {
      result = translations[DEFAULT_LANG]
      for (const k of keys) {
        if (result == null) break
        result = result[k]
      }
    }
    if (typeof result !== 'string') return key
    // 替换 {param} 占位符
    return result.replace(/\{(\w+)\}/g, (_, p) => (params[p] ?? `{${p}}`))
  }, [lang])

  const setLang = useCallback((newLang) => {
    if (!SUPPORTED_LANGS.includes(newLang)) return
    setLangState(newLang)
    try { localStorage.setItem(STORAGE_KEY, newLang) } catch { /* ignore */ }
    document.documentElement.lang = newLang
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => ({
    lang,
    setLang,
    t,
    supportedLangs: SUPPORTED_LANGS,
  }), [lang, setLang, t])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return ctx
}

export default LanguageContext

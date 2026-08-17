/**
 * @file src/components/layout/Footer.jsx
 * @description 页脚组件（主题自适应）
 */

import { Leaf } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="mt-12"
      style={{
        backgroundColor: 'hsl(var(--surface))',
        borderTop: '1px solid hsl(var(--border))',
      }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2" style={{ color: 'hsl(var(--muted-fg))' }}>
            <Leaf size={14} style={{ color: 'hsl(var(--primary-400))' }} />
            <span className="text-sm">{t('common.siteName')} — {t('common.tagline')}</span>
          </div>
          <p className="text-xs" style={{ color: 'hsl(var(--muted-fg) / 0.7)' }}>
            Built with React + Node.js + SQLite · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  )
}

/**
 * @file src/pages/NotFoundPage.jsx
 * @description 404 页面（支持中英文）
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Leaf, ArrowLeft } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-[70dvh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Leaf size={32} className="text-primary-400" />
        </div>
        <h1 className="text-6xl font-serif font-bold text-tx-subtle mb-2">404</h1>
        <h2 className="text-xl font-semibold text-tx-body mb-2">{t('common.notFound')}</h2>
        <p className="text-tx-muted mb-8">{t('common.tryOtherKeyword')}</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={15} />
          {t('common.back')}
        </Link>
      </motion.div>
    </div>
  )
}

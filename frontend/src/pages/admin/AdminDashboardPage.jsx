/**
 * @file src/pages/admin/AdminDashboardPage.jsx
 * @description Admin 仪表盘页面（支持中英文）
 */

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, FileText, MessageSquare, Eye, TrendingUp } from 'lucide-react'
import { adminApi } from '@/api/index'
import { useTranslation } from '@/contexts/LanguageContext'

function StatCard({ icon: Icon, label, value, color, delay }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-tx-muted mb-1">{label}</p>
          <p className="text-3xl font-semibold text-tx-heading">{value?.toLocaleString() ?? '-'}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </motion.div>
  )
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
  })
  const { t } = useTranslation()
  const stats = data?.data

  const statItems = [
    { icon: Users,         label: t('admin.totalUsers'),   value: stats?.userCount,    color: 'bg-blue-400',    delay: 0 },
    { icon: FileText,      label: t('admin.totalPosts'),   value: stats?.postCount,    color: 'bg-primary-500', delay: 0.1 },
    { icon: FileText,      label: t('admin.totalDrafts'), value: stats?.draftCount,   color: 'bg-amber-400',   delay: 0.2 },
    { icon: MessageSquare, label: t('admin.totalComments'), value: stats?.commentCount, color: 'bg-purple-400',  delay: 0.3 },
    { icon: Eye,           label: t('admin.totalViews'),   value: stats?.totalViews,   color: 'bg-rose-400',    delay: 0.4 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold text-tx-heading mb-6">{t('admin.dashboard')}</h1>

      {/* 统计卡片 */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {statItems.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      )}

      {/* 最近发布趋势 */}
      {stats?.recentPosts?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-5"
        >
          <h2 className="text-base font-medium text-tx-heading mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary-500" />
            {t('admin.stats')}
          </h2>
          <div className="flex items-end gap-2 h-24">
            {stats.recentPosts.map((day, i) => {
              const max = Math.max(...stats.recentPosts.map(d => d.count))
              const height = max > 0 ? (day.count / max) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-tx-muted">{day.count}</span>
                  <div
                    className="w-full bg-primary-400 rounded-t-md transition-all duration-500"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-tx-subtle">{day.date?.slice(5)}</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}

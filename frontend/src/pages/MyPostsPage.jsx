/**
 * @file src/pages/MyPostsPage.jsx
 * @description 我的文章页面（支持中英文）
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FileText, Plus, Clock, Eye, MessageCircle, ArrowUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'
import { postsApi } from '@/api/index'
import { useTranslation } from '@/contexts/LanguageContext'

const dateLocales = { zh: zhCN, en: enUS, ja }

export default function MyPostsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const LIMIT = 8
  const { t, lang } = useTranslation()
  const DATE_FMT = lang === 'zh' ? 'yyyy年M月d日' : 'MMM d, yyy'

  const { data, isLoading } = useQuery({
    queryKey: ['myPosts', page, statusFilter, sortBy, order],
    queryFn: () => postsApi.getMy({ page, limit: LIMIT, status: statusFilter || undefined, sortBy, order }),
  })

  const result = data?.data
  const posts = result?.data || []
  const totalPages = result?.totalPages || 1

  const statusOptions = [
    { value: '', label: t('home.categoryAll') },
    { value: 'published', label: t('post.publishedPosts') },
    { value: 'draft', label: t('post.drafts') },
  ]

  const SORT_OPTIONS = [
    { label: t('common.sortLatest'),       sortBy: 'created_at',    order: 'desc' },
    { label: t('common.sortOldest'),       sortBy: 'created_at',    order: 'asc'  },
    { label: t('common.sortMostViews'),    sortBy: 'views',         order: 'desc' },
    { label: t('common.sortMostComments'), sortBy: 'comment_count', order: 'desc' },
    { label: t('common.sortTitleAZ'),      sortBy: 'title',         order: 'asc'  },
    { label: t('common.sortTitleZA'),      sortBy: 'title',         order: 'desc' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 py-8"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-tx-heading">{t('nav.myPosts')}</h1>
          <p className="text-sm text-tx-muted mt-1">{t('post.myPosts')}</p>
        </div>
        <Link to="/write" className="btn-primary inline-flex items-center gap-2 text-sm">
          <Plus size={16} /> {t('post.createPost')}
        </Link>
      </div>

      {/* 状态筛选 + 排序 */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1) }}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                statusFilter === opt.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-surf-muted text-tx-body hover:bg-surf-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 排序下拉 */}
        <div className="relative">
          <select
            value={`${sortBy}:${order}`}
            onChange={(e) => {
              const [sb, od] = e.target.value.split(':')
              setSortBy(sb); setOrder(od); setPage(1)
            }}
            className="appearance-none pl-8 pr-8 py-1.5 text-sm rounded-xl border
                       bg-surf-card text-tx-body border-app cursor-pointer
                       hover:border-primary-300 focus:outline-none focus:ring-2
                       focus:ring-primary-200 transition-colors"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={`${opt.sortBy}:${opt.order}`} value={`${opt.sortBy}:${opt.order}`}>
                {opt.label}
              </option>
            ))}
          </select>
          <ArrowUpDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2
                                             pointer-events-none text-tx-subtle" />
        </div>
      </div>

      {/* 文章列表 */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-tx-subtle">
          <FileText size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">{t('post.noMyPosts')}</p>
          <p className="text-sm mt-1">{t('post.goWrite')}</p>
          <Link to="/write" className="btn-primary inline-flex items-center gap-2 mt-4 text-sm">
            <Plus size={14} /> {t('post.createPost')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/post/${post.url_token}`}
                className="block bg-surf-card rounded-2xl p-5 border border-app
                           hover:shadow-md hover:border-primary-200 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        post.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {post.status === 'published' ? t('post.published') : t('post.draft')}
                      </span>
                      {post.category_name && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surf-muted text-tx-muted">
                          {post.category_name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-tx-heading group-hover:text-primary-700
                                   transition-colors line-clamp-1">
                      {post.title}
                    </h3>
                    {post.summary && (
                      <p className="text-sm text-tx-muted line-clamp-1 mt-1">{post.summary}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-tx-subtle">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {post.published_at || post.created_at
                          ? format(new Date(post.published_at || post.created_at), DATE_FMT, { locale: dateLocales[lang] })
                          : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={11} />{post.views || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={11} />{post.comment_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {page > 1 && (
            <button onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm py-1.5 px-4">
              {t('common.prevPage')}
            </button>
          )}
          <span className="text-sm text-tx-muted">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <button onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm py-1.5 px-4">
              {t('common.nextPage')}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

/**
 * @file src/pages/HomePage.jsx
 * @description 博客首页 — 支持 3 种列表布局切换（双栏/列表/杂志）+ 主题自适应
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Leaf, TrendingUp, PenLine, UserPlus, ArrowUpDown } from 'lucide-react'
import { postsApi, categoriesApi } from '@/api/index'
import useAuthStore from '@/store/authStore'
import { useTranslation } from '@/contexts/LanguageContext'
import useLayoutStore from '@/store/layoutStore'
import { PostCardGrid, PostCardMinimal, PostCardMagazine } from '@/components/ui/PostCardVariants'

export default function HomePage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [categoryId, setCategoryId] = useState(null)
  const [sortBy, setSortBy] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const { token } = useAuthStore()
  const { t } = useTranslation()
  const { listLayout } = useLayoutStore()
  const LIMIT = 8

  const { data, isLoading } = useQuery({
    queryKey: ['posts', page, search, categoryId, sortBy, order],
    queryFn: () => postsApi.getAll({ page, limit: LIMIT, search, category: categoryId, sortBy, order }),
  })

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  })

  const posts = data?.data?.data || []
  const total = data?.data?.total || 0
  const totalPages = Math.ceil(total / LIMIT)
  const categories = catData?.data || []

  function handleSearch(e) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const SORT_OPTIONS = [
    { label: t('common.sortLatest'),       sortBy: 'created_at',    order: 'desc' },
    { label: t('common.sortOldest'),       sortBy: 'created_at',    order: 'asc'  },
    { label: t('common.sortMostViews'),    sortBy: 'views',         order: 'desc' },
    { label: t('common.sortMostComments'), sortBy: 'comment_count', order: 'desc' },
    { label: t('common.sortTitleAZ'),      sortBy: 'title',         order: 'asc'  },
    { label: t('common.sortTitleZA'),      sortBy: 'title',         order: 'desc' },
  ]

  const activeSortLabel = SORT_OPTIONS.find(o => o.sortBy === sortBy && o.order === order)?.label
    || t('common.sortLatest')

  const gridClass = listLayout === 'magazine'
    ? 'space-y-6'
    : listLayout === 'minimal'
      ? 'divide-y divide-border'
      : 'grid gap-4 md:grid-cols-2'

  const skeletonClass = listLayout === 'minimal'
    ? 'space-y-3'
    : 'grid gap-4 md:grid-cols-2'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero 区域 */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12 mb-8"
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
          <Leaf size={28} style={{ color: 'hsl(var(--primary-600))' }} />
        </div>
        <h1 className="text-4xl font-serif font-semibold mb-3"
          style={{ color: 'hsl(var(--foreground))' }}>
          {t('home.heroTitle')}
        </h1>
        <p className="text-lg max-w-sm mx-auto leading-relaxed"
          style={{ color: 'hsl(var(--muted-fg))' }}>
          {t('home.heroDesc')}
        </p>

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md mx-auto mt-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'hsl(var(--muted-fg))' }} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('common.searchPlaceholder')}
              className="input pl-9 text-sm"
            />
          </div>
          <button type="submit" className="btn-primary py-2.5">{t('common.search')}</button>
        </form>
      </motion.section>

      {/* 未登录用户引导横幅 */}
      {!token && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl text-white p-6 sm:p-8 mb-8 shadow-lg"
          style={{
            background: `linear-gradient(135deg, hsl(var(--primary-500)), hsl(var(--primary-600)))`,
          }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-surf-card/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-10 w-24 h-24 bg-surf-card/10 rounded-full translate-y-1/2" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-semibold mb-2">
                {t('home.welcomeTitle')}
              </h2>
              <p className="text-white/80 text-sm sm:text-base max-w-md">
                {t('home.welcomeDesc')}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                to="/register"
                className="flex items-center gap-2 bg-surf-card font-semibold px-5 py-3
                         rounded-xl transition-all duration-200 shadow-md
                         hover:shadow-lg active:scale-95"
                style={{ color: 'hsl(var(--primary))' }}
              >
                <UserPlus size={18} />
                {t('home.registerNow')}
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-2 bg-surf-card/20 backdrop-blur-sm text-white font-medium
                         px-5 py-3 rounded-xl border border-white/30 hover:bg-surf-card/30
                         transition-all duration-200 active:scale-95"
              >
                {t('home.hasAccount')}
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* 分类过滤器 */}
      {categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          <button
            onClick={() => { setCategoryId(null); setPage(1) }}
            className={`tag cursor-pointer transition-all ${
              !categoryId ? '' : ''
            }`}
            style={!categoryId ? {
              backgroundColor: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-fg))',
            } : {}}
          >
            {t('home.categoryAll')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategoryId(cat.id); setPage(1) }}
              className="tag cursor-pointer transition-all"
              style={categoryId === cat.id
                ? { backgroundColor: cat.color, color: 'white' }
                : { backgroundColor: cat.color + '20', color: cat.color }
              }
            >
              {cat.name}
              <span className="opacity-70">({cat.post_count})</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* 文章统计 + 排序控件 */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        {search ? (
          <p className="text-sm" style={{ color: 'hsl(var(--muted-fg))' }}>
            {t('home.searchResult', { keyword: search, count: total })}
          </p>
        ) : (
          <span />
        )}

        {/* 排序下拉 */}
        <div className="relative">
          <select
            value={`${sortBy}:${order}`}
            onChange={(e) => {
              const [sb, od] = e.target.value.split(':')
              setSortBy(sb)
              setOrder(od)
              setPage(1)
            }}
            className="appearance-none pl-8 pr-8 py-1.5 text-sm rounded-xl border
                       cursor-pointer transition-colors focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'hsl(var(--surface))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={`${opt.sortBy}:${opt.order}`} value={`${opt.sortBy}:${opt.order}`}>
                {opt.label}
              </option>
            ))}
          </select>
          <ArrowUpDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'hsl(var(--muted-fg))' }} />
        </div>
      </div>

      {/* 文章列表 */}
      {isLoading ? (
        <div className={skeletonClass}>
          {Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
          style={{ color: 'hsl(var(--muted-fg))' }}
        >
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t('home.noPosts')}</p>
          <p className="text-sm mt-1">
            {search ? t('common.tryOtherKeyword') : t('common.stayTuned')}
          </p>
        </motion.div>
      ) : (
        <div className={gridClass}>
          {posts.map((post, i) => {
            if (listLayout === 'minimal') {
              return <PostCardMinimal key={post.id} post={post} index={i} />
            }
            if (listLayout === 'magazine') {
              return (
                <PostCardMagazine
                  key={post.id}
                  post={post}
                  index={i}
                  isFirst={i === 0}
                />
              )
            }
            return <PostCardGrid key={post.id} post={post} index={i} />
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
          >{t('common.prevPage')}</button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200 ${
                  page === p
                    ? 'text-primary-fg shadow-md'
                    : 'hover:shadow-sm'
                }`}
                style={page === p
                  ? { backgroundColor: 'hsl(var(--primary))' }
                  : {
                      backgroundColor: 'hsl(var(--surface))',
                      color: 'hsl(var(--foreground))',
                      border: '1px solid hsl(var(--border))',
                    }
                }
              >{p}</button>
            ))}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
          >{t('common.nextPage')}</button>
        </div>
      )}
    </div>
  )
}

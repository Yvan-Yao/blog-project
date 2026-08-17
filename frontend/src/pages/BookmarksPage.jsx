/**
 * @file src/pages/BookmarksPage.jsx
 * @description 我的收藏页面 — 支持 3 种列表布局切换 + 主题自适应
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bookmark, BookOpen } from 'lucide-react'
import { bookmarksApi } from '@/api/index'
import { useTranslation } from '@/contexts/LanguageContext'
import useLayoutStore from '@/store/layoutStore'
import { PostCardGrid, PostCardMinimal, PostCardMagazine } from '@/components/ui/PostCardVariants'

export default function BookmarksPage() {
  const [page, setPage] = useState(1)
  const LIMIT = 8
  const { t } = useTranslation()
  const { listLayout } = useLayoutStore()

  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks', page],
    queryFn: () => bookmarksApi.list({ page, limit: LIMIT }),
  })

  const result = data
  const posts = result?.data || []
  const totalPages = result?.totalPages || 1

  const gridClass = listLayout === 'magazine'
    ? 'space-y-6'
    : listLayout === 'minimal'
      ? 'divide-y divide-border'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-4'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 py-8"
    >
      {/* 头部 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Bookmark size={20} className="text-amber-500" />
          <h1 className="text-2xl font-serif font-semibold"
            style={{ color: 'hsl(var(--foreground))' }}>
            {t('nav.bookmarks')}
          </h1>
        </div>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-fg))' }}>
          {result?.total > 0 ? t('common.total', { count: result.total }) : t('user.noBookmarks')}
        </p>
      </div>

      {/* 收藏列表 */}
      {isLoading ? (
        <div className={listLayout === 'minimal' ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'hsl(var(--muted-fg))' }}>
          <BookOpen size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">{t('user.noBookmarks')}</p>
          <p className="text-sm mt-1">{t('post.bookmark')} — {t('common.tryOtherKeyword')}</p>
        </div>
      ) : (
        <>
          <div className={gridClass}>
            {posts.map((post, i) => {
              const bookmarkedPost = { ...post, is_bookmarked: true }
              if (listLayout === 'minimal') {
                return <PostCardMinimal key={post.id} post={bookmarkedPost} index={i} />
              }
              if (listLayout === 'magazine') {
                return (
                  <PostCardMagazine
                    key={post.id}
                    post={bookmarkedPost}
                    index={i}
                    isFirst={i === 0}
                  />
                )
              }
              return <PostCardGrid key={post.id} post={bookmarkedPost} index={i} />
            })}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {page > 1 && (
                <button onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm py-1.5 px-4">
                  {t('common.prevPage')}
                </button>
              )}
              <span className="text-sm" style={{ color: 'hsl(var(--muted-fg))' }}>
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <button onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm py-1.5 px-4">
                  {t('common.nextPage')}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}

/**
 * @file src/pages/PostDetailPage.jsx
 * @description 文章详情页 — 支持 2 种阅读布局（居中/侧栏目录）+ 主题自适应
 */

import { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'
import { Eye, Clock, ArrowLeft, Pencil, Trash2, Hash } from 'lucide-react'
import { postsApi } from '@/api/index'
import { useTranslation } from '@/contexts/LanguageContext'
import useAuthStore from '@/store/authStore'
import useLayoutStore from '@/store/layoutStore'
import CommentSection from '@/components/ui/CommentSection'
import BookmarkButton from '@/components/ui/BookmarkButton'
import LikeButton from '@/components/ui/LikeButton'
import { DetailLayoutSwitcher } from '@/components/ui/LayoutSwitcher'
import { renderContent, extractTOC } from '@/utils/contentRender'
import toast from 'react-hot-toast'

const dateLocales = { zh: zhCN, en: enUS, ja }

export default function PostDetailPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { t, lang } = useTranslation()
  const { detailLayout } = useLayoutStore()
  const isAdmin = useAuthStore((s) => s.isAdmin)()

  const DATE_FMT = lang === 'zh' ? 'yyyy年M月d日' : 'MMM d, yyyy'

  const { data, isLoading, error } = useQuery({
    queryKey: ['post', token],
    queryFn: () => postsApi.getBySlug(token),
    retry: false,
  })

  const post = data?.data
  const htmlContent = useMemo(() => renderContent(post?.content), [post?.content])

  const tocItems = useMemo(() => extractTOC(htmlContent), [htmlContent])

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.delete(post?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success(t('messages.deleteSuccess'))
      navigate('/')
    },
    onError: () => toast.error(t('messages.error')),
  })

  if (isLoading) return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
      <div className="skeleton h-8 w-3/4" />
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  )

  if (error || !post) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center" style={{ color: 'hsl(var(--muted-fg))' }}>
      <p className="text-lg font-medium mb-2">{t('common.notFound')}</p>
      <Link to="/" className="btn-primary inline-flex items-center gap-2 mt-4">
        <ArrowLeft size={14} /> {t('common.back')}
      </Link>
    </div>
  )

  const canEdit = user && (user.id === post.author_id || isAdmin)
  const dateStr = post.published_at || post.created_at
  const formattedDate = dateStr
    ? format(new Date(dateStr), DATE_FMT, { locale: dateLocales[lang] })
    : ''

  const isSidebar = detailLayout === 'sidebar'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={isSidebar
        ? 'max-w-6xl mx-auto px-4 sm:px-6 py-8 flex gap-8'
        : 'max-w-3xl mx-auto px-4 sm:px-6 py-8'
      }
    >
      {/* 侧栏目录（仅 sidebar 模式 + 有标题时） */}
      {isSidebar && tocItems.length > 0 && (
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24">
            <div className="flex items-center gap-2 mb-3">
              <Hash size={14} style={{ color: 'hsl(var(--primary))' }} />
              <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                目录
              </span>
            </div>
            <nav className="space-y-1">
              {tocItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-sm py-1 transition-colors hover:text-[hsl(var(--primary))] truncate"
                  style={{
                    color: 'hsl(var(--muted-fg))',
                    paddingLeft: item.level === 3 ? '16px' : '0',
                  }}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}

      {/* 主内容区 */}
      <div className={isSidebar ? 'flex-1 min-w-0' : ''}>
        {/* 顶部导航栏 + 布局切换 */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/"
            className="inline-flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'hsl(var(--muted-fg))' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--primary))' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-fg))' }}
          >
            <ArrowLeft size={14} />
            {t('common.back')}
          </Link>
          <DetailLayoutSwitcher />
        </div>

        <article>
          {post.category_name && (
            <span className="tag mb-4 inline-flex" style={{
              backgroundColor: (post.category_color || '#4ade80') + '20',
              color: post.category_color || '#16a34a'
            }}>
              {post.category_name}
            </span>
          )}

          <h1 className="text-3xl sm:text-4xl font-serif font-semibold leading-tight mb-4"
            style={{ color: 'hsl(var(--foreground))' }}>
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm mb-6 pb-6"
            style={{
              color: 'hsl(var(--muted-fg))',
              borderBottom: '1px solid hsl(var(--border))',
            }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center"
                style={{
                  backgroundColor: 'hsl(var(--primary) / 0.15)',
                  color: 'hsl(var(--primary-600))',
                }}>
                {post.author_name?.[0]?.toUpperCase()}
              </div>
              <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                {post.author_name}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={13} />
              {formattedDate}
            </div>
            <div className="flex items-center gap-1">
              <Eye size={13} />
              {post.views} {t('post.views')}
            </div>

            {user && (
              <BookmarkButton
                postId={post.id}
                isBookmarked={!!post.is_bookmarked}
                mode="full"
              />
            )}

            {/* 点赞按钮 */}
            <LikeButton
              postId={post.id}
              initialLiked={!!post.is_liked}
              initialCount={post.like_count || 0}
              authorId={post.author_id}
            />

            {canEdit && (
              <div className="flex items-center gap-2 ml-auto">
                <Link to={`/edit/${post.url_token}`}
                  className="flex items-center gap-1.5 text-xs btn-secondary py-1 px-3">
                  <Pencil size={11} />{t('common.edit')}
                </Link>
                <button
                  onClick={() => {
                    if (window.confirm(t('post.deleteConfirm'))) {
                      deleteMutation.mutate()
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs btn-danger py-1 px-3"
                >
                  <Trash2 size={11} />{t('common.delete')}
                </button>
              </div>
            )}
          </div>

          {post.summary && (
            <p className="px-4 py-3 rounded-r-xl mb-6 text-sm leading-relaxed italic"
              style={{
                color: 'hsl(var(--muted-fg))',
                backgroundColor: 'hsl(var(--primary) / 0.08)',
                borderLeft: '4px solid hsl(var(--primary-300))',
              }}>
              {post.summary}
            </p>
          )}

          {/* 注入 ID 到标题，支持侧栏锚点跳转 */}
          <div
            className="prose-blog"
            dangerouslySetInnerHTML={{
              __html: isSidebar
                ? htmlContent.replace(/<h([23])\b/gi, (match, level, offset) => {
                    const idx = tocItems.findIndex((_, i) => {
                      let count = 0
                      const re = /<h([23])\b/gi
                      let m
                      while ((m = re.exec(htmlContent)) !== null) {
                        if (count === i) return m.index === offset
                        count++
                      }
                      return false
                    })
                    return `<h${level} id="heading-${idx >= 0 ? idx : offset}"`
                  })
                : htmlContent,
            }}
          />
        </article>

        {/* 评论区 */}
        {post.status === 'published' ? (
          <div className="mt-12 pt-8" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            <CommentSection postId={post.id} />
          </div>
        ) : canEdit && (
          <div className="mt-12 pt-8 text-center"
            style={{ borderTop: '1px dashed hsl(var(--border))' }}>
            <p className="text-sm inline-block px-4 py-2 rounded-full"
              style={{
                color: '#b45309',
                backgroundColor: '#fef3c7',
              }}>
              📝 {t('post.draft')} — {t('post.noComments')}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

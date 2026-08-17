/**
 * @file src/components/ui/PostCardVariants.jsx
 * @description 文章卡片 3 种布局变体：Grid（双栏卡片）、Minimal（极简列表）、Magazine（杂志风格）
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, MessageCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'
import BookmarkButton from './BookmarkButton'

const dateLocales = { zh: zhCN, en: enUS, ja }

/**
 * 双栏卡片布局（Grid）
 * 白色卡片 + 浅色边框 + 分类标签 + 标题 + 摘要 + 底部元信息
 */
export function PostCardGrid({ post, index = 0 }) {
  const dateStr = post.published_at || post.created_at
  const formattedDate = dateStr
    ? format(new Date(dateStr), 'yyyy年M月d日', { locale: zhCN })
    : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      <Link to={`/post/${post.url_token}`} className="block post-card group">
        <div className="h-1 w-full rounded-t-2xl mb-4"
          style={{ backgroundColor: post.category_color || 'hsl(var(--primary))' }}
        />
        <div className="px-1">
          {post.category_name && (
            <span className="tag mb-3">{post.category_name}</span>
          )}
          <h2 className="text-lg font-serif font-semibold group-hover:text-[hsl(var(--primary))]
                          transition-colors duration-200 line-clamp-2 mb-2"
            style={{ color: 'hsl(var(--foreground))' }}>
            {post.title}
          </h2>
          {post.summary && (
            <p className="text-sm line-clamp-2 mb-4 leading-relaxed"
              style={{ color: 'hsl(var(--muted-fg))' }}>
              {post.summary}
            </p>
          )}
          <div className="flex items-center justify-between text-xs"
            style={{ color: 'hsl(var(--muted-fg))' }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full text-xs font-semibold flex items-center justify-center"
                  style={{
                    backgroundColor: 'hsl(var(--primary) / 0.15)',
                    color: 'hsl(var(--primary-600))',
                  }}>
                  {post.author_name?.[0]?.toUpperCase() || 'A'}
                </div>
                <span>{post.author_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{formattedDate}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {post.is_bookmarked !== undefined && (
                <BookmarkButton postId={post.id} isBookmarked={post.is_bookmarked} mode="compact" />
              )}
              <div className="flex items-center gap-1">
                <Eye size={12} /><span>{post.views || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle size={12} /><span>{post.comment_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/**
 * 极简列表布局（Minimal）
 * 横向排列：左侧信息 + 右侧时间，底部细分隔线
 */
export function PostCardMinimal({ post, index = 0 }) {
  const dateStr = post.published_at || post.created_at
  const formattedDate = dateStr
    ? format(new Date(dateStr), 'yyyy年M月d日', { locale: zhCN })
    : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link to={`/post/${post.url_token}`} className="block group py-4 border-b"
        style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {post.category_name && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'hsl(var(--primary) / 0.1)',
                    color: 'hsl(var(--primary-600))',
                  }}>
                  {post.category_name}
                </span>
              )}
            </div>
            <h3 className="text-base font-serif font-semibold group-hover:text-[hsl(var(--primary))]
                           transition-colors duration-200 truncate"
              style={{ color: 'hsl(var(--foreground))' }}>
              {post.title}
            </h3>
            {post.summary && (
              <p className="text-sm line-clamp-1 mt-1"
                style={{ color: 'hsl(var(--muted-fg))' }}>
                {post.summary}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs"
              style={{ color: 'hsl(var(--muted-fg))' }}>
              <span>{post.author_name}</span>
              <span>·</span>
              <span>{formattedDate}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Eye size={11} />{post.views || 0}</span>
              {post.comment_count > 0 && (
                <span className="flex items-center gap-1">
                  <MessageCircle size={11} />{post.comment_count}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            <span className="text-xs" style={{ color: 'hsl(var(--muted-fg))' }}>
              {formattedDate.slice(-5)}
            </span>
            {post.is_bookmarked !== undefined && (
              <BookmarkButton postId={post.id} isBookmarked={post.is_bookmarked} mode="compact" />
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/**
 * 杂志布局（Magazine）
 * 首篇文章大图/色块 + 大标题，后续小卡片网格排列
 */
export function PostCardMagazine({ post, index = 0, isFirst = false }) {
  const dateStr = post.published_at || post.created_at
  const formattedDate = dateStr
    ? format(new Date(dateStr), 'yyyy年M月d日', { locale: zhCN })
    : ''

  if (isFirst) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link to={`/post/${post.url_token}`} className="block group">
          <div className="rounded-2xl overflow-hidden border"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--surface))' }}>
            {/* 大色块封面 */}
            <div className="h-48 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, hsl(var(--primary-200)), hsl(var(--primary-400)))`,
              }}>
              <span className="text-5xl opacity-30">&#9670;</span>
            </div>
            <div className="p-6">
              {post.category_name && (
                <span className="tag mb-3">{post.category_name}</span>
              )}
              <h2 className="text-2xl font-serif font-bold group-hover:text-[hsl(var(--primary))]
                              transition-colors duration-200 mb-3"
                style={{ color: 'hsl(var(--foreground))' }}>
                {post.title}
              </h2>
              {post.summary && (
                <p className="text-sm leading-relaxed mb-4"
                  style={{ color: 'hsl(var(--muted-fg))' }}>
                  {post.summary}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs"
                style={{ color: 'hsl(var(--muted-fg))' }}>
                <span className="font-medium">{post.author_name}</span>
                <span>·</span>
                <span>{formattedDate}</span>
                <span>·</span>
                <span>{post.views || 0} 阅读</span>
                {post.comment_count > 0 && <span>· {post.comment_count} 评论</span>}
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    )
  }

  return <PostCardGrid post={post} index={index} />
}

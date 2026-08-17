/**
 * @file src/components/ui/PostCard.jsx
 * @description 文章卡片组件（用于首页列表展示）
 *
 * 信息展示：封面图/颜色块、分类标签、标题、摘要、作者、时间、浏览量、评论数
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, MessageCircle, Clock, Heart } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import BookmarkButton from './BookmarkButton'
import LikeButton from './LikeButton'

/**
 * @param {Object} post - 文章数据
 * @param {number} index - 列表索引（用于错落动画）
 */
export default function PostCard({ post, index = 0 }) {
  // 格式化日期：如 "2024年2月15日"
  const dateStr = post.published_at || post.created_at
  const formattedDate = dateStr
    ? format(new Date(dateStr), 'yyyy年M月d日', { locale: zhCN })
    : ''

  return (
    <motion.div
      // 进入动画：从下方淡入，依次错落
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      <Link to={`/post/${post.url_token}`} className="block post-card group">
        {/* 顶部颜色条（封面图的简化版，体现清新感） */}
        <div className="h-1 w-full rounded-t-2xl mb-4"
             style={{ backgroundColor: post.category_color || '#4ade80' }} />

        <div className="px-1">
          {/* 分类标签 */}
          {post.category_name && (
            <span className="tag mb-3">
              {post.category_name}
            </span>
          )}

          {/* 标题 */}
          <h2 className="text-lg font-serif font-semibold text-tx-heading group-hover:text-primary-700
                          transition-colors duration-200 line-clamp-2 mb-2">
            {post.title}
          </h2>

          {/* 摘要 */}
          {post.summary && (
            <p className="text-sm text-tx-muted line-clamp-2 mb-4 leading-relaxed">
              {post.summary}
            </p>
          )}

          {/* 底部元信息 */}
          <div className="flex items-center justify-between text-xs text-tx-subtle">
            {/* 作者 + 时间 */}
            <div className="flex items-center gap-3">
              {/* 作者头像（首字母圆圈） */}
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700
                                text-xs font-semibold flex items-center justify-center">
                  {post.author_name?.[0]?.toUpperCase() || 'A'}
                </div>
                <span>{post.author_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{formattedDate}</span>
              </div>
            </div>

            {/* 统计数据 */}
            <div className="flex items-center gap-3">
              {/* 收藏按钮（仅登录用户可见） */}
              {post.is_bookmarked !== undefined && (
                <BookmarkButton postId={post.id} isBookmarked={post.is_bookmarked} mode="compact" />
              )}
              {/* 点赞数 */}
              <LikeButton
                postId={post.id}
                initialLiked={!!post.is_liked}
                initialCount={post.like_count || 0}
                authorId={post.author_id}
                compact
              />
              <div className="flex items-center gap-1">
                <Eye size={12} />
                <span>{post.views || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle size={12} />
                <span>{post.comment_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

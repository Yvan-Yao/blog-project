/**
 * @file LikeButton.jsx
 * @description 文章点赞按钮 — 心形动画 + 积分提示
 *                每篇文章每人限点赞 1 次，不可取消
 *
 * Props:
 *  postId     {number}  文章 ID
 *  initialLiked   {boolean} 初始是否已点赞
 *  initialCount   {number}  初始点赞数
 *  authorId   {number}  文章作者 ID（用于判断是否可点赞）
 *  compact    {boolean} 是否使用紧凑模式（用于文章卡片）
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { likesApi } from '@/api/index'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

export default function LikeButton({
  postId,
  initialLiked = false,
  initialCount = 0,
  authorId,
  compact = false,
}) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [liked, setLiked]   = useState(initialLiked)
  const [count, setCount]   = useState(initialCount)
  const [burst, setBurst]   = useState(false)

  const isAuthor = user && authorId && user.id === authorId

  const mutation = useMutation({
    mutationFn: () => likesApi.like(postId),
    onMutate: () => {
      // 乐观更新：直接设为已点赞
      setLiked(true)
      setCount(c => c + 1)
      setBurst(true)
      setTimeout(() => setBurst(false), 600)
    },
    onSuccess: (res) => {
      const { liked: serverLiked, like_count } = res.data
      setLiked(serverLiked)
      setCount(like_count)
      queryClient.invalidateQueries({ queryKey: ['post'] })
    },
    onError: () => {
      // 回滚乐观更新
      setLiked(false)
      setCount(c => Math.max(0, c - 1))
    },
  })

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      toast('请先登录才能点赞', { icon: '💡' })
      return
    }
    if (isAuthor) {
      toast('不能给自己的文章点赞', { icon: '🙅' })
      return
    }
    if (liked) {
      toast('已经点过赞了', { icon: '❤️' })
      return
    }
    if (mutation.isPending) return
    mutation.mutate()
  }

  if (compact) {
    return (
      <button
        onClick={handleClick}
        title={liked ? '已点赞' : '点赞'}
        className="flex items-center gap-1 transition-colors"
        style={{ color: liked ? '#ef4444' : undefined }}
      >
        <motion.span
          animate={burst ? { scale: [1, 1.5, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Heart
            size={12}
            fill={liked ? '#ef4444' : 'none'}
            color={liked ? '#ef4444' : 'currentColor'}
          />
        </motion.span>
        <span>{count}</span>
      </button>
    )
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <motion.button
        onClick={handleClick}
        disabled={mutation.isPending}
        whileTap={liked ? {} : { scale: 0.88 }}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
          border transition-all duration-200
          ${liked
            ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-950/30 dark:border-red-800 cursor-default'
            : 'border-app text-tx-muted hover:border-red-200 hover:text-red-400 dark:border-zinc-700 dark:text-zinc-400'
          }
        `}
      >
        <motion.span
          animate={burst ? { scale: [1, 1.6, 0.9, 1.1, 1] } : {}}
          transition={{ duration: 0.5 }}
        >
          <Heart
            size={16}
            fill={liked ? '#ef4444' : 'none'}
            color={liked ? '#ef4444' : 'currentColor'}
          />
        </motion.span>
        <span>{count}</span>
        {liked ? '已点赞' : '点赞'}
      </motion.button>

      {/* 粒子爆发效果 */}
      <AnimatePresence>
        {burst && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-red-400 text-xs"
                style={{ left: '50%', top: '50%' }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: (Math.cos((i * 60 * Math.PI) / 180) * 30),
                  y: (Math.sin((i * 60 * Math.PI) / 180) * 30),
                  opacity: 0,
                  scale: 0,
                }}
                transition={{ duration: 0.5, delay: i * 0.03 }}
              >
                ♥
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

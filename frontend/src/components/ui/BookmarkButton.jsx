/**
 * @file BookmarkButton.jsx
 * @description 收藏按钮组件 — 一键收藏/取消收藏文章
 *
 * 支持两种模式：
 * - compact:  只显示图标（用于文章卡片）
 * - full:     图标 + 文字 + 计数（用于文章详情页）
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bookmark } from 'lucide-react'
import { bookmarksApi } from '@/api/index'

export default function BookmarkButton({ postId, isBookmarked: initialBookmarked = false, mode = 'compact' }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => bookmarksApi.toggle(postId),
    onSuccess: (res) => {
      setBookmarked(res.bookmarked)
      // 刷新收藏列表和文章列表缓存
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })

  if (mode === 'compact') {
    return (
      <motion.button
        onClick={(e) => { e.preventDefault(); if (!isPending) mutate() }}
        whileTap={{ scale: 0.85 }}
        className={`p-1.5 rounded-full transition-colors ${
          bookmarked
            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
            : 'text-tx-subtle hover:text-amber-500 hover:bg-surf-muted'
        }`}
        title={bookmarked ? '取消收藏' : '收藏文章'}
        disabled={isPending}
      >
        <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
      </motion.button>
    )
  }

  // full 模式
  return (
    <motion.button
      onClick={() => !isPending && mutate()}
      whileTap={{ scale: 0.96 }}
      disabled={isPending}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium
        transition-all duration-200 ${
        bookmarked
          ? 'bg-amber-500 text-white shadow-md shadow-amber-200 hover:bg-amber-600'
          : 'bg-surf-card text-tx-body border border-app hover:border-amber-300 hover:text-amber-600'
      }`}
    >
      <Bookmark
        size={16}
        fill={bookmarked ? 'white' : 'none'}
        className={isPending ? 'animate-pulse' : ''}
      />
      {isPending ? '处理中...' : bookmarked ? '已收藏' : '收藏文章'}
    </motion.button>
  )
}

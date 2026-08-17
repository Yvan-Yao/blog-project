/**
 * @file PointsPage.jsx
 * @description 我的积分 — 等级 / 进度条 / 流水记录
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trophy, Zap, Star, MessageCircle, ThumbsUp, ScrollText } from 'lucide-react'
import { pointsApi } from '@/api/index'
import LevelBadge from '@/components/ui/LevelBadge'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const ACTION_META = {
  publish_post:    { icon: <ScrollText size={14} />, color: '#7c3aed', label: '发布文章' },
  receive_comment: { icon: <MessageCircle size={14} />, color: '#059669', label: '文章收到评论' },
  post_comment:    { icon: <MessageCircle size={14} />, color: '#2563eb', label: '发表评论' },
  receive_like:    { icon: <ThumbsUp size={14} />, color: '#c2410c', label: '收到点赞' },
  give_like:       { icon: <ThumbsUp size={14} />, color: '#ca8a04', label: '给文章点赞' },
}

export default function PointsPage() {
  const [page, setPage] = useState(1)

  const { data: ptsData, isLoading: ptsLoading } = useQuery({
    queryKey: ['points', 'me'],
    queryFn: () => pointsApi.getMe(),
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['points', 'logs', page],
    queryFn: () => pointsApi.getLogs({ page, limit: 15 }),
  })

  const pts = ptsData?.data
  const logs = logsData?.data

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 返回 */}
      <Link
        to="/profile"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: 'hsl(var(--muted-fg))' }}
      >
        <ArrowLeft size={14} />
        返回个人中心
      </Link>

      {/* 积分概览 */}
      {ptsLoading ? (
        <div className="card p-6 mb-6">
          <div className="skeleton h-20 rounded-xl" />
        </div>
      ) : pts && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 mb-6"
        >
          {/* 头部：等级 + 总分 */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={20} style={{ color: 'hsl(var(--primary))' }} />
                <h1 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                  我的积分
                </h1>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <LevelBadge level={pts.level} title={pts.title} total={pts.total} size="md" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold tabular-nums" style={{ color: 'hsl(var(--primary))' }}>
                {pts.total}
              </p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-fg))' }}>总积分</p>
            </div>
          </div>

          {/* 等级进度条 */}
          <div>
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'hsl(var(--muted-fg))' }}>
              <span>Lv.{pts.level} {pts.title}</span>
              {pts.next_title && (
                <span>距 Lv.{pts.level + 1} {pts.next_title}：{pts.next_min - pts.total} 积分</span>
              )}
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'hsl(var(--border))' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))' }}
                initial={{ width: 0 }}
                animate={{ width: `${pts.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs mt-1 text-right" style={{ color: 'hsl(var(--muted-fg))' }}>
              {pts.next_min ? `${pts.total - pts.min} / ${pts.next_min - pts.min}` : '已达最高等级'}
            </p>
          </div>

          {/* 积分规则说明 */}
          <div className="mt-5 pt-4 border-t grid grid-cols-2 gap-2.5" style={{ borderColor: 'hsl(var(--border))' }}>
            {Object.entries(ACTION_META).map(([action, meta]) => (
              <div key={action} className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--muted-fg))' }}>
                <span style={{ color: meta.color }}>{meta.icon}</span>
                <span>{meta.label}</span>
                <span className="ml-auto font-semibold tabular-nums" style={{ color: meta.color }}>
                  +{action === 'publish_post' ? 5 : action === 'receive_like' || action === 'receive_comment' ? 2 : 1}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 积分流水 */}
      <div>
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
          <Zap size={14} style={{ color: 'hsl(var(--primary))' }} />
          积分记录
        </h2>

        {logsLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : logs?.data?.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'hsl(var(--muted-fg))' }}>
            <Star size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无积分记录，快去发文章或评论吧！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs?.data?.map((log, i) => {
              const meta = ACTION_META[log.action] || { icon: <Star size={14} />, color: '#666', label: log.action }
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'hsl(var(--surface))' }}
                >
                  {/* 动作图标 */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                  >
                    {meta.icon}
                  </div>

                  {/* 描述 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
                      {meta.label}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--muted-fg))' }}>
                      {log.created_at
                        ? format(new Date(log.created_at), 'yyyy年M月d日 HH:mm', { locale: zhCN })
                        : '-'}
                    </p>
                  </div>

                  {/* 积分 */}
                  <span
                    className="text-sm font-bold tabular-nums shrink-0"
                    style={{ color: meta.color }}
                  >
                    +{log.points}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* 分页 */}
        {logs && logs.total > 15 && (
          <div className="flex justify-center gap-3 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-sm self-center" style={{ color: 'hsl(var(--muted-fg))' }}>
              {page} / {Math.ceil(logs.total / 15)}
            </span>
            <button
              disabled={page >= Math.ceil(logs.total / 15)}
              onClick={() => setPage(p => p + 1)}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

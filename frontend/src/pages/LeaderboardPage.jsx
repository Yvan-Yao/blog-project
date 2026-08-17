/**
 * @file LeaderboardPage.jsx
 * @description 积分排行榜页面
 */

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { pointsApi } from '@/api/index'
import LevelBadge from '@/components/ui/LevelBadge'

const MEDAL = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['points', 'leaderboard'],
    queryFn: () => pointsApi.leaderboard(50),
  })

  const list = data?.data || []

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 返回 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: 'hsl(var(--muted-fg))' }}
      >
        <ArrowLeft size={14} />
        返回首页
      </Link>

      {/* 标题 */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}
        >
          🏆
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            积分排行榜
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-fg))' }}>
            创作、评论、点赞都能获得积分
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'hsl(var(--muted-fg))' }}>
          <Trophy size={40} className="mx-auto mb-4 opacity-20" />
          <p>暂无排行数据</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((user, i) => {
            const rank = i + 1
            const isTop3 = rank <= 3
            return (
              <motion.div
                key={user.user_id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`
                  flex items-center gap-4 px-4 py-3 rounded-xl
                  ${isTop3 ? 'border' : ''}
                `}
                style={{
                  backgroundColor: isTop3
                    ? `hsl(var(--primary) / ${0.07 - i * 0.02})`
                    : 'hsl(var(--surface))',
                  borderColor: isTop3 ? 'hsl(var(--primary) / 0.2)' : undefined,
                }}
              >
                {/* 排名 */}
                <div className="w-8 text-center shrink-0">
                  {isTop3 ? (
                    <span className="text-xl">{MEDAL[i]}</span>
                  ) : (
                    <span className="text-sm font-semibold tabular-nums" style={{ color: 'hsl(var(--muted-fg))' }}>
                      {rank}
                    </span>
                  )}
                </div>

                {/* 头像 */}
                <div
                  className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center
                             text-sm font-bold shrink-0"
                  style={{
                    backgroundColor: 'hsl(var(--primary) / 0.12)',
                    color: 'hsl(var(--primary-700))',
                  }}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    user.username?.[0]?.toUpperCase()
                  )}
                </div>

                {/* 用户名 + 等级 */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${user.url_token}`}
                    className="text-sm font-medium truncate hover:underline block"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    {user.username}
                  </Link>
                  <div className="mt-0.5">
                    <LevelBadge level={user.level} title={user.title} size="sm" />
                  </div>
                </div>

                {/* 积分 */}
                <div className="text-right shrink-0">
                  <p
                    className={`font-bold tabular-nums ${isTop3 ? 'text-lg' : 'text-sm'}`}
                    style={{ color: 'hsl(var(--primary))' }}
                  >
                    {user.total}
                  </p>
                  <p className="text-xs" style={{ color: 'hsl(var(--muted-fg))' }}>积分</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

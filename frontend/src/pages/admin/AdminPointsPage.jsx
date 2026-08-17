/**
 * @file src/pages/admin/AdminPointsPage.jsx
 * @description Admin 积分管理页面 — 积分统计/用户列表 + 等级配置 + 积分规则维护
 *
 * Tab:
 *  1. 积分管理 — 统计卡片 + 等级分布 + 用户积分列表 + 调整积分
 *  2. 等级配置 — Level Table CRUD
 *  3. 积分规则 — Point Rules CRUD
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ArrowUpDown, ChevronLeft, ChevronRight, X,
  Zap, TrendingUp, Users, Award, Star, Plus, Minus, Eye,
  Loader2, ListOrdered, SlidersHorizontal, Edit3, Trash2,
} from 'lucide-react'
import { adminPointsApi, adminLevelApi } from '@/api/index'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'
import { useTranslation } from '@/contexts/LanguageContext'
import toast from 'react-hot-toast'
import LevelBadge from '@/components/ui/LevelBadge'

// 积分动作图标映射
const ACTION_ICONS = {
  publish_post:    { icon: '📝', color: 'text-blue-600',   bg: 'bg-blue-50'   },
  receive_comment: { icon: '💬', color: 'text-green-600',  bg: 'bg-green-50'  },
  post_comment:    { icon: '💬', color: 'text-teal-600',   bg: 'bg-teal-50'   },
  receive_like:    { icon: '❤️', color: 'text-pink-600',   bg: 'bg-pink-50'   },
  give_like:       { icon: '👍', color: 'text-rose-600',   bg: 'bg-rose-50'   },
  admin_add:       { icon: '➕', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  admin_deduct:    { icon: '➖', color: 'text-red-600',    bg: 'bg-red-50'    },
}

// 等级颜色条
const LEVEL_COLORS = {
  1: 'bg-gray-400', 2: 'bg-green-400', 3: 'bg-emerald-400',
  4: 'bg-blue-400', 5: 'bg-purple-400', 6: 'bg-pink-400',
  7: 'bg-orange-400', 8: 'bg-amber-400', 9: 'bg-rainbow',
}

const TABS = [
  { key: 'stats',  label: '积分管理', icon: Zap },
  { key: 'levels', label: '等级配置', icon: ListOrdered },
  { key: 'rules',  label: '积分规则', icon: SlidersHorizontal },
]

export default function AdminPointsPage() {
  const queryClient = useQueryClient()
  const { t, lang } = useTranslation()
  const dateLocale = lang === 'zh' ? zhCN : lang === 'en' ? enUS : ja

  // ── Tab 状态 ──
  const [activeTab, setActiveTab] = useState('stats')

  // ── 筛选状态 ──
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('total')
  const [order, setOrder] = useState('desc')
  const limit = 15

  // ── 弹窗状态 ──
  const [selectedUser, setSelectedUser] = useState(null)
  const [adjustUser, setAdjustUser] = useState(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  // ── 等级/规则编辑弹窗 ──
  const [levelModal, setLevelModal] = useState(null) // null | { id?, level, title, min_points }
  const [ruleModal, setRuleModal] = useState(null)   // null | { id?, action, points, description, enabled }

  // ── 积分统计 ──
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-points-stats'],
    queryFn: adminPointsApi.getStats,
  })
  const stats = statsData?.data

  // ── 用户积分列表 ──
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-points-users', page, search, sortBy, order],
    queryFn: () => adminPointsApi.getUsers({ page, limit, search, sortBy, order }),
  })
  const userList = usersData?.data
  const totalPages = Math.ceil((userList?.total || 0) / limit)

  // ── 积分流水 ──
  const [logsPage, setLogsPage] = useState(1)
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-points-user-logs', selectedUser?.user_id, logsPage],
    queryFn: () => adminPointsApi.getUserLogs(selectedUser.user_id, { page: logsPage, limit: 15 }),
    enabled: !!selectedUser,
  })
  const logList = logsData?.data
  const logTotalPages = Math.ceil((logList?.total || 0) / 15)

  // ── 等级配置 ──
  const { data: levelsData, isLoading: levelsLoading } = useQuery({
    queryKey: ['admin-levels'],
    queryFn: adminLevelApi.getLevels,
    enabled: activeTab === 'levels',
  })
  const levels = levelsData?.data || []

  // ── 积分规则 ──
  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['admin-rules'],
    queryFn: adminLevelApi.getRules,
    enabled: activeTab === 'rules',
  })
  const rules = rulesData?.data || []

  // ── 调整积分 mutation ──
  const adjustMutation = useMutation({
    mutationFn: ({ userId, amount, reason }) =>
      adminPointsApi.adjust(userId, { amount: Number(amount), reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-points-stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin-points-users'] })
      toast.success(t('admin.pointsAdjustSuccess') || '积分调整成功')
      closeAdjustModal()
    },
    onError: (err) => toast.error(err.response?.data?.message || t('messages.error')),
  })

  // ── 等级 mutation ──
  const levelMutation = useMutation({
    mutationFn: (data) => adminLevelApi.saveLevel(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-levels'] })
      queryClient.invalidateQueries({ queryKey: ['admin-points-stats'] })
      toast.success(res.message || '等级配置已保存')
      setLevelModal(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || t('messages.error')),
  })

  const deleteLevelMutation = useMutation({
    mutationFn: (id) => adminLevelApi.deleteLevel(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-levels'] })
      toast.success(res.message || '已删除')
    },
    onError: (err) => toast.error(err.response?.data?.message || t('messages.error')),
  })

  // ── 规则 mutation ──
  const ruleMutation = useMutation({
    mutationFn: (data) => adminLevelApi.saveRule(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-rules'] })
      toast.success(res.message || '积分规则已保存')
      setRuleModal(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || t('messages.error')),
  })

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => adminLevelApi.deleteRule(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-rules'] })
      toast.success(res.message || '已删除')
    },
    onError: (err) => toast.error(err.response?.data?.message || t('messages.error')),
  })

  const handleSort = (field) => {
    if (sortBy === field) {
      setOrder(o => o === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setOrder('desc')
    }
    setPage(1)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
  }

  const closeLogsModal = () => { setSelectedUser(null); setLogsPage(1) }
  const openAdjustModal = (user) => { setAdjustUser(user); setAdjustAmount(''); setAdjustReason('') }
  const closeAdjustModal = () => { setAdjustUser(null); setAdjustAmount(''); setAdjustReason('') }

  const sortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="opacity-30" />
    return <span className="text-primary-600 text-xs ml-0.5">{order === 'desc' ? '↓' : '↑'}</span>
  }

  // ── 统计卡片 ──
  const statCards = [
    { icon: Users,        label: t('admin.pointsTotalUsers') || '积分用户数', value: stats?.totalUsers,    color: 'bg-blue-400'   },
    { icon: Zap,          label: t('admin.pointsTotal') || '总积分',         value: stats?.totalPoints,   color: 'bg-amber-400'  },
    { icon: TrendingUp,   label: t('admin.pointsAverage') || '人均积分',     value: stats?.avgPoints,     color: 'bg-emerald-400'},
    { icon: Award,         label: t('admin.pointsTopUser') || '最高积分',     value: stats?.topUsers?.[0]?.total ?? '-', color: 'bg-purple-400'},
  ]

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold text-tx-heading mb-5">
        {t('admin.managePoints') || '积分与等级维护'}
      </h1>

      {/* ── Tab 导航 ── */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-surf-muted/80 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === key
                ? 'bg-surf-card text-tx-heading shadow-sm'
                : 'text-tx-muted hover:text-tx-body'
              }
            `}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ════════════ Tab 1: 积分管理 ════════════ */}
      {activeTab === 'stats' && (
        <>
          {/* ── 统计卡片 ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="card p-4 flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-xl ${card.color} bg-opacity-15 flex items-center justify-center`}>
                  <card.icon size={18} className={`${card.color.replace('bg-', 'text-').replace('400', '600')}`} />
                </div>
                <div>
                  <div className="text-xs text-tx-muted">{card.label}</div>
                  <div className="text-lg font-semibold text-tx-heading">
                    {statsLoading ? '-' : typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── 等级分布 ── */}
          {stats?.levelDist && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="card p-4 mb-6">
              <h3 className="text-sm font-medium text-tx-body mb-3">{t('admin.pointsLevelDist') || '等级分布'}</h3>
              <div className="flex flex-wrap gap-2">
                {stats.levelDist.map((d) => (
                  <div key={d.level} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surf-muted text-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${LEVEL_COLORS[d.level] || 'bg-gray-300'}`} />
                    <span className="text-tx-body font-medium">{d.title}</span>
                    <span className="text-tx-subtle">×{d.cnt}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── 搜索 + 表格 ── */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-app flex items-center gap-3 flex-wrap">
              <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-1 max-w-xs">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-subtle" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={t('admin.searchUser') || '搜索用户...'} className="input pl-9 text-sm" />
                </div>
                <button type="submit" className="btn btn-primary text-xs px-3 py-1.5">{t('common.search') || '搜索'}</button>
              </form>
            </div>

            {usersLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-app bg-surf-muted/50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted">{t('admin.tableUser')}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted cursor-pointer select-none" onClick={() => handleSort('total')}>
                        <span className="inline-flex items-center gap-1">{t('admin.pointsColumn') || '积分'} {sortIcon('total')}</span>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted cursor-pointer select-none" onClick={() => handleSort('level')}>
                        <span className="inline-flex items-center gap-1">{t('admin.pointsLevel') || '等级'} {sortIcon('level')}</span>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted hidden md:table-cell">{t('admin.tableRole')}</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-tx-muted">{t('admin.tableActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {userList?.data?.length > 0 ? userList.data.map((u, i) => (
                      <motion.tr key={u.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="hover:bg-surf-muted/50 cursor-pointer" onClick={() => setSelectedUser(u)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                              {u.username?.[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-tx-heading">{u.username}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-tx-body">{u.total?.toLocaleString() ?? 0}</td>
                        <td className="px-4 py-3"><LevelBadge level={u.level} title={u.title} size="sm" /></td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`badge text-xs ${u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-surf-muted text-tx-body'}`}>
                            {u.role === 'admin' ? t('admin.admin') : t('admin.user')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={(e) => { e.stopPropagation(); openAdjustModal(u) }}
                            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors" title={t('admin.pointsAdjust') || '调整积分'}>
                            <Plus size={15} />
                          </button>
                        </td>
                      </motion.tr>
                    )) : (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-tx-subtle text-sm">{t('common.noData') || '暂无数据'}</td></tr>
                    )}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-app flex items-center justify-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                      className="p-1.5 rounded-lg hover:bg-surf-muted disabled:opacity-30 transition-colors">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-tx-muted">{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                      className="p-1.5 rounded-lg hover:bg-surf-muted disabled:opacity-30 transition-colors">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ════════════ Tab 2: 等级配置 ════════════ */}
      {activeTab === 'levels' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-app flex items-center justify-between">
            <h3 className="text-sm font-medium text-tx-body">等级头衔 &amp; 阈值配置</h3>
            <button
              onClick={() => setLevelModal({ level: '', title: '', min_points: '' })}
              className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <Plus size={13} />新增等级
            </button>
          </div>

          {levelsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
            </div>
          ) : levels.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app bg-surf-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted">等级</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted">头衔</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted">最低积分</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted">预览</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-tx-muted">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {levels.map((lv) => (
                  <tr key={lv.id} className="hover:bg-surf-muted/50">
                    <td className="px-4 py-3 font-mono text-tx-muted">Lv.{lv.level}</td>
                    <td className="px-4 py-3 font-medium text-tx-heading">{lv.title}</td>
                    <td className="px-4 py-3 font-mono text-tx-body">{lv.min_points.toLocaleString()}</td>
                    <td className="px-4 py-3"><LevelBadge level={lv.level} title={lv.title} size="sm" /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setLevelModal({ ...lv })}
                          className="p-1.5 rounded-lg text-tx-subtle hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="编辑"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`确定要删除 Lv.${lv.level}「${lv.title}」吗？`)) {
                              deleteLevelMutation.mutate(lv.id)
                            }
                          }}
                          className="p-1.5 rounded-lg text-tx-subtle hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-tx-subtle text-sm">暂无等级配置</div>
          )}
        </div>
      )}

      {/* ════════════ Tab 3: 积分规则 ════════════ */}
      {activeTab === 'rules' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-app flex items-center justify-between">
            <h3 className="text-sm font-medium text-tx-body">积分获取规则配置</h3>
            <button
              onClick={() => setRuleModal({ action: '', points: '', description: '', enabled: true })}
              className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <Plus size={13} />新增规则
            </button>
          </div>

          {rulesLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
            </div>
          ) : rules.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app bg-surf-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted">动作标识</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted">描述</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted">分值</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted">状态</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-tx-muted">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rules.map((r) => (
                  <tr key={r.id} className={`hover:bg-surf-muted/50 ${!r.enabled ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-tx-muted">{r.action}</td>
                    <td className="px-4 py-3 text-tx-body">{r.description}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-medium ${r.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        +{r.points}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${r.enabled ? 'bg-green-50 text-green-700' : 'bg-surf-muted text-tx-muted'}`}>
                        {r.enabled ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setRuleModal({ ...r })}
                          className="p-1.5 rounded-lg text-tx-subtle hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="编辑"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`确定要删除规则「${r.action}」吗？`)) {
                              deleteRuleMutation.mutate(r.id)
                            }
                          }}
                          className="p-1.5 rounded-lg text-tx-subtle hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-tx-subtle text-sm">暂无积分规则</div>
          )}
        </div>
      )}

      {/* ── 积分流水弹窗 ── */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={closeLogsModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="card max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-app">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold flex items-center justify-center">
                    {selectedUser.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-tx-heading text-sm">{selectedUser.username}</div>
                    <div className="text-xs text-tx-muted">
                      {selectedUser.total?.toLocaleString() ?? 0} 积分 · <LevelBadge level={selectedUser.level} title={selectedUser.title} size="sm" />
                    </div>
                  </div>
                </div>
                <button onClick={closeLogsModal} className="p-1.5 rounded-lg hover:bg-surf-muted transition-colors">
                  <X size={16} className="text-tx-subtle" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-tx-subtle" /></div>
                ) : logList?.data?.length > 0 ? (
                  logList.data.map((log) => {
                    const a = ACTION_ICONS[log.action] || { icon: '📋', color: 'text-tx-muted', bg: 'bg-surf-muted' }
                    return (
                      <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surf-muted transition-colors">
                        <div className={`w-8 h-8 rounded-lg ${a.bg} flex items-center justify-center flex-shrink-0 text-sm`}>{a.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-tx-body">{log.description}</div>
                          <div className="text-xs text-tx-subtle">
                            {log.created_at ? format(new Date(log.created_at), 'yyyy/MM/dd HH:mm', { locale: dateLocale }) : ''}
                          </div>
                        </div>
                        <span className={`text-sm font-mono font-medium ${log.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {log.points >= 0 ? '+' : ''}{log.points}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-8 text-center text-tx-subtle text-sm">{t('common.noData') || '暂无积分流水'}</div>
                )}
              </div>
              {logTotalPages > 1 && (
                <div className="px-4 py-2 border-t border-app flex items-center justify-center gap-2">
                  <button onClick={() => setLogsPage(p => Math.max(1, p - 1))} disabled={logsPage <= 1}
                    className="p-1 rounded hover:bg-surf-muted disabled:opacity-30">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-tx-muted">{logsPage} / {logTotalPages}</span>
                  <button onClick={() => setLogsPage(p => Math.min(logTotalPages, p + 1))} disabled={logsPage >= logTotalPages}
                    className="p-1 rounded hover:bg-surf-muted disabled:opacity-30">
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 积分调整弹窗 ── */}
      <AnimatePresence>
        {adjustUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={closeAdjustModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="card max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-app">
                <h3 className="font-medium text-tx-heading">{t('admin.pointsAdjust') || '调整积分'}</h3>
                <button onClick={closeAdjustModal} className="p-1.5 rounded-lg hover:bg-surf-muted transition-colors">
                  <X size={16} className="text-tx-subtle" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surf-muted">
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold flex items-center justify-center">
                    {adjustUser.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-tx-heading">{adjustUser.username}</div>
                    <div className="text-xs text-tx-muted">
                      当前积分: <span className="font-mono font-medium text-tx-body">{adjustUser.total?.toLocaleString() ?? 0}</span>
                      {' '}· {adjustUser.title}
                    </div>
                  </div>
                </div>
                <div><label className="block text-xs text-tx-muted mb-1.5">{t('admin.pointsAdjustAmount') || '调整数值（正数增加，负数扣除）'}</label>
                  <div className="flex gap-2">
                    <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                      placeholder="如 +50 或 -20" className="input flex-1 text-sm" />
                    <button type="button" onClick={() => setAdjustAmount(prev => String(Number(prev || 0) + 10))}
                      className="px-2 py-1 rounded-lg bg-green-50 text-green-600 text-xs hover:bg-green-100 transition-colors" title="+10">
                      <Plus size={14} />10</button>
                    <button type="button" onClick={() => setAdjustAmount(prev => String(Number(prev || 0) - 10))}
                      className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs hover:bg-red-100 transition-colors" title="-10">
                      <Minus size={14} />10</button>
                  </div>
                </div>
                <div><label className="block text-xs text-tx-muted mb-1.5">{t('admin.pointsAdjustReason') || '调整原因'}</label>
                  <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                    placeholder={t('admin.pointsAdjustReasonPlaceholder') || '请输入调整原因...'} className="input w-full text-sm" />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={closeAdjustModal} className="btn btn-ghost text-sm">{t('common.cancel') || '取消'}</button>
                  <button onClick={() => {
                    if (!adjustAmount || Number(adjustAmount) === 0) {
                      toast.error(t('admin.pointsAdjustInvalid') || '请输入有效的调整数值'); return
                    }
                    if (!adjustReason.trim()) {
                      toast.error(t('admin.pointsAdjustReasonRequired') || '请填写调整原因'); return
                    }
                    adjustMutation.mutate({ userId: adjustUser.user_id, amount: Number(adjustAmount), reason: adjustReason.trim() })
                  }} disabled={adjustMutation.isPending}
                    className="btn btn-primary text-sm flex items-center gap-1.5">
                    {adjustMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    {t('common.confirm') || '确认'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 等级编辑弹窗 ── */}
      <AnimatePresence>
        {levelModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setLevelModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-app">
                <h3 className="font-medium text-tx-heading">{levelModal.id ? '编辑等级' : '新增等级'}</h3>
                <button onClick={() => setLevelModal(null)} className="p-1.5 rounded-lg hover:bg-surf-muted transition-colors">
                  <X size={16} className="text-tx-subtle" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs text-tx-muted mb-1.5">等级编号 (Lv)</label>
                  <input type="number" value={levelModal.level} onChange={e => setLevelModal({ ...levelModal, level: e.target.value })}
                    placeholder="如 1" className="input w-full text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-tx-muted mb-1.5">头衔名称</label>
                  <input type="text" value={levelModal.title} onChange={e => setLevelModal({ ...levelModal, title: e.target.value })}
                    placeholder="如 新手" className="input w-full text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-tx-muted mb-1.5">最低积分阈值</label>
                  <input type="number" value={levelModal.min_points} onChange={e => setLevelModal({ ...levelModal, min_points: e.target.value })}
                    placeholder="如 0" className="input w-full text-sm" />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setLevelModal(null)} className="btn btn-ghost text-sm">取消</button>
                  <button onClick={() => {
                    if (!levelModal.level || !levelModal.title || levelModal.min_points === '') {
                      toast.error('请填写完整信息'); return
                    }
                    levelMutation.mutate({
                      id: levelModal.id,
                      level: Number(levelModal.level),
                      title: levelModal.title,
                      min_points: Number(levelModal.min_points),
                    })
                  }} disabled={levelMutation.isPending}
                    className="btn btn-primary text-sm flex items-center gap-1.5">
                    {levelMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    保存
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 积分规则编辑弹窗 ── */}
      <AnimatePresence>
        {ruleModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setRuleModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-app">
                <h3 className="font-medium text-tx-heading">{ruleModal.id ? '编辑规则' : '新增规则'}</h3>
                <button onClick={() => setRuleModal(null)} className="p-1.5 rounded-lg hover:bg-surf-muted transition-colors">
                  <X size={16} className="text-tx-subtle" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs text-tx-muted mb-1.5">动作标识 (action key)</label>
                  <input type="text" value={ruleModal.action} onChange={e => setRuleModal({ ...ruleModal, action: e.target.value })}
                    placeholder="如 publish_post" className="input w-full text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-tx-muted mb-1.5">描述</label>
                  <input type="text" value={ruleModal.description} onChange={e => setRuleModal({ ...ruleModal, description: e.target.value })}
                    placeholder="如 发布文章" className="input w-full text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-tx-muted mb-1.5">积分数值</label>
                  <input type="number" value={ruleModal.points} onChange={e => setRuleModal({ ...ruleModal, points: e.target.value })}
                    placeholder="如 5" className="input w-full text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="rule-enabled" checked={ruleModal.enabled !== false}
                    onChange={e => setRuleModal({ ...ruleModal, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-app text-primary-600" />
                  <label htmlFor="rule-enabled" className="text-sm text-tx-body">启用此规则</label>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setRuleModal(null)} className="btn btn-ghost text-sm">取消</button>
                  <button onClick={() => {
                    if (!ruleModal.action || !ruleModal.description || ruleModal.points === '') {
                      toast.error('请填写完整信息'); return
                    }
                    ruleMutation.mutate({
                      id: ruleModal.id,
                      action: ruleModal.action,
                      points: Number(ruleModal.points),
                      description: ruleModal.description,
                      enabled: ruleModal.enabled !== false,
                    })
                  }} disabled={ruleMutation.isPending}
                    className="btn btn-primary text-sm flex items-center gap-1.5">
                    {ruleMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    保存
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * @file src/pages/admin/AdminPostsPage.jsx
 * @description 文章管理页面（Admin 专用）
 * 功能：查看所有文章（含草稿）、发布、删除
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Pencil, Trash2, CheckCircle, Eye, ArrowUpDown } from 'lucide-react'
import { adminApi, postsApi } from '@/api/index'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useTranslation } from '@/contexts/LanguageContext'

export default function AdminPostsPage() {
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const queryClient = useQueryClient()
  const { t, lang } = useTranslation()
  const dateLocale = lang === 'zh' ? zhCN : lang === 'en' ? enUS : ja

  const { data, isLoading } = useQuery({
    queryKey: ['admin-posts', page, sortBy, order],
    queryFn: () => adminApi.getPosts({ page, limit: 15, sortBy, order }),
  })

  const posts = data?.data?.data || []
  const total = data?.data?.total || 0
  const totalPages = Math.ceil(total / 15) || 1

  const SORT_OPTIONS = [
    { label: t('common.sortLatest'),       sortBy: 'created_at',    order: 'desc' },
    { label: t('common.sortOldest'),       sortBy: 'created_at',    order: 'asc'  },
    { label: t('common.sortMostViews'),    sortBy: 'views',         order: 'desc' },
    { label: t('common.sortMostComments'), sortBy: 'comment_count', order: 'desc' },
    { label: t('common.sortTitleAZ'),      sortBy: 'title',         order: 'asc'  },
    { label: t('common.sortTitleZA'),      sortBy: 'title',         order: 'desc' },
  ]

  // 发布文章
  const publishMutation = useMutation({
    mutationFn: (id) => postsApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] })
      toast.success(t('messages.publishSuccess') || '文章已发布')
    },
  })

  // 删除文章
  const deleteMutation = useMutation({
    mutationFn: (id) => postsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] })
      toast.success(t('messages.deleteSuccess'))
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-serif font-semibold text-tx-heading">
          {t('admin.managePosts')} <span className="text-sm font-sans text-tx-muted ml-1">{t('admin.totalPostsCount', { count: total })}</span>
        </h1>
        <div className="flex items-center gap-3">
          {/* 排序下拉 */}
          <div className="relative">
            <select
              value={`${sortBy}:${order}`}
              onChange={(e) => {
                const [sb, od] = e.target.value.split(':')
                setSortBy(sb); setOrder(od); setPage(1)
              }}
              className="appearance-none pl-8 pr-8 py-2 text-sm rounded-xl border
                         bg-surf-card text-tx-body border-app cursor-pointer
                         hover:border-primary-300 focus:outline-none focus:ring-2
                         focus:ring-primary-200 transition-colors"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={`${opt.sortBy}:${opt.order}`} value={`${opt.sortBy}:${opt.order}`}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2
                                               pointer-events-none text-tx-subtle" />
          </div>
          <Link to="/write" className="btn-primary py-2">{t('admin.writeNew')}</Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app bg-surf-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted">{t('admin.tableTitle')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted hidden md:table-cell">{t('admin.tableAuthor')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted hidden sm:table-cell">{t('admin.tableStatus')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted hidden lg:table-cell">{t('admin.tableTime')}</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-tx-muted">{t('admin.tableActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {posts.map((post, i) => (
                <motion.tr
                  key={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-surf-muted/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="max-w-[200px]">
                      <p className="font-medium text-tx-heading truncate">{post.title}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-tx-muted hidden md:table-cell">
                    {post.author_name}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`badge ${
                      post.status === 'published'
                        ? 'bg-primary-50 text-primary-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {post.status === 'published' ? t('post.published') : t('post.draft')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-tx-subtle text-xs hidden lg:table-cell">
                    {post.created_at ? format(new Date(post.created_at), 'MM/dd HH:mm', { locale: dateLocale }) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {post.status === 'draft' && (
                        <button
                          onClick={() => publishMutation.mutate(post.id)}
                          title={t('admin.publishAction')}
                          className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors">
                          <CheckCircle size={15} />
                        </button>
                      )}
                      {post.status === 'published' && (
                        <a href={`/post/${post.url_token}`} target="_blank" rel="noreferrer"
                          title={t('admin.view')}
                          className="p-1.5 rounded-lg text-tx-muted hover:bg-surf-muted transition-colors">
                          <Eye size={15} />
                        </a>
                      )}
                      <Link to={`/edit/${post.url_token}`} title={t('common.edit')}
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors">
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => {
                          if (window.confirm(t('admin.deletePostConfirm', { title: post.title }))) {
                            deleteMutation.mutate(post.id)
                          }
                        }}
                        title={t('common.delete')}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
          >{t('common.prevPage')}</button>
          <span className="text-sm text-tx-muted">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
          >{t('common.nextPage')}</button>
        </div>
      )}
    </div>
  )
}

/**
 * @file src/pages/admin/AdminUsersPage.jsx
 * @description 用户管理页面（Admin 专用）
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trash2, Shield, User } from 'lucide-react'
import { adminApi } from '@/api/index'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'
import { useTranslation } from '@/contexts/LanguageContext'

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const { t, lang } = useTranslation()
  const dateLocale = lang === 'zh' ? zhCN : lang === 'en' ? enUS : ja

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.getUsers,
  })

  const users = data?.data || []

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(t('messages.deleteSuccess'))
    },
    onError: (err) => toast.error(err.response?.data?.message || t('messages.error')),
  })

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold text-tx-heading mb-6">
        {t('admin.manageUsers')} <span className="text-sm font-sans text-tx-muted ml-1">{t('admin.totalUsersCount', { count: users.length })}</span>
      </h1>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app bg-surf-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted">{t('admin.tableUser')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted hidden md:table-cell">{t('admin.tableEmail')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted">{t('admin.tableRole')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-tx-muted hidden lg:table-cell">{t('admin.tableRegisterTime')}</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-tx-muted">{t('admin.tableActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-surf-muted/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs
                                      font-semibold flex items-center justify-center flex-shrink-0">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-tx-heading">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-tx-muted hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      u.role === 'admin'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-surf-muted text-tx-body'
                    }`}>
                      {u.role === 'admin' ? (
                        <span className="flex items-center gap-1"><Shield size={10} />{t('admin.admin')}</span>
                      ) : (
                        <span className="flex items-center gap-1"><User size={10} />{t('admin.user')}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-tx-subtle text-xs hidden lg:table-cell">
                    {u.created_at ? format(new Date(u.created_at), 'yyyy/MM/dd', { locale: dateLocale }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => {
                          if (window.confirm(t('admin.deleteUserConfirm', { username: u.username }))) {
                            deleteMutation.mutate(u.id)
                          }
                        }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

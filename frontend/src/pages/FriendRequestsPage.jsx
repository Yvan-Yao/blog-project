/**
 * @file src/pages/FriendRequestsPage.jsx
 * @description 好友请求管理页面（支持中英文）
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Inbox, Send, Check, X, Loader2, MapPin, Briefcase, Globe, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { friendsApi } from '@/api/index'
import { useTranslation } from '@/contexts/LanguageContext'
import toast from 'react-hot-toast'

export default function FriendRequestsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('received')
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: friendsApi.getRequests,
    refetchInterval: 30000,
  })

  const acceptMutation = useMutation({
    mutationFn: friendsApi.accept,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      toast.success(t('messages.friendAdded'))
    },
    onError: (err) => toast.error(err.response?.data?.message || t('messages.error')),
  })

  const rejectMutation = useMutation({
    mutationFn: friendsApi.reject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
      toast.success(t('messages.deleteSuccess'))
    },
    onError: (err) => toast.error(err.response?.data?.message || t('messages.error')),
  })

  const cancelMutation = useMutation({
    mutationFn: friendsApi.unfriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
      toast.success(t('messages.deleteSuccess'))
    },
    onError: (err) => toast.error(err.response?.data?.message || t('messages.error')),
  })

  const received = data?.data?.received || []
  const sent = data?.data?.sent || []
  const current = tab === 'received' ? received : sent

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto px-4 sm:px-6 py-8"
    >
      <h1 className="text-2xl font-serif font-semibold text-tx-heading mb-6">
        {t('nav.friendRequests')}
      </h1>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-surf-muted rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab('received')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium
                      rounded-lg transition-colors ${
                        tab === 'received'
                          ? 'bg-surf-card text-primary-700 shadow-sm'
                          : 'text-tx-muted hover:text-tx-body'
                      }`}
        >
          <Inbox size={14} />
          {t('friend.receivedRequests')}
          {received.length > 0 && (
            <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full
                               flex items-center justify-center">
              {received.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium
                      rounded-lg transition-colors ${
                        tab === 'sent'
                          ? 'bg-surf-card text-primary-700 shadow-sm'
                          : 'text-tx-muted hover:text-tx-body'
                      }`}
        >
          <Send size={14} />
          {t('friend.sentRequests')}
          {sent.length > 0 && (
            <span className="bg-gray-400 text-white text-xs w-5 h-5 rounded-full
                               flex items-center justify-center">
              {sent.length}
            </span>
          )}
        </button>
      </div>

      {/* 列表 */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : current.length === 0 ? (
        <div className="text-center py-16 text-tx-subtle">
          {tab === 'received' ? (
            <>
              <Inbox size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t('friend.noReceivedRequests')}</p>
            </>
          ) : (
            <>
              <Send size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t('friend.noSentRequests')}</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {current.map((u) => (
            <div key={u.id}
              className="flex items-start gap-3 bg-surf-card rounded-xl border
                         border-app p-4 shadow-soft"
            >
              {/* 头像 */}
              {u.avatar ? (
                <img src={u.avatar} alt={u.username}
                  className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-gray-100" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700
                                text-sm font-semibold flex items-center justify-center shrink-0">
                  {u.username?.[0]?.toUpperCase()}
                </div>
              )}

              {/* 公开资料 */}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/profile/${u.url_token}`}
                  className="text-sm font-semibold text-tx-heading hover:text-primary-600
                             inline-flex items-center gap-1 transition-colors"
                >
                  {u.username}
                  <ExternalLink size={11} className="opacity-40" />
                </Link>

                {u.bio && (
                  <p className="text-xs text-tx-muted mt-0.5 line-clamp-1">{u.bio}</p>
                )}

                {(u.location || u.occupation) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                    {u.location && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-tx-subtle">
                        <MapPin size={10} />
                        {u.location}
                      </span>
                    )}
                    {u.occupation && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-tx-subtle">
                        <Briefcase size={10} />
                        {u.occupation}
                      </span>
                    )}
                  </div>
                )}

                {u.website && (
                  <div className="mt-0.5">
                    <a
                      href={u.website.startsWith('http') ? u.website : `https://${u.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary-500
                                 hover:underline transition-colors"
                    >
                      <Globe size={10} />
                      {u.website.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 30)}
                      {u.website.replace(/^https?:\/\//, '').length > 30 ? '…' : ''}
                    </a>
                  </div>
                )}
              </div>

              {tab === 'received' ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => acceptMutation.mutate(u.id)}
                    disabled={acceptMutation.isPending}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    {acceptMutation.isPending
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Check size={12} />}
                    {t('friend.accept')}
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(u.id)}
                    disabled={rejectMutation.isPending}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1
                               !text-red-500 !border-red-200 hover:!bg-red-50"
                  >
                    {rejectMutation.isPending
                      ? <Loader2 size={12} className="animate-spin" />
                      : <X size={12} />}
                    {t('friend.reject')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => cancelMutation.mutate(u.id)}
                  disabled={cancelMutation.isPending}
                  className="btn-ghost text-tx-subtle hover:text-red-500 text-xs
                             py-1.5 px-3 flex items-center gap-1 shrink-0"
                >
                  {cancelMutation.isPending
                    ? <Loader2 size={12} className="animate-spin" />
                    : <X size={12} />}
                  {t('friend.cancelRequest')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

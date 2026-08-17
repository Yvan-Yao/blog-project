/**
 * @file src/pages/FriendsPage.jsx
 * @description 好友管理页面（支持中英文）
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, UserPlus, Search, UserX, Inbox, X, Loader2, MapPin, Briefcase, Globe, ExternalLink, Heart } from 'lucide-react'
import { friendsApi } from '@/api/index'
import { useTranslation } from '@/contexts/LanguageContext'
import toast from 'react-hot-toast'

export default function FriendsPage() {
  const queryClient = useQueryClient()
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const { t } = useTranslation()

  const { data: friendsData, isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: friendsApi.list,
  })

  const { data: requestsData } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: friendsApi.getRequests,
  })

  const sendMutation = useMutation({
    mutationFn: friendsApi.sendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
      toast.success(t('messages.requestSent'))
      setSearchText('')
      setSearchResults(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || t('messages.error')),
  })

  const unfriendMutation = useMutation({
    mutationFn: friendsApi.unfriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      toast.success(t('messages.deleteSuccess'))
    },
    onError: () => toast.error(t('messages.error')),
  })

  function handleSearch() {
    const q = searchText.trim()
    if (!q) { setSearchResults(null); return }
    // 注意: axios 响应拦截器已提取 response.data，所以 res 即为 { success, data }
    friendsApi.search(q).then((res) => setSearchResults(res))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSearch()
  }

  const friends = friendsData?.data || []
  const pendingCount = requestsData?.data?.received?.length || 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto px-4 sm:px-6 py-8"
    >
      {/* 页头 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-primary-600" />
          <h1 className="text-2xl font-serif font-semibold text-tx-heading">{t('nav.friends')}</h1>
        </div>
        <Link
          to="/friend-requests"
          className="relative btn-secondary py-2 px-4 text-sm flex items-center gap-2"
        >
          <Inbox size={15} />
          {t('friend.friendRequests')}
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500
                             text-white text-xs flex items-center justify-center font-medium">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      {/* 搜索添加好友 */}
      <div className="bg-surf-card rounded-2xl border border-app p-4 mb-6 shadow-soft">
        <p className="text-sm text-tx-muted mb-3 flex items-center gap-1.5">
          <UserPlus size={13} /> {t('friend.searchUser')}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setSearchResults(null) }}
            onKeyDown={handleKeyDown}
            placeholder={t('friend.searchPlaceholder')}
            className="flex-1 input text-sm"
          />
          <button onClick={handleSearch} className="btn-primary py-2 px-4 text-sm">
            <Search size={14} />
          </button>
          {searchResults && (
            <button
              onClick={() => { setSearchText(''); setSearchResults(null) }}
              className="btn-ghost p-2"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 搜索结果 — 展示公开资料 */}
        {searchResults?.data && (
          <div className="mt-3 space-y-2">
            {searchResults.data.length === 0 && (
              <p className="text-sm text-tx-subtle py-2">{t('common.noData')}</p>
            )}
            {searchResults.data.map((u) => (
              <div key={u.id}
                className="flex items-start gap-3 py-3 px-3 rounded-xl
                           hover:bg-surf-muted/80 transition-colors border border-transparent hover:border-app"
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

                  {/* 所在地 · 职业 */}
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

                  {/* 网站链接 */}
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

                  {/* 兴趣爱好标签 */}
                  {u.interests && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {u.interests.split(',').filter(Boolean).slice(0, 5).map((tag, i) => (
                        <span key={i}
                          className="text-[10px] bg-surf-muted text-tx-muted px-1.5 py-0.5 rounded-full">
                          {tag.trim()}
                        </span>
                      ))}
                      {u.interests.split(',').filter(Boolean).length > 5 && (
                        <span className="text-[10px] text-tx-subtle">
                          +{u.interests.split(',').filter(Boolean).length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="shrink-0 flex items-center pt-0.5">
                  {u.friendship_status === 'accepted' ? (
                    <span className="text-xs text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                      {t('friend.alreadyFriend')}
                    </span>
                  ) : u.friendship_status === 'pending' ? (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                      {t('friend.requestSent')}
                    </span>
                  ) : (
                    <button
                      onClick={() => sendMutation.mutate(u.id)}
                      disabled={sendMutation.isPending}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 whitespace-nowrap"
                    >
                      {sendMutation.isPending
                        ? <Loader2 size={12} className="animate-spin" />
                        : <UserPlus size={12} />}
                      {t('friend.addFriend')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 好友列表 */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : friends.length === 0 ? (
        <div className="text-center py-16 text-tx-subtle">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('friend.noFriends')}</p>
          <p className="text-xs mt-1">{t('friend.searchPlaceholder')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {friends.map((f) => (
            <div key={f.id}
              className="flex items-start gap-3 bg-surf-card rounded-xl border
                         border-app p-4 shadow-soft hover:shadow-hover transition-shadow"
            >
              {/* 头像 */}
              {f.avatar ? (
                <img src={f.avatar} alt={f.username}
                  className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-gray-100" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700
                                text-sm font-semibold flex items-center justify-center shrink-0">
                  {f.username?.[0]?.toUpperCase()}
                </div>
              )}

              {/* 公开资料 */}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/profile/${f.url_token}`}
                  className="text-sm font-semibold text-tx-heading hover:text-primary-600
                             inline-flex items-center gap-1 transition-colors"
                >
                  {f.username}
                  <ExternalLink size={11} className="opacity-40" />
                </Link>

                {f.bio && (
                  <p className="text-xs text-tx-muted mt-0.5 line-clamp-1">{f.bio}</p>
                )}

                {(f.location || f.occupation) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                    {f.location && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-tx-subtle">
                        <MapPin size={10} />
                        {f.location}
                      </span>
                    )}
                    {f.occupation && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-tx-subtle">
                        <Briefcase size={10} />
                        {f.occupation}
                      </span>
                    )}
                  </div>
                )}

                {f.website && (
                  <div className="mt-0.5">
                    <a
                      href={f.website.startsWith('http') ? f.website : `https://${f.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary-500
                                 hover:underline transition-colors"
                    >
                      <Globe size={10} />
                      {f.website.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 30)}
                      {f.website.replace(/^https?:\/\//, '').length > 30 ? '…' : ''}
                    </a>
                  </div>
                )}

                {f.interests && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {f.interests.split(',').filter(Boolean).slice(0, 5).map((tag, i) => (
                      <span key={i}
                        className="text-[10px] bg-surf-muted text-tx-muted px-1.5 py-0.5 rounded-full">
                        {tag.trim()}
                      </span>
                    ))}
                    {f.interests.split(',').filter(Boolean).length > 5 && (
                      <span className="text-[10px] text-tx-subtle">
                        +{f.interests.split(',').filter(Boolean).length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <button
                onClick={() => {
                  if (window.confirm(t('friend.deleteFriendConfirm', { username: f.username }))) {
                    unfriendMutation.mutate(f.id)
                  }
                }}
                className="btn-ghost text-red-400 hover:text-red-600 hover:bg-red-50
                           py-1.5 px-3 text-xs flex items-center gap-1 rounded-lg transition-colors shrink-0"
              >
                <UserX size={13} />
                {t('friend.deleteFriend')}
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

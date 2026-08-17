/**
 * @file src/pages/PublicProfilePage.jsx
 * @description 用户公开资料页面 — 查看其他用户的个人信息
 *
 * 路由：/profile/:token（加密链接）
 * 展示用户的头像、简介、网站、所在地、注册时间、文章数量
 */

import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { authApi, pointsApi } from '@/api/index'
import { useTranslation } from '@/contexts/LanguageContext'
import { MapPin, Globe, Calendar, FileText, ArrowLeft, Cake, Github, Twitter, Briefcase, Heart, Phone, Users } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'
import LevelBadge from '@/components/ui/LevelBadge'

const dateLocales = { zh: zhCN, en: enUS, ja }

export default function PublicProfilePage() {
  const { token } = useParams()
  const { t, lang } = useTranslation()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['publicProfile', token],
    queryFn: () => authApi.getPublicProfile(token),
    enabled: !!token,
  })

  const profile = data?.data

  const { data: ptsData } = useQuery({
    queryKey: ['publicPoints', profile?.id],
    queryFn: () => pointsApi.getUser(profile.id),
    enabled: !!profile?.id,
  })
  const pts = ptsData?.data
  const dateLocale = dateLocales[lang] || zhCN
  const avatarUrl = profile?.avatar
  const showAvatar = avatarUrl && !avatarUrl.startsWith('data:') ? avatarUrl : null

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="skeleton w-24 h-24 rounded-full" />
          <div className="skeleton w-40 h-6 rounded" />
          <div className="skeleton w-64 h-4 rounded" />
        </div>
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <p className="text-tx-subtle text-lg">{t('common.notFound')}</p>
        <Link to="/" className="btn-primary mt-4 inline-flex items-center gap-2">
          <ArrowLeft size={14} />
          {t('common.back')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* 返回按钮 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-tx-subtle hover:text-primary-600 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        {t('common.back')}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        {/* 头像 */}
        <div
          className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-white shadow-soft
                     flex items-center justify-center text-3xl font-bold"
          style={{ backgroundColor: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary-700))' }}
        >
          {showAvatar ? (
            <img src={showAvatar} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            <span>{profile.username?.[0]?.toUpperCase() || 'U'}</span>
          )}
        </div>

        {/* 用户名 + 角色标签 + 等级 */}
        <h1 className="mt-4 text-2xl font-serif font-semibold text-tx-heading">
          {profile.username}
          {profile.role === 'admin' && (
            <span className="ml-2 inline-block px-2 py-0.5 text-xs font-sans rounded-full
                             bg-purple-50 text-purple-600 align-middle">
              Admin
            </span>
          )}
        </h1>

        {/* 等级徽章 */}
        {pts && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <LevelBadge level={pts.level} title={pts.title} total={pts.total} size="md" />
            <span className="text-xs" style={{ color: 'hsl(var(--muted-fg))' }}>
              {pts.total} 积分
            </span>
          </div>
        )}

        {/* 简介 */}
        {profile.bio && (
          <p className="mt-3 text-tx-muted text-sm max-w-md mx-auto leading-relaxed">
            {profile.bio}
          </p>
        )}
      </motion.div>

      {/* 信息卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 注册时间 */}
          <div className="flex items-center gap-2.5 text-sm text-tx-body">
            <Calendar size={16} className="text-tx-subtle shrink-0" />
            <span>
              {t('user.memberSince')}: {profile.created_at
                ? format(new Date(profile.created_at), 'yyyy/MM/dd', { locale: dateLocale })
                : '-'}
            </span>
          </div>

          {/* 文章数量 */}
          <div className="flex items-center gap-2.5 text-sm text-tx-body">
            <FileText size={16} className="text-tx-subtle shrink-0" />
            <span>
              {t('user.posts')}: {profile.postCount ?? 0}
            </span>
          </div>

          {/* 生日 */}
          {profile.birthday && (
            <div className="flex items-center gap-2.5 text-sm text-tx-body">
              <Cake size={16} className="text-tx-subtle shrink-0" />
              <span>{profile.birthday}</span>
            </div>
          )}

          {/* 性别 */}
          {profile.gender && (
            <div className="flex items-center gap-2.5 text-sm text-tx-body">
              <Users size={16} className="text-tx-subtle shrink-0" />
              <span>{profile.gender === 'male' ? t('user.genderMale') : profile.gender === 'female' ? t('user.genderFemale') : t('user.genderOther')}</span>
            </div>
          )}

          {/* 职业 */}
          {profile.occupation && (
            <div className="flex items-center gap-2.5 text-sm text-tx-body">
              <Briefcase size={16} className="text-tx-subtle shrink-0" />
              <span>{profile.occupation}</span>
            </div>
          )}

          {/* 网站 */}
          {profile.website && (
            <div className="flex items-center gap-2.5 text-sm text-tx-body">
              <Globe size={16} className="text-tx-subtle shrink-0" />
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline truncate"
              >
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}

          {/* 所在地 */}
          {profile.location && (
            <div className="flex items-center gap-2.5 text-sm text-tx-body">
              <MapPin size={16} className="text-tx-subtle shrink-0" />
              <span>{profile.location}</span>
            </div>
          )}

          {/* GitHub */}
          {profile.github && (
            <div className="flex items-center gap-2.5 text-sm text-tx-body">
              <Github size={16} className="text-tx-subtle shrink-0" />
              <a
                href={`https://github.com/${profile.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline truncate"
              >
                @{profile.github}
              </a>
            </div>
          )}

          {/* Twitter */}
          {profile.twitter && (
            <div className="flex items-center gap-2.5 text-sm text-tx-body">
              <Twitter size={16} className="text-tx-subtle shrink-0" />
              <a
                href={`https://x.com/${profile.twitter.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline truncate"
              >
                @{profile.twitter.replace(/^@/, '')}
              </a>
            </div>
          )}
        </div>

        {/* 兴趣爱好 */}
        {profile.interests && (
          <div className="pt-3 border-t border-app mt-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-tx-subtle mb-2">
              <Heart size={14} />
              {t('user.interests')}
            </span>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {profile.interests.split(',').map((tag, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary-700))' }}
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

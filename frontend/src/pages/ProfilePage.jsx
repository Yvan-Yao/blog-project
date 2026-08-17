/**
 * @file src/pages/ProfilePage.jsx
 * @description 个人资料页面 — 查看 / 编辑个人信息
 *
 * 功能：
 * - 查看个人资料（默认模式）
 * - 编辑个人资料（点击编辑按钮进入编辑模式）
 * - 上传头像
 * - 修改用户名、个人简介、网站、所在地
 */

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/index'
import useAuthStore from '@/store/authStore'
import { useTranslation } from '@/contexts/LanguageContext'
import { Camera, MapPin, Globe, Calendar, FileText, Edit3, Save, X, User as UserIcon,
  Cake, Github, Twitter, Briefcase, Heart, Phone, Users } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'
import toast from 'react-hot-toast'

const dateLocales = { zh: zhCN, en: enUS, ja }

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const { t, lang } = useTranslation()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    username: '',
    bio: '',
    website: '',
    location: '',
    birthday: '',
    gender: '',
    phone: '',
    github: '',
    twitter: '',
    occupation: '',
    interests: '',
  })
  const [saving, setSaving] = useState(false)

  // 进入编辑模式时初始化表单
  function startEditing() {
    setForm({
      username: user?.username || '',
      bio: user?.bio || '',
      website: user?.website || '',
      location: user?.location || '',
      birthday: user?.birthday || '',
      gender: user?.gender || '',
      phone: user?.phone || '',
      github: user?.github || '',
      twitter: user?.twitter || '',
      occupation: user?.occupation || '',
      interests: user?.interests || '',
    })
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // 保存资料
  async function handleSave() {
    if (!form.username.trim()) {
      toast.error(t('validation.required'))
      return
    }
    setSaving(true)
    try {
      const res = await authApi.updateProfile({
        username: form.username.trim() || undefined,
        bio: form.bio.trim() || undefined,
        website: form.website.trim() || undefined,
        location: form.location.trim() || undefined,
        birthday: form.birthday || undefined,
        gender: form.gender || undefined,
        phone: form.phone.trim() || undefined,
        github: form.github.trim() || undefined,
        twitter: form.twitter.trim() || undefined,
        occupation: form.occupation.trim() || undefined,
        interests: form.interests.trim() || undefined,
      })
      setUser(res.data)
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      toast.success(t('user.profileUpdated'))
      setEditing(false)
    } catch (err) {
      toast.error(err.response?.data?.message || t('validation.unknown'))
    } finally {
      setSaving(false)
    }
  }

  // 上传头像
  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // 校验文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('user.avatarHint'))
      return
    }

    // 校验文件大小
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('user.avatarHint'))
      return
    }

    const formData = new FormData()
    formData.append('avatar', file)

    try {
      const res = await authApi.uploadAvatar(formData)
      setUser(res.data)
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      toast.success(t('user.profileUpdated'))
    } catch (err) {
      toast.error(err.response?.data?.message || t('validation.unknown'))
    }
  }

  const dateLocale = dateLocales[lang] || zhCN
  const avatarUrl = user?.avatar
  const showAvatar = avatarUrl && !avatarUrl.startsWith('data:') ? avatarUrl : null

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center text-tx-subtle">
        {t('nav.login')}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* 头像区 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="relative group">
          {/* 头像 */}
          <div
            className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-soft
                       flex items-center justify-center text-3xl font-bold"
            style={{ backgroundColor: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary-700))' }}
          >
            {showAvatar ? (
              <img
                src={showAvatar}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{user.username?.[0]?.toUpperCase() || 'U'}</span>
            )}
          </div>

          {/* 上传按钮（悬浮） */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center
                       shadow-md transition-transform hover:scale-110"
            style={{ backgroundColor: 'hsl(var(--primary))', color: '#fff' }}
            title={t('user.changeAvatar')}
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>

        {/* 用户名 */}
        {!editing ? (
          <>
            <h1 className="mt-4 text-2xl font-serif font-semibold text-tx-heading">{user.username}</h1>
            {user.bio && (
              <p className="mt-2 text-tx-muted text-sm text-center max-w-md">{user.bio}</p>
            )}
          </>
        ) : null}
      </motion.div>

      {/* 编辑模式 — 表单 */}
      {editing ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 space-y-5"
        >
          {/* 用户名 */}
          <div>
            <label className="block text-sm font-medium text-tx-body mb-1.5">
              {t('auth.username') || 'Username'}
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => handleChange('username', e.target.value)}
              maxLength={20}
              className="input"
              placeholder={user.username}
            />
          </div>

          {/* 个人简介 */}
          <div>
            <label className="block text-sm font-medium text-tx-body mb-1.5">
              {t('user.bio')}
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              rows={3}
              maxLength={200}
              className="input resize-none"
              placeholder={t('user.bioPlaceholder')}
            />
          </div>

          {/* 网站 */}
          <div>
            <label className="block text-sm font-medium text-tx-body mb-1.5">
              <span className="inline-flex items-center gap-1">
                <Globe size={13} />
                {t('user.website')}
              </span>
            </label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => handleChange('website', e.target.value)}
              className="input"
              placeholder={t('user.websitePlaceholder')}
            />
          </div>

          {/* 所在地 */}
          <div>
            <label className="block text-sm font-medium text-tx-body mb-1.5">
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} />
                {t('user.location')}
              </span>
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => handleChange('location', e.target.value)}
              maxLength={100}
              className="input"
              placeholder={t('user.locationPlaceholder')}
            />
          </div>

          {/* 生日 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Cake size={13} />
                  {t('user.birthday')}
                </span>
              </label>
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => handleChange('birthday', e.target.value)}
                className="input"
              />
            </div>
            {/* 性别 */}
            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Users size={13} />
                  {t('user.gender')}
                </span>
              </label>
              <select
                value={form.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="input"
              >
                <option value="">{t('user.genderPreferNot')}</option>
                <option value="male">{t('user.genderMale')}</option>
                <option value="female">{t('user.genderFemale')}</option>
                <option value="other">{t('user.genderOther')}</option>
              </select>
            </div>
          </div>

          {/* 手机 — 职业 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Phone size={13} />
                  {t('user.phone')}
                </span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                maxLength={30}
                className="input"
                placeholder={t('user.phonePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Briefcase size={13} />
                  {t('user.occupation')}
                </span>
              </label>
              <input
                type="text"
                value={form.occupation}
                onChange={(e) => handleChange('occupation', e.target.value)}
                maxLength={100}
                className="input"
                placeholder={t('user.occupationPlaceholder')}
              />
            </div>
          </div>

          {/* GitHub — Twitter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Github size={13} />
                  {t('user.github')}
                </span>
              </label>
              <input
                type="text"
                value={form.github}
                onChange={(e) => handleChange('github', e.target.value)}
                maxLength={39}
                className="input"
                placeholder={t('user.githubPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Twitter size={13} />
                  {t('user.twitter')}
                </span>
              </label>
              <input
                type="text"
                value={form.twitter}
                onChange={(e) => handleChange('twitter', e.target.value)}
                maxLength={15}
                className="input"
                placeholder={t('user.twitterPlaceholder')}
              />
            </div>
          </div>

          {/* 兴趣爱好 */}
          <div>
            <label className="block text-sm font-medium text-tx-body mb-1.5">
              <span className="inline-flex items-center gap-1">
                <Heart size={13} />
                {t('user.interests')}
              </span>
            </label>
            <input
              type="text"
              value={form.interests}
              onChange={(e) => handleChange('interests', e.target.value)}
              maxLength={200}
              className="input"
              placeholder={t('user.interestsPlaceholder')}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Save size={15} />
              {saving ? '...' : t('user.saveProfile')}
            </button>
            <button
              onClick={cancelEditing}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <X size={15} />
              {t('common.cancel') || 'Cancel'}
            </button>
          </div>
        </motion.div>
      ) : (
        /* 查看模式 — 信息卡片 */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 space-y-4"
        >
          {/* 元信息 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 注册时间 */}
            <div className="flex items-center gap-2 text-sm text-tx-muted">
              <Calendar size={15} className="text-tx-subtle" />
              <span>{t('user.memberSince')}: {user.created_at ? format(new Date(user.created_at), 'yyyy/MM/dd', { locale: dateLocale }) : '-'}</span>
            </div>

            {/* 邮箱 */}
            <div className="flex items-center gap-2 text-sm text-tx-muted">
              <UserIcon size={15} className="text-tx-subtle" />
              <span className="truncate">{user.email}</span>
            </div>

            {/* 生日 */}
            {user.birthday && (
              <div className="flex items-center gap-2 text-sm text-tx-muted">
                <Cake size={15} className="text-tx-subtle" />
                <span>{user.birthday}</span>
              </div>
            )}

            {/* 性别 */}
            {user.gender && (
              <div className="flex items-center gap-2 text-sm text-tx-muted">
                <Users size={15} className="text-tx-subtle" />
                <span>{user.gender === 'male' ? t('user.genderMale') : user.gender === 'female' ? t('user.genderFemale') : t('user.genderOther')}</span>
              </div>
            )}

            {/* 手机 */}
            {user.phone && (
              <div className="flex items-center gap-2 text-sm text-tx-muted">
                <Phone size={15} className="text-tx-subtle" />
                <span>{user.phone}</span>
              </div>
            )}

            {/* 职业 */}
            {user.occupation && (
              <div className="flex items-center gap-2 text-sm text-tx-muted">
                <Briefcase size={15} className="text-tx-subtle" />
                <span>{user.occupation}</span>
              </div>
            )}

            {/* 网站 */}
            {user.website && (
              <div className="flex items-center gap-2 text-sm text-tx-muted">
                <Globe size={15} className="text-tx-subtle" />
                <a
                  href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline truncate"
                >
                  {user.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}

            {/* 所在地 */}
            {user.location && (
              <div className="flex items-center gap-2 text-sm text-tx-muted">
                <MapPin size={15} className="text-tx-subtle" />
                <span>{user.location}</span>
              </div>
            )}

            {/* GitHub */}
            {user.github && (
              <div className="flex items-center gap-2 text-sm text-tx-muted">
                <Github size={15} className="text-tx-subtle" />
                <a
                  href={`https://github.com/${user.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline truncate"
                >
                  @{user.github}
                </a>
              </div>
            )}

            {/* Twitter */}
            {user.twitter && (
              <div className="flex items-center gap-2 text-sm text-tx-muted">
                <Twitter size={15} className="text-tx-subtle" />
                <a
                  href={`https://x.com/${user.twitter.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline truncate"
                >
                  @{user.twitter.replace(/^@/, '')}
                </a>
              </div>
            )}
          </div>

          {/* 兴趣爱好 */}
          {user.interests && (
            <>
              <hr className="border-app" />
              <div>
                <span className="inline-flex items-center gap-1.5 text-sm text-tx-subtle mb-2">
                  <Heart size={13} />
                  {t('user.interests')}
                </span>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {user.interests.split(',').map((tag, i) => (
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
            </>
          )}

          {/* 分隔线 */}
          <hr className="border-app" />

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            <button
              onClick={startEditing}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Edit3 size={15} />
              {t('user.editProfile')}
            </button>
            <button
              onClick={() => window.location.href = '/change-password'}
              className="btn-secondary inline-flex items-center gap-2"
            >
              {t('user.changePassword')}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

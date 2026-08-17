/**
 * @file src/pages/ChangePasswordPage.jsx
 * @description 修改密码页面（支持中英文）
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Key } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/index'
import { useTranslation } from '@/contexts/LanguageContext'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

export default function ChangePasswordPage() {
  const [form, setForm]               = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const mutation = useMutation({ mutationFn: authApi.changePassword })

  function clearError(field) {
    if (fieldErrors[field]) setFieldErrors(p => ({ ...p, [field]: '' }))
  }

  function validate() {
    const errs = {}
    const { currentPassword, newPassword, confirmPassword } = form
    if (!currentPassword) errs.currentPassword = t('validation.required') || '请输入当前密码'
    if (!newPassword)     errs.newPassword = t('validation.required') || '请输入新密码'
    else if (newPassword.length < 6) errs.newPassword = t('validation.passwordTooShort') || '密码至少 6 位'
    if (!confirmPassword) errs.confirmPassword = t('validation.required') || '请确认新密码'
    else if (newPassword && confirmPassword !== newPassword) errs.confirmPassword = t('auth.passwordMismatch') || '两次密码不一致'
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    const { currentPassword, newPassword, confirmPassword } = form
    mutation.mutate(
      { currentPassword, newPassword, confirmPassword },
      {
        onSuccess: () => {
          queryClient.clear()
          toast.success(t('messages.passwordChanged'))
          logout()
          navigate('/login', { replace: true })
        },
        onError: (err) => {
          setFieldErrors({ form: err.response?.data?.message || t('messages.error') })
        },
      }
    )
  }

  return (
    <div className="min-h-screen bg-surf-muted flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-tx-muted hover:text-primary-600
                     transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          <span>{t('common.back')}</span>
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Key size={20} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold text-tx-heading">{t('auth.changePasswordTitle')}</h1>
            <p className="text-sm text-tx-muted mt-0.5">{t('auth.changePasswordDesc')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-surf-card rounded-2xl shadow-soft border border-app p-6 space-y-4">

          {/* 表单级通用错误（如当前密码错误） */}
          {fieldErrors.form && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200"
            >
              <span className="text-red-500 text-base leading-none">✕</span>
              <p className="text-sm text-red-600">{fieldErrors.form}</p>
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-medium text-tx-body mb-1.5">{t('auth.currentPassword')}</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={(e) => { setForm({ ...form, currentPassword: e.target.value }); clearError('currentPassword') }}
                placeholder={t('auth.currentPasswordPlaceholder')}
                className={`input-field pr-10 ${fieldErrors.currentPassword ? 'border-red-400' : ''}`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-subtle hover:text-tx-body"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.currentPassword && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{fieldErrors.currentPassword}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-tx-body mb-1.5">{t('auth.newPassword')}</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(e) => { setForm({ ...form, newPassword: e.target.value }); clearError('newPassword') }}
                placeholder={t('auth.newPasswordPlaceholder')}
                className={`input-field pr-10 ${fieldErrors.newPassword ? 'border-red-400' : ''}`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-subtle hover:text-tx-body"
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.newPassword && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{fieldErrors.newPassword}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-tx-body mb-1.5">{t('auth.confirmPassword')}</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => { setForm({ ...form, confirmPassword: e.target.value }); clearError('confirmPassword') }}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              className={`input-field ${fieldErrors.confirmPassword ? 'border-red-400' : ''}`}
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary w-full py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? t('common.loading') : t('auth.changePasswordTitle')}
          </button>
        </form>

        <p className="text-center text-xs text-tx-subtle mt-4">
          {t('auth.passwordChanged')}
        </p>
      </motion.div>
    </div>
  )
}

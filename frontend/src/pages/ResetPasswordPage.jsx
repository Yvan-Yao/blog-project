/**
 * @file src/pages/ResetPasswordPage.jsx
 * @description 重置密码页面（支持中英文）
 */

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/index'
import { useTranslation } from '@/contexts/LanguageContext'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [form, setForm] = useState({
    token: location.state?.token || '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [done, setDone] = useState(false)

  const mutation = useMutation({ mutationFn: authApi.resetPassword })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.token) return toast.error(t('validation.required'))
    if (!form.newPassword) return toast.error(t('validation.required'))
    if (form.newPassword.length < 6) return toast.error(t('validation.passwordTooShort'))
    if (form.newPassword !== form.confirmPassword) return toast.error(t('auth.passwordMismatch'))

    mutation.mutate(form, {
      onSuccess: (res) => {
        toast.success(res?.data?.message || t('messages.passwordChanged'))
        setDone(true)
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || t('messages.error'))
      },
    })
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  if (done) {
    return (
      <div className="min-h-[80dvh] flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-tx-heading mb-2">
            {t('auth.passwordChanged')}
          </h1>
          <p className="text-sm text-tx-muted mb-6">{t('auth.passwordChangedDesc')}</p>
          <Link to="/login" className="btn-primary inline-block px-8 py-3">
            {t('auth.goLogin')}
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-[80dvh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock size={22} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-tx-heading">
            {t('auth.resetPasswordTitle')}
          </h1>
          <p className="text-sm text-tx-muted mt-1">{t('auth.resetPasswordDesc')}</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">
                {t('auth.resetToken')}
              </label>
              <input
                type="text"
                value={form.token}
                onChange={(e) => update('token', e.target.value)}
                placeholder={t('auth.resetTokenPlaceholder')}
                className="input font-mono text-sm"
                autoFocus={!form.token}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">
                {t('auth.newPassword')}
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={(e) => update('newPassword', e.target.value)}
                  placeholder={t('auth.newPasswordPlaceholder')}
                  className="input pr-10"
                  autoFocus={!!form.token}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-subtle hover:text-tx-body"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">
                {t('auth.confirmPassword')}
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary w-full py-3"
            >
              {mutation.isPending ? t('common.loading') : t('auth.resetPassword')}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-tx-muted mt-4">
          <Link to="/forgot-password" className="text-primary-600 font-medium hover:underline">
            {t('auth.forgotPasswordLink')}
          </Link>
          <span className="mx-2 text-tx-subtle">|</span>
          <Link to="/login" className="text-primary-600 font-medium hover:underline">
            {t('auth.goLogin')}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

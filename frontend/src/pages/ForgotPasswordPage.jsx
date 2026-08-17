/**
 * @file src/pages/ForgotPasswordPage.jsx
 * @description 忘记密码（支持中英文）
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Leaf, Mail, ArrowRight, Copy, Check } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/index'
import { useTranslation } from '@/contexts/LanguageContext'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail]             = useState('')
  const [token, setToken]             = useState(null)
  const [copied, setCopied]           = useState(false)
  const [fieldError, setFieldError]   = useState('')
  const navigate = useNavigate()
  const { t } = useTranslation()

  const mutation = useMutation({ mutationFn: authApi.forgotPassword })

  function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) {
      setFieldError(t('validation.required') || '请输入邮箱')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setFieldError('请输入正确的邮箱格式')
      return
    }
    setFieldError('')
    mutation.mutate(email, {
      onSuccess: (res) => {
        if (res?.message) toast.success(res.message)
        if (res?.data?.token) {
          setToken(res.data.token)
        }
      },
      onError: (err) => {
        setFieldError(err.response?.data?.message || t('messages.error'))
      },
    })
  }

  function handleCopy() {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true)
      toast.success(t('messages.saveSuccess'))
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-[80dvh] flex items-center justify-center px-4 py-12">
      <AnimatePresence mode="wait">
        {!token ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Mail size={22} className="text-amber-600" />
              </div>
              <h1 className="text-2xl font-serif font-semibold text-tx-heading">{t('auth.forgotPasswordTitle')}</h1>
              <p className="text-sm text-tx-muted mt-1">{t('auth.forgotPasswordDesc')}</p>
            </div>

            <div className="card p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-tx-body mb-1.5">{t('auth.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (fieldError) setFieldError('') }}
                    placeholder={t('auth.emailPlaceholder')}
                    className={`input ${fieldError ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : ''}`}
                    autoFocus
                  />
                  {fieldError && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <span>⚠</span>{fieldError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {mutation.isPending ? t('common.loading') : (
                    <>
                      {t('auth.sendResetEmail')}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-sm text-tx-muted mt-4">
              <Link to="/login" className="text-primary-600 font-medium hover:underline">
                {t('auth.goLogin')}
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Check size={22} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-serif font-semibold text-tx-heading">{t('auth.resetPasswordTitle')}</h1>
              <p className="text-sm text-tx-muted mt-1">
                {t('auth.resetPasswordDesc')}
              </p>
            </div>

            <div className="card p-6 space-y-4">
              <div className="p-3 bg-surf-muted border border-app rounded-xl
                            break-all font-mono text-xs text-tx-body leading-relaxed
                            select-all">
                {token}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  className="btn-secondary flex-1 py-2.5 flex items-center justify-center gap-2"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  {copied ? t('common.ok') : t('common.edit')}
                </button>

                <button
                  onClick={() => navigate('/reset-password', { state: { token } })}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
                >
                  {t('auth.resetPasswordTitle')}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <p className="text-center text-sm text-tx-subtle mt-4">
              {t('auth.resetTokenPlaceholder')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

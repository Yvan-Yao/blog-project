/**
 * @file src/pages/LoginPage.jsx
 * @description 登录页面（支持中英文）
 */

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Leaf, Eye, EyeOff } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/index'
import useAuthStore from '@/store/authStore'
import { useTranslation } from '@/contexts/LanguageContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm]         = useState({ username: '', password: '' })
  const [showPwd, setShowPwd]   = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const mutation = useMutation({
    mutationFn: authApi.login,
  })

  function validate() {
    const errs = {}
    if (!form.username.trim()) errs.username = t('validation.required') || '请输入用户名'
    if (!form.password)        errs.password = t('validation.required') || '请输入密码'
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
    mutation.mutate(form, {
      onSuccess: (data) => {
        if (data?.data) {
          queryClient.clear()
          login(data.data.user, data.data.token)
          toast.success(t('messages.loginSuccess', { username: data.data.user.username }))
          navigate(from, { replace: true })
        }
      },
      onError: (err) => {
        const msg = err.response?.data?.message || t('messages.error')
        // 服务器返回的字段错误（如密码错误）放到 form 级别
        setFieldErrors({ form: msg })
      },
    })
  }

  const inputClass = (field) =>
    `input ${fieldErrors[field] ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : ''}`

  return (
    <div className="min-h-[80dvh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Leaf size={22} className="text-primary-600" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-tx-heading">{t('auth.loginTitle')}</h1>
          <p className="text-sm text-tx-muted mt-1">{t('auth.loginDesc')}</p>
        </div>

        {/* 表单卡片 */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* 表单级错误（服务器返回，如用户名或密码错误） */}
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

            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">{t('auth.username')}</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => {
                  setForm(f => ({ ...f, username: e.target.value }))
                  if (fieldErrors.username) setFieldErrors(p => ({ ...p, username: '' }))
                }}
                placeholder={t('auth.usernamePlaceholder')}
                className={inputClass('username')}
                autoFocus
              />
              {fieldErrors.username && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span>{fieldErrors.username}
                </p>
              )}
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => {
                    setForm(f => ({ ...f, password: e.target.value }))
                    if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: '' }))
                  }}
                  placeholder={t('auth.passwordPlaceholder')}
                  className={`${inputClass('password')} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-subtle hover:text-tx-body"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span>{fieldErrors.password}
                </p>
              )}
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary w-full py-3"
            >
              {mutation.isPending ? t('common.loading') : t('auth.loginButton')}
            </button>

            {/* 忘记密码 */}
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-tx-subtle hover:text-primary-600 transition-colors">
                {t('auth.forgotPasswordLink')}
              </Link>
            </div>
          </form>
        </div>

        {/* 注册链接 */}
        <p className="text-center text-sm text-tx-muted mt-4">
          {t('auth.noAccount')}
          <Link to="/register" className="text-primary-600 font-medium hover:underline ml-1">
            {t('auth.goRegister')}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

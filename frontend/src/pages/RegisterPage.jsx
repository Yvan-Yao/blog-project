/**
 * @file src/pages/RegisterPage.jsx
 * @description 用户注册页面（支持中英文）
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Leaf, Eye, EyeOff } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/index'
import useAuthStore from '@/store/authStore'
import { useTranslation } from '@/contexts/LanguageContext'
import toast from 'react-hot-toast'

/** 字段下方错误小提示 */
function FieldError({ msg }) {
  if (!msg) return null
  return (
    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
      <span>⚠</span>{msg}
    </p>
  )
}

export default function RegisterPage() {
  const [form, setForm]               = useState({ username: '', email: '', password: '', confirm: '' })
  const [showPwd, setShowPwd]         = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const mutation = useMutation({
    mutationFn: authApi.register,
  })

  function clearError(field) {
    if (fieldErrors[field]) setFieldErrors(p => ({ ...p, [field]: '' }))
  }

  function validate() {
    const errs = {}
    const username = form.username.trim()
    const email    = form.email.trim()
    const password = form.password
    const confirm  = form.confirm

    if (!username)         errs.username = t('validation.required') || '请输入用户名'
    else if (username.length < 2)  errs.username = t('validation.usernameTooShort') || '用户名至少 2 个字符'
    else if (username.length > 20) errs.username = t('validation.maxLength', { min: 2, max: 20 }) || '用户名最多 20 个字符'

    if (!email)            errs.email = t('validation.required') || '请输入邮箱'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = '请输入正确的邮箱格式'

    if (!password)         errs.password = t('validation.required') || '请输入密码'
    else if (password.length < 6) errs.password = t('validation.passwordTooShort') || '密码至少 6 位'

    if (!confirm)          errs.confirm = t('validation.required') || '请确认密码'
    else if (password && confirm !== password) errs.confirm = t('auth.passwordMismatch') || '两次密码不一致'

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

    mutation.mutate(
      { username: form.username.trim(), email: form.email.trim(), password: form.password },
      {
        onSuccess: (data) => {
          queryClient.clear()
          login(data.data.user, data.data.token)
          toast.success(t('messages.registerSuccess'))
          navigate('/')
        },
        onError: (err) => {
          const serverFieldErrors = err.response?.data?.errors
          if (serverFieldErrors?.length) {
            // 把服务器字段错误映射到字段
            const mapped = {}
            serverFieldErrors.forEach(e => {
              if (e.field) mapped[e.field] = e.message
            })
            if (Object.keys(mapped).length) {
              setFieldErrors(mapped)
              return
            }
          }
          // 通用错误：放到 form 级别
          setFieldErrors({ form: err.response?.data?.message || t('messages.error') })
        },
      }
    )
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
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Leaf size={22} className="text-primary-600" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-tx-heading">{t('auth.registerTitle')}</h1>
          <p className="text-sm text-tx-muted mt-1">{t('auth.registerDesc')}</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* 表单级通用错误 */}
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
              <input type="text" value={form.username} placeholder={t('auth.usernamePlaceholder')}
                onChange={e => { setForm(f => ({ ...f, username: e.target.value })); clearError('username') }}
                className={inputClass('username')} autoFocus />
              <FieldError msg={fieldErrors.username} />
            </div>

            {/* 邮箱 */}
            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">{t('auth.email')}</label>
              <input type="email" value={form.email} placeholder={t('auth.emailPlaceholder')}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); clearError('email') }}
                className={inputClass('email')} />
              <FieldError msg={fieldErrors.email} />
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={form.password}
                  placeholder={t('auth.passwordPlaceholder')}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); clearError('password') }}
                  className={`${inputClass('password')} pr-10`} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-subtle hover:text-tx-body">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <FieldError msg={fieldErrors.password} />
            </div>

            {/* 确认密码 */}
            <div>
              <label className="block text-sm font-medium text-tx-body mb-1.5">{t('auth.confirmPassword')}</label>
              <input type="password" value={form.confirm} placeholder={t('auth.confirmPasswordPlaceholder')}
                onChange={e => { setForm(f => ({ ...f, confirm: e.target.value })); clearError('confirm') }}
                className={inputClass('confirm')} />
              <FieldError msg={fieldErrors.confirm} />
            </div>

            <button type="submit" disabled={mutation.isPending} className="btn-primary w-full py-3">
              {mutation.isPending ? t('common.loading') : t('auth.registerButton')}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-tx-muted mt-4">
          {t('auth.hasAccount')}
          <Link to="/login" className="text-primary-600 font-medium hover:underline ml-1">
            {t('auth.goLogin')}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

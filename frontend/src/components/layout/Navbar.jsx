/**
 * @file src/components/layout/Navbar.jsx
 * @description 导航栏组件（支持中英文切换）
 */

import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Leaf, PenLine, Menu, X, User, LogOut,
  LayoutDashboard, ChevronDown, UserPlus, LogIn,
  FileText, Bookmark, Key, Users, Globe,
  Trophy, Zap,
} from 'lucide-react'
import useAuthStore from '@/store/authStore'
import { useTranslation } from '@/contexts/LanguageContext'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher'
import { ListLayoutSwitcher } from '@/components/ui/LayoutSwitcher'
import toast from 'react-hot-toast'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, token, logout, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, lang, setLang } = useTranslation()
  const location = useLocation()
  const showListSwitcher = location.pathname === '/' || location.pathname === '/bookmarks'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      // 关闭用户菜单
      if (!e.target.closest('.user-menu-container')) {
        setUserMenuOpen(false)
      }
      // 关闭语言菜单
      const langMenu = document.getElementById('lang-menu')
      if (langMenu && !e.target.closest('.relative')) {
        langMenu.classList.add('hidden')
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  function handleLogout() {
    queryClient.clear()
    logout()
    setUserMenuOpen(false)
    setMobileOpen(false)
    toast.success(t('messages.logoutSuccess'))
    navigate('/')
  }

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'text-primary'
        : 'text-muted-fg hover:text-primary'
    }`

  return (
    <header className={`sticky top-0 z-50 transition-[background-color,box-shadow] duration-300 border-b ${
      scrolled
        ? 'bg-surface/90 backdrop-blur-md shadow-soft border-border'
        : 'bg-transparent border-transparent'
    }`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center
                            group-hover:opacity-90 transition-colors duration-200"
              style={{ backgroundColor: 'hsl(var(--primary))' }}>
              <Leaf size={16} className="text-white" />
            </div>
            <span className="font-serif font-semibold group-hover:text-[hsl(var(--primary))] transition-colors"
              style={{ color: 'hsl(var(--foreground))' }}>
              {t('common.siteName')}
            </span>
          </Link>

          {/* 桌面端导航 */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/" className={navLinkClass} end>{t('nav.home')}</NavLink>
            <NavLink to="/leaderboard" className={navLinkClass}>
              <span className="flex items-center gap-1">
                <Trophy size={13} />
                {t('nav.leaderboard')}
              </span>
            </NavLink>
          </nav>

          {/* 右侧操作区 */}
          <div className="hidden md:flex items-center gap-3">
            {/* 语言切换下拉菜单 */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const menu = document.getElementById('lang-menu')
                  menu?.classList.toggle('hidden')
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold
                           transition-all duration-200 text-muted-fg hover:text-primary hover:bg-accent"
                title="Switch language"
              >
                <Globe size={14} />
                {lang === 'zh' ? '中' : lang === 'en' ? 'EN' : '日'}
              </button>
              {/* 语言选项下拉菜单 */}
              <div
                id="lang-menu"
                className="hidden absolute right-0 top-full mt-1 rounded-lg shadow-lg border py-1 min-w-[80px] z-50"
                style={{
                  backgroundColor: 'hsl(var(--surface))',
                  borderColor: 'hsl(var(--border))',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setLang('zh'); document.getElementById('lang-menu')?.classList.add('hidden') }}
                  className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    lang === 'zh' ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: lang === 'zh' ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'hsl(var(--muted))' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  中文
                </button>
                <button
                  onClick={() => { setLang('en'); document.getElementById('lang-menu')?.classList.add('hidden') }}
                  className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    lang === 'en' ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: lang === 'en' ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'hsl(var(--muted))' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  English
                </button>
                <button
                  onClick={() => { setLang('ja'); document.getElementById('lang-menu')?.classList.add('hidden') }}
                  className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    lang === 'ja' ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: lang === 'ja' ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'hsl(var(--muted))' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  日本語
                </button>
              </div>
            </div>

            {/* 主题切换 */}
            <ThemeSwitcher />

            {/* 列表布局切换（仅首页/书签页） */}
            {showListSwitcher && <ListLayoutSwitcher />}

            {token ? (
              <>
                <Link to="/write"
                  className="flex items-center gap-1.5 text-sm font-medium
                             transition-colors duration-200 text-muted-fg hover:text-primary">
                  <PenLine size={15} />
                  <span>{t('nav.write')}</span>
                </Link>

                <div className="relative user-menu-container">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 btn-secondary py-1.5 px-3"
                  >
                    <div className="w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center overflow-hidden"
                      style={{
                        backgroundColor: 'hsl(var(--primary) / 0.15)',
                        color: 'hsl(var(--primary-700))',
                      }}>
                      {user?.avatar && !user.avatar.startsWith('data:') ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        user?.username?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <span className="text-sm max-w-[80px] truncate">{user?.username}</span>
                    <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-44 rounded-xl shadow-hover
                                   border py-1 overflow-hidden"
                        style={{
                          backgroundColor: 'hsl(var(--surface))',
                          borderColor: 'hsl(var(--border))',
                        }}
                      >
                        <Link to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm
                                     transition-colors"
                          style={{ color: 'hsl(var(--foreground))' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.08)'
                            e.currentTarget.style.color = 'hsl(var(--primary-700))'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = 'hsl(var(--foreground))'
                          }}>
                          <User size={14} />
                          {t('nav.profile')}
                        </Link>
                        <div className="divider my-1" />
                        <Link to="/my-posts"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm
                                     transition-colors"
                          style={{ color: 'hsl(var(--foreground))' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.08)'
                            e.currentTarget.style.color = 'hsl(var(--primary-700))'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = 'hsl(var(--foreground))'
                          }}>
                          <FileText size={14} />
                          {t('nav.myPosts')}
                        </Link>
                        <Link to="/bookmarks"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm
                                     transition-colors"
                          style={{ color: 'hsl(var(--foreground))' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.08)'
                            e.currentTarget.style.color = 'hsl(var(--primary-700))'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = 'hsl(var(--foreground))'
                          }}>
                          <Bookmark size={14} />
                          {t('nav.bookmarks')}
                        </Link>
                        <Link to="/friends"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm
                                     transition-colors"
                          style={{ color: 'hsl(var(--foreground))' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.08)'
                            e.currentTarget.style.color = 'hsl(var(--primary-700))'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = 'hsl(var(--foreground))'
                          }}>
                          <Users size={14} />
                          {t('nav.friends')}
                        </Link>
                        <div className="divider my-1" />
                        <Link to="/points"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm
                                     transition-colors"
                          style={{ color: 'hsl(var(--foreground))' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.08)'
                            e.currentTarget.style.color = 'hsl(var(--primary-700))'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = 'hsl(var(--foreground))'
                          }}>
                          <Zap size={14} />
                          {t('nav.myPoints')}
                        </Link>
                        <div className="divider my-1" />
                        <Link to="/change-password"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm
                                     transition-colors"
                          style={{ color: 'hsl(var(--foreground))' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.08)'
                            e.currentTarget.style.color = 'hsl(var(--primary-700))'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = 'hsl(var(--foreground))'
                          }}>
                          <Key size={14} />
                          {t('nav.changePassword')}
                        </Link>
                        <div className="divider my-1" />
                        {isAdmin() && (
                          <Link to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm
                                       transition-colors"
                            style={{ color: 'hsl(var(--foreground))' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.08)'
                              e.currentTarget.style.color = 'hsl(var(--primary-700))'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                              e.currentTarget.style.color = 'hsl(var(--foreground))'
                            }}>
                            <LayoutDashboard size={14} />
                            {t('nav.admin')}
                          </Link>
                        )}
                        <div className="divider my-1" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm
                                     text-red-600 hover:bg-red-50 transition-colors text-left">
                          <LogOut size={14} />
                          {t('nav.logout')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary py-1.5">
                  <span className="flex items-center gap-1.5">
                    <LogIn size={15} />
                    {t('nav.login')}
                  </span>
                </Link>
                <Link to="/register" className="btn-primary py-2 px-4 text-sm font-semibold">
                  <span className="flex items-center gap-1.5">
                    <UserPlus size={15} />
                    {t('nav.register')}
                  </span>
                </Link>
              </>
            )}
          </div>

          {/* 移动端菜单按钮 */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors text-muted-fg hover:bg-muted"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t('common.more')}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* 移动端菜单 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-surface border-t border-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {/* 移动端语言切换 */}
              <div className="flex items-center gap-2 px-2 py-2">
                <Globe size={14} style={{ color: 'hsl(var(--muted-fg))' }} />
                <button
                  onClick={() => setLang('zh')}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    lang === 'zh' ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: lang === 'zh' ? 'hsl(var(--primary))' : 'hsl(var(--muted-fg))',
                    backgroundColor: lang === 'zh' ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                  }}
                >
                  中文
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    lang === 'en' ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: lang === 'en' ? 'hsl(var(--primary))' : 'hsl(var(--muted-fg))',
                    backgroundColor: lang === 'en' ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                  }}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('ja')}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    lang === 'ja' ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: lang === 'ja' ? 'hsl(var(--primary))' : 'hsl(var(--muted-fg))',
                    backgroundColor: lang === 'ja' ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                  }}
                >
                  日本語
                </button>
              </div>
              <div className="divider my-1" />

              {/* 移动端主题/布局切换 */}
              <div className="flex items-center gap-2 px-2 py-2">
                <ThemeSwitcher />
                {showListSwitcher && <ListLayoutSwitcher />}
              </div>

              <NavLink to="/" className={navLinkClass} end
                onClick={() => setMobileOpen(false)}>
                <div className="py-2">{t('nav.home')}</div>
              </NavLink>
              <NavLink to="/leaderboard" className={navLinkClass}
                onClick={() => setMobileOpen(false)}>
                <div className="py-2 flex items-center gap-1.5">
                  <Trophy size={13} />
                  {t('nav.leaderboard')}
                </div>
              </NavLink>
              {token ? (
                <>
                  <Link to="/write" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    <PenLine size={14} /> {t('nav.write')}
                  </Link>
                  <Link to="/my-posts" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    <FileText size={14} /> {t('nav.myPosts')}
                  </Link>
                  <Link to="/bookmarks" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    <Bookmark size={14} /> {t('nav.bookmarks')}
                  </Link>
                  <Link to="/friends" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    <Users size={14} /> {t('nav.friends')}
                  </Link>
                  <Link to="/points" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    <Zap size={14} /> {t('nav.myPoints')}
                  </Link>
                  <Link to="/change-password" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    <Key size={14} /> {t('nav.changePassword')}
                  </Link>
                  {isAdmin() && (
                    <Link to="/admin" onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 py-2 text-sm"
                      style={{ color: 'hsl(var(--foreground))' }}>
                      <LayoutDashboard size={14} /> {t('nav.admin')}
                    </Link>
                  )}
                  <div className="divider" />
                  <button onClick={handleLogout}
                    className="flex items-center gap-2 py-2 text-sm text-red-600">
                    <LogOut size={14} /> {t('nav.logout')}
                  </button>
                </>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Link to="/login" className="btn-secondary text-sm flex-1 text-center py-2.5"
                    onClick={() => setMobileOpen(false)}>
                    <span className="flex items-center justify-center gap-1.5">
                      <LogIn size={15} /> {t('nav.login')}
                    </span>
                  </Link>
                  <Link to="/register" className="btn-primary text-sm flex-1 text-center py-2.5 font-semibold"
                    onClick={() => setMobileOpen(false)}>
                    <span className="flex items-center justify-center gap-1.5">
                      <UserPlus size={15} /> {t('nav.register')}
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

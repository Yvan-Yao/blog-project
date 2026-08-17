/**
 * @file src/components/layout/AdminLayout.jsx
 * @description Admin 后台布局（动态背景 + 侧边栏 + 内容区），主题自适应
 */

import { NavLink, Outlet, Link } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, MessageSquare, Tag, Leaf, ArrowLeft, Zap } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'
import DynamicBackground from '@/components/ui/DynamicBackground'

const navItems = [
  { to: '/admin',          labelKey: 'admin.dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/posts',    labelKey: 'admin.managePosts', icon: FileText },
  { to: '/admin/users',    labelKey: 'admin.manageUsers', icon: Users },
  { to: '/admin/comments', labelKey: 'admin.manageComments', icon: MessageSquare },
  { to: '/admin/categories', labelKey: 'admin.manageCategories', icon: Tag },
  { to: '/admin/points',   labelKey: 'admin.managePoints', icon: Zap },
]

export default function AdminLayout() {
  const { t } = useTranslation()
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200`

  return (
    <div className="min-h-[100dvh] flex relative" style={{ backgroundColor: 'hsl(var(--muted))' }}>
      {/* 动态 Canvas 背景 */}
      <DynamicBackground />
      {/* 侧边栏 */}
      <aside className="w-56 flex flex-col p-4 fixed left-0 top-0 h-full z-20"
        style={{
          backgroundColor: 'hsl(var(--surface))',
          borderRight: '1px solid hsl(var(--border))',
        }}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-1 mb-6 mt-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'hsl(var(--primary))' }}>
            <Leaf size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
            {t('admin.dashboard')}
          </span>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, labelKey, icon: Icon, end }) => (
            <NavLink key={to} to={to} className={linkClass} end={end}
              style={({ isActive }) => ({
                color: isActive
                  ? 'hsl(var(--primary-700))'
                  : 'hsl(var(--foreground))',
                backgroundColor: isActive
                  ? 'hsl(var(--primary) / 0.1)'
                  : 'transparent',
              })}>
              <Icon size={16} />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* 返回博客 */}
        <Link to="/"
          className="flex items-center gap-2 px-3 py-2.5 text-sm transition-colors mt-2"
          style={{ color: 'hsl(var(--muted-fg))' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--primary))' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-fg))' }}>
          <ArrowLeft size={14} />
          返回博客
        </Link>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 ml-56 p-6 min-h-[100dvh]">
        <Outlet />
      </main>
    </div>
  )
}

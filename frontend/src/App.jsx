/**
 * @file src/App.jsx
 * @description 应用根组件，负责路由配置和全局初始化
 *
 * 路由结构（所有链接已加密）：
 *  /               首页（文章列表）
 *  /post/:token   文章详情（加密链接）
 *  /login          登录页
 *  /register       注册页
 *  /write          发帖/编辑文章
 *  /edit/:token    编辑文章（加密链接）
 *  /profile/:token 用户资料（加密链接）
 *  /my-posts       我的文章
 *  /bookmarks      我的收藏
 *  /points         我的积分（需登录）
 *  /leaderboard    积分排行榜
 *  /admin          Admin 后台
 *  /admin/users    用户管理
 *  /admin/posts    文章管理
 *  /admin/comments 评论管理
 *  /admin/categories 分类管理
 *  /admin/points     积分管理
 */

import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/index'
import { LanguageProvider, useTranslation } from '@/contexts/LanguageContext'
import ThemeProvider from '@/contexts/ThemeContext'

// 布局组件
import Layout from '@/components/layout/Layout'
import AdminLayout from '@/components/layout/AdminLayout'

// 页面组件
import HomePage from '@/pages/HomePage'
import PostDetailPage from '@/pages/PostDetailPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import WritePage from '@/pages/WritePage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminPostsPage from '@/pages/admin/AdminPostsPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminCommentsPage from '@/pages/admin/AdminCommentsPage'
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage'
import AdminPointsPage from '@/pages/admin/AdminPointsPage'
import MyPostsPage from '@/pages/MyPostsPage'
import BookmarksPage from '@/pages/BookmarksPage'
import ChangePasswordPage from '@/pages/ChangePasswordPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import FriendsPage from '@/pages/FriendsPage'
import FriendRequestsPage from '@/pages/FriendRequestsPage'
import ProfilePage from '@/pages/ProfilePage'
import PublicProfilePage from '@/pages/PublicProfilePage'
import PointsPage from '@/pages/PointsPage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import NotFoundPage from '@/pages/NotFoundPage'

/**
 * 动态更新页面标题（根据当前语言）
 */
function TitleManager() {
  const { t, lang } = useTranslation()
  
  useEffect(() => {
    document.title = t('common.siteName')
    
    // 更新 meta description
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute('content', t('common.tagline'))
    }
  }, [t, lang])
  
  return null
}

/**
 * 需要登录才能访问的路由守卫
 */
function PrivateRoute({ children }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return children
}

/**
 * 需要 Admin 权限的路由守卫
 */
function AdminRoute({ children }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (user && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { login, logout, token } = useAuthStore()

  // 应用初始化：如果有 token，从服务器获取用户信息
  // queryKey 包含 token，确保切换账号时缓存隔离，不会返回上一个用户的数据
  const queryClient = useQueryClient()
  const { data, isError, isSuccess } = useQuery({
    queryKey: ['currentUser', token],
    queryFn: authApi.getMe,
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  // 获取到用户数据后同步到全局状态
  useEffect(() => {
    if (isSuccess && data?.data && token) {
      login(data.data, token)
    }
  }, [isSuccess, data, token, login])

  // token 无效时清除登录状态并清缓存
  useEffect(() => {
    if (isError) {
      logout()
      queryClient.clear()
    }
  }, [isError, logout, queryClient])

  // 监听 401 事件（由 axios 拦截器触发）
  useEffect(() => {
    const handler = () => {
      logout()
      queryClient.clear()
    }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [logout, queryClient])

  return (
    <ThemeProvider>
    <LanguageProvider>
      <TitleManager />
      <Routes>
        {/* 公开路由（带主布局） */}
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="post/:token" element={<PostDetailPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          {/* 发帖/编辑（需要登录） */}
          <Route path="write" element={
            <PrivateRoute><WritePage /></PrivateRoute>
          } />
          <Route path="edit/:token" element={
            <PrivateRoute><WritePage /></PrivateRoute>
          } />
          {/* 我的文章 + 我的收藏（需要登录） */}
          <Route path="my-posts" element={
            <PrivateRoute><MyPostsPage /></PrivateRoute>
          } />
          <Route path="bookmarks" element={
            <PrivateRoute><BookmarksPage /></PrivateRoute>
          } />
          <Route path="change-password" element={
            <PrivateRoute><ChangePasswordPage /></PrivateRoute>
          } />
          <Route path="friends" element={
            <PrivateRoute><FriendsPage /></PrivateRoute>
          } />
          <Route path="friend-requests" element={
            <PrivateRoute><FriendRequestsPage /></PrivateRoute>
          } />
          <Route path="profile" element={
            <PrivateRoute><ProfilePage /></PrivateRoute>
          } />
          {/* 公开用户资料（无需登录，加密链接） */}
          <Route path="profile/:token" element={<PublicProfilePage />} />
          {/* 积分排行榜（公开） */}
          <Route path="leaderboard" element={<LeaderboardPage />} />
          {/* 我的积分（需要登录） */}
          <Route path="points" element={
            <PrivateRoute><PointsPage /></PrivateRoute>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Admin 路由（需要 admin 权限） */}
        <Route path="admin" element={
          <AdminRoute><AdminLayout /></AdminRoute>
        }>
          <Route index element={<AdminDashboardPage />} />
          <Route path="posts" element={<AdminPostsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="comments" element={<AdminCommentsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="points" element={<AdminPointsPage />} />
        </Route>
      </Routes>
    </LanguageProvider>
    </ThemeProvider>
  )
}

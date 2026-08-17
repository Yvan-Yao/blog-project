/**
 * @file src/store/authStore.js
 * @description 全局认证状态管理（使用 Zustand）
 *
 * 存储：当前用户信息、JWT Token、登录状态
 * 持久化：将 token 保存到 localStorage，刷新页面不丢失登录状态
 */

import { create } from 'zustand'

const useAuthStore = create((set, get) => ({
  // 当前登录用户（null = 未登录）
  user: null,
  // JWT Token
  token: localStorage.getItem('blog_token') || null,
  // 是否正在加载用户信息（用于显示加载状态）
  loading: false,

  /**
   * 登录成功后调用：保存用户信息和 Token
   * @param {Object} user - 用户对象
   * @param {string} token - JWT Token
   */
  login(user, token) {
    localStorage.setItem('blog_token', token)
    set({ user, token })
  },

  /**
   * 登出：清除所有认证信息
   */
  logout() {
    localStorage.removeItem('blog_token')
    set({ user: null, token: null })
  },

  /**
   * 设置用户信息（应用初始化时，用 token 换取用户信息后调用）
   */
  setUser(user) {
    set({ user })
  },

  /**
   * 设置加载状态
   */
  setLoading(loading) {
    set({ loading })
  },

  /**
   * 判断是否为管理员
   */
  isAdmin() {
    return get().user?.role === 'admin'
  },

  /**
   * 判断是否已登录
   */
  isLoggedIn() {
    return !!get().token && !!get().user
  },
}))

export default useAuthStore

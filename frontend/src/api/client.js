/**
 * @file src/api/client.js
 * @description Axios HTTP 客户端配置
 *
 * - 自动在请求头附加 JWT Token
 * - 统一处理 401（Token 过期）自动跳转登录
 * - 统一处理 500 错误
 */

import axios from 'axios'

// 创建 axios 实例
const client = axios.create({
  baseURL: '/api',          // 代理到后端（通过 Vite proxy）
  timeout: 60000,            // 60 秒超时（AI 调用需要较长时间）
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─────────────────────────────────────────────
//  请求拦截器：自动添加认证 Token
// ─────────────────────────────────────────────
client.interceptors.request.use(
  (config) => {
    // 从 localStorage 读取 token（与 authStore 同步）
    const token = localStorage.getItem('blog_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─────────────────────────────────────────────
//  响应拦截器：统一错误处理
// ─────────────────────────────────────────────
client.interceptors.response.use(
  // 成功响应：直接返回 data 字段
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status } = error.response

      // Token 过期或无效：清除本地状态并跳转登录页
      if (status === 401) {
        localStorage.removeItem('blog_token')
        // 不直接 navigate，避免循环依赖，通过事件通知
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    }
    return Promise.reject(error)
  }
)

export default client

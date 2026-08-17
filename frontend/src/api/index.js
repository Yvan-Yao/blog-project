/**
 * @file src/api/posts.js
 * @description 文章相关 API 请求函数
 */

import client from './client'

export const postsApi = {
  /** 获取文章列表（分页 + 筛选） */
  getAll: (params) => client.get('/posts', { params }),

  /** 获取我的文章（分页） */
  getMy: (params) => client.get('/posts/my', { params }),

  /** 获取文章详情（通过 slug） */
  getBySlug: (slug) => client.get(`/posts/${slug}`),

  /** 创建文章 */
  create: (data) => client.post('/posts', data),

  /** 更新文章 */
  update: (id, data) => client.put(`/posts/${id}`, data),

  /** 发布文章（Admin） */
  publish: (id) => client.put(`/posts/${id}/publish`),

  /** 删除文章 */
  delete: (id) => client.delete(`/posts/${id}`),
}

/**
 * @file src/api/comments.js
 * @description 评论相关 API 请求函数
 */
export const commentsApi = {
  /** 获取文章评论列表 */
  getByPost: (postId) => client.get(`/posts/${postId}/comments`),

  /** 发表评论（或回复） */
  create: (postId, data) => client.post(`/posts/${postId}/comments`, data),

  /** 删除评论 */
  delete: (commentId) => client.delete(`/comments/${commentId}`),

  /** 上传评论图片（FormData） */
  uploadImage: (formData) => client.post('/comments/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

/**
 * @file src/api/auth.js
 * @description 认证相关 API 请求函数
 */
export const authApi = {
  /** 注册 */
  register: (data) => client.post('/auth/register', data),

  /** 登录 */
  login: (data) => client.post('/auth/login', data),

  /** 获取当前用户信息 */
  getMe: () => client.get('/auth/me'),

  /** 更新个人资料 */
  updateProfile: (data) => client.put('/auth/profile', data),

  /** 获取用户公开资料 */
  getPublicProfile: (username) => client.get(`/auth/profile/${username}`),

  /** 上传头像（FormData） */
  uploadAvatar: (formData) => client.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  /** 修改密码 */
  changePassword: (data) => client.put('/auth/password', data),

  /** 忘记密码 — 发送重置令牌 */
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }),

  /** 重置密码 — 使用令牌更新密码 */
  resetPassword: (data) => client.post('/auth/reset-password', data),
}

/**
 * @file src/api/categories.js
 * @description 分类相关 API
 */
export const categoriesApi = {
  getAll: () => client.get('/categories'),
  create: (data) => client.post('/categories', data),
  update: (id, data) => client.put(`/categories/${id}`, data),
  delete: (id) => client.delete(`/categories/${id}`),
}

/**
 * @file src/api/admin.js
 * @description Admin 后台 API
 */
export const adminApi = {
  getStats: () => client.get('/admin/stats'),
  getUsers: () => client.get('/admin/users'),
  deleteUser: (id) => client.delete(`/admin/users/${id}`),
  getPosts: (params) => client.get('/admin/posts', { params }),
  deleteComment: (id) => client.delete(`/admin/comments/${id}`),
}

/**
 * Admin 积分管理 API
 */
export const adminPointsApi = {
  /** 积分统计概览 */
  getStats: () => client.get('/admin/points/stats'),

  /** 用户积分列表（搜索/排序/分页） */
  getUsers: (params) => client.get('/admin/points/users', { params }),

  /** 查看用户积分流水 */
  getUserLogs: (userId, params) => client.get(`/admin/points/users/${userId}/logs`, { params }),

  /** 手动调整积分 */
  adjust: (userId, data) => client.post(`/admin/points/users/${userId}/adjust`, data),
}

/**
 * Admin 等级/规则配置 API（后台积分等级维护）
 */
export const adminLevelApi = {
  /** 获取全部等级配置 */
  getLevels: () => client.get('/admin/points/levels'),

  /** 新增或更新等级配置 */
  saveLevel: (data) => client.post('/admin/points/levels', data),

  /** 删除等级配置 */
  deleteLevel: (id) => client.delete(`/admin/points/levels/${id}`),

  /** 获取全部积分规则 */
  getRules: () => client.get('/admin/points/rules'),

  /** 新增或更新积分规则 */
  saveRule: (data) => client.post('/admin/points/rules', data),

  /** 删除积分规则 */
  deleteRule: (id) => client.delete(`/admin/points/rules/${id}`),
}

/**
 * @file src/api/bookmarks.js
 * @description 收藏相关 API
 */
export const bookmarksApi = {
  /** 收藏/取消收藏 */
  toggle: (postId) => client.post(`/bookmarks/${postId}`),

  /** 获取收藏列表 */
  list: (params) => client.get('/bookmarks', { params }),

  /** 检查是否已收藏 */
  check: (postId) => client.get(`/bookmarks/${postId}`),
}

/**
 * @file src/api/friends.js
 * @description 好友相关 API
 */
export const friendsApi = {
  /** 好友列表 */
  list: () => client.get('/friends'),

  /** 待处理请求（收到 + 发出） */
  getRequests: () => client.get('/friends/requests'),

  /** 搜索用户 */
  search: (q) => client.get('/friends/search', { params: { q } }),

  /** 发送好友请求 */
  sendRequest: (userId) => client.post(`/friends/request/${userId}`),

  /** 接受好友请求 */
  accept: (userId) => client.put(`/friends/accept/${userId}`),

  /** 拒绝好友请求 */
  reject: (userId) => client.put(`/friends/reject/${userId}`),

  /** 删除好友 */
  unfriend: (userId) => client.delete(`/friends/${userId}`),
}

/**
 * @file src/api/ai.js
 * @description AI 功能相关 API
 */
export const aiApi = {
  /** AI 文本润色 */
  polish: (data) => client.post('/ai/polish', data),

  /** AI 图片生成 */
  generateImage: (data) => client.post('/ai/image', data),
}

/**
 * @file src/api/points.js
 * @description 积分 / 点赞相关 API
 */
export const pointsApi = {
  /** 我的积分信息 */
  getMe: () => client.get('/points/me'),

  /** 他人积分信息 */
  getUser: (userId) => client.get(`/points/${userId}`),

  /** 积分流水 */
  getLogs: (params) => client.get('/points/logs', { params }),

  /** 积分排行榜 */
  leaderboard: (limit = 20) => client.get('/points/leaderboard', { params: { limit } }),
}

export const likesApi = {
  /** 点赞（每篇文章限 1 次） */
  like: (postId) => client.post(`/posts/${postId}/like`),

  /** 查询点赞状态 */
  status: (postId) => client.get(`/posts/${postId}/like`),

  /** 公开点赞数 */
  count: (postId) => client.get(`/posts/${postId}/likes/count`),
}

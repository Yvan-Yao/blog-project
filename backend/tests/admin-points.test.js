/**
 * @file admin-points.test.js
 * @description Admin 积分管理后台 API 测试
 *
 * 测试端点：
 *  GET  /api/admin/points/stats           积分统计概览
 *  GET  /api/admin/points/users           用户积分列表（搜索/排序/分页）
 *  GET  /api/admin/points/users/:id/logs  查看用户积分流水
 *  POST /api/admin/points/users/:id/adjust 手动调整积分
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'

const DB_FILE = `./data/test_admin_points_${Date.now()}.db`
process.env.DB_PATH = DB_FILE
process.env.NODE_ENV = 'test'
process.env.ADMIN_SECRET = 'admin_register_secret_2024'

import { initDatabase } from '../src/models/database.js'
await initDatabase()

const { app } = await import('../src/app.js')

// ── 辅助函数 ─────────────────────────────────────────────
async function register(username, email, isAdmin = false) {
  const body = { username, email, password: '123456' }
  if (isAdmin) body.adminSecret = 'admin_register_secret_2024'
  const r = await request(app)
    .post('/api/auth/register')
    .send(body)
  return { token: r.body.data.token, id: r.body.data.user.id }
}

async function publishPost(token, title, content = 'this is enough content for the post') {
  const cr = await request(app)
    .post('/api/posts')
    .set('Authorization', `Bearer ${token}`)
    .send({ title, content, categories: [] })
  const postId = cr.body.data.id
  // 发布后才有积分
  await request(app)
    .put(`/api/posts/${postId}/publish`)
    .set('Authorization', `Bearer ${token}`)
  return cr.body.data
}

// ── 全局状态 ─────────────────────────────────────────────
let adminToken, adminId
let user1Token, user1Id
let user2Token, user2Id

// ── 测试套件 ─────────────────────────────────────────────
describe('Admin 积分管理', () => {
  // 清理 DB 文件
  afterAll(() => { try { fs.unlinkSync(DB_FILE) } catch (_) {} })

  beforeAll(async () => {
    // 创建管理员
    const admin = await register('admin_test_ap', 'admin_ap@test.com', true)
    adminToken = admin.token; adminId = admin.id

    // 创建普通用户 1，并产生积分
    const u1 = await register('user1_ap', 'u1_ap@test.com')
    user1Token = u1.token; user1Id = u1.id
    // 发布 3 篇文章 → +15
    await publishPost(user1Token, 'Post 1 by user1', 'This is the content for post one')
    await publishPost(user1Token, 'Post 2 by user1', 'This is the content for post two')
    await publishPost(user1Token, 'Post 3 by user1', 'This is the content for post three')

    // 普通用户 2，产生积分
    const u2 = await register('user2_ap', 'u2_ap@test.com')
    user2Token = u2.token; user2Id = u2.id
    await publishPost(user2Token, 'Post 1 by user2', 'This is the content of user2 post one')
    await publishPost(user2Token, 'Post 2 by user2', 'This is the content of user2 post two')
    // user2 评论 user1 的文章（让双方都有积分）
    const posts = await request(app).get('/api/posts').query({ limit: 5 })
    const user1PostId = posts.body.data?.data?.find(p => p.author_id === user1Id)?.id
    if (user1PostId) {
      await request(app)
        .post(`/api/posts/${user1PostId}/comments`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Great post!' })
    }
  })

  // ── 非 admin 访问应被拒绝 ──────────────────────────────
  describe('权限检查', () => {
    it('普通用户访问 admin 积分统计 → 403', async () => {
      const r = await request(app)
        .get('/api/admin/points/stats')
        .set('Authorization', `Bearer ${user1Token}`)
      expect(r.status).toBe(403)
    })

    it('普通用户访问用户积分列表 → 403', async () => {
      const r = await request(app)
        .get('/api/admin/points/users')
        .set('Authorization', `Bearer ${user1Token}`)
      expect(r.status).toBe(403)
    })

    it('未登录访问 → 401', async () => {
      const r = await request(app).get('/api/admin/points/stats')
      expect(r.status).toBe(401)
    })
  })

  // ── 积分统计 ────────────────────────────────────────────
  describe('GET /api/admin/points/stats', () => {
    it('返回积分统计数据', async () => {
      const r = await request(app)
        .get('/api/admin/points/stats')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(r.status).toBe(200)
      expect(r.body.success).toBe(true)
      const data = r.body.data
      expect(data).toHaveProperty('totalUsers')
      expect(data).toHaveProperty('totalPoints')
      expect(data).toHaveProperty('avgPoints')
      expect(data).toHaveProperty('levelDist')
      expect(data).toHaveProperty('recentLogs')
      expect(data).toHaveProperty('topUsers')
      // 至少有 2 个用户有积分
      expect(data.totalUsers).toBeGreaterThanOrEqual(2)
      expect(data.totalPoints).toBeGreaterThan(0)
      expect(data.avgPoints).toBeGreaterThan(0)
    })

    it('levelDist 包含正确的等级分布', async () => {
      const r = await request(app)
        .get('/api/admin/points/stats')
        .set('Authorization', `Bearer ${adminToken}`)
      const dist = r.body.data.levelDist
      expect(Array.isArray(dist)).toBe(true)
      // 所有用户等级为 1
      const lvl1 = dist.find(d => d.level === 1)
      expect(lvl1).toBeDefined()
      expect(lvl1.cnt).toBeGreaterThanOrEqual(2)
    })

    it('topUsers 按积分降序排列', async () => {
      const r = await request(app)
        .get('/api/admin/points/stats')
        .set('Authorization', `Bearer ${adminToken}`)
      const top = r.body.data.topUsers
      expect(Array.isArray(top)).toBe(true)
      if (top.length > 1) {
        expect(top[0].total).toBeGreaterThanOrEqual(top[1].total)
      }
    })

    it('recentLogs 包含最近的积分记录', async () => {
      const r = await request(app)
        .get('/api/admin/points/stats')
        .set('Authorization', `Bearer ${adminToken}`)
      const logs = r.body.data.recentLogs
      expect(Array.isArray(logs)).toBe(true)
      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0]).toHaveProperty('username')
      expect(logs[0]).toHaveProperty('action')
      expect(logs[0]).toHaveProperty('points')
    })
  })

  // ── 用户积分列表 ────────────────────────────────────────
  describe('GET /api/admin/points/users', () => {
    it('返回用户积分列表（默认分页）', async () => {
      const r = await request(app)
        .get('/api/admin/points/users')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(r.status).toBe(200)
      expect(r.body.success).toBe(true)
      const data = r.body.data
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('page')
      expect(data).toHaveProperty('data')
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.total).toBeGreaterThanOrEqual(2)
    })

    it('每条用户记录包含必要的字段', async () => {
      const r = await request(app)
        .get('/api/admin/points/users')
        .set('Authorization', `Bearer ${adminToken}`)
      const user = r.body.data.data[0]
      expect(user).toHaveProperty('user_id')
      expect(user).toHaveProperty('total')
      expect(user).toHaveProperty('level')
      expect(user).toHaveProperty('title')
      expect(user).toHaveProperty('username')
      expect(user).toHaveProperty('role')
    })

    it('默认按积分降序', async () => {
      const r = await request(app)
        .get('/api/admin/points/users')
        .set('Authorization', `Bearer ${adminToken}`)
      const users = r.body.data.data
      if (users.length > 1) {
        expect(users[0].total).toBeGreaterThanOrEqual(users[1].total)
      }
    })

    it('支持按用户名搜索', async () => {
      const r = await request(app)
        .get('/api/admin/points/users')
        .query({ search: 'user1' })
        .set('Authorization', `Bearer ${adminToken}`)
      expect(r.status).toBe(200)
      const users = r.body.data.data
      expect(users.length).toBeGreaterThanOrEqual(1)
      expect(users.every(u => u.username.includes('user1'))).toBe(true)
    })

    it('搜索不存在的用户返回空', async () => {
      const r = await request(app)
        .get('/api/admin/points/users')
        .query({ search: 'zzz_nonexist' })
        .set('Authorization', `Bearer ${adminToken}`)
      expect(r.status).toBe(200)
      expect(r.body.data.data.length).toBe(0)
      expect(r.body.data.total).toBe(0)
    })

    it('支持按等级排序', async () => {
      const r = await request(app)
        .get('/api/admin/points/users')
        .query({ sortBy: 'level', order: 'asc' })
        .set('Authorization', `Bearer ${adminToken}`)
      expect(r.status).toBe(200)
      // 等级 1 在前
      expect(r.body.data.data[0].level).toBeLessThanOrEqual(1)
    })

    it('分页参数生效', async () => {
      const r = await request(app)
        .get('/api/admin/points/users')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${adminToken}`)
      expect(r.status).toBe(200)
      expect(r.body.data.data.length).toBe(1)
      expect(r.body.data.page).toBe(1)
      expect(r.body.data.limit).toBe(1)
    })
  })

  // ── 积分流水 ────────────────────────────────────────────
  describe('GET /api/admin/points/users/:id/logs', () => {
    it('获取用户的积分流水', async () => {
      const r = await request(app)
        .get(`/api/admin/points/users/${user1Id}/logs`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(r.status).toBe(200)
      expect(r.body.success).toBe(true)
      const data = r.body.data
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('data')
      expect(Array.isArray(data.data)).toBe(true)
      // user1 发表了 3 篇文章，所以至少有 3 条记录
      expect(data.total).toBeGreaterThanOrEqual(3)
    })

    it('流水记录包含所有必要字段', async () => {
      const r = await request(app)
        .get(`/api/admin/points/users/${user1Id}/logs`)
        .set('Authorization', `Bearer ${adminToken}`)
      const log = r.body.data.data[0]
      expect(log).toHaveProperty('id')
      expect(log).toHaveProperty('user_id')
      expect(log).toHaveProperty('action')
      expect(log).toHaveProperty('points')
      expect(log).toHaveProperty('description')
      expect(log).toHaveProperty('created_at')
    })

    it('分页支持', async () => {
      const r = await request(app)
        .get(`/api/admin/points/users/${user1Id}/logs`)
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`)
      expect(r.status).toBe(200)
      expect(r.body.data.data.length).toBeLessThanOrEqual(2)
    })

    it('非 admin 用户被拒绝', async () => {
      const r = await request(app)
        .get(`/api/admin/points/users/${user1Id}/logs`)
        .set('Authorization', `Bearer ${user1Token}`)
      expect(r.status).toBe(403)
    })
  })

  // ── 手动调整积分 ────────────────────────────────────────
  describe('POST /api/admin/points/users/:id/adjust', () => {
    it('增加积分 → 正常', async () => {
      const r = await request(app)
        .post(`/api/admin/points/users/${user1Id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 50, reason: '测试加分' })
      expect(r.status).toBe(200)
      expect(r.body.success).toBe(true)
      expect(r.body.data.adjusted).toBe(50)
      expect(r.body.data.total).toBeGreaterThan(0)
    })

    it('扣除积分 → 正常', async () => {
      const r = await request(app)
        .post(`/api/admin/points/users/${user1Id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: -10, reason: '测试扣分' })
      expect(r.status).toBe(200)
      expect(r.body.success).toBe(true)
      expect(r.body.data.adjusted).toBe(-10)
    })

    it('调整后流水中有调整记录', async () => {
      const r = await request(app)
        .get(`/api/admin/points/users/${user1Id}/logs`)
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`)
      const logs = r.body.data.data
      const adjustLogs = logs.filter(l => l.action === 'admin_add' || l.action === 'admin_deduct')
      expect(adjustLogs.length).toBeGreaterThanOrEqual(2)
      // 调整日志包含原因
      expect(adjustLogs[0].description).toMatch(/管理员/)
    })

    it('amount 为 0 → 400', async () => {
      const r = await request(app)
        .post(`/api/admin/points/users/${user1Id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 0, reason: '无效调整' })
      expect(r.status).toBe(400)
      expect(r.body.message).toMatch(/无效/)
    })

    it('缺少 reason → 400', async () => {
      const r = await request(app)
        .post(`/api/admin/points/users/${user1Id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 10, reason: '   ' })
      expect(r.status).toBe(400)
    })

    it('不能扣到负数（最低为 0）', async () => {
      const r = await request(app)
        .post(`/api/admin/points/users/${user2Id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: -99999, reason: '测试大额扣分' })
      expect(r.status).toBe(200)
      expect(r.body.data.total).toBe(0)
    })

    it('非 admin 用户调整积分 → 403', async () => {
      const r = await request(app)
        .post(`/api/admin/points/users/${user1Id}/adjust`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ amount: 10, reason: '测试' })
      expect(r.status).toBe(403)
    })

    it('调整积分后重新计算等级', async () => {
      // user2 当前积分很少，加 100 后总分 > 50 → 应升级为 Lv.2
      const r = await request(app)
        .post(`/api/admin/points/users/${user2Id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 100, reason: '测试升级' })
      expect(r.status).toBe(200)
      expect(r.body.data.level).toBeGreaterThanOrEqual(2)
      expect(r.body.data.title).toBe('见习作者')
    })
  })
})

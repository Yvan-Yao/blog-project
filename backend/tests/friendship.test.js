/**
 * @file friendship.test.js
 * @description 好友搜索 + 好友关系管理自动化测试
 *
 * 覆盖：
 *   - 用户搜索 (GET /api/friends/search?q=xxx)
 *   - 发送/接受/拒绝好友请求
 *   - 好友列表 & 请求列表
 *   - 删除好友
 *   - 各种边界情况
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import { resolve } from 'path'

process.env.DB_PATH = './data/test_friendships.db'
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_friends'

import { initDatabase } from '../src/models/database.js'
await initDatabase()

const { app } = await import('../src/app.js')

let userAToken, userBToken, userCToken
let userIdA, userIdB, userIdC

describe('🫂 好友搜索 & 关系管理 API', () => {
  // ─────────────────────────────────────────────
  //  Setup: 创建 3 个独立测试用户
  // ─────────────────────────────────────────────
  beforeAll(async () => {
    // 用户 A — 发起者
    const rA = await request(app)
      .post('/api/auth/register')
      .send({ username: 'friend_user_a', email: 'fa@test.com', password: '123456' })
    expect(rA.status).toBe(201)
    expect(rA.body.success).toBe(true)
    userAToken = rA.body.data.token
    userIdA = rA.body.data.user.id

    // 用户 B — 被添加者
    const rB = await request(app)
      .post('/api/auth/register')
      .send({ username: 'friend_user_b', email: 'fb@test.com', password: '123456' })
    expect(rB.status).toBe(201)
    userBToken = rB.body.data.token
    userIdB = rB.body.data.user.id

    // 用户 C — 无关第三方
    const rC = await request(app)
      .post('/api/auth/register')
      .send({ username: 'friend_user_c', email: 'fc@test.com', password: '123456' })
    expect(rC.status).toBe(201)
    userCToken = rC.body.data.token
    userIdC = rC.body.data.user.id
  })

  // ─────────────────────────────────────────────
  //  Cleanup
  // ─────────────────────────────────────────────
  afterAll(() => {
    const dbPath = resolve('./data/test_friendships.db')
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  // ─────────────────────────────────────────────
  //  1. 用户搜索测试
  // ─────────────────────────────────────────────
  describe('🔍 GET /api/friends/search?q=xxx — 用户搜索', () => {
    it('搜索存在的用户 — 返回匹配结果', async () => {
      const res = await request(app)
        .get('/api/friends/search?q=friend_user')
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      // 应该排除自己 (userA)
      expect(res.body.data.length).toBeGreaterThanOrEqual(2)
      // 验证返回包含 userB 和 userC
      const usernames = res.body.data.map((u) => u.username)
      expect(usernames).toContain('friend_user_b')
      expect(usernames).toContain('friend_user_c')
      // 不应该包含自己
      expect(usernames).not.toContain('friend_user_a')
    })

    it('搜索结果包含 friendship_status 字段', async () => {
      const res = await request(app)
        .get('/api/friends/search?q=friend_user_b')
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(1)
      expect(res.body.data[0]).toHaveProperty('friendship_status')
      // 尚未添加，状态为 null
      expect(res.body.data[0].friendship_status).toBeNull()
    })

    it('空查询 — 返回空数组', async () => {
      const res = await request(app)
        .get('/api/friends/search?q=')
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('无匹配用户 — 返回空数组', async () => {
      const res = await request(app)
        .get('/api/friends/search?q=no_such_user_xyz')
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('未登录无法搜索', async () => {
      const res = await request(app)
        .get('/api/friends/search?q=friend')
      expect(res.status).toBe(401)
    })

    it('搜索大小写敏感测试 — LIKE 匹配', async () => {
      // SQLite LIKE 默认不区分 ASCII 大小写
      const res = await request(app)
        .get('/api/friends/search?q=FRIEND_USER')
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ─────────────────────────────────────────────
  //  2. 发送好友请求测试
  // ─────────────────────────────────────────────
  describe('📨 POST /api/friends/request/:userId — 发送好友请求', () => {
    it('正常发送好友请求', async () => {
      const res = await request(app)
        .post(`/api/friends/request/${userIdB}`)
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/已发送/)
    })

    it('不能重复发送 pending 状态的请求', async () => {
      const res = await request(app)
        .post(`/api/friends/request/${userIdB}`)
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(409)
      expect(res.body.message).toMatch(/已发送|等待/)
    })

    it('不能添加自己为好友', async () => {
      const res = await request(app)
        .post(`/api/friends/request/${userIdA}`)
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(400)
    })

    it('目标用户不存在', async () => {
      const res = await request(app)
        .post('/api/friends/request/99999')
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(404)
    })
  })

  // ─────────────────────────────────────────────
  //  3. 对方查看请求列表 & 搜索中的状态显示
  // ─────────────────────────────────────────────
  describe('📋 好友请求列表 & 搜索状态', () => {
    it('B 收到来自 A 的好友请求', async () => {
      const res = await request(app)
        .get('/api/friends/requests')
        .set('Authorization', `Bearer ${userBToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.received.length).toBe(1)
      expect(res.body.data.received[0].username).toBe('friend_user_a')
    })

    it('A 的发出的请求列表有记录', async () => {
      const res = await request(app)
        .get('/api/friends/requests')
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.sent.length).toBe(1)
      expect(res.body.data.sent[0].username).toBe('friend_user_b')
    })

    it('搜索时 pending 请求显示正确状态', async () => {
      // A 搜索 B，应显示 friendship_status = 'pending'
      const res = await request(app)
        .get('/api/friends/search?q=friend_user_b')
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.body.data[0].friendship_status).toBe('pending')
    })
  })

  // ─────────────────────────────────────────────
  //  4. 拒绝好友请求测试
  // ─────────────────────────────────────────────
  describe('❌ PUT /api/friends/reject/:userId — 拒绝好友请求', () => {
    it('B 拒绝 A 的请求', async () => {
      const res = await request(app)
        .put(`/api/friends/reject/${userIdA}`)
        .set('Authorization', `Bearer ${userBToken}`)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/已拒绝/)
    })

    it('拒绝后 B 的请求列表为空', async () => {
      const res = await request(app)
        .get('/api/friends/requests')
        .set('Authorization', `Bearer ${userBToken}`)
      expect(res.body.data.received.length).toBe(0)
    })

    it('拒绝后可重新发送请求', async () => {
      // A 重新发送
      const res = await request(app)
        .post(`/api/friends/request/${userIdB}`)
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
    })

    it('拒绝不存在的请求返回 404', async () => {
      const res = await request(app)
        .put(`/api/friends/reject/${userIdC}`)
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(404)
    })
  })

  // ─────────────────────────────────────────────
  //  5. 接受好友请求测试
  // ─────────────────────────────────────────────
  describe('✅ PUT /api/friends/accept/:userId — 接受好友请求', () => {
    it('B 接受 A 的请求', async () => {
      const res = await request(app)
        .put(`/api/friends/accept/${userIdA}`)
        .set('Authorization', `Bearer ${userBToken}`)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/已接受/)
    })

    it('接受后搜索显示 accepted 状态', async () => {
      // A 搜索 B
      const res = await request(app)
        .get('/api/friends/search?q=friend_user_b')
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.body.data[0].friendship_status).toBe('accepted')
    })
  })

  // ─────────────────────────────────────────────
  //  6. 好友列表测试
  // ─────────────────────────────────────────────
  describe('👥 GET /api/friends — 好友列表', () => {
    it('A 的好友列表包含 B', async () => {
      const res = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(1)
      expect(res.body.data[0].username).toBe('friend_user_b')
    })

    it('B 的好友列表包含 A（双向）', async () => {
      const res = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${userBToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(1)
      expect(res.body.data[0].username).toBe('friend_user_a')
    })

    it('C 没有好友', async () => {
      const res = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${userCToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('已是好友后不能再次发送请求', async () => {
      const res = await request(app)
        .post(`/api/friends/request/${userIdB}`)
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(409)
      expect(res.body.message).toMatch(/已经是好友/)
    })

    it('未登录无法获取好友列表', async () => {
      const res = await request(app)
        .get('/api/friends')
      expect(res.status).toBe(401)
    })
  })

  // ─────────────────────────────────────────────
  //  7. 删除好友测试
  // ─────────────────────────────────────────────
  describe('🗑️  DELETE /api/friends/:userId — 删除好友', () => {
    it('C 添加 B 为好友（B 先接受）', async () => {
      // C 发送请求
      const r1 = await request(app)
        .post(`/api/friends/request/${userIdB}`)
        .set('Authorization', `Bearer ${userCToken}`)
      expect(r1.status).toBe(201)

      // B 接受
      const r2 = await request(app)
        .put(`/api/friends/accept/${userIdC}`)
        .set('Authorization', `Bearer ${userBToken}`)
      expect(r2.status).toBe(200)
    })

    it('B 删除与 C 的好友关系', async () => {
      const res = await request(app)
        .delete(`/api/friends/${userIdC}`)
        .set('Authorization', `Bearer ${userBToken}`)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('删除后 B 的列表中不再包含 C', async () => {
      const res = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${userBToken}`)
      const ids = res.body.data.map((f) => f.id)
      expect(ids).not.toContain(userIdC)
    })
  })

  // ─────────────────────────────────────────────
  //  8. 边界情况测试
  // ─────────────────────────────────────────────
  describe('⚡ 边界情况', () => {
    it('没有参数 q 的搜索 — 返回空数组', async () => {
      const res = await request(app)
        .get('/api/friends/search')
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('纯空格查询 — 返回空数组', async () => {
      const res = await request(app)
        .get('/api/friends/search?q=   ')
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('搜索不匹配用户名 — 返回空', async () => {
      const res = await request(app)
        .get('/api/friends/search?q=%E4%B8%8D%E5%AD%98%E5%9C%A8') // "不存在"
        .set('Authorization', `Bearer ${userAToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(0)
    })
  })
})

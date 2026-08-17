/**
 * @file points.test.js
 * @description 积分 / 等级 / 头衔 / 点赞系统全覆盖测试
 *
 * 积分规则：
 *  - 发布文章   → 作者 +5
 *  - 评论       → 评论者 +1，文章作者 +2（不自评）
 *  - 点赞       → 点赞者 +1，文章作者 +2（不给自己点赞，每篇文章限 1 次）
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'

// 每次测试使用唯一文件名，确保测试完全隔离
const DB_FILE = `./data/test_points_${Date.now()}.db`
process.env.DB_PATH = DB_FILE
process.env.NODE_ENV = 'test'

import { initDatabase } from '../src/models/database.js'
await initDatabase()

const { app } = await import('../src/app.js')

// ── 辅助函数 ─────────────────────────────────────────────
async function register(username, email) {
  const r = await request(app)
    .post('/api/auth/register')
    .send({ username, email, password: '123456' })
  return { token: r.body.data.token, id: r.body.data.user.id }
}

async function getPoints(token) {
  const r = await request(app)
    .get('/api/points/me')
    .set('Authorization', `Bearer ${token}`)
  return r.body.data
}

// ── 全局状态（所有 describe 共享）───────────────────────
let authorToken, authorId
let readerToken, readerId
let postId
let commentId

// ── 测试套件 ─────────────────────────────────────────────
describe('积分系统', () => {

  // 最外层 beforeAll：注册用户（在所有 describe 之前执行）
  beforeAll(async () => {
    const a = await register('积分作者', 'pts_author@test.com')
    const b = await register('积分读者', 'pts_reader@test.com')
    authorToken = a.token; authorId = a.id
    readerToken = b.token; readerId = b.id
  })

  afterAll(() => {
    // 清理临时测试数据库文件
    try { fs.unlinkSync(DB_FILE) } catch (_) {}
  })

  // ── 1. 初始状态 ──────────────────────────────────────
  describe('1. 注册后初始状态', () => {
    it('注册后积分为 0', async () => {
      const pts = await getPoints(authorToken)
      expect(pts.total).toBe(0)
    })

    it('初始等级为 1，头衔为「新手」', async () => {
      const pts = await getPoints(authorToken)
      expect(pts.level).toBe(1)
      expect(pts.title).toBe('新手')
    })

    it('未登录不能查看 /points/me', async () => {
      const r = await request(app).get('/api/points/me')
      expect(r.status).toBe(401)
    })

    it('公开接口可查看他人积分 /points/:userId', async () => {
      const r = await request(app).get(`/api/points/${authorId}`)
      expect(r.status).toBe(200)
      expect(r.body.data.user_id).toBe(authorId)
    })

    it('无效 userId 返回 400', async () => {
      const r = await request(app).get('/api/points/0')
      expect(r.status).toBe(400)
    })
  })

  // ── 2. 发布文章 +5 ───────────────────────────────────
  describe('2. 发布文章 → 作者 +5', () => {
    beforeAll(async () => {
      const cr = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ title: 'Points Test Post', content: 'This is a test post for points system testing, long enough.' })
      postId = cr.body.data.id

      await request(app)
        .put(`/api/posts/${postId}/publish`)
        .set('Authorization', `Bearer ${authorToken}`)
    })

    it('发布后作者积分 +5', async () => {
      const pts = await getPoints(authorToken)
      expect(pts.total).toBe(5)
    })

    it('积分流水中有 publish_post 记录', async () => {
      const r = await request(app)
        .get('/api/points/logs')
        .set('Authorization', `Bearer ${authorToken}`)
      expect(r.status).toBe(200)
      const log = r.body.data.data.find(l => l.action === 'publish_post')
      expect(log).toBeTruthy()
      expect(log.points).toBe(5)
    })
  })

  // ── 3. 评论积分 ──────────────────────────────────────
  describe('3. 评论 → 评论者 +1，作者 +2', () => {
    beforeAll(async () => {
      const r = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${readerToken}`)
        .send({ content: '这篇文章写得真好！' })
      commentId = r.body.data.id
    })

    it('评论者积分 +1', async () => {
      const pts = await getPoints(readerToken)
      expect(pts.total).toBe(1)
    })

    it('文章作者收到评论 +2', async () => {
      const pts = await getPoints(authorToken)
      expect(pts.total).toBe(7) // 5 (发布) + 2 (评论)
    })

    it('读者积分流水包含 post_comment', async () => {
      const r = await request(app)
        .get('/api/points/logs')
        .set('Authorization', `Bearer ${readerToken}`)
      const log = r.body.data.data.find(l => l.action === 'post_comment')
      expect(log).toBeTruthy()
      expect(log.points).toBe(1)
    })

    it('作者积分流水包含 receive_comment', async () => {
      const r = await request(app)
        .get('/api/points/logs')
        .set('Authorization', `Bearer ${authorToken}`)
      const log = r.body.data.data.find(l => l.action === 'receive_comment')
      expect(log).toBeTruthy()
      expect(log.points).toBe(2)
    })

    it('作者自评 — 仅得 post_comment +1，不得 receive_comment', async () => {
      const before = await getPoints(authorToken)
      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ content: '我是作者，自评一下' })
      const after = await getPoints(authorToken)
      expect(after.total - before.total).toBe(1)
    })
  })

  // ── 4. 点赞积分 ──────────────────────────────────────
  describe('4. 点赞 → 点赞者 +1，作者 +2（每篇文章限 1 次）', () => {
    it('读者点赞文章', async () => {
      const r = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${readerToken}`)
      expect(r.status).toBe(200)
      expect(r.body.data.liked).toBe(true)
    })

    it('点赞者积分 +1', async () => {
      const pts = await getPoints(readerToken)
      // 1 (评论) + 1 (点赞) = 2
      expect(pts.total).toBe(2)
    })

    it('文章作者收到点赞 +2', async () => {
      const pts = await getPoints(authorToken)
      // 5 + 2 (评论) + 1 (自评) + 2 (点赞) = 10
      expect(pts.total).toBe(10)
    })

    it('重复点赞返回 400', async () => {
      const r = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${readerToken}`)
      expect(r.status).toBe(400)
      expect(r.body.message).toMatch(/已经点过赞/)
    })

    it('作者不能给自己文章点赞 → 400', async () => {
      const r = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${authorToken}`)
      expect(r.status).toBe(400)
    })

    it('未登录不能点赞 → 401', async () => {
      const r = await request(app).post(`/api/posts/${postId}/like`)
      expect(r.status).toBe(401)
    })

    it('GET /posts/:id/like 返回点赞状态', async () => {
      const r = await request(app)
        .get(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${readerToken}`)
      expect(r.status).toBe(200)
      expect(typeof r.body.data.liked).toBe('boolean')
      expect(typeof r.body.data.like_count).toBe('number')
    })

    it('GET /posts/:id/likes/count 公开接口', async () => {
      const r = await request(app).get(`/api/posts/${postId}/likes/count`)
      expect(r.status).toBe(200)
      expect(r.body.data.like_count).toBeGreaterThanOrEqual(0)
    })

    it('文章详情包含 like_count 和 is_liked 字段', async () => {
      const list = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${readerToken}`)
      const post = list.body.data.data.find(p => p.id === postId)
      const slug = encodeURIComponent(post.slug)
      const r = await request(app)
        .get(`/api/posts/${slug}`)
        .set('Authorization', `Bearer ${readerToken}`)
      expect(r.status).toBe(200)
      expect(typeof r.body.data.like_count).toBe('number')
      expect(typeof r.body.data.is_liked).toBe('boolean')
    })
  })

  // ── 5. 等级/头衔/排行榜 ──────────────────────────────
  describe('5. 等级计算与排行榜', () => {
    it('积分流水分页返回正确结构', async () => {
      const r = await request(app)
        .get('/api/points/logs?page=1&limit=5')
        .set('Authorization', `Bearer ${authorToken}`)
      expect(r.status).toBe(200)
      expect(r.body.data).toHaveProperty('total')
      expect(r.body.data).toHaveProperty('data')
      expect(Array.isArray(r.body.data.data)).toBe(true)
    })

    it('积分排行榜公开可访问', async () => {
      const r = await request(app).get('/api/points/leaderboard')
      expect(r.status).toBe(200)
      expect(Array.isArray(r.body.data)).toBe(true)
    })

    it('排行榜按积分降序排列', async () => {
      const r = await request(app).get('/api/points/leaderboard')
      const data = r.body.data
      for (let i = 1; i < data.length; i++) {
        expect(data[i - 1].total).toBeGreaterThanOrEqual(data[i].total)
      }
    })

    it('排行榜数据包含 username / level / title', async () => {
      const r = await request(app).get('/api/points/leaderboard')
      if (r.body.data.length > 0) {
        const row = r.body.data[0]
        expect(row).toHaveProperty('username')
        expect(row).toHaveProperty('level')
        expect(row).toHaveProperty('title')
        expect(row).toHaveProperty('total')
      }
    })

    it('未登录不能查流水 → 401', async () => {
      const r = await request(app).get('/api/points/logs')
      expect(r.status).toBe(401)
    })
  })
})

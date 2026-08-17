/**
 * @file profile.test.js
 * @description 个人信息功能自动化测试
 *
 * 覆盖：
 *   - 获取用户公开资料 (GET /api/auth/profile/:username)
 *   - 更新个人资料 (PUT /api/auth/profile)
 *   - 上传头像 (POST /api/auth/avatar)
 *   - 用户名唯一性检查
 *   - 新增字段 website / location
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import { resolve } from 'path'

process.env.DB_PATH = './data/test_profile.db'
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_profile'

import { initDatabase } from '../src/models/database.js'
await initDatabase()

const { app } = await import('../src/app.js')

let tokenA, tokenB
let userA, userB

describe('👤 个人信息 API', () => {
  // ─────────────────────────────────────────────
  //  Setup: 创建 2 个测试用户
  // ─────────────────────────────────────────────
  beforeAll(async () => {
    // 用户 A
    const rA = await request(app)
      .post('/api/auth/register')
      .send({ username: 'profile_user_a', email: 'pa@test.com', password: '123456' })
    expect(rA.body.success).toBe(true)
    tokenA = rA.body.data.token
    userA = rA.body.data.user

    // 用户 B
    const rB = await request(app)
      .post('/api/auth/register')
      .send({ username: 'profile_user_b', email: 'pb@test.com', password: '123456' })
    expect(rB.body.success).toBe(true)
    tokenB = rB.body.data.token
    userB = rB.body.data.user
  })

  afterAll(() => {
    try { fs.unlinkSync(resolve('./data/test_profile.db')) } catch (_) {}
  })

  // ══════════════════════════════════════════════
  //  公开资料查询
  // ══════════════════════════════════════════════
  describe('GET /api/auth/profile/:username — 公开资料', () => {
    it('可以查看任何用户的公开资料（无需登录）', async () => {
      const res = await request(app).get('/api/auth/profile/profile_user_a')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.username).toBe('profile_user_a')
      expect(res.body.data).not.toHaveProperty('email')  // 不应暴露邮箱
      expect(res.body.data).not.toHaveProperty('password') // 不应暴露密码
    })

    it('公开资料包含 postCount 字段', async () => {
      const res = await request(app).get('/api/auth/profile/profile_user_a')
      expect(res.body.data).toHaveProperty('postCount')
      expect(typeof res.body.data.postCount).toBe('number')
    })

    it('不存在的用户返回 404', async () => {
      const res = await request(app).get('/api/auth/profile/nobody_xyz')
      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })

    it('公开资料包含新字段 website 和 location（默认为 null）', async () => {
      const res = await request(app).get('/api/auth/profile/profile_user_b')
      expect(res.body.data).toHaveProperty('website', null)
      expect(res.body.data).toHaveProperty('location', null)
    })
  })

  // ══════════════════════════════════════════════
  //  更新个人资料
  // ══════════════════════════════════════════════
  describe('PUT /api/auth/profile — 更新资料', () => {
    it('未登录不能更新资料', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .send({ bio: 'hello' })
      expect(res.status).toBe(401)
    })

    it('可以更新个人简介', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ bio: '这是我的个人简介' })
      expect(res.body.success).toBe(true)
      expect(res.body.data.bio).toBe('这是我的个人简介')
    })

    it('可以更新 website 字段', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ website: 'https://myblog.com' })
      expect(res.body.success).toBe(true)
      expect(res.body.data.website).toBe('https://myblog.com')
    })

    it('可以更新 location 字段', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ location: '中国上海' })
      expect(res.body.success).toBe(true)
      expect(res.body.data.location).toBe('中国上海')
    })

    it('可以同时更新多个字段', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          bio: 'Full-stack developer',
          website: 'https://devblog.io',
          location: 'Tokyo',
        })
      expect(res.body.success).toBe(true)
      expect(res.body.data.bio).toBe('Full-stack developer')
      expect(res.body.data.website).toBe('https://devblog.io')
      expect(res.body.data.location).toBe('Tokyo')
    })

    it('可以修改用户名', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ username: 'profile_user_b_renamed' })
      expect(res.body.success).toBe(true)
      expect(res.body.data.username).toBe('profile_user_b_renamed')
    })

    it('用户名冲突时返回 409', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ username: 'profile_user_b_renamed' })
      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
    })

    it('可以设置为与自己当前相同的用户名（不冲突）', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ username: 'profile_user_a' })
      expect(res.body.success).toBe(true)
    })

    it('更新后的资料可通过公开接口查看', async () => {
      const res = await request(app).get('/api/auth/profile/profile_user_a')
      expect(res.body.data.website).toBe('https://myblog.com')
      expect(res.body.data.location).toBe('中国上海')
      expect(res.body.data.bio).toBe('这是我的个人简介')
    })
  })

  // ══════════════════════════════════════════════
  //  头像上传
  // ══════════════════════════════════════════════
  describe('POST /api/auth/avatar — 上传头像', () => {
    it('未登录不能上传头像', async () => {
      const res = await request(app)
        .post('/api/auth/avatar')
        .attach('avatar', Buffer.from('fake-image'), 'test.jpg')
      expect(res.status).toBe(401)
    })

    it('可以上传 PNG 头像', async () => {
      // 创建 1x1 最小 PNG 文件
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82,
      ])

      const res = await request(app)
        .post('/api/auth/avatar')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('avatar', pngBuffer, 'avatar.png')

      expect(res.body.success).toBe(true)
      expect(res.body.data.avatar).toMatch(/^\/uploads\/avatars\/avatar-\d+-\d+\.png$/)
    })

    it('上传头像后 avatar 字段指向正确的 URL 路径', async () => {
      const profile = await request(app).get('/api/auth/profile/profile_user_a')
      expect(profile.body.data.avatar).toMatch(/^\/uploads\/avatars\//)
    })

    it('上传非图片格式会被拒绝', async () => {
      const res = await request(app)
        .post('/api/auth/avatar')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('avatar', Buffer.from('not an image'), 'test.txt')
      expect(res.status).toBe(500)
    })
  })

  // ══════════════════════════════════════════════
  //  边界情况
  // ══════════════════════════════════════════════
  describe('边界情况', () => {
    it('空字符串 bio 更新为空不会出错', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ bio: '' })
      expect(res.body.success).toBe(true)
    })

    it('超长 bio 仍可保存（数据库层面为 TEXT）', async () => {
      const longBio = 'x'.repeat(500)
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ bio: longBio })
      expect(res.body.success).toBe(true)
    })

    it('location 为空字符串更新正常', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ location: '' })
      expect(res.body.success).toBe(true)
    })
  })
})

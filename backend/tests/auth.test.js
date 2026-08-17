/**
 * @file tests/auth.test.js
 * @description 认证 API 自动化测试
 *
 * 测试覆盖：
 *  - 用户注册（正常/重复用户名/弱密码）
 *  - 用户登录（正常/错误密码/不存在用户）
 *  - 获取当前用户（有/无 Token）
 *  - Admin 注册（使用 adminSecret）
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from '../src/models/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 测试前清理数据库
const TEST_DB = path.resolve(__dirname, '../data/test.db');
beforeAll(async () => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  await initDatabase();
});
afterAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

// 数据库初始化后再导入 app（路由和控制器依赖已初始化的 db）
const { default: app } = await import('../src/app.js');

// 共享测试数据
let userToken = '';
let adminToken = '';

// ─────────────────────────────────────────────
//  用户注册
// ─────────────────────────────────────────────
describe('POST /api/auth/register - 用户注册', () => {
  it('应该成功注册普通用户', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', email: 'test@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('testuser');
    expect(res.body.data.user.role).toBe('user');
    expect(res.body.data.token).toBeTruthy();
    userToken = res.body.data.token;
  });

  it('应该成功注册管理员（使用 adminSecret）', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'adminuser',
        email: 'admin@test.com',
        password: 'admin123',
        adminSecret: 'admin_register_secret_2024',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('admin');
    adminToken = res.body.data.token;
  });

  it('重复用户名应返回 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', email: 'other@test.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('密码太短应返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser', email: 'new@test.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('邮箱格式无效应返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser2', email: 'notanemail', password: 'password123' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
//  用户登录
// ─────────────────────────────────────────────
describe('POST /api/auth/login - 用户登录', () => {
  it('正确凭证应登录成功并返回 token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('错误密码应返回 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('不存在的用户应返回 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nosuchuser', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
//  获取当前用户
// ─────────────────────────────────────────────
describe('GET /api/auth/me - 获取当前用户', () => {
  it('携带有效 token 应返回用户信息', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('testuser');
  });

  it('不携带 token 应返回 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('无效 token 应返回 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

export { userToken, adminToken };

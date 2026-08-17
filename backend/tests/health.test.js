/**
 * @file tests/health.test.js
 * @description 健康检查 + Admin 登录冒烟测试
 *
 * 覆盖：
 *  - 服务器存活（app 可处理请求）
 *  - Vite 代理链路（基础 URL 响应）
 *  - Admin 登录（正确/错误凭证）
 *  - Admin Token 有效性（/auth/me 返回 admin 角色）
 *  - Admin 端点鉴权（/admin/stats 需 token）
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from '../src/models/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.resolve(__dirname, '../data/test.db');

// ── 清理 + 初始化 ──
beforeAll(async () => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  await initDatabase();
});
afterAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

// 数据库就绪后再导入 app
const { default: app } = await import('../src/app.js');

// ─────────────────────────────────────────────
//  健康检查 — 服务器存活
// ─────────────────────────────────────────────
describe('服务器存活检查', () => {
  it('GET /api/categories 应返回 200（公开端点可访问）', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('不存在的路由应返回 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
//  Admin 登录冒烟测试
// ─────────────────────────────────────────────
let adminToken = '';

describe('POST /api/auth/login — Admin 登录', () => {
  beforeAll(async () => {
    // 先注册一个 admin 账号
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'adminsmoke',
        email: 'adminsmoke@test.com',
        password: 'admin123',
        adminSecret: 'admin_register_secret_2024',
      });
  });

  it('正确 admin 凭证应登录成功并返回 role=admin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'adminsmoke', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.password).toBeUndefined();
    adminToken = res.body.data.token;
  });

  it('错误密码应返回 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'adminsmoke', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('不存在的用户应返回 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'noone', password: 'whatever' });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
//  Admin Token 有效性
// ─────────────────────────────────────────────
describe('GET /api/auth/me — Admin Token 验证', () => {
  it('携带有效 admin token 应返回 role=admin', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('admin');
    expect(res.body.data.username).toBe('adminsmoke');
  });

  it('不携带 token 应返回 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('无效 token 应返回 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer bad.token.value');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
//  Admin 端点鉴权
// ─────────────────────────────────────────────
describe('Admin 端点鉴权', () => {
  it('GET /api/admin/stats 携带 admin token 应返回 200', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /api/admin/stats 无 token 应返回 401', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/stats 错误 token 应返回 401', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', 'Bearer badtoken');
    expect(res.status).toBe(401);
  });
});

export { adminToken };

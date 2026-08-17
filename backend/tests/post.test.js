/**
 * @file tests/post.test.js
 * @description 文章 API 自动化测试
 *
 * 测试覆盖：获取列表/创建/发布/详情/更新/删除
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from '../src/models/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.resolve(__dirname, '../data/test_post.db');

// 先清理旧数据库 + 设置路径 + 初始化
beforeAll(async () => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  process.env.DB_PATH = './data/test_post.db';
  await initDatabase();
});
afterAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

const { default: app } = await import('../src/app.js');

let userToken = '';
let adminToken = '';
let postId = 0;
let postSlug = '';

beforeAll(async () => {
  const userRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'postuser', email: 'postuser@test.com', password: 'password123' });
  userToken = userRes.body.data?.token || '';

  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'postadmin', email: 'postadmin@test.com', password: 'admin123', adminSecret: 'admin_register_secret_2024' });
  adminToken = adminRes.body.data?.token || '';
});

describe('GET /api/posts', () => {
  it('初始无文章返回空列表', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
  });
  it('支持分页参数', async () => {
    const res = await request(app).get('/api/posts?page=1&limit=5');
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(5);
  });
});

describe('POST /api/posts', () => {
  it('未登录不能创建', async () => {
    const res = await request(app).post('/api/posts').send({ title: '测试', content: '测试内容超过十个字符' });
    expect(res.status).toBe(401);
  });
  it('普通用户创建草稿', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: '我的第一篇文章', content: '文章内容足够长，用于测试创建功能。', summary: '摘要' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    postId = res.body.data.id;
    postSlug = res.body.data.slug;
  });
  it('标题太短返回 400', async () => {
    const res = await request(app).post('/api/posts').set('Authorization', `Bearer ${userToken}`)
      .send({ title: '短', content: '测试内容，需要超过十个字符才行' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/posts/:id/publish', () => {
  it('文章作者可以发布自己的文章', async () => {
    const res = await request(app).put(`/api/posts/${postId}/publish`).set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('published');
  });
  it('Admin 可以发布任意文章', async () => {
    // 用户再创建一篇，admin 来发布
    const p = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Admin 发布测试', content: '需要超过十个字的文章内容才行' });
    const res = await request(app).put(`/api/posts/${p.body.data.id}/publish`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('published');
  });
  it('非作者普通用户不能发布他人文章', async () => {
    const p = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: '非作者发布测试', content: '非作者不能发布此文章。需要超过十个字。' });
    const u2 = await request(app).post('/api/auth/register')
      .send({ username: 'otheruser', email: 'other@test.com', password: 'password123' });
    const res = await request(app).put(`/api/posts/${p.body.data.id}/publish`).set('Authorization', `Bearer ${u2.body.data.token}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/posts/:slug', () => {
  it('返回已发布文章详情', async () => {
    const res = await request(app).get(`/api/posts/${encodeURIComponent(postSlug)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('我的第一篇文章');
  });
  it('不存在的文章返回 404', async () => {
    const res = await request(app).get('/api/posts/nonexistent-slug');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/posts/:id', () => {
  it('作者可更新自己的文章', async () => {
    const res = await request(app).put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ summary: '更新摘要' });
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBe('更新摘要');
  });
  it('非作者不能更新', async () => {
    const u2 = await request(app).post('/api/auth/register')
      .send({ username: 'user2', email: 'u2@test.com', password: 'password123' });
    const res = await request(app).put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${u2.body.data.token}`)
      .send({ summary: '篡改' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/posts/:id', () => {
  it('作者可删除自己的文章', async () => {
    const res = await request(app).delete(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });
  it('已删除文章返回 404', async () => {
    const res = await request(app).get(`/api/posts/${encodeURIComponent(postSlug)}`);
    expect(res.status).toBe(404);
  });
});

/**
 * @file tests/comment.test.js
 * @description 评论 API 自动化测试
 *
 * 测试覆盖：列表/发表/回复/嵌套结构/权限删除
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from '../src/models/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.resolve(__dirname, '../data/test_comment.db');

beforeAll(async () => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  process.env.DB_PATH = './data/test_comment.db';
  await initDatabase();
});
afterAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

const { default: app } = await import('../src/app.js');

let userToken = '';
let adminToken = '';
let publishedPostId = 0;
let commentId = 0;

beforeAll(async () => {
  const u = await request(app).post('/api/auth/register')
    .send({ username: 'commenter', email: 'c@test.com', password: 'password123' });
  userToken = u.body.data.token;

  const a = await request(app).post('/api/auth/register')
    .send({ username: 'cadmin', email: 'ca@test.com', password: 'admin123', adminSecret: 'admin_register_secret_2024' });
  adminToken = a.body.data.token;

  const p = await request(app).post('/api/posts')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: '评论测试文章', content: '这是用于测试评论功能的文章内容，足够长且有意义。', status: 'published' });
  publishedPostId = p.body.data.id;
});

describe('GET /api/posts/:id/comments', () => {
  it('空评论列表', async () => {
    const res = await request(app).get(`/api/posts/${publishedPostId}/comments`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });
});

describe('POST /api/posts/:id/comments', () => {
  it('未登录不能评论', async () => {
    const res = await request(app).post(`/api/posts/${publishedPostId}/comments`).send({ content: '游客评论' });
    expect(res.status).toBe(401);
  });
  it('登录用户发表顶层评论', async () => {
    const res = await request(app).post(`/api/posts/${publishedPostId}/comments`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: '文章写得真好！' });
    expect(res.status).toBe(201);
    expect(res.body.data.parent_id).toBeNull();
    commentId = res.body.data.id;
  });
  it('回复评论（嵌套）', async () => {
    const res = await request(app).post(`/api/posts/${publishedPostId}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: '谢谢回复！', parent_id: commentId });
    expect(res.status).toBe(201);
    expect(res.body.data.parent_id).toBe(commentId);
  });
  it('空内容返回 400', async () => {
    const res = await request(app).post(`/api/posts/${publishedPostId}/comments`)
      .set('Authorization', `Bearer ${userToken}`).send({ content: '' });
    expect(res.status).toBe(400);
  });
});

describe('评论嵌套结构', () => {
  it('顶层评论含 replies 数组', async () => {
    const res = await request(app).get(`/api/posts/${publishedPostId}/comments`);
    const top = res.body.data.filter(c => !c.parent_id);
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].replies.length).toBeGreaterThan(0);
  });
});

describe('DELETE /api/comments/:id', () => {
  it('非作者不能删除别人的评论', async () => {
    const u3 = await request(app).post('/api/auth/register')
      .send({ username: 'u3', email: 'u3@test.com', password: 'password123' });
    const res = await request(app).delete(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${u3.body.data.token}`);
    expect(res.status).toBe(403);
  });
  it('作者可以删除', async () => {
    const res = await request(app).delete(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });
  it('Admin 可以删除任意评论', async () => {
    const c = await request(app).post(`/api/posts/${publishedPostId}/comments`)
      .set('Authorization', `Bearer ${userToken}`).send({ content: '待删除' });
    const res = await request(app).delete(`/api/comments/${c.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

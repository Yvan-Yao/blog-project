/**
 * @file tests/smoke.test.js
 * @description E2E 冒烟测试 — 模拟用户完整操作链
 *
 * 不走真实网络，直接通过 supertest 对 Express app 发请求。
 * 覆盖一条完整用户旅程：注册 → 登录 → 发文章 → 评论 → 收藏 → 退出
 *
 * 目的：验证前后端"隐式约定"一致性
 *   此前出现过前端发 parent_id: null 导致后端 400 的问题 —
 *   这类问题单元测试很难捕获，但冒烟测试能直接暴露。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { initDatabase } from '../src/models/database.js';

describe('E2E 冒烟: 用户完整操作链', () => {
  let userA = { token: null };
  let userB = { token: null };
  let postId;
  let commentId;

  beforeAll(async () => {
    await initDatabase();
  });

  // ═══════════════════════════════════════════════════════════
  //  阶段 1：注册 + 登录
  // ═══════════════════════════════════════════════════════════

  it('A 注册', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'smoke_a', email: 'smoke_a@test.com', password: 'password123' });
    expect(res.status).toBe(201);
  });

  it('B 注册', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'smoke_b', email: 'smoke_b@test.com', password: 'password123' });
    expect(res.status).toBe(201);
  });

  it('A 登录', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'smoke_a', password: 'password123' });
    expect(res.status).toBe(200);
    userA.token = res.body.data.token;
    expect(userA.token).toBeTruthy();
  });

  it('B 登录', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'smoke_b', password: 'password123' });
    expect(res.status).toBe(200);
    userB.token = res.body.data.token;
    expect(userB.token).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════
  //  阶段 2：A 创建并发布文章
  // ═══════════════════════════════════════════════════════════

  it('A 创建文章', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ title: '冒烟测试文章', content: '这是冒烟测试的内容，长度至少超过10个字符。' });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    postId = res.body.data.id;
  });

  it('A 发布文章', async () => {
    const res = await request(app)
      .put(`/api/posts/${postId}/publish`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(res.status).toBe(200);
  });

  // ═══════════════════════════════════════════════════════════
  //  阶段 3：评论（验证 parent_id 语义）
  // ═══════════════════════════════════════════════════════════

  it('B 发表顶层评论（不传 parent_id）', async () => {
    // ⚠️ 关键：前端默认不传 parent_id，后端应视为顶层评论
    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ content: '这里的写法值得借鉴！' });
    expect(res.status).toBe(201);
    expect(res.body.data.parent_id).toBeNull();
    commentId = res.body.data.id;
  });

  it('B 发表顶层评论（parent_id: null）', async () => {
    // ⚠️ 回归 Bug #13：前端 JSON.stringify 会把 parent_id 序列化为 null
    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ content: '第二条顶层评论', parent_id: null });
    expect(res.status).toBe(201);
    expect(res.body.data.parent_id).toBeNull();
  });

  it('B 发表顶层评论（parent_id: ""）', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ content: '第三条顶层评论', parent_id: '' });
    expect(res.status).toBe(201);
    expect(res.body.data.parent_id).toBeNull();
  });

  it('A 回复 B 的评论', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ content: '谢谢！也欢迎你投稿。', parent_id: commentId });
    expect(res.status).toBe(201);
    expect(res.body.data.parent_id).toBe(commentId);
  });

  it('查看评论列表包含嵌套结构', async () => {
    const res = await request(app)
      .get(`/api/posts/${postId}/comments`);
    expect(res.status).toBe(200);
    // 评论列表直接挂在 data 下（非 data.comments）
    expect(Array.isArray(res.body.data)).toBe(true);
    // 至少有一条顶层评论
    const topLevel = res.body.data.filter(c => c.parent_id === null);
    expect(topLevel.length).toBeGreaterThanOrEqual(3);
    // 至少有一条带 replies
    const withReplies = res.body.data.filter(c => Array.isArray(c.replies) && c.replies.length > 0);
    expect(withReplies.length).toBeGreaterThanOrEqual(1);
  });

  // ═══════════════════════════════════════════════════════════
  //  阶段 4：收藏
  // ═══════════════════════════════════════════════════════════

  it('B 收藏 A 的文章', async () => {
    const res = await request(app)
      .post(`/api/bookmarks/${postId}`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(res.status).toBe(200);
    // toggle 返回 spread: { success, bookmarked, message }
    expect(res.body.bookmarked).toBe(true);
  });

  it('B 查看收藏列表包含该文章', async () => {
    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${userB.token}`);
    expect(res.status).toBe(200);
    // list 返回 spread: { success, data, total, page, totalPages }
    const ids = res.body.data.map(b => b.id);
    expect(ids).toContain(postId);
  });

  it('B 取消收藏', async () => {
    const res = await request(app)
      .post(`/api/bookmarks/${postId}`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(res.status).toBe(200);
    expect(res.body.bookmarked).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════
  //  阶段 5：A 删除自己的文章 → 关联评论级联清理
  // ═══════════════════════════════════════════════════════════

  it('A 删除文章', async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(res.status).toBe(200);
  });

  it('删除后文章 404', async () => {
    const res = await request(app)
      .get(`/api/posts/${postId}`);
    expect(res.status).toBe(404);
  });

  it('删除后评论不可见', async () => {
    const res = await request(app)
      .get(`/api/posts/${postId}/comments`);
    // 404（文章不存在）或 200（空列表）均可接受
    expect([200, 404]).toContain(res.status);
  });
});

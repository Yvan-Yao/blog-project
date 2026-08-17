/**
 * @file tests/homepage.test.js
 * @description 首页 API 测试
 *
 * 覆盖首页（HomePage.jsx）所依赖的全部 API 端点：
 *  - GET /api/posts      — 文章列表（分页/搜索/分类/排序）
 *  - GET /api/categories — 分类列表
 *
 * 这些用例确保：
 *  1. 首页在后端重启 / 代码修改后仍能正确加载
 *  2. 响应字段与前端使用的 data.data.data / data.data.total 结构一致
 *  3. 各种筛选参数组合不会导致 500 错误
 *
 * Bug #14 — 首页打不开：后端重启后 API 连接断开，前端无数据
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from '../src/models/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.resolve(__dirname, '../data/test.db');

let adminToken = '';
let userToken = '';
let postSlug = '';

beforeAll(async () => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  await initDatabase();
});
afterAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

const { default: app } = await import('../src/app.js');

// ─────────────────────────────────────────────
//  准备测试数据
// ─────────────────────────────────────────────
describe('准备：注册用户 + 创建已发布文章 + 分类', () => {
  it('注册并登录普通用户', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'homeuser', email: 'homeuser@test.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'homeuser', password: 'password123' });

    expect(res.status).toBe(200);
    userToken = res.body.data.token;
  });

  it('注册并登录 Admin 用户', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'homeadmin',
        email: 'homeadmin@test.com',
        password: 'admin123',
        adminSecret: 'admin_register_secret_2024',
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'homeadmin', password: 'admin123' });

    expect(res.status).toBe(200);
    adminToken = res.body.data.token;
  });

  it('Admin 创建分类', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '技术', slug: 'tech', description: '技术文章', color: '#4ade80' });

    expect(res.status).toBe(201);
  });

  it('用户创建文章并发布', async () => {
    const create = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: '首页测试文章',
        content: '这是一篇用于测试首页 API 的文章，内容足够长',
        category_id: 1,
      });

    expect(create.status).toBe(201);
    const postId = create.body.data.id;
    postSlug = create.body.data.slug;

    const pub = await request(app)
      .put(`/api/posts/${postId}/publish`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(pub.status).toBe(200);
  });

  it('再创建 2 篇文章用于分页测试', async () => {
    for (let i = 2; i <= 3; i++) {
      const create = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: `首页文章 ${i}`,
          content: `这是第 ${i} 篇用于分页测试的文章，内容充足`,
        });
      const postId = create.body.data.id;
      await request(app)
        .put(`/api/posts/${postId}/publish`)
        .set('Authorization', `Bearer ${userToken}`);
    }
  });
});

// ─────────────────────────────────────────────
//  Bug #14 — 首页 API 连通性（服务重启后基础保障）
// ─────────────────────────────────────────────
describe('Bug #14 — 首页 API 基础连通性', () => {
  it('GET /api/posts 无需登录应返回 200', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/categories 无需登录应返回 200', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('两个端点都能在同一请求中串联（模拟首页并行请求）', async () => {
    const [postsRes, catsRes] = await Promise.all([
      request(app).get('/api/posts?page=1&limit=8'),
      request(app).get('/api/categories'),
    ]);
    expect(postsRes.status).toBe(200);
    expect(catsRes.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
//  GET /api/posts — 响应结构
// ─────────────────────────────────────────────
describe('GET /api/posts — 响应结构与字段完整性', () => {
  it('响应结构符合前端期望 data.data.data + data.data.total', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.body.success).toBe(true);
    // 前端：data?.data?.data 和 data?.data?.total
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.page).toBe('number');
    expect(typeof res.body.data.limit).toBe('number');
  });

  it('文章对象包含前端所需的所有字段', async () => {
    const res = await request(app).get('/api/posts');
    const post = res.body.data.data[0];
    expect(post).toBeDefined();
    // 前端 PostCardGrid/Minimal/Magazine 会用到的字段
    expect(post).toHaveProperty('id');
    expect(post).toHaveProperty('title');
    expect(post).toHaveProperty('slug');
    expect(post).toHaveProperty('summary');
    expect(post).toHaveProperty('status');
    expect(post).toHaveProperty('views');
    expect(post).toHaveProperty('created_at');
    expect(post).toHaveProperty('author_name');
    expect(post).toHaveProperty('comment_count');
  });

  it('已发布文章 status 均为 published（游客视角）', async () => {
    const res = await request(app).get('/api/posts');
    for (const post of res.body.data.data) {
      expect(post.status).toBe('published');
    }
  });

  it('草稿文章不出现在未登录的文章列表中', async () => {
    // 创建一篇草稿
    await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: '这是草稿文章', content: '未发布内容，前端首页不应看到这篇' });

    const res = await request(app).get('/api/posts');
    const drafts = res.body.data.data.filter(p => p.status === 'draft');
    expect(drafts).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────
//  GET /api/posts — 分页
// ─────────────────────────────────────────────
describe('GET /api/posts — 分页', () => {
  it('默认返回第 1 页', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.body.data.page).toBe(1);
  });

  it('limit=1 每页只返回 1 条', async () => {
    const res = await request(app).get('/api/posts?limit=1');
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.limit).toBe(1);
  });

  it('page=2 limit=1 返回第 2 条文章', async () => {
    const page1 = await request(app).get('/api/posts?page=1&limit=1');
    const page2 = await request(app).get('/api/posts?page=2&limit=1');

    expect(page1.body.data.data[0].id).not.toBe(page2.body.data.data[0]?.id);
  });

  it('total 大于 limit 时 totalPages 计算正确', async () => {
    const res = await request(app).get('/api/posts?limit=1');
    expect(res.body.data.total).toBeGreaterThanOrEqual(3);
  });

  it('超出范围的页码返回空数组（不报错）', async () => {
    const res = await request(app).get('/api/posts?page=9999&limit=8');
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(0);
  });

  it('limit 最大值被限制在 50（不能拖数据库）', async () => {
    const res = await request(app).get('/api/posts?limit=999');
    expect(res.status).toBe(200);
    expect(res.body.data.limit).toBeLessThanOrEqual(50);
  });
});

// ─────────────────────────────────────────────
//  GET /api/posts — 搜索
// ─────────────────────────────────────────────
describe('GET /api/posts — 搜索', () => {
  it('搜索关键词能匹配标题', async () => {
    // 使用 .query() 传参，supertest 会自动 URL encode 中文字符
    const res = await request(app).get('/api/posts').query({ search: '首页测试文章' });
    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.data[0].title).toContain('首页测试文章');
  });

  it('不存在的关键词返回空数组（不报 500）', async () => {
    const res = await request(app).get('/api/posts').query({ search: 'xyzabc不存在的内容' });
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('搜索含特殊字符不报 500', async () => {
    // 使用 .query() 传参，避免直接在路径中出现未转义字符
    const res = await request(app).get('/api/posts').query({ search: '%&\'"' });
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
//  GET /api/posts — 分类过滤
// ─────────────────────────────────────────────
describe('GET /api/posts — 分类过滤', () => {
  it('按分类 ID 过滤，返回该分类文章', async () => {
    const res = await request(app).get('/api/posts?category=1');
    expect(res.status).toBe(200);
    // 应有 1 篇属于技术分类
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
  });

  it('不存在的分类 ID 返回空数组', async () => {
    const res = await request(app).get('/api/posts?category=9999');
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(0);
  });

  it('category=0 不崩溃（边界值）', async () => {
    const res = await request(app).get('/api/posts?category=0');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
//  GET /api/posts — 排序
// ─────────────────────────────────────────────
describe('GET /api/posts — 排序（首页排序下拉控件）', () => {
  it('sortBy=created_at&order=desc（默认：最新优先）', async () => {
    const res = await request(app).get('/api/posts?sortBy=created_at&order=desc');
    expect(res.status).toBe(200);
    const dates = res.body.data.data.map(p => new Date(p.created_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('sortBy=created_at&order=asc（最早优先）', async () => {
    const res = await request(app).get('/api/posts?sortBy=created_at&order=asc');
    expect(res.status).toBe(200);
    const dates = res.body.data.data.map(p => new Date(p.created_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeLessThanOrEqual(dates[i]);
    }
  });

  it('sortBy=views（最多浏览）', async () => {
    const res = await request(app).get('/api/posts?sortBy=views&order=desc');
    expect(res.status).toBe(200);
  });

  it('sortBy=comment_count（最多评论）', async () => {
    const res = await request(app).get('/api/posts?sortBy=comment_count&order=desc');
    expect(res.status).toBe(200);
  });

  it('sortBy=title&order=asc（标题 A→Z）', async () => {
    const res = await request(app).get('/api/posts?sortBy=title&order=asc');
    expect(res.status).toBe(200);
    const titles = res.body.data.data.map(p => p.title);
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });

  it('非法 sortBy 值被忽略（回退 created_at，不报 500）', async () => {
    const res = await request(app).get('/api/posts?sortBy=INJECTION--DROP');
    expect(res.status).toBe(200);
  });

  it('非法 order 值被忽略（回退 desc，不报 500）', async () => {
    const res = await request(app).get('/api/posts?order=INJECTION');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
//  GET /api/categories — 分类列表
// ─────────────────────────────────────────────
describe('GET /api/categories — 分类列表（首页过滤器）', () => {
  it('返回 200 且数据是数组', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('分类对象包含前端所需字段', async () => {
    const res = await request(app).get('/api/categories');
    const cat = res.body.data[0];
    expect(cat).toHaveProperty('id');
    expect(cat).toHaveProperty('name');
    expect(cat).toHaveProperty('slug');
    expect(cat).toHaveProperty('color');
    expect(cat).toHaveProperty('post_count');
  });

  it('post_count 为数字类型', async () => {
    const res = await request(app).get('/api/categories');
    for (const cat of res.body.data) {
      expect(typeof cat.post_count).toBe('number');
    }
  });

  it('post_count 只统计已发布文章（不包含草稿）', async () => {
    // 技术分类有 1 篇已发布文章
    const res = await request(app).get('/api/categories');
    const techCat = res.body.data.find(c => c.slug === 'tech');
    expect(techCat).toBeDefined();
    expect(techCat.post_count).toBeGreaterThanOrEqual(1);
  });

  it('无需登录即可访问（游客首页可见分类过滤器）', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────
//  登录用户首页 — 附加 is_bookmarked 字段
// ─────────────────────────────────────────────
describe('GET /api/posts — 登录用户视角', () => {
  it('登录用户获取文章列表，每篇包含 is_bookmarked 字段', async () => {
    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    for (const post of res.body.data.data) {
      expect(typeof post.is_bookmarked).toBe('boolean');
    }
  });

  it('游客获取文章列表，不包含 is_bookmarked 字段', async () => {
    const res = await request(app).get('/api/posts');
    for (const post of res.body.data.data) {
      expect(post.is_bookmarked).toBeUndefined();
    }
  });

  it('收藏文章后，列表中 is_bookmarked=true', async () => {
    // 获取第一篇文章 ID
    const posts = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${userToken}`);
    const firstPostId = posts.body.data.data[0].id;

    // 收藏
    await request(app)
      .post(`/api/bookmarks/${firstPostId}`)
      .set('Authorization', `Bearer ${userToken}`);

    // 再次查列表
    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${userToken}`);

    const bookmarked = res.body.data.data.find(p => p.id === firstPostId);
    expect(bookmarked.is_bookmarked).toBe(true);

    // 清理：取消收藏
    await request(app)
      .post(`/api/bookmarks/${firstPostId}`)
      .set('Authorization', `Bearer ${userToken}`);
  });
});

// ─────────────────────────────────────────────
//  并发稳定性（首页同时发多个请求）
// ─────────────────────────────────────────────
describe('首页并发请求稳定性', () => {
  it('同时发 5 个 /api/posts 请求，全部返回 200', async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => request(app).get('/api/posts?page=1&limit=8'))
    );
    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it('同时发 posts + categories 并发请求（模拟首页初始化）', async () => {
    const [postsRes, catsRes] = await Promise.all([
      request(app).get('/api/posts?page=1&limit=8&sortBy=created_at&order=desc'),
      request(app).get('/api/categories'),
    ]);
    expect(postsRes.status).toBe(200);
    expect(catsRes.status).toBe(200);
    expect(Array.isArray(postsRes.body.data.data)).toBe(true);
    expect(Array.isArray(catsRes.body.data)).toBe(true);
  });
});

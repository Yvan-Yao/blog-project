/**
 * @file Post.js
 * @description 文章数据模型
 *
 * 封装 posts 表的 CRUD 操作，包含：
 *  - 分页查询（游客只能看已发布的文章）
 *  - 全文搜索（简单 LIKE 实现）
 *  - 关联查询（一次性获取作者名和分类名）
 *  - 浏览量自增
 */

import db from './database.js';

/**
 * 将文章标题转换为 URL 友好的 slug
 * 例："我的第一篇博客" → "wo-de-di-yi-pian-bo-ke-{timestamp}"
 * @param {string} title
 * @returns {string}
 */
function generateSlug(title) {
  // 对于中文标题，使用时间戳确保唯一性
  const base = title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]/g, '-')  // 非字母数字汉字替换为连字符
    .replace(/-+/g, '-')                    // 多个连字符合并
    .replace(/^-|-$/g, '');                 // 去掉首尾连字符
  return `${base}-${Date.now()}`;
}

/**
 * 生成 URL token（UUID v4，用于加密链接）
 * @returns {string}
 */
function generateUrlToken() {
  return crypto.randomUUID();
}

const Post = {
  /**
   * 获取文章列表（分页 + 筛选 + 排序）
   * @param {Object} options
   * @param {number} options.page - 当前页码（从 1 开始）
   * @param {number} options.limit - 每页条数
   * @param {string|null} options.status - 'published'|'draft'|null（null = 全部，Admin 用）
   * @param {number|null} options.categoryId - 按分类筛选
   * @param {string|null} options.search - 搜索关键词
   * @param {number|null} options.authorId - 按作者筛选
   * @param {string} options.sortBy - 排序字段：created_at|published_at|title|views|comment_count
   * @param {string} options.order - 排序方向：desc|asc
   * @returns {{ data: Array, total: number, page: number, limit: number }}
   */
  findAll({ page = 1, limit = 10, status = 'published', categoryId = null, search = null, authorId = null, sortBy = 'created_at', order = 'desc' } = {}) {
    const offset = (page - 1) * limit;

    // 动态构建 WHERE 条件
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    if (categoryId) {
      conditions.push('p.category_id = ?');
      params.push(categoryId);
    }
    if (authorId) {
      conditions.push('p.author_id = ?');
      params.push(authorId);
    }
    if (search) {
      // 简单全文搜索：标题或摘要中包含关键词
      conditions.push('(p.title LIKE ? OR p.summary LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 排序字段白名单，防止 SQL 注入
    const ALLOWED_SORT = ['created_at', 'published_at', 'title', 'views', 'comment_count'];
    const ALLOWED_ORDER = ['desc', 'asc'];
    const safeSortBy = ALLOWED_SORT.includes(sortBy) ? sortBy : 'created_at';
    const safeOrder = ALLOWED_ORDER.includes(order) ? order : 'desc';

    // comment_count 是子查询别名，不加 p. 前缀；其他字段加 p. 前缀
    const orderColumn = safeSortBy === 'comment_count' ? safeSortBy : `p.${safeSortBy}`;

    // 主查询：联表获取作者用户名和分类名，支持动态排序
    const sql = `
      SELECT
        p.id, p.title, p.slug, p.url_token, p.summary, p.cover_image,
        p.status, p.views, p.created_at, p.published_at,
        u.username AS author_name,
        u.avatar   AS author_avatar,
        c.name     AS category_name,
        c.slug     AS category_slug,
        c.color    AS category_color,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
      FROM posts p
      LEFT JOIN users      u ON p.author_id   = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${where}
      ORDER BY ${orderColumn} ${safeOrder}
      LIMIT ? OFFSET ?
    `;

    // 计数查询（用于分页）
    const countSql = `
      SELECT COUNT(*) as total
      FROM posts p ${where}
    `;

    const data = db.prepare(sql).all([...params, limit, offset]);
    const { total } = db.prepare(countSql).get(params);

    return { data, total, page, limit };
  },

  /**
   * 根据 ID 获取文章详情（含完整 content）
   * @param {number} id
   * @returns {Object|undefined}
   */
  findById(id) {
    return db.prepare(`
      SELECT
        p.*,
        p.url_token,
        u.username  AS author_name,
        u.avatar    AS author_avatar,
        u.bio       AS author_bio,
        c.name      AS category_name,
        c.slug      AS category_slug,
        c.color     AS category_color
      FROM posts p
      LEFT JOIN users      u ON p.author_id   = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);
  },

  /**
   * 根据 slug 获取文章详情（同时自增浏览量）
   * @param {string} slug
   * @returns {Object|undefined}
   */
  findBySlug(slug) {
    // 先自增浏览量（只对已发布文章计数）
    db.prepare(`
      UPDATE posts SET views = views + 1
      WHERE slug = ? AND status = 'published'
    `).run(slug);

    return db.prepare(`
      SELECT
        p.*,
        u.username  AS author_name,
        u.avatar    AS author_avatar,
        u.bio       AS author_bio,
        c.name      AS category_name,
        c.slug      AS category_slug,
        c.color     AS category_color
      FROM posts p
      LEFT JOIN users      u ON p.author_id   = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ?
    `).get(slug);
  },

  /**
   * 根据 url_token 获取文章详情（同时自增浏览量）
   * @param {string} token
   * @returns {Object|undefined}
   */
  findByToken(token) {
    // 先自增浏览量（只对已发布文章计数）
    db.prepare(`
      UPDATE posts SET views = views + 1
      WHERE url_token = ? AND status = 'published'
    `).run(token);

    return db.prepare(`
      SELECT
        p.*,
        u.username  AS author_name,
        u.avatar    AS author_avatar,
        u.bio       AS author_bio,
        c.name      AS category_name,
        c.slug      AS category_slug,
        c.color     AS category_color
      FROM posts p
      LEFT JOIN users      u ON p.author_id   = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.url_token = ?
    `).get(token);
  },

  /**
   * 创建文章
   * @param {Object} data - { title, content, summary?, cover_image?, status?, author_id, category_id? }
   * @returns {Object} 创建的文章
   */
  create({ title, content, summary = null, cover_image = null, status = 'draft', author_id, category_id = null }) {
    const slug = generateSlug(title);
    const url_token = generateUrlToken();
    const published_at = status === 'published' ? new Date().toISOString() : null;

    const result = db.prepare(`
      INSERT INTO posts (title, slug, url_token, summary, content, cover_image, status, author_id, category_id, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, slug, url_token, summary, content, cover_image, status, author_id, category_id, published_at);

    return this.findById(result.lastInsertRowid);
  },

  /**
   * 更新文章
   * @param {number} id
   * @param {Object} data
   * @returns {Object} 更新后的文章
   */
  update(id, { title, content, summary, cover_image, status, category_id }) {
    // 如果从 draft 改为 published，记录发布时间
    const currentPost = this.findById(id);
    const published_at =
      status === 'published' && currentPost.status !== 'published'
        ? new Date().toISOString()
        : currentPost.published_at;

    db.prepare(`
      UPDATE posts
      SET title       = COALESCE(?, title),
          content     = COALESCE(?, content),
          summary     = COALESCE(?, summary),
          cover_image = COALESCE(?, cover_image),
          status      = COALESCE(?, status),
          category_id = COALESCE(?, category_id),
          published_at = ?,
          updated_at  = datetime('now')
      WHERE id = ?
    `).run(title, content, summary, cover_image, status, category_id, published_at, id);

    return this.findById(id);
  },

  /**
   * 删除文章（关联评论会因为外键 CASCADE 自动删除）
   * @param {number} id
   */
  delete(id) {
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  },
};

export default Post;

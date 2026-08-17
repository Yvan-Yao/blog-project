/**
 * @file Bookmark.js
 * @description 书签/收藏模型 — 用户收藏文章
 *
 * 支持的操作：
 * - toggle(userId, postId)  收藏/取消收藏（幂等切换）
 * - isBookmarked(userId, postId)  检查是否已收藏
 * - getByUser(userId, { page, limit })  分页获取收藏列表
 * - count(postId)  文章被收藏数
 */

import { prepare, run, get, all } from './database.js';

const Bookmark = {
  /**
   * 收藏/取消收藏（切换模式）
   * 如果已收藏则删除，未收藏则新增
   * @param {number} userId
   * @param {number} postId
   * @returns {{ bookmarked: boolean, message: string }}
   */
  toggle(userId, postId) {
    const existing = get(
      'SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );
    if (existing) {
      run('DELETE FROM bookmarks WHERE id = ?', [existing.id]);
      return { bookmarked: false, message: '已取消收藏' };
    } else {
      run('INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)', [userId, postId]);
      return { bookmarked: true, message: '收藏成功' };
    }
  },

  /**
   * 检查用户是否已收藏某文章
   * @param {number} userId
   * @param {number} postId
   * @returns {boolean}
   */
  isBookmarked(userId, postId) {
    const row = get(
      'SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );
    return !!row;
  },

  /**
   * 批量检查：返回当前用户已收藏的文章 ID 集合
   * @param {number} userId
   * @param {number[]} postIds
   * @returns {Set<number>}
   */
  getBookmarkedSet(userId, postIds) {
    if (!postIds.length) return new Set();
    const placeholders = postIds.map(() => '?').join(',');
    const rows = all(
      `SELECT post_id FROM bookmarks WHERE user_id = ? AND post_id IN (${placeholders})`,
      [userId, ...postIds]
    );
    return new Set(rows.map(r => r.post_id));
  },

  /**
   * 获取用户收藏文章列表（分页，含文章信息）
   * @param {number} userId
   * @param {object}  opts
   * @param {number}  opts.page  页码（从 1 开始）
   * @param {number}  opts.limit 每页数量
   * @returns {{ data: object[], total: number, page: number, totalPages: number }}
   */
  getByUser(userId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const total = get(
      'SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?',
      [userId]
    ).count;

    const data = all(
      `SELECT
        b.id        AS bookmark_id,
        b.created_at AS bookmarked_at,
        p.id, p.title, p.slug, p.summary, p.cover_image,
        p.status, p.views, p.created_at, p.published_at,
        u.username   AS author_name,
        u.avatar     AS author_avatar,
        c.name       AS category_name,
        c.slug       AS category_slug,
        c.color      AS category_color,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
      FROM bookmarks b
      JOIN posts      p ON b.post_id     = p.id
      LEFT JOIN users      u ON p.author_id   = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE b.user_id = ? AND p.status = 'published'
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * 获取文章的收藏数
   * @param {number} postId
   * @returns {number}
   */
  count(postId) {
    const row = get('SELECT COUNT(*) as count FROM bookmarks WHERE post_id = ?', [postId]);
    return row ? row.count : 0;
  },
};

export default Bookmark;

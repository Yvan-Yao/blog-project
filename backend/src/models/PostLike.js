/**
 * @file PostLike.js
 * @description 文章点赞模型（单向点赞，不可取消）
 *
 * 限制：同一用户对同一文章只能点赞 1 次
 * 数据库 UNIQUE(user_id, post_id) 约束作为最后防线
 */

import db from './database.js';

const PostLike = {
  /**
   * 点赞（单向，不可取消）
   * @throws {Error} 已点赞时抛出，message 可返回给前端
   * @returns {{ liked: true, count: number }}
   */
  addLike(userId, postId) {
    const existing = db.prepare(
      'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?'
    ).get(userId, postId);

    if (existing) {
      throw Object.assign(new Error('已经点过赞了'), { status: 400 });
    }

    db.prepare(
      'INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)'
    ).run(userId, postId);

    const count = this.count(postId);
    return { liked: true, count };
  },

  /**
   * 取消点赞（独立操作，不是 toggle 的一部分）
   * 仅用于用户主动取消场景
   */
  removeLike(userId, postId) {
    const existing = db.prepare(
      'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?'
    ).get(userId, postId);

    if (!existing) {
      return { removed: false, count: this.count(postId) };
    }

    db.prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?').run(userId, postId);

    const count = this.count(postId);
    return { removed: true, count };
  },

  /** 获取某文章的点赞数 */
  count(postId) {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM post_likes WHERE post_id = ?').get(postId);
    return row ? row.cnt : 0;
  },

  /** 查询指定用户是否已点赞某文章 */
  isLiked(userId, postId) {
    const row = db.prepare(
      'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?'
    ).get(userId, postId);
    return !!row;
  },

  /** 批量查询（给列表页附加状态用） */
  getLikedSet(userId, postIds) {
    if (!postIds.length) return new Set();
    const placeholders = postIds.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (${placeholders})`
    ).all(userId, ...postIds);
    return new Set(rows.map(r => r.post_id));
  },
};

export default PostLike;

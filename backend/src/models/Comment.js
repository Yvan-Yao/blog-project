/**
 * @file Comment.js
 * @description 评论数据模型
 *
 * 支持嵌套回复结构：
 *  - 顶层评论：parent_id = null
 *  - 回复：parent_id = 父评论 ID
 *
 * 前端渲染时将评论树展开为两层（评论 + 回复）显示。
 */

import db from './database.js';

const Comment = {
  /**
   * 获取文章的所有评论（含回复），按树形结构组织
   * @param {number} postId
   * @returns {Array} 评论树（顶层评论含 replies 数组）
   */
  findByPostId(postId) {
    // 获取所有评论（含作者信息）
    const allComments = db.prepare(`
      SELECT
        c.id, c.content, c.parent_id, c.created_at,
        c.image, c.image_width, c.image_height,
        u.id       AS author_id,
        u.username AS author_name,
        u.avatar   AS author_avatar
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(postId);

    // 在内存中构建树形结构（避免递归 SQL）
    const topLevel = [];
    const replyMap = {};

    // 第一遍：收集顶层评论
    for (const comment of allComments) {
      if (!comment.parent_id) {
        comment.replies = [];
        topLevel.push(comment);
        replyMap[comment.id] = comment;
      }
    }

    // 第二遍：将回复挂载到对应父评论
    for (const comment of allComments) {
      if (comment.parent_id && replyMap[comment.parent_id]) {
        replyMap[comment.parent_id].replies.push(comment);
      }
    }

    return topLevel;
  },

  /**
   * 根据 ID 获取单条评论
   * @param {number} id
   * @returns {Object|undefined}
   */
  findById(id) {
    return db.prepare(`
      SELECT c.*, u.username AS author_name
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `).get(id);
  },

  /**
   * 创建评论或回复
   * @param {Object} data - { content, post_id, author_id, parent_id?, image?, image_width?, image_height? }
   * @returns {Object} 创建的评论
   */
  create({ content, post_id, author_id, parent_id = null, image = null, image_width = null, image_height = null }) {
    const result = db.prepare(`
      INSERT INTO comments (content, post_id, author_id, parent_id, image, image_width, image_height)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(content, post_id, author_id, parent_id, image, image_width, image_height);

    return this.findById(result.lastInsertRowid);
  },

  /**
   * 更新评论内容（仅作者本人可操作）
   * @param {number} id
   * @param {string} content
   * @returns {Object} 更新后的评论
   */
  update(id, content) {
    db.prepare(`
      UPDATE comments
      SET content = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(content, id);
    return this.findById(id);
  },

  /**
   * 删除评论（及其所有子回复，通过外键 CASCADE 实现）
   * @param {number} id
   */
  delete(id) {
    db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  },

  /**
   * 获取文章的评论总数
   * @param {number} postId
   * @returns {number}
   */
  countByPostId(postId) {
    const row = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(postId);
    return row.count;
  },
};

export default Comment;

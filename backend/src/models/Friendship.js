/**
 * @file models/Friendship.js
 * @description 好友关系模型 — 封装 friendships 表的 CRUD 操作
 *
 * 好友流程:
 *   1. A 向 B 发送好友请求 → status = 'pending'
 *   2. B 接受 → status = 'accepted'
 *   3. B 拒绝 → status = 'rejected' (保留记录，避免重复请求)
 *   4. 任一方删除 → 物理删除该行记录
 *
 * 双向好友: accepted 状态下 requester 和 addressee 互为好友。
 */

import db from './database.js';

export default {
  /**
   * 发送好友请求
   * @param {number} requesterId - 请求方 ID
   * @param {number} addresseeId - 接收方 ID
   * @returns {{ id, status }} 新建的好友关系
   */
  sendRequest(requesterId, addresseeId) {
    if (requesterId === addresseeId) {
      throw Object.assign(new Error('不能添加自己为好友'), { statusCode: 400 });
    }

    // 检查是否已存在（包括 pending / accepted / rejected）
    const existing = db
      .prepare(
        `SELECT id, status FROM friendships
         WHERE (requester_id = ? AND addressee_id = ?)
            OR (requester_id = ? AND addressee_id = ?)`
      )
      .get(requesterId, addresseeId, addresseeId, requesterId);

    if (existing) {
      if (existing.status === 'accepted') {
        throw Object.assign(new Error('你们已经是好友了'), { statusCode: 409 });
      }
      if (existing.status === 'pending') {
        throw Object.assign(new Error('已发送过好友请求，请等待对方处理'), { statusCode: 409 });
      }
      // rejected → 允许重新发送，更新为 pending
      const result = db
        .prepare(
          `UPDATE friendships SET status = 'pending', requester_id = ?, addressee_id = ?,
           updated_at = datetime('now') WHERE id = ?`
        )
        .run(requesterId, addresseeId, existing.id);
      return { id: existing.id, status: 'pending' };
    }

    const result = db
      .prepare(
        `INSERT INTO friendships (requester_id, addressee_id, status)
         VALUES (?, ?, 'pending')`
      )
      .run(requesterId, addresseeId);

    return { id: Number(result.lastInsertRowid), status: 'pending' };
  },

  /**
   * 接受好友请求
   * @param {number} addresseeId - 接收方（当前用户）ID
   * @param {number} requesterId - 请求方 ID
   */
  acceptRequest(addresseeId, requesterId) {
    const pending = db
      .prepare(
        `SELECT id FROM friendships
         WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`
      )
      .get(requesterId, addresseeId);

    if (!pending) {
      throw Object.assign(new Error('未找到待处理的好友请求'), { statusCode: 404 });
    }

    return db
      .prepare(
        `UPDATE friendships SET status = 'accepted',
         updated_at = datetime('now') WHERE id = ?`
      )
      .run(pending.id);
  },

  /**
   * 拒绝好友请求
   * @param {number} addresseeId - 接收方 ID
   * @param {number} requesterId - 请求方 ID
   */
  rejectRequest(addresseeId, requesterId) {
    const pending = db
      .prepare(
        `SELECT id FROM friendships
         WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`
      )
      .get(requesterId, addresseeId);

    if (!pending) {
      throw Object.assign(new Error('未找到待处理的好友请求'), { statusCode: 404 });
    }

    return db
      .prepare(
        `UPDATE friendships SET status = 'rejected',
         updated_at = datetime('now') WHERE id = ?`
      )
      .run(pending.id);
  },

  /**
   * 删除好友关系
   * - accepted → 任一方删除
   * - pending → 请求方取消
   * @param {number} userId - 当前用户 ID
   * @param {number} friendId - 对方 ID
   */
  unfriend(userId, friendId) {
    return db
      .prepare(
        `DELETE FROM friendships
         WHERE ((requester_id = ? AND addressee_id = ?)
            OR  (requester_id = ? AND addressee_id = ?))
           AND status IN ('accepted', 'pending')`
      )
      .run(userId, friendId, friendId, userId);
  },

  /**
   * 获取用户的好友列表（已接受的）
   * @param {number} userId
   * @returns {Array<{id, username, email, avatar, bio, since}>}
   */
  getFriends(userId) {
    return db
      .prepare(
        `SELECT u.id, u.username, u.email, u.avatar, u.bio,
                u.website, u.location, u.occupation, u.interests,
                u.github, u.twitter, u.url_token,
                MAX(f.created_at) AS since
         FROM friendships f
         JOIN users u ON (
           (f.requester_id = u.id AND f.addressee_id = ?)
           OR (f.addressee_id = u.id AND f.requester_id = ?)
         )
         WHERE f.status = 'accepted' AND u.id != ?
         GROUP BY u.id
         ORDER BY u.username ASC`
      )
      .all(userId, userId, userId);
  },

  /**
   * 获取发给用户的待处理请求列表
   * @param {number} userId
   * @returns {Array<{id, friendship_id, username, email, avatar, created_at}>}
   */
  getIncomingRequests(userId) {
    return db
      .prepare(
        `SELECT f.id AS friendship_id, u.id, u.username, u.email, u.avatar, u.bio,
                u.website, u.location, u.occupation, u.url_token,
                f.created_at
         FROM friendships f
         JOIN users u ON u.id = f.requester_id
         WHERE f.addressee_id = ? AND f.status = 'pending'
         ORDER BY f.created_at DESC`
      )
      .all(userId);
  },

  /**
   * 获取用户发出的待处理请求列表
   * @param {number} userId
   * @returns {Array<{id, friendship_id, username, email, avatar, created_at}>}
   */
  getOutgoingRequests(userId) {
    return db
      .prepare(
        `SELECT f.id AS friendship_id, u.id, u.username, u.email, u.avatar, u.bio,
                u.website, u.location, u.occupation,
                f.created_at
         FROM friendships f
         JOIN users u ON u.id = f.addressee_id
         WHERE f.requester_id = ? AND f.status = 'pending'
         ORDER BY f.created_at DESC`
      )
      .all(userId);
  },

  /**
   * 检查两个用户的好友关系状态
   * @param {number} userId
   * @param {number} otherId
   * @returns {string|null} 'accepted' | 'pending' | 'rejected' | null
   */
  getStatus(userId, otherId) {
    if (userId === otherId) return 'self';

    const row = db
      .prepare(
        `SELECT status FROM friendships
         WHERE (requester_id = ? AND addressee_id = ?)
            OR (requester_id = ? AND addressee_id = ?)`
      )
      .get(userId, otherId, otherId, userId);

    return row ? row.status : null;
  },
};

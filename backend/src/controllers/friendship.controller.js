/**
 * @file controllers/friendship.controller.js
 * @description 好友关系控制器 — 发送/接受/拒绝/删除/列表
 *
 * @swagger
 * tags:
 *   name: Friendships
 *   description: 好友关系管理
 */

import Friendship from '../models/Friendship.js';
import User from '../models/User.js';

export default {
  /**
   * POST /api/friends/request/:userId
   * 向指定用户发送好友请求
   *
   * @swagger
   * /friends/request/{userId}:
   *   post:
   *     tags: [Friendships]
   *     summary: 发送好友请求
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       201: { description: 请求已发送 }
   *       400: { description: 不能添加自己 / 已发送 }
   *       409: { description: 已经是好友 }
   */
  async sendRequest(req, res, next) {
    try {
      const targetId = Number(req.params.userId);
      if (!targetId) return res.status(400).json({ success: false, message: '目标用户 ID 无效' });

      // 目标用户存在性检查
      const target = await User.findById(targetId);
      if (!target) return res.status(404).json({ success: false, message: '用户不存在' });

      const result = Friendship.sendRequest(req.user.id, targetId);
      res.status(201).json({ success: true, data: result, message: '好友请求已发送' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/friends/accept/:userId
   * 接受来自某用户的好友请求
   *
   * @swagger
   * /friends/accept/{userId}:
   *   put:
   *     tags: [Friendships]
   *     summary: 接受好友请求
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200: { description: 已接受 }
   *       404: { description: 未找到待处理请求 }
   */
  async acceptRequest(req, res, next) {
    try {
      const requesterId = Number(req.params.userId);
      if (!requesterId) return res.status(400).json({ success: false, message: '请求方用户 ID 无效' });

      Friendship.acceptRequest(req.user.id, requesterId);
      res.json({ success: true, message: '已接受好友请求' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/friends/reject/:userId
   * 拒绝来自某用户的好友请求
   *
   * @swagger
   * /friends/reject/{userId}:
   *   put:
   *     tags: [Friendships]
   *     summary: 拒绝好友请求
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200: { description: 已拒绝 }
   *       404: { description: 未找到待处理请求 }
   */
  async rejectRequest(req, res, next) {
    try {
      const requesterId = Number(req.params.userId);
      if (!requesterId) return res.status(400).json({ success: false, message: '请求方用户 ID 无效' });

      Friendship.rejectRequest(req.user.id, requesterId);
      res.json({ success: true, message: '已拒绝好友请求' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/friends/:userId
   * 删除好友（任一方都可操作）
   *
   * @swagger
   * /friends/{userId}:
   *   delete:
   *     tags: [Friendships]
   *     summary: 删除好友
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200: { description: 已删除 }
   */
  async unfriend(req, res, next) {
    try {
      const friendId = Number(req.params.userId);
      if (!friendId) return res.status(400).json({ success: false, message: '好友 ID 无效' });

      Friendship.unfriend(req.user.id, friendId);
      res.json({ success: true, message: '已删除好友' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/friends
   * 获取当前用户的好友列表
   *
   * @swagger
   * /friends:
   *   get:
   *     tags: [Friendships]
   *     summary: 获取好友列表
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200: { description: 好友列表 }
   */
  async list(req, res, next) {
    try {
      const friends = Friendship.getFriends(req.user.id);
      res.json({ success: true, data: friends });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/friends/requests
   * 获取待处理请求（我收到的 + 我发出的）
   *
   * @swagger
   * /friends/requests:
   *   get:
   *     tags: [Friendships]
   *     summary: 获取待处理的好友请求
   *     security: [{ BearerAuth: [] }]
   *     responses:
   *       200: { description: 包含 received 和 sent 两个数组 }
   */
  async getRequests(req, res, next) {
    try {
      const [received, sent] = await Promise.all([
        Promise.resolve(Friendship.getIncomingRequests(req.user.id)),
        Promise.resolve(Friendship.getOutgoingRequests(req.user.id)),
      ]);
      res.json({ success: true, data: { received, sent } });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/friends/search?q=xxx
   * 按用户名搜索用户（排除自己、已有好友/请求）
   *
   * @swagger
   * /friends/search:
   *   get:
   *     tags: [Friendships]
   *     summary: 搜索可添加的用户
   *     security: [{ BearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: q
   *         schema: { type: string }
   *         description: 搜索关键词（匹配用户名）
   *     responses:
   *       200: { description: 搜索结果 }
   */
  async searchUsers(req, res, next) {
    try {
      const { q } = req.query;
      if (!q || q.trim().length === 0) {
        return res.json({ success: true, data: [] });
      }

      const users = User.search(q.trim());
      // 排除自己，并标记好友状态
      const results = users
        .filter((u) => u.id !== req.user.id)
        .map((u) => ({
          ...u,
          friendship_status: Friendship.getStatus(req.user.id, u.id),
        }));

      res.json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  },
};

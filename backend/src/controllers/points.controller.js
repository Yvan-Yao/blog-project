/**
 * @file points.controller.js
 * @description 积分控制器
 *
 * GET  /api/points/me         — 我的积分/等级/头衔（需登录）
 * GET  /api/points/leaderboard — 积分排行榜（公开）
 * GET  /api/points/logs       — 我的积分流水（需登录）
 * GET  /api/points/:userId    — 查看他人积分（公开）
 */

import Points from '../models/Points.js';

const pointsController = {
  /** GET /api/points/me */
  me(req, res, next) {
    try {
      const data = Points.get(req.user.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/points/leaderboard?limit=20 */
  leaderboard(req, res, next) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const data = Points.leaderboard(limit);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/points/logs?page=1&limit=20 */
  logs(req, res, next) {
    try {
      const page  = parseInt(req.query.page)  || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const data = Points.getLogs(req.user.id, page, limit);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/points/:userId */
  show(req, res, next) {
    try {
      const userId = parseInt(req.params.userId);
      if (!userId || userId < 1) {
        return res.status(400).json({ success: false, message: '无效的用户 ID' });
      }
      const data = Points.get(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};

export default pointsController;

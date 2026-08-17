/**
 * @file admin.controller.js
 * @description Admin 后台控制器（仅 admin 角色可访问）
 */

import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import db from '../models/database.js';

const adminController = {
  /**
   * GET /api/admin/stats
   * 获取站点统计数据（用于 admin 仪表盘）
   */
  getStats(req, res, next) {
    try {
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      const postCount = db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published'").get().count;
      const draftCount = db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'draft'").get().count;
      const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments').get().count;
      const totalViews = db.prepare('SELECT SUM(views) as total FROM posts').get().total || 0;

      // 最近 7 天发布的文章趋势
      const recentPosts = db.prepare(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM posts
        WHERE created_at >= DATE('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date
      `).all();

      res.json({
        success: true,
        data: {
          userCount,
          postCount,
          draftCount,
          commentCount,
          totalViews,
          recentPosts,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/admin/users - 用户列表 */
  getUsers(req, res, next) {
    try {
      const users = User.findAll();
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  },

  /** DELETE /api/admin/users/:id */
  deleteUser(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      if (id === req.user.id) {
        return res.status(400).json({ success: false, message: '不能删除自己的账号' });
      }
      User.delete(id);
      res.json({ success: true, message: '用户已删除' });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/admin/posts - 所有文章（含草稿） */
  getPosts(req, res, next) {
    try {
      const { page = 1, limit = 20, sortBy, order } = req.query;
      const result = Post.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        status: null, // null = 全部状态
        sortBy: sortBy || undefined,
        order: order || undefined,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /** DELETE /api/admin/comments/:id */
  deleteComment(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      Comment.delete(id);
      res.json({ success: true, message: '评论已删除' });
    } catch (error) {
      next(error);
    }
  },
};

export default adminController;

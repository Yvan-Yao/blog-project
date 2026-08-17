/**
 * @file bookmark.controller.js
 * @description 收藏控制器 — 处理收藏/取消收藏/列表请求
 */

import Bookmark from '../models/Bookmark.js';

const bookmarkController = {
  /**
   * POST /api/bookmarks/:postId — 收藏/取消收藏（切换）
   * 需要登录
   */
  toggle(req, res, next) {
    try {
      const postId = parseInt(req.params.postId, 10);
      if (isNaN(postId)) {
        return res.status(400).json({ success: false, message: '无效的文章 ID' });
      }
      const result = Bookmark.toggle(req.user.id, postId);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/bookmarks — 获取当前用户收藏列表
   * 需要登录
   * Query: ?page=1&limit=10
   */
  list(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
      const result = Bookmark.getByUser(req.user.id, { page, limit });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/bookmarks/:postId — 检查是否收藏
   * 需要登录
   */
  check(req, res, next) {
    try {
      const postId = parseInt(req.params.postId, 10);
      if (isNaN(postId)) {
        return res.status(400).json({ success: false, message: '无效的文章 ID' });
      }
      const bookmarked = Bookmark.isBookmarked(req.user.id, postId);
      res.json({ success: true, data: { bookmarked } });
    } catch (err) {
      next(err);
    }
  },
};

export default bookmarkController;

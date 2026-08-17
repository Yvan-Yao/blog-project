/**
 * @file bookmark.routes.js
 * @description 收藏路由
 *
 * GET    /api/bookmarks           — 获取收藏列表
 * GET    /api/bookmarks/:postId   — 检查是否收藏
 * POST   /api/bookmarks/:postId   — 收藏/取消收藏
 */

import { Router } from 'express';
import bookmarkController from '../controllers/bookmark.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// 所有收藏操作都需要登录
router.use(authenticate);

router.get('/', bookmarkController.list);
router.get('/:postId', bookmarkController.check);
router.post('/:postId', bookmarkController.toggle);

export default router;

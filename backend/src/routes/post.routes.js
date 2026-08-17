/**
 * @file post.routes.js
 * @description 文章路由
 */

import { Router } from 'express';
import { body } from 'express-validator';
import postController from '../controllers/post.controller.js';
import likeController  from '../controllers/like.controller.js';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { optBody, validate } from '../middleware/validate.middleware.js';

const router = Router();

// 获取文章列表（游客可访问，登录用户可获取更多信息）
router.get('/', optionalAuth, postController.index);

// 获取当前用户的文章（需要登录，必须放在 /:slug 之前避免路由冲突）
router.get('/my', authenticate, postController.myPosts);

// 获取文章详情
router.get('/:slug', optionalAuth, postController.show);

// 创建文章（需要登录）
router.post('/',
  authenticate,
  [
    body('title').trim().isLength({ min: 2, max: 200 }).withMessage('标题长度 2-200 字符'),
    body('content').trim().isLength({ min: 10 }).withMessage('内容至少 10 字符'),
  ],
  validate,
  postController.create
);

// 更新文章（作者 or admin）
router.put('/:id',
  authenticate,
  [
    optBody('title').trim().isLength({ min: 2, max: 200 }),
    optBody('content').trim().isLength({ min: 10 }),
  ],
  validate,
  postController.update
);

// 发布文章（Admin 专用）
router.put('/:id/publish', authenticate, postController.publish);

// ── 文章点赞 ──
// POST /posts/:id/like   — 点赞（需登录，每人每篇文章限 1 次）
router.post('/:id/like',   authenticate, likeController.like);
// DELETE /posts/:id/like  — 取消点赞（需登录）
router.delete('/:id/like', authenticate, likeController.unlike);
// GET  /posts/:id/like   — 查询点赞状态（需登录）
router.get('/:id/like',    authenticate, likeController.status);
// GET  /posts/:id/likes/count — 公开点赞数
router.get('/:id/likes/count', likeController.count);

// 删除文章
router.delete('/:id', authenticate, postController.destroy);

export default router;

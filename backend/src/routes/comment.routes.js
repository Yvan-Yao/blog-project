/**
 * @file comment.routes.js
 * @description 评论路由（嵌套在 /posts/:postId/comments 下）
 */

import { Router } from 'express';
import { body } from 'express-validator';
import commentController from '../controllers/comment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { optBody, validate } from '../middleware/validate.middleware.js';

// mergeParams: true 允许访问父路由（/posts/:postId）的 params
const router = Router({ mergeParams: true });

// 获取文章评论列表（公开）
router.get('/:postId/comments', commentController.index);

// 发表评论（需要登录）
router.post('/:postId/comments',
  authenticate,
  [
    body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('评论内容 1-1000 字'),
    optBody('parent_id').isInt({ min: 1 }).withMessage('无效的父评论 ID'),
  ],
  validate,
  commentController.create
);

// 删除评论（需要登录）
router.delete('/comments/:id', authenticate, commentController.destroy);

export default router;

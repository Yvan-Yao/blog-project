/**
 * @file auth.routes.js
 * @description 认证路由
 */

import { Router } from 'express';
import { body } from 'express-validator';
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = Router();

// 注册
router.post('/register',
  [
    body('username').trim().isLength({ min: 2, max: 20 }).withMessage('用户名长度 2-20 字符'),
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('password').isLength({ min: 6 }).withMessage('密码至少 6 位'),
  ],
  validate,
  authController.register
);

// 登录
router.post('/login',
  [
    body('username').notEmpty().withMessage('请输入用户名'),
    body('password').notEmpty().withMessage('请输入密码'),
  ],
  validate,
  authController.login
);

// 获取当前用户（需要登录）
router.get('/me', authenticate, authController.getMe);

// 获取用户公开资料（无需登录）
router.get('/profile/:username', authController.getPublicProfile);

// 更新个人资料（需要登录）
router.put('/profile', authenticate, authController.updateProfile);

// 上传头像（需要登录）
router.post('/avatar', authenticate, upload.single('avatar'), authController.uploadAvatar);

// 修改密码（需要登录 + 验证当前密码）
router.put('/password',
  [
    body('currentPassword').notEmpty().withMessage('请输入当前密码'),
    body('newPassword').isLength({ min: 6 }).withMessage('新密码至少 6 位'),
    body('confirmPassword').notEmpty().withMessage('请确认新密码'),
  ],
  validate,
  authenticate,
  authController.changePassword
);

// 忘记密码 — 发送重置令牌（无需登录，需要限流）
router.post('/forgot-password',
  [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  ],
  validate,
  authController.forgotPassword
);

// 重置密码 — 使用令牌修改密码（无需登录）
router.post('/reset-password',
  [
    body('token').notEmpty().withMessage('请输入重置令牌'),
    body('newPassword').isLength({ min: 6 }).withMessage('新密码至少 6 位'),
    body('confirmPassword').notEmpty().withMessage('请确认新密码'),
  ],
  validate,
  authController.resetPassword
);

export default router;

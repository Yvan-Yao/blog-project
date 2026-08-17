/**
 * @file src/routes/ai.routes.js
 * @description AI 功能路由 — 文本润色 + 图片生成
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import aiController from '../controllers/ai.controller.js';

const router = Router();

// 所有 AI 端点均需登录
router.use(authenticate);

router.post('/polish', aiController.polish);
router.post('/image',  aiController.generateImage);

export default router;

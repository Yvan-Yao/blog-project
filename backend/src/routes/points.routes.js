/**
 * @file points.routes.js
 * @description 积分 API 路由
 *
 * GET /api/points/me            — 我的积分（需登录）
 * GET /api/points/leaderboard   — 积分榜（公开）
 * GET /api/points/logs          — 我的流水（需登录）
 * GET /api/points/:userId       — 他人积分（公开）
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import pointsController from '../controllers/points.controller.js';

const router = Router();

router.get('/me',          authenticate,  pointsController.me);
router.get('/leaderboard',               pointsController.leaderboard);
router.get('/logs',        authenticate,  pointsController.logs);
router.get('/:userId',                   pointsController.show);

export default router;

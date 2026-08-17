/**
 * @file admin.routes.js
 * @description Admin 管理路由（所有路由均需 admin 权限）
 */

import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import adminPointsController from '../controllers/admin/points.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// 所有 admin 路由都需要认证 + admin 角色
router.use(authenticate, requireAdmin);

// ── Dashboard & 内容管理 ──
router.get('/stats',           adminController.getStats);
router.get('/users',           adminController.getUsers);
router.delete('/users/:id',    adminController.deleteUser);
router.get('/posts',           adminController.getPosts);
router.delete('/comments/:id', adminController.deleteComment);

// ── 积分管理 ──
router.get('/points/stats',               adminPointsController.getStats);
router.get('/points/users',               adminPointsController.getUsers);
router.get('/points/users/:id/logs',      adminPointsController.getUserLogs);
router.post('/points/users/:id/adjust',   adminPointsController.adjust);

// ── 等级配置 ──
router.get('/points/levels',              adminPointsController.getLevels);
router.post('/points/levels',             adminPointsController.saveLevel);
router.delete('/points/levels/:id',       adminPointsController.deleteLevel);

// ── 积分规则 ──
router.get('/points/rules',               adminPointsController.getRules);
router.post('/points/rules',              adminPointsController.saveRule);
router.delete('/points/rules/:id',        adminPointsController.deleteRule);

export default router;

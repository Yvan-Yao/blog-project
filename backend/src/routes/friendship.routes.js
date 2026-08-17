/**
 * @file routes/friendship.routes.js
 * @description 好友关系路由
 *
 * 所有端点均需登录。
 * GET    /api/friends           好友列表
 * GET    /api/friends/requests  待处理请求（收到 + 发出）
 * GET    /api/friends/search    搜索用户
 * POST   /api/friends/request/:userId  发送好友请求
 * PUT    /api/friends/accept/:userId   接受请求
 * PUT    /api/friends/reject/:userId   拒绝请求
 * DELETE /api/friends/:userId          删除好友
 */

import { Router } from 'express';
import controller from '../controllers/friendship.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// 所有好友接口都需要登录
router.use(authenticate);

// 列表与搜索
router.get('/',                          controller.list);
router.get('/requests',                  controller.getRequests);
router.get('/search',                    controller.searchUsers);

// 好友请求操作
router.post('/request/:userId',          controller.sendRequest);
router.put('/accept/:userId',            controller.acceptRequest);
router.put('/reject/:userId',            controller.rejectRequest);

// 删除好友
router.delete('/:userId',                controller.unfriend);

export default router;

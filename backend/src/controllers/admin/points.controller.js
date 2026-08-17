/**
 * @file admin/points.controller.js
 * @description Admin 积分管理控制器 — 统计 / 用户 / 调整 / 等级规则
 */

import Points from '../../models/Points.js';
import LevelConfig from '../../models/LevelConfig.js';

const adminPointsController = {

  // GET /api/admin/points/stats — 积分统计概览
  getStats(req, res, next) {
    try {
      const stats = Points.getStats();
      res.json({ success: true, data: stats });
    } catch (error) { next(error); }
  },

  // GET /api/admin/points/users — 用户积分列表（搜索/排序/分页）
  getUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '', sortBy = 'total', order = 'desc' } = req.query;
      const result = Points.getAllUsersPoints({
        page: parseInt(page), limit: parseInt(limit),
        search, sortBy, order,
      });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  // GET /api/admin/points/users/:id/logs — 查看用户积分流水
  getUserLogs(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const { page = 1, limit = 20 } = req.query;
      const result = Points.getUserLogs(userId, parseInt(page), parseInt(limit));
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  // POST /api/admin/points/users/:id/adjust — 手动调整积分
  adjust(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const { amount, reason } = req.body;

      // 校验
      if (typeof amount !== 'number' || amount === 0) {
        return res.status(400).json({
          success: false,
          message: '调整积分数值无效，必须是非零数字',
        });
      }
      if (!reason || !reason.trim()) {
        return res.status(400).json({
          success: false,
          message: '请填写调整原因',
        });
      }

      const result = Points.adjust(userId, amount, reason.trim());
      res.json({
        success: true,
        message: `积分调整成功，${amount >= 0 ? '增加' : '扣除'} ${Math.abs(amount)} 分`,
        data: result,
      });
    } catch (error) { next(error); }
  },

  // ── 等级配置 CRUD ─────────────────────────────────────

  // GET /api/admin/points/levels — 获取全部等级配置
  getLevels(req, res, next) {
    try {
      const levels = LevelConfig.getAll();
      res.json({ success: true, data: levels });
    } catch (error) { next(error); }
  },

  // POST /api/admin/points/levels — 新增或更新等级
  saveLevel(req, res, next) {
    try {
      const { id, level, title, min_points } = req.body;
      if (!level || !title || min_points === undefined) {
        return res.status(400).json({ success: false, message: '缺少必填字段: level, title, min_points' });
      }
      const result = LevelConfig.upsert({ id, level: Number(level), title, min_points: Number(min_points) });
      res.json({ success: true, message: id ? '等级配置已更新' : '等级配置已创建', data: result });
    } catch (error) { next(error); }
  },

  // DELETE /api/admin/points/levels/:id — 删除等级配置
  deleteLevel(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      const result = LevelConfig.delete(id);
      if (!result.changes) {
        return res.status(404).json({ success: false, message: '等级配置不存在' });
      }
      res.json({ success: true, message: '等级配置已删除' });
    } catch (error) { next(error); }
  },

  // ── 积分规则 CRUD ─────────────────────────────────────

  // GET /api/admin/points/rules — 获取全部积分规则
  getRules(req, res, next) {
    try {
      const rules = LevelConfig.getRules();
      res.json({ success: true, data: rules });
    } catch (error) { next(error); }
  },

  // POST /api/admin/points/rules — 新增或更新积分规则
  saveRule(req, res, next) {
    try {
      const { id, action, points, description, enabled } = req.body;
      if (!action || points === undefined || !description) {
        return res.status(400).json({ success: false, message: '缺少必填字段: action, points, description' });
      }
      const result = LevelConfig.upsertRule({
        id, action, points: Number(points), description, enabled: enabled !== false,
      });
      res.json({ success: true, message: id ? '积分规则已更新' : '积分规则已创建', data: result });
    } catch (error) { next(error); }
  },

  // DELETE /api/admin/points/rules/:id — 删除积分规则
  deleteRule(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      const result = LevelConfig.deleteRule(id);
      if (!result.changes) {
        return res.status(404).json({ success: false, message: '积分规则不存在' });
      }
      res.json({ success: true, message: '积分规则已删除' });
    } catch (error) { next(error); }
  },
};

export default adminPointsController;

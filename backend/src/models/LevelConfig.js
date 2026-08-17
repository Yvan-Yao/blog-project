/**
 * @file LevelConfig.js
 * @description 等级配置 & 积分规则配置模型（Admin 维护）
 *
 * 两张配置表：
 *  - level_config:  等级名称、最低积分阈值
 *  - point_rules:   积分动作、分值、描述、启用状态
 */

import db from './database.js';

const LevelConfig = {
  // ── 等级配置 ──────────────────────────────────

  /**
   * 获取全部等级配置（按 level ASC 排序）
   */
  getAll() {
    return db.prepare(
      'SELECT * FROM level_config ORDER BY level ASC'
    ).all();
  },

  /**
   * 获取单个等级配置
   */
  getOne(id) {
    return db.prepare('SELECT * FROM level_config WHERE id = ?').get(id);
  },

  /**
   * 创建或更新等级配置
   * @param {{ level:number, title:string, min_points:number }} data
   * @returns 完整的配置行
   */
  upsert(data) {
    const { id, level, title, min_points } = data;

    if (id) {
      // 更新
      db.prepare(`
        UPDATE level_config SET level = ?, title = ?, min_points = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(level, title, min_points, id);
    } else {
      // 新增
      db.prepare(`
        INSERT INTO level_config (level, title, min_points) VALUES (?, ?, ?)
      `).run(level, title, min_points);
    }

    // 返回最新数据
    if (id) return this.getOne(id);
    return db.prepare('SELECT * FROM level_config WHERE level = ?').get(level);
  },

  /**
   * 删除等级配置
   */
  delete(id) {
    return db.prepare('DELETE FROM level_config WHERE id = ?').run(id);
  },

  // ── 积分规则配置 ──────────────────────────────

  /**
   * 获取全部积分规则
   */
  getRules() {
    return db.prepare(
      'SELECT * FROM point_rules ORDER BY id ASC'
    ).all();
  },

  /**
   * 获取单条积分规则
   */
  getRule(id) {
    return db.prepare('SELECT * FROM point_rules WHERE id = ?').get(id);
  },

  /**
   * 创建或更新积分规则
   * @param {{ action:string, points:number, description:string, enabled:boolean }} data
   */
  upsertRule(data) {
    const { id, action, points, description, enabled } = data;

    if (id) {
      db.prepare(`
        UPDATE point_rules SET action = ?, points = ?, description = ?, enabled = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(action, points, description, enabled ? 1 : 0, id);
    } else {
      db.prepare(`
        INSERT INTO point_rules (action, points, description, enabled)
        VALUES (?, ?, ?, ?)
      `).run(action, points, description, enabled ? 1 : 0);
    }

    if (id) return this.getRule(id);
    return db.prepare('SELECT * FROM point_rules WHERE action = ?').get(action);
  },

  /**
   * 删除积分规则
   */
  deleteRule(id) {
    return db.prepare('DELETE FROM point_rules WHERE id = ?').run(id);
  },
};

export default LevelConfig;

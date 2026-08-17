/**
 * @file Points.js
 * @description 积分模型 — 等级/头衔/流水记录
 *
 * 积分规则 & 等级体系现在从数据库 level_config / point_rules 表中动态读取，
 * Admin 可通过后台面板实时修改。
 */

import db from './database.js';

// ── 从数据库加载配置（每次调用实时读取，支持 Admin 热更新） ──

/** 从 point_rules 表加载启用的积分规则 */
function _loadPointRules() {
  const rows = db.prepare(
    "SELECT * FROM point_rules WHERE enabled = 1"
  ).all();
  const map = {};
  for (const r of rows) {
    map[r.action] = { points: r.points, desc: r.description };
  }
  return map;
}

/** 从 level_config 表加载等级阈值（按 min_points ASC） */
function _loadLevelTable() {
  return db.prepare(
    'SELECT level, title, min_points AS min FROM level_config ORDER BY min_points ASC'
  ).all();
}

// 保持导出以供外部引用（每次访问时实时读取）
export const POINT_RULES = new Proxy({}, {
  get(_, action) { return _loadPointRules()[action]; },
  ownKeys() { return Object.keys(_loadPointRules()); },
  getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; },
});

export const LEVEL_TABLE = new Proxy([], {
  get(_, prop) {
    const levels = _loadLevelTable();
    if (typeof prop === 'string' && !isNaN(prop)) return levels[Number(prop)];
    return levels[prop];
  },
  ownKeys() { return Reflect.ownKeys(_loadLevelTable()); },
  getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; },
});

// 根据总积分计算等级信息
export function calcLevel(total) {
  const levels = _loadLevelTable();
  let current = levels[0];
  for (const entry of levels) {
    if (total >= entry.min) current = entry;
    else break;
  }
  // 下一级的最低分，用于显示进度
  const nextIdx = levels.findIndex(e => e.level === current.level + 1);
  const next = nextIdx >= 0 ? levels[nextIdx] : null;
  return {
    level: current.level,
    title: current.title,
    min:   current.min,
    next_min: next ? next.min : null,
    next_title: next ? next.title : null,
    progress: next ? Math.floor(((total - current.min) / (next.min - current.min)) * 100) : 100,
  };
}

// ── Points 模型 ──────────────────────────────────────────
const Points = {
  /**
   * 给用户加积分（创建流水 + 更新汇总）
   * @param {number} userId - 目标用户 ID
   * @param {string} action - 积分类型（POINT_RULES 中的 key）
   * @param {number|null} refId - 关联资源 ID（文章/评论等）
   * @returns {{ total, level, title, gained }}
   */
  add(userId, action, refId = null) {
    const rules = _loadPointRules();
    const rule = rules[action];
    if (!rule) throw new Error(`未知积分类型: ${action}`);

    // 插入流水记录
    db.prepare(
      `INSERT INTO point_logs (user_id, action, points, description, ref_id)
       VALUES (?, ?, ?, ?, ?)`
    ).run(userId, action, rule.points, rule.desc, refId);

    // 确保汇总行存在
    db.prepare(
      `INSERT OR IGNORE INTO user_points (user_id, total, level, title)
       VALUES (?, 0, 1, '新手')`
    ).run(userId);

    // 累加积分
    db.prepare(
      `UPDATE user_points SET total = total + ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).run(rule.points, userId);

    // 重新计算等级
    const row = db.prepare('SELECT total FROM user_points WHERE user_id = ?').get(userId);
    const info = calcLevel(row.total);
    db.prepare(
      `UPDATE user_points SET level = ?, title = ? WHERE user_id = ?`
    ).run(info.level, info.title, userId);

    return { total: row.total, ...info, gained: rule.points };
  },

  /**
   * 初始化用户积分行（注册时调用）
   */
  init(userId) {
    db.prepare(
      `INSERT OR IGNORE INTO user_points (user_id, total, level, title)
       VALUES (?, 0, 1, '新手')`
    ).run(userId);
  },

  /**
   * 获取用户积分信息（含等级进度）
   */
  get(userId) {
    // 确保行存在
    db.prepare(
      `INSERT OR IGNORE INTO user_points (user_id, total, level, title)
       VALUES (?, 0, 1, '新手')`
    ).run(userId);

    const row = db.prepare('SELECT * FROM user_points WHERE user_id = ?').get(userId);
    const info = calcLevel(row.total);
    return {
      user_id:    row.user_id,
      total:      row.total,
      ...info,
    };
  },

  /**
   * 获取积分流水（分页）
   */
  getLogs(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const total = db.prepare(
      'SELECT COUNT(*) as cnt FROM point_logs WHERE user_id = ?'
    ).get(userId)?.cnt || 0;

    const logs = db.prepare(
      `SELECT * FROM point_logs WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(userId, limit, offset);

    return { total, page, limit, data: logs };
  },

  /**
   * 积分排行榜（前 N 名）
   */
  leaderboard(limit = 20) {
    return db.prepare(
      `SELECT up.user_id, up.total, up.level, up.title,
              u.username, u.avatar
       FROM user_points up
       JOIN users u ON up.user_id = u.id
       ORDER BY up.total DESC LIMIT ?`
    ).all(limit);
  },

  // ── Admin 方法 ──────────────────────────────────────────

  /**
   * Admin: 获取所有用户的积分列表（含搜索/排序/分页）
   */
  getAllUsersPoints({ page = 1, limit = 20, search = '', sortBy = 'total', order = 'desc' } = {}) {
    const offset = (page - 1) * limit;
    const searchClause = search
      ? 'WHERE u.username LIKE ? OR u.email LIKE ?'
      : '';
    const searchParam = search ? `%${search}%` : null;

    const allowedSorts = ['total', 'level', 'username', 'created_at'];
    const safeSort = allowedSorts.includes(sortBy) ? sortBy : 'total';
    const sortField = safeSort === 'username' ? 'u.username' : `up.${safeSort}`;
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    const countSql = searchParam
      ? `SELECT COUNT(*) as cnt FROM user_points up JOIN users u ON up.user_id = u.id ${searchClause}`
      : 'SELECT COUNT(*) as cnt FROM user_points';
    const total = (searchParam
      ? db.prepare(countSql).get(searchParam, searchParam)
      : db.prepare(countSql).get()
    )?.cnt || 0;

    const listSql = searchParam
      ? `SELECT up.*, u.username, u.email, u.avatar, u.role
         FROM user_points up JOIN users u ON up.user_id = u.id
         ${searchClause} ORDER BY ${sortField} ${safeOrder} LIMIT ? OFFSET ?`
      : `SELECT up.*, u.username, u.email, u.avatar, u.role
         FROM user_points up JOIN users u ON up.user_id = u.id
         ORDER BY ${sortField} ${safeOrder} LIMIT ? OFFSET ?`;

    const data = searchParam
      ? db.prepare(listSql).all(searchParam, searchParam, limit, offset)
      : db.prepare(listSql).all(limit, offset);

    return { total, page, limit, data };
  },

  /**
   * Admin: 积分统计概览
   */
  getStats() {
    const totalUsers     = db.prepare('SELECT COUNT(*) as cnt FROM user_points').get()?.cnt || 0;
    const totalPoints    = db.prepare('SELECT COALESCE(SUM(total), 0) as s FROM user_points').get()?.s || 0;
    const avgPoints      = totalUsers > 0 ? Math.round(totalPoints / totalUsers) : 0;

    // 等级分布
    const levelDist = db.prepare(`
      SELECT level, title, COUNT(*) as cnt
      FROM user_points GROUP BY level ORDER BY level
    `).all();

    // 最近积分流水（top 20）
    const recentLogs = db.prepare(`
      SELECT pl.*, u.username, u.avatar
      FROM point_logs pl JOIN users u ON pl.user_id = u.id
      ORDER BY pl.created_at DESC LIMIT 20
    `).all();

    // Top 积分用户
    const topUsers = db.prepare(`
      SELECT up.user_id, up.total, up.level, up.title,
             u.username, u.avatar
      FROM user_points up JOIN users u ON up.user_id = u.id
      ORDER BY up.total DESC LIMIT 10
    `).all();

    return { totalUsers, totalPoints, avgPoints, levelDist, recentLogs: recentLogs || [], topUsers: topUsers || [] };
  },

  /**
   * Admin: 手动调整用户积分
   * @param {number} userId
   * @param {number} amount - 正数加、负数扣
   * @param {string} reason - 调整原因
   */
  adjust(userId, amount, reason) {
    // 确保汇总行存在
    db.prepare(
      `INSERT OR IGNORE INTO user_points (user_id, total, level, title) VALUES (?, 0, 1, '新手')`
    ).run(userId);

    // 防止扣到负数
    const current = db.prepare('SELECT total FROM user_points WHERE user_id = ?').get(userId);
    const newTotal = Math.max(0, current.total + amount);

    // 插入流水记录
    const actionLabel = amount >= 0 ? 'admin_add' : 'admin_deduct';
    const descLabel = amount >= 0 ? `管理员手动增加: ${reason}` : `管理员手动扣除: ${reason}`;
    db.prepare(
      `INSERT INTO point_logs (user_id, action, points, description, ref_id)
       VALUES (?, ?, ?, ?, NULL)`
    ).run(userId, actionLabel, amount, descLabel);

    // 更新积分
    db.prepare(
      `UPDATE user_points SET total = ?, updated_at = datetime('now') WHERE user_id = ?`
    ).run(newTotal, userId);

    // 重新计算等级
    const info = calcLevel(newTotal);
    db.prepare(
      `UPDATE user_points SET level = ?, title = ? WHERE user_id = ?`
    ).run(info.level, info.title, userId);

    return { total: newTotal, ...info, adjusted: amount };
  },

  /**
   * Admin: 获取某个用户的积分流水（不限分页，limit可选）
   */
  getUserLogs(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const total = db.prepare(
      'SELECT COUNT(*) as cnt FROM point_logs WHERE user_id = ?'
    ).get(userId)?.cnt || 0;

    const logs = db.prepare(
      `SELECT pl.*, u.username
       FROM point_logs pl
       LEFT JOIN users u ON pl.user_id = u.id
       WHERE pl.user_id = ?
       ORDER BY pl.created_at DESC LIMIT ? OFFSET ?`
    ).all(userId, limit, offset);

    return { total, page, limit, data: logs };
  },
};

export default Points;

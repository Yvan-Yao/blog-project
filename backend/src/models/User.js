/**
 * @file User.js
 * @description 用户数据模型
 *
 * 封装所有与 users 表相关的数据库操作。
 * 所有 SQL 使用 Prepared Statement 防止注入攻击。
 */

import db from './database.js';
import bcrypt from 'bcryptjs';

/** bcrypt 加密轮数（越高越安全，越慢。10 是生产环境推荐值） */
const SALT_ROUNDS = 10;

const User = {
  /**
   * 根据 ID 查找用户（不返回密码字段）
   * @param {number} id - 用户 ID
   * @returns {Object|undefined} 用户对象（不含 password）
   */
  findById(id) {
    return db.prepare(`
      SELECT id, username, email, avatar, bio, website, location,
             birthday, gender, phone, github, twitter, occupation, interests,
             role, created_at
      FROM users WHERE id = ?
    `).get(id);
  },

  /**
   * 根据 url_token 查找用户（不含密码）
   * @param {string} token - UUID token
   * @returns {Object|undefined}
   */
  findByToken(token) {
    return db.prepare(`
      SELECT id, username, email, avatar, bio, website, location,
             birthday, gender, phone, github, twitter, occupation, interests,
             role, url_token, created_at
      FROM users WHERE url_token = ?
    `).get(token);
  },

  /**
   * 根据用户名查找用户（含密码，用于登录验证）
   * @param {string} username
   * @returns {Object|undefined}
   */
  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },

  /**
   * 根据邮箱查找用户
   * @param {string} email
   * @returns {Object|undefined}
   */
  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  /**
   * 创建新用户
   * @param {Object} data - { username, email, password, role? }
   * @returns {Object} 新创建的用户（不含密码）
   */
  async create({ username, email, password, role = 'user' }) {
    // 使用 bcrypt 对密码进行哈希处理（不存储明文）
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    // 生成 URL token（加密个人资料链接）
    const url_token = crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, role, url_token)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(username, email, hashedPassword, role, url_token);

    // 返回新用户信息（不含密码）
    return this.findById(result.lastInsertRowid);
  },

  /**
   * 验证密码是否正确
   * @param {string} plainPassword - 用户输入的明文密码
   * @param {string} hashedPassword - 数据库中存储的哈希密码
   * @returns {Promise<boolean>}
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  /**
   * 修改密码
   * @param {number} id - 用户 ID
   * @param {string} newPassword - 新密码（明文）
   */
  async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.prepare(`
      UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?
    `).run(hashedPassword, id);
  },

  /**
   * 更新用户信息
   * @param {number} id
   * @param {Object} data - { username?, bio?, avatar?, website?, location?, birthday?, gender?, phone?, github?, twitter?, occupation?, interests? }
   * @returns {Object} 更新后的用户
   */
  update(id, { username, bio, avatar, website, location, birthday, gender, phone, github, twitter, occupation, interests }) {
    db.prepare(`
      UPDATE users
      SET username   = COALESCE(?, username),
          bio        = COALESCE(?, bio),
          avatar     = COALESCE(?, avatar),
          website    = COALESCE(?, website),
          location   = COALESCE(?, location),
          birthday   = COALESCE(?, birthday),
          gender     = COALESCE(?, gender),
          phone      = COALESCE(?, phone),
          github     = COALESCE(?, github),
          twitter    = COALESCE(?, twitter),
          occupation = COALESCE(?, occupation),
          interests  = COALESCE(?, interests),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(username, bio, avatar, website, location,
           birthday, gender, phone, github, twitter, occupation, interests, id);
    return this.findById(id);
  },

  /**
   * 获取所有用户列表（Admin 专用）
   * @returns {Array}
   */
  findAll() {
    return db.prepare(`
      SELECT id, username, email, role, avatar, bio, website, location,
             birthday, gender, phone, github, twitter, occupation, interests, created_at
      FROM users ORDER BY created_at DESC
    `).all();
  },

  /**
   * 设置密码重置 Token（有效期 30 分钟）
   * @param {number} id - 用户 ID
   * @param {string} token - 重置令牌
   */
  setResetToken(id, token) {
    db.prepare(`
      UPDATE users
      SET reset_token = ?, reset_token_expires = datetime('now', '+30 minutes')
      WHERE id = ?
    `).run(token, id);
  },

  /**
   * 根据重置 Token 查找有效用户
   * 仅返回未过期的记录；每次调用后清除已过期的记录
   * @param {string} token
   * @returns {Object|undefined} 含 id/username/email 的用户信息
   */
  findByResetToken(token) {
    // 先清除所有已过期的 token（保证只有有效的 token 能被匹配）
    // 注意：prepare().run() 内部已自动调用 saveToFile()，无需重复调用
    db.prepare("UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE reset_token_expires < datetime('now')").run();
    return db.prepare(`
      SELECT id, username, email FROM users
      WHERE reset_token = ? AND reset_token_expires > datetime('now')
    `).get(token);
  },

  /**
   * 清除用户的密码重置 Token
   * @param {number} id
   */
  clearResetToken(id) {
    db.prepare('UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(id);
  },

  /**
   * 删除用户（Admin 专用）
   * @param {number} id
   */
  delete(id) {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },

  /**
   * 按用户名模糊搜索用户
   * @param {string} q - 搜索关键词
   * @param {number} [limit=20] - 最大返回数
   * @returns {Array<{id, username, email, avatar, bio}>}
   */
  search(q, limit = 20) {
    return db.prepare(`
      SELECT id, username, email, avatar, bio, website, location,
             birthday, gender, phone, github, twitter, occupation, interests
      FROM users
      WHERE username LIKE ?
      ORDER BY username ASC
      LIMIT ?
    `).all(`%${q}%`, limit);
  },

  /**
   * 获取用户公开资料（通过 username）
   * 仅返回非敏感信息，供其他用户查看
   * @param {string} username
   * @returns {Object|undefined}
   */
  getPublicProfile(identifier) {
    // 支持 username 或 url_token 查询
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const field = isUuid ? 'url_token' : 'username';
    return db.prepare(`
      SELECT id, username, avatar, bio, website, location,
             birthday, gender, github, twitter, occupation, interests,
             role, created_at, url_token
      FROM users WHERE ${field} = ?
    `).get(identifier);
  },

  /**
   * 获取用户的文章数量
   * @param {number} userId
   * @returns {number}
   */
  getPostCount(userId) {
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM posts WHERE author_id = ? AND status = 'published'
    `).get(userId);
    return row ? row.count : 0;
  },
};

export default User;

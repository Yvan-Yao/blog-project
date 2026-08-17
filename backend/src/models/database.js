/**
 * @file database.js
 * @description 数据库初始化模块（sql.js 纯 JS 实现）
 *
 * 使用 sql.js（SQLite 编译为 WebAssembly），无需原生编译，跨平台开箱即用。
 * 封装了与 better-sqlite3 兼容的 API：db.prepare(sql).run/get/all(params)
 */

import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/** 获取当前 DB 文件路径（每次调用动态读取环境变量，支持测试切换） */
function getDbPath() {
  return process.env.DB_PATH
    ? path.resolve(PROJECT_ROOT, process.env.DB_PATH)
    : path.join(PROJECT_ROOT, 'data/blog.db');
}

// 确保默认数据库目录存在
const defaultDir = path.dirname(path.join(PROJECT_ROOT, 'data/blog.db'));
if (!fs.existsSync(defaultDir)) {
  fs.mkdirSync(defaultDir, { recursive: true });
}

// ── sql.js 内部实例 ──────────────────────────
let _db = null;
let _dbPath = null;  // 当前打开的数据库路径

// ── 参数化的 SELECT 查询（使用 PreparedStatement） ──
function all(sql, params = []) {
  const safeParams = params.map(p => p === undefined ? null : p);
  const stmt = _db.prepare(sql);
  if (safeParams.length) stmt.bind(safeParams);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function get(sql, params = []) {
  const safeParams = params.map(p => p === undefined ? null : p);
  const stmt = _db.prepare(sql);
  if (safeParams.length) stmt.bind(safeParams);
  let result;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

// ── 写入操作 ──
function run(sql, params = []) {
  const safeParams = params.map(p => p === undefined ? null : p);
  _db.run(sql, safeParams);
  const row = get('SELECT last_insert_rowid() AS id, changes() AS changes');
  return {
    changes: row ? row.changes : _db.getRowsModified(),
    lastInsertRowid: row ? row.id : 0,
  };
}

/** 保存数据库到文件 */
function saveToFile() {
  if (_dbPath) {
    const data = _db.export();
    fs.writeFileSync(_dbPath, Buffer.from(data));
  }
}

/** prepared statement 兼容对象
 *  兼容 better-sqlite3 的调用方式：.run(p1, p2) 和 .run([p1, p2]) 都支持 */
function prepare(sql) {
  // 把 rest 参数展平（处理传入数组的情况）
  const flatten = (args) =>
    args.length === 1 && Array.isArray(args[0]) ? args[0] : args;

  return {
    run(...args) {
      const result = run(sql, flatten(args));
      saveToFile();
      return result;
    },
    get(...args) { return get(sql, flatten(args)); },
    all(...args) { return all(sql, flatten(args)); },
  };
}

/** 执行多语句 SQL（用于 DDL/批量操作） */
function exec(sql) {
  _db.exec(sql);
  saveToFile();
}

/** 事务包装 */
function transaction(fn) {
  _db.run('BEGIN');
  try {
    fn();
    _db.run('COMMIT');
    saveToFile();
  } catch (err) {
    try { _db.run('ROLLBACK'); } catch (_) {}
    throw err;
  }
}

// ── 种子数据函数 ────────────────────────────

/** 种子：等级配置（仅当表为空时插入） */
function seedLevelConfig() {
  const cnt = _db.exec("SELECT COUNT(*) FROM level_config");
  const count = cnt.length && cnt[0].values.length ? cnt[0].values[0][0] : 0;
  if (count > 0) return;

  const levels = [
    [1, '新手',       0],
    [2, '见习作者',   50],
    [3, '初级创作者', 150],
    [4, '进阶创作者', 350],
    [5, '资深作者',   700],
    [6, '优秀创作者', 1200],
    [7, '精英作者',   2000],
    [8, '大师',       3500],
    [9, '传说',       6000],
  ];
  const stmt = _db.prepare(
    'INSERT INTO level_config (level, title, min_points) VALUES (?, ?, ?)'
  );
  for (const [level, title, min_points] of levels) {
    stmt.run([level, title, min_points]);
  }
  stmt.free();
  console.log('🌱 种子数据: level_config (9 个等级)');
}

/** 种子：积分规则（仅当表为空时插入） */
function seedPointRules() {
  const cnt = _db.exec("SELECT COUNT(*) FROM point_rules");
  const count = cnt.length && cnt[0].values.length ? cnt[0].values[0][0] : 0;
  if (count > 0) return;

  const rules = [
    ['publish_post',    5, '发布文章'],
    ['receive_comment', 2, '文章收到评论'],
    ['post_comment',    1, '发表评论'],
    ['receive_like',    2, '文章收到点赞'],
    ['give_like',       1, '给文章点赞'],
  ];
  const stmt = _db.prepare(
    'INSERT INTO point_rules (action, points, description, enabled) VALUES (?, ?, ?, 1)'
  );
  for (const [action, points, description] of rules) {
    stmt.run([action, points, description]);
  }
  stmt.free();
  console.log('🌱 种子数据: point_rules (5 条规则)');
}

// ── 初始化 ────────────────────────────────────
async function initDatabase() {
  const SQL = await initSqlJs();
  _dbPath = getDbPath();

  // 确保目录存在
  const dir = path.dirname(_dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(_dbPath)) {
    _db = new SQL.Database(fs.readFileSync(_dbPath));
  } else {
    _db = new SQL.Database();
  }

  _db.run('PRAGMA foreign_keys = ON');

  // 逐条建表
  const ddl = [
    `CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    NOT NULL UNIQUE,
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      avatar      TEXT    DEFAULT NULL,
      bio         TEXT    DEFAULT NULL,
      role        TEXT    NOT NULL DEFAULT 'user',
      url_token   TEXT    DEFAULT NULL,
      created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      slug        TEXT    NOT NULL UNIQUE,
      description TEXT    DEFAULT NULL,
      color       TEXT    DEFAULT '#4ade80',
      created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS posts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT    NOT NULL,
      slug         TEXT    NOT NULL UNIQUE,
      url_token    TEXT    DEFAULT NULL,
      summary      TEXT    DEFAULT NULL,
      content      TEXT    NOT NULL,
      cover_image  TEXT    DEFAULT NULL,
      status       TEXT    NOT NULL DEFAULT 'draft',
      author_id    INTEGER NOT NULL,
      category_id  INTEGER DEFAULT NULL,
      views        INTEGER NOT NULL DEFAULT 0,
      created_at   DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at   DATETIME NOT NULL DEFAULT (datetime('now')),
      published_at DATETIME DEFAULT NULL,
      FOREIGN KEY (author_id)   REFERENCES users(id)      ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS tags (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    )`,
    `CREATE TABLE IF NOT EXISTS post_tags (
      post_id INTEGER NOT NULL,
      tag_id  INTEGER NOT NULL,
      PRIMARY KEY (post_id, tag_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      content    TEXT    NOT NULL,
      post_id    INTEGER NOT NULL,
      author_id  INTEGER NOT NULL,
      parent_id  INTEGER DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id)   REFERENCES posts(id)    ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS bookmarks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      post_id    INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )`,
    'CREATE INDEX IF NOT EXISTS idx_posts_status    ON posts(status)',
    'CREATE INDEX IF NOT EXISTS idx_posts_author    ON posts(author_id)',
    'CREATE INDEX IF NOT EXISTS idx_posts_category  ON posts(category_id)',
    'CREATE INDEX IF NOT EXISTS idx_posts_slug      ON posts(slug)',
    'CREATE INDEX IF NOT EXISTS idx_comments_post   ON comments(post_id)',
    'CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id)',
    'CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_user  ON bookmarks(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookmarks_post  ON bookmarks(post_id)',
    // ── 好友关系表 ──
    `CREATE TABLE IF NOT EXISTS friendships (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id  INTEGER NOT NULL,
      addressee_id  INTEGER NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'pending',
      created_at    DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at    DATETIME NOT NULL DEFAULT (datetime('now')),
      UNIQUE(requester_id, addressee_id),
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK (requester_id != addressee_id)
    )`,
    'CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id)',
    'CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id)',
    'CREATE INDEX IF NOT EXISTS idx_friendships_status   ON friendships(status)',
    // 密码重置字段（向前兼容：表已存在时用 ALTER TABLE）
    "ALTER TABLE users ADD COLUMN reset_token TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN reset_token_expires DATETIME DEFAULT NULL",
    // 个人信息扩展字段
    "ALTER TABLE users ADD COLUMN website TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN location TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN birthday TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN gender TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN phone TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN github TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN twitter TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN occupation TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN interests TEXT DEFAULT NULL",
    // 评论图片附件字段
    "ALTER TABLE comments ADD COLUMN image TEXT DEFAULT NULL",
    "ALTER TABLE comments ADD COLUMN image_width INTEGER DEFAULT NULL",
    "ALTER TABLE comments ADD COLUMN image_height INTEGER DEFAULT NULL",
    // 用户 URL token（加密个人资料链接）
    "ALTER TABLE users ADD COLUMN url_token TEXT DEFAULT NULL",
    // 文章 URL token（加密链接）
    "ALTER TABLE posts ADD COLUMN url_token TEXT DEFAULT NULL",
    // ── 文章点赞表 ──
    `CREATE TABLE IF NOT EXISTS post_likes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      post_id    INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )`,
    'CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id)',
    // ── 用户积分汇总表 ──
    `CREATE TABLE IF NOT EXISTS user_points (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL UNIQUE,
      total      INTEGER NOT NULL DEFAULT 0,
      level      INTEGER NOT NULL DEFAULT 1,
      title      TEXT    NOT NULL DEFAULT '新手',
      updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    'CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id)',
    // ── 积分流水日志表 ──
    `CREATE TABLE IF NOT EXISTS point_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      action      TEXT    NOT NULL,
      points      INTEGER NOT NULL,
      description TEXT    DEFAULT NULL,
      ref_id      INTEGER DEFAULT NULL,
      created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    'CREATE INDEX IF NOT EXISTS idx_point_logs_user   ON point_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_point_logs_action ON point_logs(action)',
    // ── 等级配置表（Admin 维护） ──
    `CREATE TABLE IF NOT EXISTS level_config (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      level       INTEGER NOT NULL UNIQUE,
      title       TEXT    NOT NULL,
      min_points  INTEGER NOT NULL,
      created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
    )`,
    // ── 积分规则配置表（Admin 维护） ──
    `CREATE TABLE IF NOT EXISTS point_rules (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      action      TEXT    NOT NULL UNIQUE,
      points      INTEGER NOT NULL,
      description TEXT    NOT NULL,
      enabled     INTEGER NOT NULL DEFAULT 1,
      created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
    )`,
  ];

  for (const sql of ddl) {
    try { _db.run(sql); } catch (err) {
      // ALTER TABLE 重复添加列 / CREATE INDEX 重复 都是安全的，记录 warning 不中断
      if (err.message && /duplicate|already exists/i.test(err.message)) {
        console.warn('⚠️  跳过（已存在）:', sql.split('\n')[0].trim());
      } else {
        console.error('DDL error:', err.message);
        throw err;
      }
    }
  }

  // ── 种子数据：如果表为空则插入默认配置 ──
  seedLevelConfig();
  seedPointRules();

  // ── 为已有文章生成 url_token（加密链接） ──
  const postsWithoutToken = all('SELECT id FROM posts WHERE url_token IS NULL');
  if (postsWithoutToken.length > 0) {
    console.log(`🔗 为 ${postsWithoutToken.length} 篇文章生成 URL token...`);
    for (const { id } of postsWithoutToken) {
      const token = crypto.randomUUID();
      run('UPDATE posts SET url_token = ? WHERE id = ?', [token, id]);
    }
    saveToFile();
    console.log('✅ 文章 URL token 生成完毕');
  }

  // ── 为已有用户生成 url_token（加密个人资料链接） ──
  const usersWithoutToken = all('SELECT id FROM users WHERE url_token IS NULL');
  if (usersWithoutToken.length > 0) {
    console.log(`👤 为 ${usersWithoutToken.length} 位用户生成 URL token...`);
    for (const { id } of usersWithoutToken) {
      const token = crypto.randomUUID();
      run('UPDATE users SET url_token = ? WHERE id = ?', [token, id]);
    }
    saveToFile();
    console.log('✅ 用户 URL token 生成完毕');
  }

  saveToFile();

  console.log('✅ Database initialized at', _dbPath);
  return { exec, transaction, run, get, all, prepare, saveToFile };
}

export { initDatabase, exec, transaction, run, get, all, prepare, saveToFile };

export default {
  prepare: (sql) => prepare(sql),
  exec: (sql) => exec(sql),
  transaction: (fn) => transaction(fn),
};

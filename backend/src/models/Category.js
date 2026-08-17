/**
 * @file Category.js
 * @description 分类数据模型
 */

import db from './database.js';

const Category = {
  /** 获取所有分类（含每个分类的文章数） */
  findAll() {
    return db.prepare(`
      SELECT
        c.*,
        COUNT(p.id) AS post_count
      FROM categories c
      LEFT JOIN posts p ON p.category_id = c.id AND p.status = 'published'
      GROUP BY c.id
      ORDER BY post_count DESC
    `).all();
  },

  /** 根据 ID 查询 */
  findById(id) {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  },

  /** 根据 slug 查询 */
  findBySlug(slug) {
    return db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
  },

  /** 创建分类（Admin 专用） */
  create({ name, slug, description = null, color = '#4ade80' }) {
    const result = db.prepare(`
      INSERT INTO categories (name, slug, description, color)
      VALUES (?, ?, ?, ?)
    `).run(name, slug, description, color);
    return this.findById(result.lastInsertRowid);
  },

  /** 更新分类（Admin 专用） */
  update(id, { name, slug, description, color }) {
    db.prepare(`
      UPDATE categories
      SET name = COALESCE(?, name),
          slug = COALESCE(?, slug),
          description = COALESCE(?, description),
          color = COALESCE(?, color)
      WHERE id = ?
    `).run(name, slug, description, color, id);
    return this.findById(id);
  },

  /** 删除分类（关联文章的 category_id 将变为 null） */
  delete(id) {
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  },
};

export default Category;

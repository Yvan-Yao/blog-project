/**
 * @file category.controller.js
 * @description 分类控制器
 */

import Category from '../models/Category.js';

const categoryController = {
  /** GET /api/categories - 获取所有分类（公开） */
  index(req, res, next) {
    try {
      const categories = Category.findAll();
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/categories - 创建分类（Admin） */
  create(req, res, next) {
    try {
      const { name, slug, description, color } = req.body;

      const existing = Category.findBySlug(slug);
      if (existing) {
        return res.status(409).json({ success: false, message: '该分类 slug 已存在' });
      }

      const category = Category.create({ name, slug, description, color });
      res.status(201).json({ success: true, message: '分类创建成功', data: category });
    } catch (error) {
      next(error);
    }
  },

  /** PUT /api/categories/:id - 更新分类（Admin） */
  update(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      const category = Category.findById(id);
      if (!category) {
        return res.status(404).json({ success: false, message: '分类不存在' });
      }
      const updated = Category.update(id, req.body);
      res.json({ success: true, message: '分类更新成功', data: updated });
    } catch (error) {
      next(error);
    }
  },

  /** DELETE /api/categories/:id - 删除分类（Admin） */
  destroy(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      if (!Category.findById(id)) {
        return res.status(404).json({ success: false, message: '分类不存在' });
      }
      Category.delete(id);
      res.json({ success: true, message: '分类已删除' });
    } catch (error) {
      next(error);
    }
  },
};

export default categoryController;

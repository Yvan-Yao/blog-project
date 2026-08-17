/**
 * @file category.routes.js
 * @description 分类路由
 */

import { Router } from 'express';
import { body } from 'express-validator';
import categoryController from '../controllers/category.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

router.get('/', categoryController.index);

router.post('/',
  authenticate, requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('分类名不能为空'),
    body('slug').trim().matches(/^[a-z0-9-]+$/).withMessage('slug 只能包含小写字母、数字和连字符'),
  ],
  validate,
  categoryController.create
);

router.put('/:id', authenticate, requireAdmin, categoryController.update);
router.delete('/:id', authenticate, requireAdmin, categoryController.destroy);

export default router;

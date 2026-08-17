/**
 * @file validate.middleware.js
 * @description 请求参数校验中间件
 *
 * 使用 express-validator 对请求体/参数进行声明式校验。
 * 校验失败时统一返回 400 错误，包含详细的字段错误信息。
 *
 * ═══════════════════════════════════════════════════════════
 * optBody / optQuery — 统一"可选"语义
 * ═══════════════════════════════════════════════════════════
 *
 * 默认的 optional() 只跳过"字段不存在"的情况，
 * 一旦前端的 JSON.stringify 发送了 field: null，validator 仍会校验并报错。
 * optBody / optQuery 使用 { values: 'falsy' }，将 null / undefined / "" / 0 / false
 * 全部视为"未传"，彻底消除前后端对"空"的理解差异。
 *
 * 用法:
 *   import { optBody, optQuery, validate } from '../middleware/validate.middleware.js';
 *   [ optBody('parent_id').isInt({ min: 1 }) ]
 */

import { body, query, validationResult } from 'express-validator';

/** 可选 body 字段：跳过 null / undefined / "" / 0 / false */
export const optBody = (field) => body(field).optional({ values: 'falsy' });

/** 可选 query 字段：跳过 null / undefined / "" / 0 / false */
export const optQuery = (field) => query(field).optional({ values: 'falsy' });

/**
 * 执行校验结果检查的中间件
 * 在路由 handler 之前使用，校验不通过直接返回 400
 *
 * 使用方式：
 * router.post('/posts', [...validators], validate, postController.create)
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // 开发环境输出详细日志，帮助排查前端传参问题
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Validate] 校验失败:', req.method, req.originalUrl);
      console.warn('[Validate] 请求体:', JSON.stringify(req.body, null, 2));
      console.warn('[Validate] 错误详情:', JSON.stringify(errors.array(), null, 2));
    }
    return res.status(400).json({
      success: false,
      message: '请求参数校验失败',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
}

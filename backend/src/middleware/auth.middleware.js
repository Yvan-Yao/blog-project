/**
 * @file auth.middleware.js
 * @description JWT 认证中间件
 *
 * 提供两个中间件：
 *  1. authenticate   - 验证 JWT Token，将用户信息挂载到 req.user
 *  2. requireAdmin   - 在 authenticate 之后，额外检查用户是否为 admin 角色
 *
 * Token 传递方式（优先级从高到低）：
 *  1. Authorization: Bearer <token>  （推荐）
 *  2. Cookie: token=<token>
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * JWT 认证中间件
 * 验证请求头中的 Bearer Token，将解码后的用户信息挂载到 req.user
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
export function authenticate(req, res, next) {
  try {
    // 从 Authorization 头或 Cookie 中提取 token
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // 去掉 "Bearer " 前缀
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌，请先登录',
      });
    }

    // 验证并解码 JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 从数据库重新查询用户（确保用户仍然存在且未被删除）
    const user = User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被删除',
      });
    }

    // 将用户信息挂载到请求对象，供后续中间件和控制器使用
    req.user = user;
    next();
  } catch (error) {
    // JWT 过期或签名不匹配
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: '无效的认证令牌' });
    }
    next(error);
  }
}

/**
 * Admin 权限中间件（必须在 authenticate 之后使用）
 * 检查 req.user.role 是否为 'admin'
 *
 * 使用方式：router.delete('/posts/:id', authenticate, requireAdmin, handler)
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '权限不足，此操作需要管理员权限',
    });
  }
  next();
}

/**
 * 可选认证中间件
 * 如果提供了 Token 则解码并挂载 req.user，没有 Token 也不报错（允许游客访问）
 * 适用于：文章详情页（游客可以看，登录用户可以看到"是否收藏"等额外信息）
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = User.findById(decoded.id);
    }
  } catch {
    // Token 无效时静默忽略，req.user 保持 undefined
  }
  next();
}

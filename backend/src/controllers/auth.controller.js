/**
 * @file auth.controller.js
 * @description 认证控制器（注册 / 登录 / 获取当前用户）
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User   from '../models/User.js';
import Points from '../models/Points.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 生成 JWT Token
 * @param {Object} user - 用户对象（含 id 和 role）
 * @returns {string} JWT 字符串
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

const authController = {
  /**
   * POST /api/auth/register
   * @swagger
   * /auth/register:
   *   post:
   *     summary: 用户注册
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [username, email, password]
   *             properties:
   *               username: { type: string, example: "张三" }
   *               email: { type: string, example: "zhangsan@example.com" }
   *               password: { type: string, example: "password123" }
   *               adminSecret: { type: string, description: "管理员注册码，填写后注册为 admin" }
   */
  async register(req, res, next) {
    try {
      const { username, email, password, adminSecret } = req.body;

      // 检查用户名/邮箱是否已存在
      if (User.findByUsername(username)) {
        return res.status(409).json({ success: false, message: '用户名已被使用' });
      }
      if (User.findByEmail(email)) {
        return res.status(409).json({ success: false, message: '邮箱已被注册' });
      }

      // 确定用户角色：提供正确的 adminSecret 才能注册为 admin
      const role = adminSecret && adminSecret === process.env.ADMIN_SECRET ? 'admin' : 'user';

      const user = await User.create({ username, email, password, role });
      // 初始化积分记录
      Points.init(user.id);
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/login
   * @swagger
   * /auth/login:
   *   post:
   *     summary: 用户登录
   *     tags: [Auth]
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      // 查找用户（含密码字段）
      const user = User.findByUsername(username);
      if (!user) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }

      // 验证密码
      const isValid = await User.verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }

      const token = generateToken(user);
      // 去掉返回数据中的敏感字段
      const { password: _, reset_token: __, reset_token_expires: ___, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: '登录成功',
        data: { user: userWithoutPassword, token },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   * 获取当前登录用户信息（需要 authenticate 中间件）
   */
  getMe(req, res) {
    res.json({ success: true, data: req.user });
  },

  /**
   * PUT /api/auth/profile
   * 更新个人资料
   */
  updateProfile(req, res, next) {
    try {
      const { username, bio, avatar, website, location, birthday, gender, phone, github, twitter, occupation, interests } = req.body;

      // 如果修改了用户名，检查是否与现有用户冲突
      if (username && username !== req.user.username) {
        const existing = User.findByUsername(username);
        if (existing) {
          return res.status(409).json({ success: false, message: '用户名已被使用' });
        }
      }

      const updated = User.update(req.user.id, { username, bio, avatar, website, location, birthday, gender, phone, github, twitter, occupation, interests });
      res.json({ success: true, message: '资料更新成功', data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/avatar
   * 上传用户头像
   */
  uploadAvatar(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: '请选择要上传的图片' });
      }

      // 构建可访问的 URL 路径
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      // 更新用户头像
      const updated = User.update(req.user.id, { avatar: avatarUrl });

      res.json({ success: true, message: '头像更新成功', data: updated });
    } catch (error) {
      next(error);
    }
  },
  getPublicProfile(req, res, next) {
    try {
      const { username } = req.params;
      // 优先按 url_token 查询（UUID 格式），失败则按用户名查询（兼容旧链接）
      let profile = User.findByToken(username);
      if (!profile) {
        profile = User.getPublicProfile(username);
      }

      if (!profile) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      // 获取文章数量
      const postCount = User.getPostCount(profile.id);

      res.json({
        success: true,
        data: { ...profile, postCount },
      });
    } catch (error) {
      next(error);
    }
  },
  /**
   * PUT /api/auth/password
   * @swagger
   * /auth/password:
   *   put:
   *     summary: 修改密码
   *     tags: [Auth]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [currentPassword, newPassword, confirmPassword]
   *             properties:
   *               currentPassword: { type: string, example: "oldpass123" }
   *               newPassword: { type: string, example: "newpass456" }
   *               confirmPassword: { type: string, example: "newpass456" }
   *     responses:
   *       200:
   *         description: 密码修改成功
   *       400:
   *         description: 参数校验失败或当前密码不正确
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      // 确认两次输入一致
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: '两次输入的新密码不一致' });
      }

      // 拿带密码字段的完整用户记录
      const fullUser = User.findByUsername(req.user.username);
      if (!fullUser) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      // 验证当前密码
      const isValid = await User.verifyPassword(currentPassword, fullUser.password);
      if (!isValid) {
        return res.status(400).json({ success: false, message: '当前密码不正确' });
      }

      // 不能和旧密码相同
      const isSame = await User.verifyPassword(newPassword, fullUser.password);
      if (isSame) {
        return res.status(400).json({ success: false, message: '新密码不能和当前密码相同' });
      }

      await User.updatePassword(req.user.id, newPassword);
      res.json({ success: true, message: '密码修改成功，请使用新密码重新登录' });
    } catch (error) {
      next(error);
    }
  },
  /**
   * POST /api/auth/forgot-password
   * @swagger
   * /auth/forgot-password:
   *   post:
   *     summary: 忘记密码 — 发送重置令牌
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email: { type: string, example: "user@example.com" }
   *     responses:
   *       200: { description: "重置令牌已生成（模拟邮件发送）" }
   */
  forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      // 查找该邮箱对应的用户
      const user = User.findByEmail(email);
      if (!user) {
        // 无论邮箱是否存在都返回相同消息，防止枚举攻击
        return res.json({
          success: true,
          message: '如果该邮箱已注册，重置令牌已发送',
        });
      }

      // 生成一个 32 字节的随机令牌（hex 编码 = 64 字符）
      const token = crypto.randomBytes(32).toString('hex');
      User.setResetToken(user.id, token);

      res.json({
        success: true,
        message: '重置令牌已生成',
        // ⚠️ 演示环境直接返回 token（生产环境应通过邮件发送）
        data: { token, expiresIn: '30 分钟' },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/reset-password
   * @swagger
   * /auth/reset-password:
   *   post:
   *     summary: 使用重置令牌修改密码
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [token, newPassword, confirmPassword]
   *             properties:
   *               token: { type: string, example: "a1b2c3..." }
   *               newPassword: { type: string, example: "newpass456" }
   *               confirmPassword: { type: string, example: "newpass456" }
   *     responses:
   *       200:
   *         description: 密码重置成功
   *       400:
   *         description: 令牌无效/过期 或 参数校验失败
   */
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      // 确认两次输入一致
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: '两次输入的新密码不一致' });
      }

      // 根据 token 查找用户（自动排除已过期）
      const user = User.findByResetToken(token);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: '重置令牌无效或已过期（有效期 30 分钟）',
        });
      }

      // 更新密码并清除 token（一次性使用）
      await User.updatePassword(user.id, newPassword);
      User.clearResetToken(user.id);

      res.json({ success: true, message: '密码重置成功，请使用新密码登录' });
    } catch (error) {
      next(error);
    }
  },
};

export default authController;

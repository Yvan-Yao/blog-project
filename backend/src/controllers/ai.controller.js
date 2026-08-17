/**
 * @file src/controllers/ai.controller.js
 * @description AI 功能控制器 — 文本润色 + 图片生成
 */

import aiService from '../services/ai.service.js';

const aiController = {
  /**
   * POST /api/ai/polish
   * Body: { text, style?, lang? }
   * Response: { success: true, data: { polished } }
   */
  async polish(req, res, next) {
    try {
      const { text, style, lang } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ success: false, message: '请提供需要润色的文本' });
      }
      if (text.length > 15000) {
        return res.status(400).json({ success: false, message: '文本过长，最多支持 15000 字符' });
      }

      if (!aiService.isAvailable()) {
        return res.status(503).json({
          success: false,
          message: 'AI 服务未配置，请在 .env 中设置 AI_API_KEY',
        });
      }

      const result = await aiService.polish({
        text: text.trim(),
        style: style || 'formal',
        lang: lang || 'zh',
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/ai/image
   * Body: { prompt, size? }
   * Response: { success: true, data: { url } }
   */
  async generateImage(req, res, next) {
    try {
      const { prompt, size } = req.body;

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ success: false, message: '请提供图片描述提示词' });
      }
      if (prompt.length > 1000) {
        return res.status(400).json({ success: false, message: '提示词过长，最多支持 1000 字符' });
      }

      if (!aiService.isAvailable()) {
        return res.status(503).json({
          success: false,
          message: 'AI 服务未配置，请在 .env 中设置 AI_API_KEY',
        });
      }

      const result = await aiService.generateImage({
        prompt: prompt.trim(),
        size: size || '1024x1024',
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};

export default aiController;

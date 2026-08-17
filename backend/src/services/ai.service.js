/**
 * @file src/services/ai.service.js
 * @description AI 服务层 — 统一封装 OpenAI 兼容 API 调用
 *
 * 支持功能：
 * - polish()  文本润色（chat completions）
 * - generateImage()  AI 图片生成（image generation）
 *
 * 配置方式（.env）：
 * - AI_API_URL  OpenAI 兼容 API Base URL（默认 https://api.openai.com/v1）
 * - AI_API_KEY  API 密钥（必填，未配置时端点返回 503）
 * - AI_MODEL    对话模型（默认 gpt-3.5-turbo）
 * - AI_IMAGE_MODEL 图片生成模型（默认 dall-e-3）
 *
 * 只需一个 API Key 即可同时启用润色和图片生成（取决于 endpoint 是否支持）。
 */

const AI_API_URL = (process.env.AI_API_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL   = process.env.AI_MODEL || 'gpt-3.5-turbo';
const AI_IMAGE_MODEL = process.env.AI_IMAGE_MODEL || 'dall-e-3';

/**
 * 检查 AI 服务是否可用
 */
function isAvailable() {
  return !!AI_API_KEY;
}

/**
 * 文本润色
 * @param {Object}  options
 * @param {string}  options.text     - 要润色的文本
 * @param {string}  [options.style]  - 润色风格（formal/casual/academic）
 * @param {string}  [options.lang]   - 输出语言（zh/en/ja）
 * @returns {Promise<{ polished: string }>}
 */
async function polish({ text, style = 'formal', lang = 'zh' }) {
  if (!isAvailable()) throw new Error('AI 服务未配置 API Key');

  const styleGuide = {
    formal:   '使用正式、专业的语言风格',
    casual:   '使用轻松、口语化的表达方式',
    academic: '使用严谨、学术化的表达',
  };

  const langGuide = {
    zh: '输出使用中文',
    en: 'Output in English',
    ja: '出力は日本語で',
  };

  const systemPrompt = `你是一名专业写作助手。请润色用户提供的文本，要求：
1. 严格保持原文的核心意思和 Markdown 格式
2. 提升表达的流畅度、清晰度和专业性
3. ${styleGuide[style] || styleGuide.formal}
4. ${langGuide[lang] || langGuide.zh}
5. 只返回润色后的文本，不要添加任何解释、注释或前后缀`;

  const res = await fetch(`${AI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI API 请求失败 (${res.status}): ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  const polished = data.choices?.[0]?.message?.content?.trim();

  if (!polished) {
    throw new Error('AI 返回内容为空，请重试');
  }

  return { polished };
}

/**
 * AI 图片生成
 *
 * 优先使用原生图片 API（DALL-E 兼容），如不可用则降级为 LLM 生成图片提示词。
 * TokenHub 等纯文本 API 代理无法提供图片 API，降级后返回 refinedPrompt。
 *
 * @param {Object}  options
 * @param {string}  options.prompt - 图片描述提示词
 * @param {string}  [options.size] - 图片尺寸（默认 1024x1024）
 * @returns {Promise<{ url?: string, refinedPrompt: string, mode: 'native'|'chat' }>}
 */
async function generateImage({ prompt, size = '1024x1024' }) {
  if (!isAvailable()) throw new Error('AI 服务未配置 API Key');

  // ── 1. 尝试原生图片 API ──
  try {
    const res = await fetch(`${AI_API_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_IMAGE_MODEL,
        prompt,
        n: 1,
        size,
        response_format: 'url',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const url = data.data?.[0]?.url;
      if (url) {
        return { url, refinedPrompt: data.data[0]?.revised_prompt || prompt, mode: 'native' };
      }
    }
    // 400/404/401 等错误 → 降级到 chat 模式
  } catch (_) {
    // 网络错误也降级
  }

  // ── 2. 降级：使用 LLM 生成精炼图片描述 ──
  const systemPrompt = `You are a professional AI image prompt engineer. 
Given a user's image idea, create a detailed, vivid image generation prompt in English.
The prompt should include: subject, style, lighting, composition, color palette, and mood.
Keep it concise (under 200 words). Output ONLY the refined prompt, no explanations.`;

  const res = await fetch(`${AI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create an image generation prompt for: ${prompt}. Target size: ${size}.` },
      ],
      temperature: 0.8,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI 图片生成失败 (${res.status}): ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  const refinedPrompt = data.choices?.[0]?.message?.content?.trim();

  if (!refinedPrompt) {
    throw new Error('AI 未返回图片提示词');
  }

  return { refinedPrompt, mode: 'chat' };
}

export default { polish, generateImage, isAvailable };

/**
 * @file src/utils/contentRender.js
 * @description 内容渲染工具 — 自动识别 HTML 或 Markdown 格式
 */
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

const HTML_RE = /<[a-z][\s\S]*>/i

/**
 * 渲染内容为安全 HTML
 * - 如果内容包含 HTML 标签 → 直接净化渲染
 * - 否则视为 Markdown → marked 转换后净化
 *
 * @param {string}  content  文章正文
 * @param {string}  [fallback=''] 内容为空时的占位
 * @returns {string} 安全的 HTML
 */
export function renderContent(content, fallback = '') {
  if (!content) return fallback
  if (HTML_RE.test(content)) {
    return DOMPurify.sanitize(content)
  }
  return DOMPurify.sanitize(marked(content))
}

/**
 * 从 HTML 内容提取标题（用于侧栏目录）
 * @param {string} html
 * @returns {{ level: number, text: string, id: string }[]}
 */
export function extractTOC(html) {
  const headingRegex = /<h([23])\b[^>]*>(.*?)<\/h[23]>/gi
  const items = []
  let match
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1])
    const text = match[2].replace(/<[^>]+>/g, '').trim()
    const id = 'heading-' + items.length
    items.push({ level, text, id })
  }
  return items
}

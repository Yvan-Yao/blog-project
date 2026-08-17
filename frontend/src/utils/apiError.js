/**
 * @file src/utils/apiError.js
 * @description 统一 API 错误信息提取
 *
 * 后端 validate 中间件返回格式：
 *   { success: false, message: "请求参数校验失败", errors: [{ field, message }] }
 *
 * 本工具优先展示字段级错误，让前端用户精确知道哪个字段出了问题，
 * 避免泛化的"操作失败"提示掩盖根因。
 *
 * 用法:
 *   import { formatApiError } from '@/utils/apiError'
 *
 *   onError: (err) => toast.error(formatApiError(err))
 */

/**
 * 从 axios 错误响应中提取人类可读的错误信息
 * @param {Error}  err    - axios onError 回调接收的 error 对象
 * @param {string} fallback - 当无法提取任何信息时的降级文案
 * @returns {string} 格式化后的错误信息（支持 toaster 展示）
 */
export function formatApiError(err, fallback = '操作失败，请稍后重试') {
  const data = err?.response?.data

  // 1. 优先展示字段级校验错误（express-validator 格式）
  if (data?.errors && data.errors.length > 0) {
    const details = data.errors
      .map((e) => {
        const field = e.field || e.path || ''
        const msg = e.message || e.msg || ''
        return field ? `· ${field}: ${msg}` : `· ${msg}`
      })
      .join('\n')
    return details
  }

  // 2. 其次展示顶层 message
  if (data?.message) return data.message

  // 3. HTTP 状态码降级
  if (err?.response?.status) {
    return `请求失败 (${err.response.status})`
  }

  // 4. 网络错误
  if (err?.message) return err.message

  // 5. 最终降级
  return fallback
}

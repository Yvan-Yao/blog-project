/**
 * @file null-strip.middleware.js
 * @description 防御性 null 值清理中间件
 *
 * 前端 JSON.stringify 会把"未选/未填"的字段序列化为 null：
 *   { parent_id: null, content: "hello" }
 * 到达后端后，express-validator 的 isInt() 会对 null 报错。
 *
 * 本中间件在 validator 执行前，递归删除 req.body / req.query 中
 * 值为 null 的字段（等同于未传），消除 express-validator 的可选字段歧义。
 *
 * 仅删除 null，保留 undefined / "" / 0 / false（这些由 optBody 处理）。
 */

export default function nullStrip(req, res, next) {
  /**
   * 递归处理：删除对象中值为 null 的键
   * 嵌套对象同样处理（如 { profile: { bio: null } } → { profile: {} }）
   */
  const strip = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (obj[key] === null) {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        strip(obj[key]);
      }
    }
  };

  if (req.body) strip(req.body);
  if (req.query) strip(req.query);

  next();
}

/**
 * @file upload.middleware.js
 * @description 文件上传中间件（基于 multer）
 *
 * 支持头像上传，限制文件类型和大小。
 * 上传的文件存储在 /backend/public/uploads/ 目录下。
 */

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/** 上传目录 */
const UPLOAD_DIR = path.join(PROJECT_ROOT, 'public', 'uploads', 'avatars');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/** 允许的图片 MIME 类型 */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** 文件大小限制：2MB */
const MAX_SIZE = 2 * 1024 * 1024;

/** multer storage 配置 */
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    // 使用时间戳 + 随机数 + 原始扩展名，避免冲突
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

/** 文件过滤器：仅允许图片 */
function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持 JPG / PNG / GIF / WebP 格式的图片'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

export default upload;

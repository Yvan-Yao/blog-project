/**
 * @file comment-upload.middleware.js
 * @description 评论图片上传中间件
 *
 * 限制：JPG/PNG/GIF/WebP，最大 5MB，存储在 public/uploads/comments/
 */

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

const UPLOAD_DIR = path.join(PROJECT_ROOT, 'public', 'uploads', 'comments');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `comment-${uniqueSuffix}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持 JPG / PNG / GIF / WebP 格式的图片'), false);
  }
}

const commentUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

export default commentUpload;

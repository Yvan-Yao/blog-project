/**
 * @file routes/index.js
 * @description API 路由入口，汇总所有子路由
 */

import { Router } from 'express';
import authRoutes       from './auth.routes.js';
import postRoutes       from './post.routes.js';
import commentRoutes    from './comment.routes.js';
import categoryRoutes   from './category.routes.js';
import adminRoutes      from './admin.routes.js';
import bookmarkRoutes   from './bookmark.routes.js';
import friendshipRoutes from './friendship.routes.js';
import aiRoutes         from './ai.routes.js';
import pointsRoutes     from './points.routes.js';
import { authenticate } from '../middleware/auth.middleware.js';
import commentController from '../controllers/comment.controller.js';
import commentUpload from '../middleware/comment-upload.middleware.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});

router.use('/auth',       authRoutes);
router.use('/posts',      postRoutes);
router.use('/categories', categoryRoutes);
router.use('/admin',      adminRoutes);
router.use('/bookmarks',  bookmarkRoutes);
router.use('/friends',    friendshipRoutes);
router.use('/ai',         aiRoutes);
router.use('/points',     pointsRoutes);
// 评论路由嵌套在 /posts 下，支持 mergeParams
router.use('/posts',      commentRoutes);
// 独立的评论删除端点（不在 /posts 嵌套内）
router.delete('/comments/:id', authenticate, commentController.destroy);

// 评论图片上传（独立端点，避免与 /posts/:postId 参数冲突）
router.post('/comments/upload-image',
  authenticate,
  (req, res) => {
    commentUpload.single('image')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: '图片大小不能超过 5MB' });
        }
        return res.status(400).json({ success: false, message: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: '请选择要上传的图片' });
      }
      const imagePath = `/uploads/comments/${req.file.filename}`;
      res.json({ success: true, data: { url: imagePath } });
    });
  }
);

export default router;

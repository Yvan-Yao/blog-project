/**
 * @file like.controller.js
 * @description 文章点赞控制器
 *
 * POST   /api/posts/:id/like       — 点赞（需登录，每人每篇文章限 1 次）
 * DELETE /api/posts/:id/like       — 取消点赞（需登录）
 * GET    /api/posts/:id/like       — 查询点赞状态（登录用户）
 * GET    /api/posts/:id/likes/count — 公开点赞数
 */

import PostLike from '../models/PostLike.js';
import Post     from '../models/Post.js';
import Points   from '../models/Points.js';

const likeController = {
  /**
   * POST /api/posts/:id/like
   * 点赞（单向，每人每篇文章只能点赞 1 次）
   */
  like(req, res, next) {
    try {
      const postId = parseInt(req.params.id);
      const post = Post.findById(postId);

      if (!post || post.status !== 'published') {
        return res.status(404).json({ success: false, message: '文章不存在' });
      }

      if (post.author_id === req.user.id) {
        return res.status(400).json({ success: false, message: '不能给自己的文章点赞' });
      }

      const { count } = PostLike.addLike(req.user.id, postId);

      // 积分：点赞者 +1，作者 +2
      Points.add(req.user.id,   'give_like',    postId);
      Points.add(post.author_id, 'receive_like', postId);

      res.json({
        success: true,
        message: '点赞成功',
        data: { liked: true, like_count: count },
      });
    } catch (error) {
      if (error.status === 400) {
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  },

  /**
   * DELETE /api/posts/:id/like
   * 取消点赞
   */
  unlike(req, res, next) {
    try {
      const postId = parseInt(req.params.id);
      const post = Post.findById(postId);

      if (!post || post.status !== 'published') {
        return res.status(404).json({ success: false, message: '文章不存在' });
      }

      const { removed, count } = PostLike.removeLike(req.user.id, postId);

      if (!removed) {
        return res.status(400).json({ success: false, message: '尚未点赞，无法取消' });
      }

      res.json({
        success: true,
        message: '取消点赞',
        data: { liked: false, like_count: count },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/posts/:id/like
   * 查询当前用户是否已点赞
   */
  status(req, res, next) {
    try {
      const postId = parseInt(req.params.id);
      const liked = PostLike.isLiked(req.user.id, postId);
      const count = PostLike.count(postId);
      res.json({ success: true, data: { liked, like_count: count } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/posts/:id/likes/count
   * 公开查询点赞数
   */
  count(req, res, next) {
    try {
      const postId = parseInt(req.params.id);
      const count = PostLike.count(postId);
      res.json({ success: true, data: { like_count: count } });
    } catch (error) {
      next(error);
    }
  },
};

export default likeController;

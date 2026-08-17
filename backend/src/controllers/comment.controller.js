/**
 * @file comment.controller.js
 * @description 评论控制器
 *
 * 功能：获取评论列表、发表评论、回复评论、删除评论
 *
 * 权限规则：
 *  - 所有人可以查看评论
 *  - 登录用户可以发表评论和回复
 *  - 作者本人或 admin 可以删除评论
 */

import Comment from '../models/Comment.js';
import Post    from '../models/Post.js';
import Points  from '../models/Points.js';

const commentController = {
  /**
   * GET /api/posts/:postId/comments
   * 获取文章的全部评论（含嵌套回复）
   */
  index(req, res, next) {
    try {
      const postId = parseInt(req.params.postId);
      const comments = Comment.findByPostId(postId);
      res.json({ success: true, data: comments });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/posts/:postId/comments
   * 发表评论或回复
   * Body: { content, parent_id? }
   *  - parent_id 不填 = 顶层评论
   *  - parent_id 填写 = 回复某条评论
   */
  create(req, res, next) {
    try {
      const postId = parseInt(req.params.postId);
      const { content, parent_id, image, image_width, image_height } = req.body;

      // 确认文章存在且已发布（防止对草稿文章评论）
      const post = Post.findById(postId);
      if (!post || post.status !== 'published') {
        return res.status(404).json({ success: false, message: '文章不存在' });
      }

      // 如果是回复，确认父评论存在且属于同一篇文章
      if (parent_id) {
        const parentComment = Comment.findById(parseInt(parent_id));
        if (!parentComment || parentComment.post_id !== postId) {
          return res.status(400).json({ success: false, message: '父评论不存在' });
        }
      }

      const comment = Comment.create({
        content: content.trim(),
        post_id: postId,
        author_id: req.user.id,
        parent_id: parent_id ? parseInt(parent_id) : null,
        image: image || null,
        image_width: image_width ? parseInt(image_width) : null,
        image_height: image_height ? parseInt(image_height) : null,
      });

      // 积分：评论者 +1；文章作者 +2（不给自己评论加分）
      try {
        Points.add(req.user.id, 'post_comment', comment.id);
        if (post.author_id !== req.user.id) {
          Points.add(post.author_id, 'receive_comment', comment.id);
        }
      } catch (_) {}

      res.status(201).json({ success: true, message: '评论发表成功', data: comment });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/comments/:id
   * 删除评论（仅作者或 admin）
   */
  destroy(req, res, next) {
    try {
      const commentId = parseInt(req.params.id);
      const comment = Comment.findById(commentId);

      if (!comment) {
        return res.status(404).json({ success: false, message: '评论不存在' });
      }

      // 权限检查
      if (req.user.role !== 'admin' && req.user.id !== comment.author_id) {
        return res.status(403).json({ success: false, message: '无权删除此评论' });
      }

      Comment.delete(commentId);
      res.json({ success: true, message: '评论已删除' });
    } catch (error) {
      next(error);
    }
  },
};

export default commentController;

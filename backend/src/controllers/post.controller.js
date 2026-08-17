/**
 * @file post.controller.js
 * @description 文章控制器
 *
 * 权限矩阵：
 *  GET    /posts          - 所有人（游客看已发布，admin 看全部）
 *  GET    /posts/:slug    - 所有人
 *  POST   /posts          - 登录用户
 *  PUT    /posts/:id      - 作者本人 或 admin
 *  DELETE /posts/:id      - 作者本人 或 admin
 */

import Post     from '../models/Post.js';
import Bookmark  from '../models/Bookmark.js';
import PostLike  from '../models/PostLike.js';
import Points    from '../models/Points.js';

const postController = {
  /**
   * GET /api/posts
   * 获取文章列表（分页 + 筛选）
   */
  index(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        search,
        status,
        author,
        sortBy,
        order,
      } = req.query;

      // 游客只能看已发布的文章；admin 可以指定 status 看全部
      const resolvedStatus = req.user?.role === 'admin' && status
        ? status
        : 'published';

      const result = Post.findAll({
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 50),
        status: resolvedStatus,
        categoryId: category ? parseInt(category) : null,
        search: search || null,
        authorId: author ? parseInt(author) : null,
        sortBy: sortBy || undefined,
        order: order || undefined,
      });

      // 登录用户附加收藏状态和点赞状态
      if (req.user && result.data.length) {
        const postIds = result.data.map(p => p.id);
        const bookmarkedSet = Bookmark.getBookmarkedSet(req.user.id, postIds);
        const likedSet      = PostLike.getLikedSet(req.user.id, postIds);
        result.data = result.data.map(p => ({
          ...p,
          is_bookmarked: bookmarkedSet.has(p.id),
          is_liked:      likedSet.has(p.id),
          like_count:    PostLike.count(p.id),
        }));
      } else if (result.data.length) {
        result.data = result.data.map(p => ({
          ...p,
          like_count: PostLike.count(p.id),
        }));
      }

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/posts/:slug
   * 获取文章详情（自动增加浏览量）
   */
  show(req, res, next) {
    try {
      // 优先按 slug 查，查不到再按 url_token 查（兼容新旧链接）
      let post = Post.findBySlug(req.params.slug);
      if (!post) {
        post = Post.findByToken(req.params.slug);
      }
      if (!post) {
        return res.status(404).json({ success: false, message: '文章不存在' });
      }

      // 游客不能看草稿
      if (post.status === 'draft' && req.user?.role !== 'admin' && req.user?.id !== post.author_id) {
        return res.status(404).json({ success: false, message: '文章不存在' });
      }

      // 附加收藏状态、收藏数和点赞数
      const result = { ...post };
      result.bookmark_count = Bookmark.count(post.id);
      result.like_count     = PostLike.count(post.id);
      if (req.user) {
        result.is_bookmarked = Bookmark.isBookmarked(req.user.id, post.id);
        result.is_liked      = PostLike.isLiked(req.user.id, post.id);
      }

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/posts/my — 获取当前用户的文章（草稿 + 已发布）
   * 需要登录
   */
  myPosts(req, res, next) {
    try {
      const { page = 1, limit = 10, status, sortBy, order } = req.query;

      const result = Post.findAll({
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 50),
        status: status || null,                     // 不传 = 不做状态筛选，返回所有
        authorId: req.user.id,                       // 只看自己的文章
        sortBy: sortBy || undefined,
        order: order || undefined,
      });

      // 给文章附加收藏数
      if (result.data.length) {
        const postIds = result.data.map(p => p.id);
        const bookmarkedSet = Bookmark.getBookmarkedSet(req.user.id, postIds);
        result.data = result.data.map(p => ({
          ...p,
          is_bookmarked: bookmarkedSet.has(p.id),
        }));
      }

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/posts
   * 创建文章（需要登录）
   */
  create(req, res, next) {
    try {
      const { title, content, summary, cover_image, status, category_id } = req.body;

      const post = Post.create({
        title,
        content,
        summary,
        cover_image,
        // 允许任何登录用户选择状态（draft 或 published）
        status: status || 'draft',
        author_id: req.user.id,
        category_id: category_id ? parseInt(category_id) : null,
      });

      res.status(201).json({ success: true, message: '文章创建成功', data: post });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/posts/:id
   * 更新文章
   */
  update(req, res, next) {
    try {
      // 支持用 ID 或 token 查询文章
      const param = req.params.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
      const post = isUuid ? Post.findByToken(param) : Post.findById(parseInt(param));

      if (!post) {
        return res.status(404).json({ success: false, message: '文章不存在' });
      }

      // 权限检查：仅作者本人或 admin 可以修改
      if (req.user.role !== 'admin' && req.user.id !== post.author_id) {
        return res.status(403).json({ success: false, message: '无权修改此文章' });
      }

      const { title, content, summary, cover_image, status, category_id } = req.body;
      const updated = Post.update(post.id, { title, content, summary, cover_image, status, category_id });

      res.json({ success: true, message: '文章更新成功', data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/posts/:id
   * 删除文章
   */
  destroy(req, res, next) {
    try {
      // 支持用 ID 或 token 查询文章
      const param = req.params.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
      const post = isUuid ? Post.findByToken(param) : Post.findById(parseInt(param));

      if (!post) {
        return res.status(404).json({ success: false, message: '文章不存在' });
      }

      // 权限检查
      if (req.user.role !== 'admin' && req.user.id !== post.author_id) {
        return res.status(403).json({ success: false, message: '无权删除此文章' });
      }

      Post.delete(post.id);
      res.json({ success: true, message: '文章已删除' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/posts/:id/publish
   * 发布文章（作者本人 或 admin）
   */
  publish(req, res, next) {
    try {
      const postId = parseInt(req.params.id);
      const post = Post.findById(postId);

      if (!post) {
        return res.status(404).json({ success: false, message: '文章不存在' });
      }

      // 权限检查：仅作者本人或 admin 可以发布
      if (req.user.role !== 'admin' && req.user.id !== post.author_id) {
        return res.status(403).json({ success: false, message: '无权发布此文章' });
      }

      const updated = Post.update(postId, { status: 'published' });
      // 积分：发布文章 +5（仅首次发布时记录）
      try { Points.add(post.author_id, 'publish_post', postId); } catch (_) {}
      res.json({ success: true, message: '文章已发布', data: updated });
    } catch (error) {
      next(error);
    }
  },
};

export default postController;

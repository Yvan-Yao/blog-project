/**
 * @file seed.js
 * @description 数据库初始化脚本（纯 JS，无需原生编译）
 *
 * 运行方式：node src/utils/seed.js
 * 会创建：1个管理员账户、1个普通用户、2个分类、2篇示例文章、3条评论
 */

import { initDatabase, prepare, exec } from '../models/database.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Category from '../models/Category.js';

async function seed() {
  await initDatabase();
  console.log('🌱 开始初始化示例数据...\n');

  // 清空旧数据
  exec('DELETE FROM comments; DELETE FROM post_tags; DELETE FROM posts; DELETE FROM categories; DELETE FROM users;');

  // 创建管理员
  const admin = await User.create({
    username: 'admin',
    email: 'admin@blog.com',
    password: 'admin123',
    role: 'admin',
  });
  console.log('✅ 管理员账号:', admin.username, '/ 密码: admin123');

  // 创建普通用户
  const user1 = await User.create({
    username: '小明',
    email: 'xiaoming@blog.com',
    password: 'user123',
  });
  console.log('✅ 普通用户:', user1.username, '/ 密码: user123');

  // 创建分类
  const catTech = Category.create({ name: '技术', slug: 'tech', description: '技术分享与探讨', color: '#4ade80' });
  const catLife = Category.create({ name: '生活', slug: 'life', description: '日常生活记录', color: '#60a5fa' });
  console.log('✅ 分类创建完成');

  // 创建文章
  const post1 = Post.create({
    title: '欢迎来到我的博客',
    content: `# 欢迎来到我的博客 👋

这里是我记录技术与生活的地方。

## 关于这个博客

这个博客使用以下技术栈构建：

- **前端**：React 18 + Tailwind CSS + Framer Motion
- **后端**：Node.js + Express + SQLite
- **认证**：JWT Token

## 我会分享什么

1. 前端开发技巧
2. 后端架构设计
3. 日常生活感悟
4. 好书推荐

> 路虽远，行则将至；事虽难，做则必成。

欢迎留言交流！`,
    summary: '这是我博客的第一篇文章，介绍了博客的技术栈和内容方向。',
    status: 'published',
    author_id: admin.id,
    category_id: catTech.id,
  });

  const post2 = Post.create({
    title: 'Tailwind CSS 最佳实践',
    content: `# Tailwind CSS 最佳实践

Tailwind CSS 是一个实用优先的 CSS 框架，可以快速构建现代界面。

## 核心概念

### 1. 响应式设计

\`\`\`html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- 卡片内容 -->
</div>
\`\`\`

### 2. 自定义主题

通过 \`tailwind.config.js\` 扩展默认配置：
\`\`\`js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#4ade80',
      },
    },
  },
};
\`\`\`

### 3. 动态类名

⚠️ **注意**：避免使用字符串拼接动态类名。

✅ 正确做法：使用完整类名的条件判断。

## 总结

Tailwind CSS 让样式编写变得高效，但需要遵循最佳实践。`,
    summary: '分享 Tailwind CSS 的核心概念和最佳实践，包括响应式设计、自定义主题等。',
    status: 'published',
    author_id: admin.id,
    category_id: catTech.id,
  });

  console.log('✅ 示例文章创建完成');

  // 创建评论
  const comment1 = Comment.create({
    content: '写得真好！期待更多精彩内容~',
    post_id: post1.id,
    author_id: user1.id,
  });

  Comment.create({
    content: '谢谢你的支持！后续会持续更新的 😊',
    post_id: post1.id,
    author_id: admin.id,
    parent_id: comment1.id,
  });

  Comment.create({
    content: '请问有没有关于 React Query 的使用教程？',
    post_id: post2.id,
    author_id: user1.id,
  });

  console.log('✅ 示例评论创建完成');
  console.log('\n🎉 数据初始化完成！\n');
  console.log('登录账号：');
  console.log('  管理员: admin / admin123');
  console.log('  普通用户: 小明 / user123\n');
}

seed().catch(err => {
  console.error('❌ 初始化失败:', err);
  process.exit(1);
});

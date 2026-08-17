# 个人博客系统 — 开发文档

> 版本：1.0.0 | 最后更新：2026-06-22

---

## 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [目录结构](#目录结构)
4. [快速启动](#快速启动)
5. [数据库设计（ER 图）](#数据库设计)
6. [API 参考](#api-参考)
7. [认证机制](#认证机制)
8. [权限矩阵](#权限矩阵)
9. [前端架构](#前端架构)
10. [自动化测试](#自动化测试)
11. [部署指南](#部署指南)
12. [常见问题](#常见问题)

---

## 1. 项目概述

一个功能完整的个人博客系统，支持：

- **游客浏览**：查看已发布文章、搜索、按分类筛选
- **注册用户**：发表评论、回复评论、写文章（草稿）
- **管理员（Admin）**：文章发布/删除、用户管理、站点统计

### 设计原则

| 原则 | 说明 |
|------|------|
| 清新自然 | 绿色系配色，宽松排版，圆润卡片 |
| 渐进增强 | 游客可完整浏览，登录后获得更多功能 |
| 安全优先 | JWT 认证、密码哈希、SQL 参数化、XSS 防护 |
| 代码可读 | 每个文件头部有详细注释，函数有 JSDoc |

---

## 2. 技术栈

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行时 |
| Express | 4.x | Web 框架 |
| better-sqlite3 | 9.x | SQLite 数据库驱动 |
| bcryptjs | 2.x | 密码加密 |
| jsonwebtoken | 9.x | JWT 生成/验证 |
| swagger-jsdoc | 6.x | API 文档生成 |
| swagger-ui-express | 5.x | API 文档 UI |
| express-validator | 7.x | 请求参数校验 |
| helmet | 7.x | HTTP 安全头 |
| cors | 2.x | 跨域资源共享 |
| express-rate-limit | 7.x | 速率限制 |
| morgan | 1.x | 请求日志 |

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| Vite | 5.x | 构建工具 |
| Tailwind CSS | 3.x | 原子化 CSS |
| Framer Motion | 11.x | 动画库 |
| @tanstack/react-query | 5.x | 服务端状态管理 |
| Zustand | 4.x | 客户端状态管理 |
| React Router DOM | 6.x | 路由 |
| Axios | 1.x | HTTP 客户端 |
| marked | 11.x | Markdown 渲染 |
| DOMPurify | 3.x | XSS 防护 |
| date-fns | 3.x | 日期格式化 |
| lucide-react | 0.x | 图标库 |
| react-hot-toast | 2.x | Toast 通知 |

### 测试

| 技术 | 用途 |
|------|------|
| Vitest | 测试框架（兼容 Jest API）|
| Supertest | HTTP 接口测试 |

---

## 3. 目录结构

```
blog-project/
├── backend/                    # 后端
│   ├── src/
│   │   ├── app.js              # Express 入口，中间件配置
│   │   ├── models/
│   │   │   ├── database.js     # 数据库连接 & 表初始化
│   │   │   ├── User.js         # 用户数据模型
│   │   │   ├── Post.js         # 文章数据模型
│   │   │   ├── Comment.js      # 评论数据模型
│   │   │   └── Category.js     # 分类数据模型
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── post.controller.js
│   │   │   ├── comment.controller.js
│   │   │   ├── category.controller.js
│   │   │   └── admin.controller.js
│   │   ├── routes/
│   │   │   ├── index.js        # 路由汇总
│   │   │   ├── auth.routes.js
│   │   │   ├── post.routes.js
│   │   │   ├── comment.routes.js
│   │   │   ├── category.routes.js
│   │   │   └── admin.routes.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js     # JWT 认证
│   │   │   └── validate.middleware.js # 参数校验
│   │   └── utils/
│   │       └── seed.js         # 测试数据初始化脚本
│   ├── tests/
│   │   ├── auth.test.js        # 认证 API 测试
│   │   ├── post.test.js        # 文章 API 测试
│   │   └── comment.test.js     # 评论 API 测试
│   ├── data/                   # SQLite 数据库文件（自动创建）
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── vitest.config.js
│
├── frontend/                   # 前端
│   ├── src/
│   │   ├── main.jsx            # React 入口
│   │   ├── App.jsx             # 路由配置
│   │   ├── index.css           # 全局样式
│   │   ├── api/
│   │   │   ├── client.js       # Axios 配置
│   │   │   └── index.js        # API 函数集合
│   │   ├── store/
│   │   │   └── authStore.js    # 认证全局状态（Zustand）
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Layout.jsx
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   └── AdminLayout.jsx
│   │   │   └── ui/
│   │   │       ├── PostCard.jsx
│   │   │       └── CommentSection.jsx
│   │   └── pages/
│   │       ├── HomePage.jsx
│   │       ├── PostDetailPage.jsx
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       ├── WritePage.jsx
│   │       ├── NotFoundPage.jsx
│   │       └── admin/
│   │           ├── AdminDashboardPage.jsx
│   │           ├── AdminPostsPage.jsx
│   │           ├── AdminUsersPage.jsx
│   │           └── AdminCommentsPage.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── docs/                       # 文档目录（此文件所在位置）
    ├── dev-guide.md            # 本开发文档
    └── user-manual.md          # 用户手册
```

---

## 4. 快速启动

### 前提条件

- Node.js 18+
- npm 或 pnpm

### 安装依赖

```bash
# 后端
cd backend
npm install

# 前端（另开终端）
cd frontend
npm install
```

### 初始化数据

```bash
# 在 backend 目录下运行，创建示例数据
node src/utils/seed.js
```

运行后会创建：
- 管理员账号：`admin` / `admin123`
- 普通用户：`小明` / `user123`
- 2 个分类、2 篇示例文章、3 条评论

### 启动服务

```bash
# 后端（端口 3001）
cd backend
npm run dev

# 前端（端口 5173）
cd frontend
npm run dev
```

访问：
- 博客前台：http://localhost:5173
- API 文档：http://localhost:3001/api-docs

---

## 5. 数据库设计

### ER 图

```
users (用户)
  id          INTEGER PK
  username    TEXT UNIQUE
  email       TEXT UNIQUE
  password    TEXT (bcrypt)
  avatar      TEXT NULL
  bio         TEXT NULL
  role        TEXT ('user' | 'admin')
  created_at  DATETIME
  updated_at  DATETIME

categories (分类)
  id          INTEGER PK
  name        TEXT UNIQUE
  slug        TEXT UNIQUE
  description TEXT NULL
  color       TEXT (HEX)
  created_at  DATETIME

posts (文章)
  id           INTEGER PK
  title        TEXT
  slug         TEXT UNIQUE        ← URL 路径标识
  summary      TEXT NULL
  content      TEXT (Markdown)
  cover_image  TEXT NULL
  status       TEXT ('draft' | 'published')
  author_id    INTEGER FK → users.id
  category_id  INTEGER FK → categories.id (NULL)
  views        INTEGER DEFAULT 0
  created_at   DATETIME
  updated_at   DATETIME
  published_at DATETIME NULL

comments (评论)
  id         INTEGER PK
  content    TEXT
  post_id    INTEGER FK → posts.id
  author_id  INTEGER FK → users.id
  parent_id  INTEGER FK → comments.id (NULL = 顶层)
  created_at DATETIME
  updated_at DATETIME

tags (标签)
  id   INTEGER PK
  name TEXT UNIQUE
  slug TEXT UNIQUE

post_tags (文章标签关联)
  post_id INTEGER FK → posts.id
  tag_id  INTEGER FK → tags.id
  PRIMARY KEY (post_id, tag_id)

bookmarks (收藏)
  id         INTEGER PK
  user_id    INTEGER FK → users.id
  post_id    INTEGER FK → posts.id
  created_at DATETIME
  UNIQUE (user_id, post_id)
```

### 关联关系

```
users ──< posts (一对多：一个用户可有多篇文章)
users ──< comments (一对多：一个用户可有多条评论)
users ──< bookmarks (一对多：一个用户可收藏多篇文章)
posts ──< bookmarks (一对多：一篇文章可被多人收藏)
categories ──< posts (一对多：一个分类可有多篇文章)
posts ──< comments (一对多：一篇文章可有多条评论)
comments ──< comments (自引用：回复关系)
posts >──< tags (多对多：通过 post_tags 关联)
```

---

## 6. API 参考

### 基础信息

- Base URL: `http://localhost:3001/api`
- 认证方式: `Authorization: Bearer <JWT_TOKEN>`
- 响应格式: `{ success: boolean, data: any, message?: string }`

### 认证接口

| 方法 | 路径 | 描述 | 认证要求 |
|------|------|------|----------|
| POST | `/auth/register` | 用户注册 | 无 |
| POST | `/auth/login` | 用户登录 | 无 |
| GET  | `/auth/me` | 获取当前用户 | 需要登录 |
| PUT  | `/auth/profile` | 更新个人资料 | 需要登录 |

#### 注册请求体

```json
{
  "username": "string (2-20字符)",
  "email": "string (有效邮箱)",
  "password": "string (最少6位)",
  "adminSecret": "string (可选，填写后注册为admin)"
}
```

#### 登录请求体

```json
{
  "username": "string",
  "password": "string"
}
```

### 文章接口

| 方法 | 路径 | 描述 | 认证要求 |
|------|------|------|----------|
| GET  | `/posts` | 获取文章列表 | 无（游客只看已发布） |
| GET  | `/posts/:slug` | 获取文章详情 | 无 |
| GET  | `/posts/my` | 获取我的文章 | 需要登录 |
| POST | `/posts` | 创建文章 | 需要登录 |
| PUT  | `/posts/:id` | 更新文章 | 作者或Admin |
| PUT  | `/posts/:id/publish` | 发布文章 | Admin only |
| DELETE | `/posts/:id` | 删除文章 | 作者或Admin |

#### 文章列表查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码，默认1 |
| limit | number | 每页条数，最大50 |
| search | string | 搜索关键词（标题/摘要） |
| category | number | 分类ID过滤 |
| status | string | 状态（Admin可用：draft/published） |

### 评论接口

| 方法 | 路径 | 描述 | 认证要求 |
|------|------|------|----------|
| GET  | `/posts/:postId/comments` | 获取文章评论 | 无 |
| POST | `/posts/:postId/comments` | 发表评论/回复 | 需要登录 |
| DELETE | `/comments/:id` | 删除评论 | 作者或Admin |

#### 发表评论请求体

```json
{
  "content": "string (1-1000字)",
  "parent_id": "number | null (null=顶层评论, 数字=回复某条评论)"
}
```

### 收藏接口（需要登录）

| 方法 | 路径 | 描述 | 认证要求 |
|------|------|------|----------|
| GET  | `/bookmarks` | 获取收藏列表 | 需要登录 |
| GET  | `/bookmarks/:postId` | 检查收藏状态 | 需要登录 |
| POST | `/bookmarks/:postId` | 收藏/取消收藏（切换） | 需要登录 |

### Admin 接口（需要 Admin 权限）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET  | `/admin/stats` | 站点统计数据 |
| GET  | `/admin/users` | 用户列表 |
| DELETE | `/admin/users/:id` | 删除用户 |
| GET  | `/admin/posts` | 所有文章（含草稿） |
| DELETE | `/admin/comments/:id` | 删除评论 |

---

## 7. 认证机制

### JWT 流程

```
客户端                    服务端
   |                        |
   |-- POST /auth/login -->  |
   |                        | 验证密码
   |                        | 生成 JWT
   |<-- { token } --------- |
   |                        |
   | 存入 localStorage       |
   |                        |
   |-- GET /api/... -------> |
   |  Authorization: Bearer <token>
   |                        | 验证 JWT
   |                        | 挂载 req.user
   |<-- 响应数据 ----------- |
```

### Token 生命周期

- 有效期：7 天（可通过 `JWT_EXPIRES_IN` 配置）
- 过期处理：前端收到 401 后自动清除 token，触发重新登录

### 密码安全

- 使用 `bcryptjs` 进行密码哈希（10 轮）
- 数据库中永远不存储明文密码
- 登录时逐字符对比哈希（防计时攻击）

---

## 8. 权限矩阵

| 操作 | 游客 | 注册用户 | Admin |
|------|------|----------|-------|
| 查看已发布文章 | ✅ | ✅ | ✅ |
| 查看草稿文章 | ❌ | ❌（仅自己） | ✅ |
| 创建文章（草稿） | ❌ | ✅ | ✅ |
| 发布文章 | ❌ | ❌ | ✅ |
| 编辑自己的文章 | ❌ | ✅ | ✅ |
| 删除任意文章 | ❌ | ❌ | ✅ |
| 发表评论 | ❌ | ✅ | ✅ |
| 删除自己的评论 | ❌ | ✅ | ✅ |
| 删除任意评论 | ❌ | ❌ | ✅ |
| 用户管理 | ❌ | ❌ | ✅ |
| 站点统计 | ❌ | ❌ | ✅ |
| 分类管理 | ❌ | ❌ | ✅ |

---

## 9. 前端架构

### 状态管理

```
全局状态（Zustand）          服务端状态（React Query）
┌─────────────────────┐     ┌─────────────────────────┐
│  authStore.js       │     │  useQuery(['posts'])     │
│  - user             │     │  useQuery(['post', slug])│
│  - token            │     │  useQuery(['categories'])│
│  - login()          │     │  useMutation(create)     │
│  - logout()         │     │  useMutation(delete)     │
│  - isAdmin()        │     │                          │
└─────────────────────┘     └─────────────────────────┘
```

### 路由结构

```
/                   首页（文章列表）
/post/:slug         文章详情 + 评论区
/login              登录
/register           注册
/write              新建文章（需登录）
/edit/:id           编辑文章（需登录，仅作者/admin）
/admin              Admin 仪表盘（需 admin）
/admin/posts        文章管理
/admin/users        用户管理
/admin/comments     评论管理
```

### API 代理配置

前端开发时，Vite 代理所有 `/api` 请求到 `http://localhost:3001`：

```js
// vite.config.js
server: {
  proxy: {
    '/api': { target: 'http://localhost:3001', changeOrigin: true }
  }
}
```

---

## 10. 自动化测试

### 运行测试

```bash
cd backend

# 运行所有测试
npm test

# 监视模式（开发时）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 测试套件

| 文件 | 覆盖场景 |
|------|---------|
| `tests/auth.test.js` | 注册（正常/重复/弱密码）、登录（正常/错误密码）、token 验证 |
| `tests/post.test.js` | 创建/读取/更新/删除文章、权限验证、发布流程 |
| `tests/comment.test.js` | 发表评论、嵌套回复、删除权限验证 |

### 测试原则

- 每个测试使用独立数据库文件（`test.db`, `test_post.db` 等），互不干扰
- `beforeAll` 清理，`afterAll` 删除数据库
- 不依赖外部服务，完全离线运行

---

## 11. 部署指南

### 生产环境配置

编辑 `backend/.env`：

```bash
NODE_ENV=production
JWT_SECRET=<随机长字符串，至少32位>
PORT=3001
FRONTEND_URL=https://your-domain.com
```

### 构建前端

```bash
cd frontend
npm run build
# 产物在 frontend/dist/
```

### 反向代理（Nginx 示例）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/blog/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 12. 常见问题

**Q: 如何重置数据库？**
```bash
cd backend
rm data/blog.db
node src/utils/seed.js
```

**Q: 如何修改管理员注册码？**
编辑 `.env` 文件中的 `ADMIN_SECRET` 字段。

**Q: 前端构建后白屏？**
检查 `vite.config.js` 中 `base` 配置是否与部署路径一致。

**Q: API 文档在哪里访问？**
开发模式下：http://localhost:3001/api-docs（生产模式不可用）

**Q: 如何更改博客名称？**
- 前端：修改 `frontend/index.html` 中的 `<title>` 标签
- 导航栏：修改 `src/components/layout/Navbar.jsx` 中的文字
- 页脚：修改 `src/components/layout/Footer.jsx`

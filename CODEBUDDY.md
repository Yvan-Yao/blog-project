# CODEBUDDY.md

This file provides guidance to CodeBuddy Code when working with code in this repository.

## 项目概述

个人博客系统(全栈单体仓库):游客可浏览/搜索已发布文章,注册用户可写草稿、评论、收藏、点赞、交友、赚积分升级,Admin 可发布文章、管理用户/评论/分类/积分等级。

前端与后端在 `WorkBuddy/2026-06-22-17-00-28/blog-project/` 下,不是 git 仓库,无 README。`docs/dev-guide.md` 已过时,应以本文件 + 代码为准(它描述的 better-sqlite3 模型层已不存在)。

## 常用命令

```bash
# ── 后端 (backend/, 端口 3001) ──
cd backend
npm install
npm run dev          # 启动开发服务器(node --watch)
npm start            # 生产启动
node src/utils/seed.js   # 初始化示例数据:admin/admin123, 小明/user123
npm test             # 运行全部测试(Vitest + Supertest,顺序单进程)
npm run test:watch   # 监视模式
npm run test:coverage

# 运行单个测试文件(其他文件同理)
node --experimental-vm-modules node_modules/vitest/dist/cli.js run tests/auth.test.js

# ── 前端 (frontend/, 端口 5173) ──
cd frontend
npm install
npm run dev          # Vite dev server,代理 /api → localhost:3001
npm run build        # 产物在 dist/
npm run preview
```

## 已知问题(2026-08-17 实测)

- **前端 `npm run lint` 不可用**:script 引用了 `eslint`,但前端无任何 ESLint 配置文件(无 `.eslintrc*`/`eslint.config.*`),运行会报 "couldn't find a configuration file"。若要启用 lint,需先补配置文件;否则不要使用该命令。
- **后端测试不全部通过**:`npm test` 结果 218 通过、1 失败、1 套件超时。
  - `tests/homepage.test.js` 中 `post_count 只统计已发布文章` 断言失败(`expected 0 to be greater than or equal to 1`)——分类 `post_count` 返回 0,疑似 category 模型/控制器计数逻辑与测试预期不符。
  - `tests/regression.test.js` beforeAll hook 10s 超时。
  - 注意:测试全都在 `data/test.db` 上串行执行,依赖 Vitest `singleFork` 配置隔离。
- **`.env` 已提交**:`backend/.env` 含真实 `AI_API_KEY`(TokenHub 密钥)。修改代码时不要打印、提交或硬编码它;AI 功能未配 Key 时端点返回 503,不影响其余功能。

## 架构

### 技术栈

- **后端**:Node.js 18+ / Express 4 / `sql.js`(纯 JS SQLite,WebAssembly,无原生编译)/ JWT(bcryptjs + jsonwebtoken)/ express-validator / helmet / express-rate-limit / Swagger(仅开发模式,`/api-docs`)
- **前端**:Vite 5 / React 18 / Tailwind CSS 3 / React Router 6 / Zustand(全局状态)/ TanStack React Query(服务端状态)/ TipTap(富文本编辑器)/ Framer Motion / i18n(zh/en/ja, `src/i18n/translations.js` + `src/contexts/LanguageContext.jsx`)
- **测试**:Vitest + Supertest(仅后端)

### 后端结构(`backend/src/`)

分层清晰,请求流: `routes/*.js`(express-validator 校验)→ `controllers/*.js` → `models/*.js`(裸 SQL)。全部用 ESM(`"type": "module"`)。

- **`app.js`** — Express 入口。同时可被 import 导出(测试用)。直接运行时才 `initDatabase()` + listen,监听 `127.0.0.1:3001`。中间件顺序:helmet → cors → json/urlencoded → morgan → **`nullStrip`** → rateLimit → routes → 全局错误处理。CORS 白名单含 `http://192.168.1.52:5173`。
- **`models/database.js`** — 核心。用 sql.js 封装出与 better-sqlite3 兼容的 API:`prepare(sql).run/get/all(params)`、`exec`、`transaction`、`saveToFile`。**每次 `run` 都 `saveToFile()` 落盘**。DB 路径由 `DB_PATH` env 控制(默认 `data/blog.db`),测试通过环境变量换库。DDL 建表 + 迁移(大量 `ALTER TABLE ADD COLUMN` 幂等处理)+ 种子(level_config 9 级、point_rules 5 条)。
- **`models/*.js`** — 每个表一个模型文件(User/Post/Comment/Category/Bookmark/Friendship/Points/PostLike/LevelConfig),全部参数化 SQL。
- **`middleware/`** — `auth.middleware.js`:三个导出,`authenticate`(JWT,支持 Bearer header 或 cookie)、`requireAdmin`(角色检查)、`optionalAuth`(游客也可访问,挂载 req.user 可空)。`validate.middleware.js`:`optBody`/`optQuery` 用 `{ values: 'falsy' }` 把 null/undefined/""/0/false 都当"未传";`null-strip.middleware.js` 在 validator 之前递归删除请求体中的 `null` 字段。上传用 `upload.middleware.js`、`comment-upload.middleware.js`(multer,5MB 限制)。
- **`routes/index.js`** — 汇总所有子路由。挂载点:`/auth /posts /categories /admin /bookmarks /friends /ai /points`;评论嵌套在 `/posts` 下(mergeParams);独立评论删除 `/comments/:id`;评论图片上传 `/comments/upload-image`;`/health`。
- **`controllers/`** — 除标准模块外,`admin/points.controller.js` 管积分管理,`ai.controller.js` 走 `services/ai.service.js`(OpenAI 兼容 API,润色 + 图片生成,图片失败降级为返回精炼提示词)。

### 数据表(均在 `database.js` DDL 中)

`users`(含 profile 扩展字段、reset_token、url_token)、`categories`、`posts`(status: draft/published,有 url_token)、`tags`+`post_tags`、`comments`(自引用 parent_id 做回复,含 image 字段)、`bookmarks`、`friendships`(pending/accepted)、`post_likes`、`user_points`(总积分+等级汇总)、`point_logs`(积分流水)、`level_config`、`point_rules`。

### 权限与积分

- 角色 `user`/`admin`。注册时传 `adminSecret`(env `ADMIN_SECRET`,默认 `admin_register_secret_2024`)可注册成 admin。普通用户文章默认 draft,仅 Admin 可发布(`PUT /posts/:id/publish`)。
- 积分规则从 `point_rules` 表实时读取(`models/Points.js` 用 Proxy 每次动态加载,支持 Admin 热更新),动作:publish_post/receive_comment/post_comment/receive_like/give_like。等级从 `level_config` 计算。Admin 可调积分、改等级和规则。

### 前端结构(`frontend/src/`)

- **`App.jsx`** — 路由中心。公开路由在 `<Layout>` 下,`PrivateRoute`/`AdminRoute` 守卫;Admin 路由在 `AdminLayout` 下(`/admin/posts users comments categories points`)。初始化时用 token 换用户信息(React Query,`queryKey: ['currentUser', token]` 隔离账号),401 通过 `auth:unauthorized` 事件触发登出。
- **路由用加密 token 而非 slug**:`/post/:token`、`/edit/:token`、`/profile/:token` 用的是 `url_token`(UUID),不是数字 ID 或 slug。涉及取参/跳转时注意。
- **`api/`** — `client.js` 是 axios 实例:`baseURL: '/api'`,请求拦截器从 localStorage `blog_token` 附加 Bearer,响应拦截器统一处理 401 并发 `auth:unauthorized` 事件。`index.js` 按模块导出 API 函数集合(postsApi/authApi/adminApi/adminPointsApi/adminLevelApi/bookmarksApi/friendsApi/aiApi/pointsApi/likesApi)。
- **`store/`** — Zustand:`authStore.js`(user/token,持久化 localStorage)、`layoutStore.js`、`themeStore.js`。
- **`components/editor/RichTextEditor.jsx`** — TipTap 富文本(ToolbarButton 中两个 `isActive` prop 叠写是既有 bug 风险点)。
- **`utils/contentRender.js`** — 关键渲染工具:`renderContent()` 自动识别 HTML(直接 DOMPurify.sanitize)或 Markdown(marked 转 HTML 后 sanitize),`extractTOC()` 提取 h2/h3 生成侧栏目录。
- **i18n**:`LanguageContext.jsx` 支持 zh/en/ja,`translations.js` 兜底用中文;改文案注意维护三语。

### 上传文件

multer 写到 `backend/public/uploads/{avatars,comments}/`,通过 `/uploads/*` 静态路径访问,前端拿到的 url 形如 `/uploads/comments/xxx.png`(前端代理 /api 不代理 /uploads,需注意本地开发时由 vite 转发到 3001 的方式——实际由 dev 时同源?如有跨域问题排查 vite proxy)。

## 调试提示

- 后端全部文件头有中文 JSDoc 注释,函数大多有 `@param`/`@returns`,读代码优先看文件头。
- 修改数据库相关代码后注意:sql.js 的 `run` 自动落盘,而 `get`/`all` 不落盘;事务用 `db.transaction(fn)`。
- 测试跑完后会删 `data/test.db`;如果测试数据库残留导致状态串扰,删掉 `backend/data/test*.db` 再跑。
- 管理员初始账号见 `seed.js` 输出;重置数据库:`rm backend/data/blog.db && node src/utils/seed.js`。

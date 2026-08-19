/**
 * @file app.js
 * @description Express 应用入口
 *
 * 当直接运行时启动 HTTP 服务器；
 * 被 import 时仅导出 app 对象（供测试使用），不启动服务器。
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './models/database.js';
import nullStrip from './middleware/null-strip.middleware.js';
import apiRoutes from './routes/index.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

// ─────────────────────────────────────────────
//  安全中间件
// ─────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: isDev
    ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://192.168.1.52:5173']
    : process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─────────────────────────────────────────────
//  gzip 压缩(纯 Node 内置 zlib,无需额外依赖)
//  - 云端经公网隧道访问时,JS/CSS/JSON/HTML 体积可降 3~4 倍,显著提速
//  - 仅对文本类资源压缩;已压缩的二进制(图片/字体)自动跳过
//  - 客户端不支持 gzip(无 Accept-Encoding)时自动透传
// ─────────────────────────────────────────────
app.use((req, res, next) => {
  if (!/\bgzip\b/.test(req.headers['accept-encoding'] || '')) return next();
  if (res.getHeader('Content-Encoding')) return next();

  const origWrite = res.write.bind(res);
  const origEnd = res.end.bind(res);
  let gzip = null;
  let decided = false;

  const maybeInit = () => {
    if (decided) return;
    decided = true;
    const type = String(res.getHeader('Content-Type') || '');
    const compressible = /\b(text\/|application\/(javascript|json|xml)|image\/svg\+xml|\+json|\+xml)/i.test(type);
    if (!compressible) { gzip = false; return; }
    gzip = zlib.createGzip();
    res.setHeader('Content-Encoding', 'gzip');
    res.removeHeader('Content-Length');
    res.setHeader('Vary', 'Accept-Encoding');
    gzip.on('data', (c) => origWrite.call(res, c));
    gzip.on('end', () => origEnd.call(res));
  };

  res.write = function (chunk, ...rest) {
    maybeInit();
    if (gzip === false) return origWrite.call(res, chunk, ...rest);
    if (chunk) gzip.write(chunk);
    return true;
  };
  res.end = function (chunk, ...rest) {
    maybeInit();
    if (gzip === false) return origEnd.call(res, chunk, ...rest);
    if (chunk) gzip.write(chunk);
    gzip.end();
    return res;
  };
  next();
});

// ─────────────────────────────────────────────
//  请求解析和日志
// ─────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(isDev ? 'dev' : 'combined'));

// ─────────────────────────────────────────────
//  null 值清理（路由 / 校验之前，消除前后端语义差）
// ─────────────────────────────────────────────
app.use(nullStrip);

// ─────────────────────────────────────────────
//  速率限制
// ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '请求过于频繁，请稍后再试' },
});
app.use('/api', globalLimiter);

// 登录限流：防暴力破解（20次/15分钟，dev环境下足够宽容）
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '登录尝试次数过多，请 15 分钟后再试' },
});
app.use('/api/auth/login', loginLimiter);

// 注册限流
// - 开发环境: 100次/15分钟（调试友好）
// - 生产环境: 10次/15分钟（防滥用）
// - skipSuccessfulRequests: 只计失败的请求，避免锁住正常用户
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,   // 校验失败（400）不计数，避免表单错误消耗配额
  message: { success: false, message: '注册请求过于频繁，请稍后再试' },
});
app.use('/api/auth/register', registerLimiter);

// 忘记密码限流：防止邮箱枚举/恶意重置（5次/15分钟）
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '重置密码请求过于频繁，请 15 分钟后再试' },
});
app.use('/api/auth/forgot-password', forgotPasswordLimiter);

// AI 端点限流：防止滥用（润色 30次/分钟，生图 10次/分钟）
const aiPolishLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'AI 润色请求过于频繁，请稍后再试' },
});
app.use('/api/ai/polish', aiPolishLimiter);

const aiImageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'AI 图片生成请求过于频繁，请稍后再试' },
});
app.use('/api/ai/image', aiImageLimiter);

// ─────────────────────────────────────────────
//  静态文件服务（上传资源）
// ─────────────────────────────────────────────
app.use('/uploads', express.static(path.join(PROJECT_ROOT, 'public', 'uploads')));

// ─────────────────────────────────────────────
//  API 文档
// ─────────────────────────────────────────────
if (isDev) {
  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: '个人博客 API',
        version: '1.0.0',
        description: '个人博客系统 REST API 文档',
        contact: { name: 'Blog Admin' },
      },
      servers: [{ url: `http://localhost:${PORT}/api`, description: '开发服务器' }],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ BearerAuth: [] }],
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js'],
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { background-color: #4ade80; }',
    customSiteTitle: '博客 API 文档',
  }));
}

// ─────────────────────────────────────────────
//  挂载 API 路由
// ─────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─────────────────────────────────────────────
//  部署: 托管前端构建产物（若存在 frontend/dist）
//  - 生产/云端部署时由后端在同一端口(3001)同时提供页面与接口，
//    避免 Vite dev server 在公网隧道下首屏加载数百个模块导致极慢。
//  - dev 环境若未构建 frontend/dist 则自动跳过，不影响本地开发。
//  - 页面与 /api、/uploads 同源，无需代理/CORS。
// ─────────────────────────────────────────────
const frontendDist = path.join(PROJECT_ROOT, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  // Vite 产物文件名带 content hash,可安全长期缓存,刷新不再重复下载
  app.use(express.static(frontendDist, {
    setHeaders: (res, filePath) => {
      if (/[/\\]assets[/\\]/.test(filePath) || /index-.*\.(js|css)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  // SPA 回退：非 /api、非 /uploads 的 GET 请求返回 index.html
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.setHeader('Cache-Control', 'no-cache');   // HTML 不缓存,保证发版即时生效
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// ─────────────────────────────────────────────
//  全局错误处理
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ success: false, message: '数据已存在，请检查用户名或邮箱' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: isDev ? err.message : '服务器内部错误，请稍后再试',
    ...(isDev && { stack: err.stack }),
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `找不到路由: ${req.originalUrl}` });
});

// ─────────────────────────────────────────────
//  数据库启动 + 服务器启动
//  只在直接运行 app.js 时启动服务器（被 import 时由调用方控制）
// ─────────────────────────────────────────────
async function startServer() {
  await initDatabase();
  return new Promise((resolve) => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 博客 API 服务已启动`);
      console.log(`   地址: http://0.0.0.0:${PORT}`);
      console.log(`   API:  http://0.0.0.0:${PORT}/api`);
      if (isDev) console.log(`   文档: http://0.0.0.0:${PORT}/api-docs`);
      console.log(`   环境: ${process.env.NODE_ENV || 'development'}\n`);
      resolve(server);
    });
  });
}

// 直接运行时启动服务器；被 import 时仅导出
const isMainModule = process.argv[1] && process.argv[1].endsWith('app.js');
if (isMainModule) {
  startServer().catch(err => {
    console.error('❌ 启动失败:', err);
    process.exit(1);
  });
}

export { app, startServer };
export default app;

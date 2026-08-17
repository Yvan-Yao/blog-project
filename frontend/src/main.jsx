/**
 * @file src/main.jsx
 * @description React 应用根入口
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

/**
 * React Query 客户端配置
 * - staleTime: 5 分钟内不重新请求相同的数据
 * - retry: 失败自动重试 1 次
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5分钟缓存
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* React Query 上下文，提供全局数据缓存 */}
    <QueryClientProvider client={queryClient}>
      {/* BrowserRouter 提供路由上下文 */}
      <BrowserRouter>
        <App />
        {/* Toast 通知组件，全局唯一，放在最外层 */}
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#374151',
              borderRadius: '12px',
              boxShadow: '0 8px 32px -4px rgba(0,0,0,0.15)',
              fontSize: '14px',
              padding: '10px 16px',
              maxWidth: '400px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
              style: {
                background: '#fff5f5',
                color: '#c0392b',
                border: '1px solid #fecaca',
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)

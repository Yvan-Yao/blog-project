/**
 * @file src/components/layout/Layout.jsx
 * @description 主布局组件（动态背景 + 导航栏 + 主内容区 + 页脚），使用语义化主题颜色
 */

import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import DynamicBackground from '@/components/ui/DynamicBackground'

export default function Layout() {
  return (
    <div className="min-h-[100dvh] flex flex-col relative"
      style={{ backgroundColor: 'hsl(var(--muted))' }}>
      {/* 动态 Canvas 背景 — 最底层 */}
      <DynamicBackground />

      <Navbar />
      <main className="flex-1 w-full relative z-[1]">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

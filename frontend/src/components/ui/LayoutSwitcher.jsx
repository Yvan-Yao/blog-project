/**
 * @file src/components/ui/LayoutSwitcher.jsx
 * @description 布局切换组件 — 列表布局（双栏/列表/杂志）+ 详情布局（居中/侧栏）
 *
 * 仅在主页和书签页显示列表布局选项，详情页时隐藏
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, AlignJustify, BookOpen } from 'lucide-react'
import useLayoutStore, {
  listLayoutLabels,
  detailLayoutLabels,
} from '@/store/layoutStore'

const listLayouts = ['grid', 'minimal', 'magazine']
const listIcons = {
  grid: LayoutGrid,
  minimal: AlignJustify,
  magazine: BookOpen,
}

/**
 * 列表布局切换（首页/书签页使用）
 */
export function ListLayoutSwitcher() {
  const [open, setOpen] = useState(false)
  const { listLayout, setListLayout } = useLayoutStore()
  const ref = useRef(null)
  const Icon = listIcons[listLayout] || LayoutGrid

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold
                   transition-all duration-200"
        style={{ color: 'hsl(var(--muted-fg))' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.08)'
          e.currentTarget.style.color = 'hsl(var(--primary))'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'hsl(var(--muted-fg))'
        }}
        title="切换布局"
      >
        <Icon size={14} />
        <span className="hidden sm:inline">{listLayoutLabels[listLayout]}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-40 rounded-xl shadow-lg border py-1 overflow-hidden z-50"
            style={{
              backgroundColor: 'hsl(var(--surface))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            {listLayouts.map((lyt) => {
              const LIcon = listIcons[lyt] || LayoutGrid
              return (
                <button
                  key={lyt}
                  onClick={() => { setListLayout(lyt); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                    listLayout === lyt ? 'font-semibold' : ''
                  }`}
                  style={{
                    color: listLayout === lyt
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--foreground))',
                    backgroundColor: listLayout === lyt
                      ? 'hsl(var(--primary) / 0.08)'
                      : 'transparent',
                  }}
                >
                  <LIcon size={14} />
                  <span>{listLayoutLabels[lyt]}</span>
                  {listLayout === lyt && (
                    <span className="ml-auto text-[10px]">✓</span>
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * 详情布局切换（文章详情页使用）
 */
export function DetailLayoutSwitcher() {
  const [open, setOpen] = useState(false)
  const { detailLayout, setDetailLayout } = useLayoutStore()
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold
                   transition-all duration-200"
        style={{ color: 'hsl(var(--muted-fg))' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.08)'
          e.currentTarget.style.color = 'hsl(var(--primary))'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'hsl(var(--muted-fg))'
        }}
        title="切换阅读布局"
      >
        <BookOpen size={14} />
        <span className="hidden sm:inline">{detailLayoutLabels[detailLayout]}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-36 rounded-xl shadow-lg border py-1 overflow-hidden z-50"
            style={{
              backgroundColor: 'hsl(var(--surface))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            {['center', 'sidebar'].map((lyt) => (
              <button
                key={lyt}
                onClick={() => { setDetailLayout(lyt); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                  detailLayout === lyt ? 'font-semibold' : ''
                }`}
                style={{
                  color: detailLayout === lyt
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--foreground))',
                  backgroundColor: detailLayout === lyt
                    ? 'hsl(var(--primary) / 0.08)'
                    : 'transparent',
                }}
              >
                <BookOpen size={14} />
                <span>{detailLayoutLabels[lyt]}</span>
                {detailLayout === lyt && (
                  <span className="ml-auto text-[10px]">✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

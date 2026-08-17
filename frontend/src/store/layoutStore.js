/**
 * @file src/store/layoutStore.js
 * @description 布局状态管理 — 列表布局（双栏/列表/杂志）+ 详情布局（居中/侧栏）+ localStorage 持久化
 */

import { create } from 'zustand'

const LIST_LAYOUTS = ['grid', 'minimal', 'magazine']
const DETAIL_LAYOUTS = ['center', 'sidebar']

const LIST_KEY = 'blog-list-layout'
const DETAIL_KEY = 'blog-detail-layout'

/**
 * 布局显示名称
 */
export const listLayoutLabels = {
  grid:     '双栏卡片',
  minimal:  '极简列表',
  magazine: '杂志风格',
}

export const detailLayoutLabels = {
  center:  '居中阅读',
  sidebar: '侧栏目录',
}

function getInitial(key, defaults, fallback) {
  try {
    const saved = localStorage.getItem(key)
    if (saved && defaults.includes(saved)) return saved
  } catch {}
  return fallback
}

const useLayoutStore = create((set) => ({
  listLayout: getInitial(LIST_KEY, LIST_LAYOUTS, 'grid'),
  detailLayout: getInitial(DETAIL_KEY, DETAIL_LAYOUTS, 'center'),

  setListLayout: (layout) => {
    if (!LIST_LAYOUTS.includes(layout)) return
    try { localStorage.setItem(LIST_KEY, layout) } catch {}
    set({ listLayout: layout })
  },

  setDetailLayout: (layout) => {
    if (!DETAIL_LAYOUTS.includes(layout)) return
    try { localStorage.setItem(DETAIL_KEY, layout) } catch {}
    set({ detailLayout: layout })
  },
}))

export default useLayoutStore

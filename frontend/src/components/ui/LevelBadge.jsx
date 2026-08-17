/**
 * @file LevelBadge.jsx
 * @description 用户等级/头衔徽章
 *
 * Props:
 *  level   {number}  等级 1-9
 *  title   {string}  头衔文字
 *  total   {number}  总积分（用于 tooltip）
 *  size    {string}  'sm' | 'md' | 'lg'
 *  showTitle {boolean} 是否显示头衔文字（默认 true）
 */

const LEVEL_COLORS = {
  1: { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },        // 新手 — 灰
  2: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },        // 见习 — 绿
  3: { bg: '#ecfdf5', text: '#059669', border: '#6ee7b7' },        // 初级 — 翠绿
  4: { bg: '#eff6ff', text: '#2563eb', border: '#93c5fd' },        // 进阶 — 蓝
  5: { bg: '#f5f3ff', text: '#7c3aed', border: '#c4b5fd' },        // 资深 — 紫
  6: { bg: '#fdf4ff', text: '#a21caf', border: '#e879f9' },        // 优秀 — 品红
  7: { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },        // 精英 — 橙
  8: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },        // 大师 — 金
  9: { bg: 'linear-gradient(135deg,#fff1f2,#fef3c7,#f0fdf4)', text: '#dc2626', border: '#fca5a5' }, // 传说 — 彩虹
}

const LEVEL_ICONS = {
  1: '🌱', 2: '📖', 3: '✏️', 4: '🖊️',
  5: '🌟', 6: '💡', 7: '🔥', 8: '👑', 9: '🏆',
}

const SIZE_MAP = {
  sm: { badge: 'px-1.5 py-0.5 text-xs gap-1',   icon: 'text-xs' },
  md: { badge: 'px-2.5 py-1  text-sm gap-1.5',  icon: 'text-sm' },
  lg: { badge: 'px-3   py-1.5 text-base gap-2', icon: 'text-base' },
}

export default function LevelBadge({
  level = 1,
  title = '新手',
  total,
  size = 'sm',
  showTitle = true,
}) {
  const lvl = Math.min(Math.max(level, 1), 9)
  const color = LEVEL_COLORS[lvl]
  const icon  = LEVEL_ICONS[lvl]
  const sz    = SIZE_MAP[size] || SIZE_MAP.sm

  return (
    <span
      title={total !== undefined ? `Lv.${lvl} ${title} · 积分 ${total}` : `Lv.${lvl} ${title}`}
      className={`
        inline-flex items-center font-medium rounded-full border
        select-none whitespace-nowrap
        ${sz.badge}
      `}
      style={{
        background: lvl === 9 ? color.bg : color.bg,
        color: color.text,
        borderColor: color.border,
      }}
    >
      <span className={sz.icon}>{icon}</span>
      <span>Lv.{lvl}</span>
      {showTitle && <span>{title}</span>}
    </span>
  )
}

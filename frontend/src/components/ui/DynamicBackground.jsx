/**
 * @file DynamicBackground.jsx
 * @description 全站动态背景 — 四套主题各具独特视觉
 *
 *  翠绿 (mint)  — 多种形态绿叶缓缓漂动
 *  暖黄 (sepia) — 多种形态落叶缤纷飘落
 *  深海 (ocean) — 5种海洋鱼类悠然游动（小丑鱼/天使鱼/金鱼/河豚/热带鱼）
 *  暗黑 (dark)  — 萤火虫微光有机飞行
 */

import { useEffect, useRef, useCallback } from 'react'
import useThemeStore from '@/store/themeStore'

/* ── 常量 ───────────────────────────────── */
const TWO_PI = Math.PI * 2

/* ── 工具函数 ───────────────────────────── */
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rand  = (min, max) => min + Math.random() * (max - min)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/* ═══════════════════════════════════════════
   主题配置
═══════════════════════════════════════════ */
const THEME_CONFIG = {
  mint: {
    type: 'leaf',
    count: 20,
    palette: ['#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#a7f3d0', '#86efac'],
    bgPalette: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7'],
  },
  sepia: {
    type: 'fallingLeaf',
    count: 26,
    palette: ['#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#fef3c7', '#fde68a', '#dc7f00'],
    bgPalette: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d'],
  },
  ocean: {
    type: 'fish',
    count: 18,
    palette: [], // 每条鱼有自己的配色方案
    bgPalette: ['#ecfeff', '#cffafe', '#a5f3fc', '#06b6d4'],
  },
  dark: {
    type: 'firefly',
    count: 35,
    palette: ['#fef08a', '#fde047', '#eab308', '#a3e635', '#84cc16', '#d9f99d'],
    bgPalette: ['#0f172a', '#1e293b', '#334155', '#0f172a'],
  },
}

/* ═══════════════════════════════════════════
   叶片形状库（6 种形态）
═══════════════════════════════════════════ */

/**
 * 绘制叶片（根据 leafType 选不同形态）
 * leafType: 0=椭圆叶  1=心形叶  2=枫叶风  3=细长柳叶  4=圆形荷叶  5=不规则锯齿叶
 */
function drawLeafShape(ctx, s, leafType, color, isDark) {
  const veinColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'

  ctx.fillStyle = color
  ctx.strokeStyle = veinColor
  ctx.lineWidth = Math.max(0.5, s * 0.018)

  if (leafType === 0) {
    // 卵圆形叶（最常见）
    ctx.beginPath()
    ctx.moveTo(s * 0.55, 0)
    ctx.bezierCurveTo(s * 0.55, -s * 0.28, -s * 0.3, -s * 0.28, -s * 0.3, 0)
    ctx.bezierCurveTo(-s * 0.3, s * 0.28, s * 0.55, s * 0.28, s * 0.55, 0)
    ctx.closePath()
    ctx.fill()
    // 中脉
    ctx.beginPath()
    ctx.moveTo(-s * 0.25, 0)
    ctx.quadraticCurveTo(s * 0.1, 0, s * 0.5, 0)
    ctx.stroke()
    // 侧脉
    const veinCount = 4
    for (let i = 1; i <= veinCount; i++) {
      const tx = -s * 0.25 + (s * 0.75 * i) / (veinCount + 1)
      const spread = s * 0.18 * Math.sin((i / (veinCount + 1)) * Math.PI)
      ctx.beginPath()
      ctx.moveTo(tx, 0)
      ctx.quadraticCurveTo(tx + s * 0.05, -spread * 0.6, tx + s * 0.08, -spread)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(tx, 0)
      ctx.quadraticCurveTo(tx + s * 0.05, spread * 0.6, tx + s * 0.08, spread)
      ctx.stroke()
    }

  } else if (leafType === 1) {
    // 尖头细长叶（竹叶/柳叶）
    ctx.beginPath()
    ctx.moveTo(s * 0.7, 0)
    ctx.bezierCurveTo(s * 0.4, -s * 0.15, -s * 0.5, -s * 0.12, -s * 0.5, 0)
    ctx.bezierCurveTo(-s * 0.5, s * 0.12, s * 0.4, s * 0.15, s * 0.7, 0)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-s * 0.45, 0)
    ctx.lineTo(s * 0.65, 0)
    ctx.stroke()
    for (let i = 1; i <= 3; i++) {
      const tx = -s * 0.45 + (s * 1.1 * i) / 4
      const spread = s * 0.1 * Math.sin((i / 4) * Math.PI)
      ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx + s * 0.12, -spread); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx + s * 0.12,  spread); ctx.stroke()
    }

  } else if (leafType === 2) {
    // 心形叶（双尖）
    ctx.beginPath()
    ctx.moveTo(0, s * 0.55)
    ctx.bezierCurveTo(-s * 0.65, s * 0.2, -s * 0.65, -s * 0.35, 0, -s * 0.1)
    ctx.bezierCurveTo(s * 0.65, -s * 0.35, s * 0.65, s * 0.2, 0, s * 0.55)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0, s * 0.5)
    ctx.bezierCurveTo(-s * 0.1, s * 0.2, -s * 0.1, -s * 0.05, 0, -s * 0.05)
    ctx.stroke()

  } else if (leafType === 3) {
    // 扇形圆叶（荷叶感）
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.45, -Math.PI * 0.7, Math.PI * 0.7)
    ctx.lineTo(0, 0)
    ctx.closePath()
    ctx.fill()
    // 放射状叶脉
    for (let i = -2; i <= 2; i++) {
      const angle = (i / 5) * Math.PI * 0.65
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(angle) * s * 0.4, Math.sin(angle) * s * 0.4)
      ctx.stroke()
    }

  } else if (leafType === 4) {
    // 三角形尖叶（松针感）
    ctx.beginPath()
    ctx.moveTo(s * 0.6, 0)
    ctx.lineTo(-s * 0.3, -s * 0.18)
    ctx.lineTo(-s * 0.15, 0)
    ctx.lineTo(-s * 0.3, s * 0.18)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-s * 0.12, 0)
    ctx.lineTo(s * 0.55, 0)
    ctx.stroke()

  } else {
    // 不规则波浪叶缘（更自然）
    ctx.beginPath()
    ctx.moveTo(s * 0.55, 0)
    ctx.bezierCurveTo(s * 0.4, -s * 0.12, s * 0.1, -s * 0.32, -s * 0.1, -s * 0.25)
    ctx.bezierCurveTo(-s * 0.3, -s * 0.18, -s * 0.4, -s * 0.05, -s * 0.35, 0)
    ctx.bezierCurveTo(-s * 0.4, s * 0.05, -s * 0.3, s * 0.2, -s * 0.1, s * 0.27)
    ctx.bezierCurveTo(s * 0.1, s * 0.34, s * 0.4, s * 0.14, s * 0.55, 0)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-s * 0.3, 0)
    ctx.quadraticCurveTo(s * 0.1, s * 0.02, s * 0.5, 0)
    ctx.stroke()
  }
}

/* ═══════════════════════════════════════════
   鱼类绘制（5 种类型）
   0=金鱼  1=小丑鱼  2=天使鱼  3=河豚  4=热带鱼
═══════════════════════════════════════════ */

// 各鱼类颜色方案
const FISH_SCHEMES = [
  // 0 金鱼：金红色
  { body: '#f97316', belly: '#fed7aa', stripe: '#b45309', fin: '#fb923c', eye: '#1c1917' },
  // 1 小丑鱼：橙白黑
  { body: '#f97316', belly: '#fff', stripe: '#000', fin: '#ea580c', eye: '#000' },
  // 2 天使鱼：蓝黄
  { body: '#0ea5e9', belly: '#fbbf24', stripe: '#1e40af', fin: '#38bdf8', eye: '#0c4a6e' },
  // 3 河豚：黄绿
  { body: '#84cc16', belly: '#d9f99d', stripe: '#365314', fin: '#a3e635', eye: '#1a2e05' },
  // 4 热带鱼：紫蓝
  { body: '#8b5cf6', belly: '#ddd6fe', stripe: '#4c1d95', fin: '#a78bfa', eye: '#1e1b4b' },
  // 5 蓝吊鱼：蓝黄
  { body: '#06b6d4', belly: '#ecfeff', stripe: '#0e7490', fin: '#22d3ee', eye: '#083344' },
  // 6 红鱼
  { body: '#ef4444', belly: '#fecaca', stripe: '#7f1d1d', fin: '#f87171', eye: '#1c1917' },
]

function createFish() {
  const goingRight = Math.random() > 0.5
  const fishType = Math.floor(Math.random() * 5) // 0~4 五种体形
  const schemeIdx = Math.floor(Math.random() * FISH_SCHEMES.length)
  return {
    x: rand(-8, 108),
    y: rand(8, 92),
    size: rand(22, 55),
    fishType,
    scheme: FISH_SCHEMES[schemeIdx],
    vx: rand(0.02, 0.065) * (goingRight ? 1 : -1),
    vy: rand(-0.006, 0.006),
    swimPhase: rand(0, TWO_PI),
    swimSpeed: rand(0.007, 0.018),
    swimAmp: rand(1.5, 5),
    tailPhase: rand(0, TWO_PI),
    tailSpeed: rand(0.055, 0.13),
    opacity: rand(0.55, 0.82),
    wobblePhase: rand(0, TWO_PI),
  }
}

/** 金鱼（圆润身型，长扇尾，背鳍高） */
function drawGoldfish(ctx, s, c, tailWag, op) {
  // 身体
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.34, s * 0.18, 0, 0, TWO_PI)
  ctx.fillStyle = c.body
  ctx.globalAlpha = op
  ctx.fill()

  // 腹部高光
  ctx.beginPath()
  ctx.ellipse(s * 0.06, s * 0.05, s * 0.22, s * 0.1, 0, 0, TWO_PI)
  ctx.fillStyle = c.belly
  ctx.globalAlpha = op * 0.45
  ctx.fill()

  // 高扇背鳍
  ctx.beginPath()
  ctx.moveTo(-s * 0.05, -s * 0.16)
  ctx.bezierCurveTo(-s * 0.15, -s * 0.42, s * 0.1, -s * 0.42, s * 0.2, -s * 0.16)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.8
  ctx.fill()

  // 臀鳍
  ctx.beginPath()
  ctx.moveTo(-s * 0.05, s * 0.16)
  ctx.bezierCurveTo(-s * 0.1, s * 0.3, s * 0.08, s * 0.3, s * 0.12, s * 0.16)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.7
  ctx.fill()

  // 双叉扇尾
  ctx.save()
  ctx.translate(-s * 0.32, 0)
  ctx.rotate(tailWag)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-s * 0.12, -s * 0.08, -s * 0.28, -s * 0.22, -s * 0.26, -s * 0.05)
  ctx.bezierCurveTo(-s * 0.28, -s * 0.22, -s * 0.12, -s * 0.08, 0, 0)
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-s * 0.12, s * 0.08, -s * 0.28, s * 0.22, -s * 0.26, s * 0.05)
  ctx.bezierCurveTo(-s * 0.28, s * 0.22, -s * 0.12, s * 0.08, 0, 0)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.85
  ctx.fill()
  ctx.restore()

  // 胸鳍
  ctx.save()
  ctx.translate(s * 0.1, s * 0.08)
  ctx.rotate(-0.4 + tailWag * 0.5)
  ctx.beginPath()
  ctx.ellipse(0, s * 0.08, s * 0.05, s * 0.12, 0, 0, TWO_PI)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.6
  ctx.fill()
  ctx.restore()
}

/** 小丑鱼（白色竖条纹，圆尾） */
function drawClownfish(ctx, s, c, tailWag, op) {
  // 身体椭圆
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.3, s * 0.16, 0, 0, TWO_PI)
  ctx.fillStyle = c.body
  ctx.globalAlpha = op
  ctx.fill()

  // 3条白色竖纹（clip到身体内）
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.3, s * 0.16, 0, 0, TWO_PI)
  ctx.clip()
  ctx.fillStyle = c.belly
  ctx.globalAlpha = op * 0.9
  const stripePositions = [s * 0.14, -s * 0.02, -s * 0.2]
  for (const sx of stripePositions) {
    ctx.beginPath()
    ctx.ellipse(sx, 0, s * 0.045, s * 0.16, 0, 0, TWO_PI)
    ctx.fill()
  }
  // 黑色边
  ctx.strokeStyle = c.stripe
  ctx.lineWidth = s * 0.015
  ctx.globalAlpha = op * 0.5
  for (const sx of stripePositions) {
    ctx.beginPath()
    ctx.ellipse(sx, 0, s * 0.055, s * 0.16, 0, 0, TWO_PI)
    ctx.stroke()
  }
  ctx.restore()

  // 背鳍
  ctx.beginPath()
  ctx.moveTo(s * 0.18, -s * 0.14)
  ctx.bezierCurveTo(s * 0.08, -s * 0.28, -s * 0.12, -s * 0.28, -s * 0.18, -s * 0.14)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.85
  ctx.fill()

  // 圆尾
  ctx.save()
  ctx.translate(-s * 0.28, 0)
  ctx.rotate(tailWag)
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.13, -Math.PI * 0.65, Math.PI * 0.65)
  ctx.lineTo(0, 0)
  ctx.closePath()
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.88
  ctx.fill()
  ctx.restore()
}

/** 天使鱼（菱形体，长丝状腹鳍，竖纹） */
function drawAngel(ctx, s, c, tailWag, op) {
  // 菱形压扁体
  ctx.save()
  ctx.scale(1, 1.4)
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.28, s * 0.13, 0, 0, TWO_PI)
  ctx.fillStyle = c.body
  ctx.globalAlpha = op
  ctx.fill()

  // 竖纹（clip）
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.28, s * 0.13, 0, 0, TWO_PI)
  ctx.clip()
  ctx.fillStyle = c.stripe
  ctx.globalAlpha = op * 0.25
  for (const sx of [s * 0.1, -s * 0.08, -s * 0.22]) {
    ctx.beginPath()
    ctx.rect(sx - s * 0.03, -s * 0.13, s * 0.06, s * 0.26)
    ctx.fill()
  }
  ctx.restore()

  // 背鳍（高尖）
  ctx.save()
  ctx.scale(1, 1.4)
  ctx.beginPath()
  ctx.moveTo(s * 0.05, -s * 0.12)
  ctx.bezierCurveTo(s * 0.0, -s * 0.38, -s * 0.12, -s * 0.38, -s * 0.18, -s * 0.12)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.8
  ctx.fill()
  ctx.restore()

  // 长丝腹鳍
  ctx.save()
  ctx.scale(1, 1.4)
  ctx.beginPath()
  ctx.moveTo(s * 0.05, s * 0.12)
  ctx.bezierCurveTo(s * 0.0, s * 0.38, -s * 0.14, s * 0.45, -s * 0.2, s * 0.18)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.75
  ctx.fill()
  ctx.restore()

  // 尾鳍（分叉）
  ctx.save()
  ctx.translate(-s * 0.26, 0)
  ctx.rotate(tailWag)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-s * 0.05, -s * 0.06, -s * 0.18, -s * 0.2, -s * 0.16, -s * 0.04)
  ctx.bezierCurveTo(-s * 0.18, -s * 0.2, -s * 0.05, -s * 0.06, 0, 0)
  ctx.bezierCurveTo(-s * 0.05, s * 0.06, -s * 0.18, s * 0.2, -s * 0.16, s * 0.04)
  ctx.bezierCurveTo(-s * 0.18, s * 0.2, -s * 0.05, s * 0.06, 0, 0)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.82
  ctx.fill()
  ctx.restore()
}

/** 河豚（圆鼓体，小刺，扇尾） */
function drawPuffer(ctx, s, c, tailWag, op) {
  // 圆鼓身体
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.28, s * 0.22, 0, 0, TWO_PI)
  ctx.fillStyle = c.body
  ctx.globalAlpha = op
  ctx.fill()

  // 腹部花纹
  ctx.beginPath()
  ctx.ellipse(s * 0.05, s * 0.06, s * 0.18, s * 0.12, 0, 0, TWO_PI)
  ctx.fillStyle = c.belly
  ctx.globalAlpha = op * 0.6
  ctx.fill()

  // 斑点
  ctx.fillStyle = c.stripe
  ctx.globalAlpha = op * 0.3
  const dots = [[s*0.1,-s*0.08],[s*0.0,-s*0.15],[-s*0.1,-s*0.06],[s*0.14,s*0.04],[s*0.02,s*0.14]]
  for (const [dx, dy] of dots) {
    ctx.beginPath()
    ctx.arc(dx, dy, s * 0.035, 0, TWO_PI)
    ctx.fill()
  }

  // 小刺（背部）
  ctx.strokeStyle = c.stripe
  ctx.lineWidth = s * 0.015
  ctx.globalAlpha = op * 0.6
  for (let i = -2; i <= 2; i++) {
    const angle = Math.PI * 1.5 + i * 0.22
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * s * 0.22, Math.sin(angle) * s * 0.22)
    ctx.lineTo(Math.cos(angle) * s * 0.3, Math.sin(angle) * s * 0.3)
    ctx.stroke()
  }

  // 小背鳍
  ctx.beginPath()
  ctx.moveTo(s * 0.04, -s * 0.2)
  ctx.bezierCurveTo(-s * 0.04, -s * 0.32, -s * 0.12, -s * 0.3, -s * 0.16, -s * 0.2)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.75
  ctx.fill()

  // 小扇尾
  ctx.save()
  ctx.translate(-s * 0.26, 0)
  ctx.rotate(tailWag * 0.7)
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.12, -Math.PI * 0.55, Math.PI * 0.55)
  ctx.lineTo(0, 0)
  ctx.closePath()
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.82
  ctx.fill()
  ctx.restore()
}

/** 热带鱼（修长体，高背鳍，分叉尾） */
function drawTropicalFish(ctx, s, c, tailWag, op) {
  // 修长身体
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.36, s * 0.13, 0, 0, TWO_PI)
  ctx.fillStyle = c.body
  ctx.globalAlpha = op
  ctx.fill()

  // 腹部渐变感
  ctx.beginPath()
  ctx.ellipse(s * 0.08, s * 0.04, s * 0.24, s * 0.08, 0, 0, TWO_PI)
  ctx.fillStyle = c.belly
  ctx.globalAlpha = op * 0.5
  ctx.fill()

  // 横向深色斑纹
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.36, s * 0.13, 0, 0, TWO_PI)
  ctx.clip()
  ctx.fillStyle = c.stripe
  ctx.globalAlpha = op * 0.2
  for (const sx of [s * 0.0, -s * 0.18]) {
    ctx.beginPath()
    ctx.rect(sx - s * 0.04, -s * 0.13, s * 0.08, s * 0.26)
    ctx.fill()
  }
  ctx.restore()

  // 高背鳍
  ctx.beginPath()
  ctx.moveTo(s * 0.22, -s * 0.12)
  ctx.bezierCurveTo(s * 0.12, -s * 0.34, -s * 0.1, -s * 0.36, -s * 0.18, -s * 0.12)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.85
  ctx.fill()

  // 臀鳍
  ctx.beginPath()
  ctx.moveTo(s * 0.05, s * 0.12)
  ctx.bezierCurveTo(-s * 0.04, s * 0.28, -s * 0.15, s * 0.28, -s * 0.2, s * 0.12)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.72
  ctx.fill()

  // 胸鳍
  ctx.save()
  ctx.translate(s * 0.14, s * 0.06)
  ctx.rotate(-0.35 + tailWag * 0.4)
  ctx.beginPath()
  ctx.ellipse(0, s * 0.07, s * 0.04, s * 0.1, 0, 0, TWO_PI)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.6
  ctx.fill()
  ctx.restore()

  // 分叉尾
  ctx.save()
  ctx.translate(-s * 0.34, 0)
  ctx.rotate(tailWag)
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.02)
  ctx.bezierCurveTo(-s * 0.08, -s * 0.08, -s * 0.22, -s * 0.2, -s * 0.2, -s * 0.04)
  ctx.bezierCurveTo(-s * 0.22, -s * 0.2, -s * 0.08, -s * 0.08, 0, -s * 0.02)
  ctx.moveTo(0, s * 0.02)
  ctx.bezierCurveTo(-s * 0.08, s * 0.08, -s * 0.22, s * 0.2, -s * 0.2, s * 0.04)
  ctx.bezierCurveTo(-s * 0.22, s * 0.2, -s * 0.08, s * 0.08, 0, s * 0.02)
  ctx.fillStyle = c.fin
  ctx.globalAlpha = op * 0.88
  ctx.fill()
  ctx.restore()
}

/** 公共：绘制眼睛 */
function drawEye(ctx, s, eyeColor, op) {
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.arc(s * 0.2, -s * 0.04, s * 0.042, 0, TWO_PI)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(s * 0.215, -s * 0.04, s * 0.022, 0, TWO_PI)
  ctx.fillStyle = eyeColor
  ctx.fill()
  // 高光
  ctx.beginPath()
  ctx.arc(s * 0.208, -s * 0.048, s * 0.009, 0, TWO_PI)
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fill()
}

/** 统一绘制小鱼入口 */
function drawFish(ctx, f, W, H) {
  const cx = (f.x / 100) * W
  const cy = (f.y / 100) * H
  const s  = f.size
  const goingRight = f.vx > 0
  const tailWag    = Math.sin(f.tailPhase) * 0.28

  ctx.save()
  ctx.translate(cx, cy)
  if (!goingRight) ctx.scale(-1, 1)

  // 身体上下摆动
  const bodyWobble = Math.sin(f.wobblePhase) * 0.06
  ctx.rotate(bodyWobble)

  // 根据类型绘制
  const c  = f.scheme
  const op = f.opacity
  switch (f.fishType) {
    case 0: drawGoldfish(ctx, s, c, tailWag, op); break
    case 1: drawClownfish(ctx, s, c, tailWag, op); break
    case 2: drawAngel(ctx, s, c, tailWag, op); break
    case 3: drawPuffer(ctx, s, c, tailWag, op); break
    default: drawTropicalFish(ctx, s, c, tailWag, op); break
  }

  // 眼睛（所有鱼统一）
  drawEye(ctx, s, c.eye, op)

  // 气泡（偶尔）
  if (Math.sin(f.tailPhase * 0.6 + 1) > 0.9) {
    ctx.globalAlpha = 0.25
    ctx.beginPath()
    ctx.arc(s * 0.32, -s * 0.08, s * 0.022, 0, TWO_PI)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  ctx.restore()
}

/* ═══════════════════════════════════════════
   萤火虫
═══════════════════════════════════════════ */
function createFirefly() {
  return {
    x: rand(0, 100),
    y: rand(0, 100),
    coreSize: rand(1.2, 3),
    glowSize: rand(10, 28),
    vx: rand(-0.006, 0.006),
    vy: rand(-0.004, 0.004),
    phaseX: rand(0, TWO_PI),
    phaseY: rand(0, TWO_PI),
    phaseGlow: rand(0, TWO_PI),
    freqX: rand(0.003, 0.008),
    freqY: rand(0.004, 0.01),
    freqGlow: rand(0.03, 0.07),
    ampX: rand(0.5, 2.5),
    ampY: rand(0.5, 2.5),
    color: null,
    opacity: rand(0.3, 0.65),
  }
}

function drawFirefly(ctx, ff, W, H) {
  const cx = (ff.x / 100) * W
  const cy = (ff.y / 100) * H
  const pulse = 0.45 + 0.55 * Math.sin(ff.phaseGlow)
  const glowR = ff.glowSize * (0.65 + 0.35 * pulse)

  ctx.save()
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
  grad.addColorStop(0,   ff.color + '4D')
  grad.addColorStop(0.3, ff.color + '1A')
  grad.addColorStop(0.7, ff.color + '05')
  grad.addColorStop(1,   'transparent')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, glowR, 0, TWO_PI)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, ff.coreSize * (0.8 + 0.2 * pulse), 0, TWO_PI)
  ctx.fillStyle = ff.color
  ctx.shadowColor = ff.color
  ctx.shadowBlur = ff.coreSize * 4 * (0.8 + 0.2 * pulse)
  ctx.globalAlpha = ff.opacity * (0.8 + 0.2 * pulse)
  ctx.fill()
  ctx.restore()
}

/* ═══════════════════════════════════════════
   实体工厂
═══════════════════════════════════════════ */
function makeEntities(config) {
  const entities = []
  for (let i = 0; i < config.count; i++) {
    let e
    switch (config.type) {
      case 'leaf':
        e = {
          x: rand(0, 100), y: rand(0, 100),
          leafType: Math.floor(Math.random() * 6),
          size: rand(15, 44),
          angle: rand(0, TWO_PI),
          rotationSpeed: rand(-0.005, 0.005),
          vx: rand(-0.01, 0.01),
          vy: rand(-0.007, 0.007),
          swayPhase: rand(0, TWO_PI),
          swaySpeed: rand(0.003, 0.007),
          swayAmp: rand(1.5, 4),
          color: pick(config.palette),
          opacity: rand(0.55, 0.88),
        }
        break
      case 'fallingLeaf':
        e = {
          x: rand(0, 100), y: rand(-20, 110),
          leafType: Math.floor(Math.random() * 6),
          size: rand(10, 38),
          angle: rand(0, TWO_PI),
          rotationSpeed: rand(0.01, 0.05),
          vx: rand(-0.035, 0.035),
          vy: rand(0.025, 0.075),
          swayPhase: rand(0, TWO_PI),
          swaySpeed: rand(0.018, 0.055),
          swayAmp: rand(4, 16),
          color: pick(config.palette),
          opacity: rand(0.5, 0.82),
        }
        break
      case 'fish':
        e = createFish()
        break
      case 'firefly':
        e = createFirefly()
        e.color = pick(config.palette)
        break
    }
    if (config.type !== 'fish' && config.type !== 'firefly') {
      // color already assigned above
    }
    entities.push(e)
  }
  return entities
}

/* ═══════════════════════════════════════════
   实体更新逻辑
═══════════════════════════════════════════ */
function updateLeaf(e) {
  e.x += e.vx + Math.cos(e.swayPhase) * e.swayAmp * 0.014
  e.y += e.vy + Math.sin(e.swayPhase) * e.swayAmp * 0.007
  e.angle += e.rotationSpeed
  e.swayPhase += e.swaySpeed
  if (e.x < -12) e.x = 112
  if (e.x > 112) e.x = -12
  if (e.y < -12) e.y = 112
  if (e.y > 112) e.y = -12
}

function updateFallingLeaf(e) {
  e.x += e.vx + Math.sin(e.swayPhase) * e.swayAmp * 0.02
  e.y += e.vy
  e.angle += e.rotationSpeed
  e.swayPhase += e.swaySpeed
  if (e.y > 112) { e.y = rand(-16, -2); e.x = rand(0, 100) }
  if (e.x < -10) e.x = 110
  if (e.x > 110) e.x = -10
}

function updateFish(e) {
  e.x += e.vx
  e.y += e.vy + Math.sin(e.swimPhase) * e.swimAmp * 0.014
  e.tailPhase += e.tailSpeed
  e.swimPhase += e.swimSpeed
  e.wobblePhase += 0.04
  if (e.vx > 0 && e.x > 114) e.x = -12
  if (e.vx < 0 && e.x < -14) e.x = 112
  if (e.y < 2)  e.vy = Math.abs(e.vy)
  if (e.y > 98) e.vy = -Math.abs(e.vy)
}

function updateFirefly(e) {
  e.phaseX += e.freqX; e.phaseY += e.freqY; e.phaseGlow += e.freqGlow
  e.x += e.vx + Math.sin(e.phaseX) * e.ampX * 0.015
  e.y += e.vy + Math.cos(e.phaseY) * e.ampY * 0.015
  if (Math.random() < 0.003) {
    e.vx = clamp(e.vx + rand(-0.003, 0.003), -0.014, 0.014)
    e.vy = clamp(e.vy + rand(-0.003, 0.003), -0.012, 0.012)
  }
  if (e.x < 1)  { e.x = 1;  e.vx =  Math.abs(e.vx) * 0.8 }
  if (e.x > 99) { e.x = 99; e.vx = -Math.abs(e.vx) * 0.8 }
  if (e.y < 1)  { e.y = 1;  e.vy =  Math.abs(e.vy) * 0.8 }
  if (e.y > 99) { e.y = 99; e.vy = -Math.abs(e.vy) * 0.8 }
}

/* ═══════════════════════════════════════════
   Background Blobs
═══════════════════════════════════════════ */
const BLOB_COUNT = 3

function createBlobs() {
  return Array.from({ length: BLOB_COUNT }, () => ({
    x: rand(10, 90), y: rand(10, 90),
    vx: rand(-0.008, 0.008), vy: rand(-0.006, 0.006),
    rx: rand(20, 36), ry: rand(18, 30),
    phase: rand(0, TWO_PI),
  }))
}

function drawBlob(ctx, b, color, W, H) {
  b.x += b.vx; b.y += b.vy; b.phase += 0.002
  if (b.x < -20) b.vx =  Math.abs(b.vx)
  if (b.x > 120) b.vx = -Math.abs(b.vx)
  if (b.y < -20) b.vy =  Math.abs(b.vy)
  if (b.y > 120) b.vy = -Math.abs(b.vy)
  const sinOff = Math.sin(b.phase) * 3
  const cx = (b.x / 100) * W, cy = (b.y / 100) * H
  const rx = (b.rx / 100) * W + sinOff * (W / 300)
  const ry = (b.ry / 100) * H + sinOff * (H / 300)
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry))
  grad.addColorStop(0,   color + '14')
  grad.addColorStop(0.5, color + '08')
  grad.addColorStop(1,   'transparent')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, b.phase * 0.2, 0, TWO_PI)
  ctx.fill()
}

/* ═══════════════════════════════════════════
   Main Component
═══════════════════════════════════════════ */
export default function DynamicBackground() {
  const canvasRef   = useRef(null)
  const rafRef      = useRef(null)
  const entitiesRef = useRef([])
  const blobsRef    = useRef(createBlobs())
  const cssSizeRef  = useRef({ w: 0, h: 0, dpr: 1 })
  const theme       = useThemeStore((s) => s.theme)
  const themeRef    = useRef(theme)
  const configRef   = useRef(THEME_CONFIG[theme])

  themeRef.current  = theme
  configRef.current = THEME_CONFIG[theme]

  useEffect(() => {
    entitiesRef.current = makeEntities(THEME_CONFIG[theme])
  }, [theme])

  if (entitiesRef.current.length === 0) {
    entitiesRef.current = makeEntities(THEME_CONFIG[theme])
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { w: W, h: H, dpr } = cssSizeRef.current
    if (W === 0 || H === 0) return

    const config   = configRef.current
    const entities = entitiesRef.current
    const blobs    = blobsRef.current

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    // 背景渐变基底
    const bgGrad = ctx.createLinearGradient(0, 0, W, H)
    bgGrad.addColorStop(0,   config.bgPalette[0] + '30')
    bgGrad.addColorStop(0.5, config.bgPalette[1] + '20')
    bgGrad.addColorStop(1,   config.bgPalette[2] + '15')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    // 环境 blobs
    for (let i = 0; i < blobs.length; i++) {
      drawBlob(ctx, blobs[i], config.bgPalette[i % config.bgPalette.length], W, H)
    }

    // 主题实体
    const isDark = config.type === 'firefly'
    for (const e of entities) {
      switch (config.type) {
        case 'leaf':
          updateLeaf(e)
          ctx.save()
          ctx.translate((e.x / 100) * W, (e.y / 100) * H)
          ctx.rotate(e.angle)
          ctx.globalAlpha = e.opacity
          drawLeafShape(ctx, e.size, e.leafType, e.color, isDark)
          ctx.restore()
          break
        case 'fallingLeaf':
          updateFallingLeaf(e)
          ctx.save()
          ctx.translate((e.x / 100) * W, (e.y / 100) * H)
          ctx.rotate(e.angle)
          ctx.globalAlpha = e.opacity
          drawLeafShape(ctx, e.size, e.leafType, e.color, isDark)
          ctx.restore()
          break
        case 'fish':
          updateFish(e)
          drawFish(ctx, e, W, H)
          break
        case 'firefly':
          updateFirefly(e)
          drawFirefly(ctx, e, W, H)
          break
      }
    }

    rafRef.current = requestAnimationFrame(draw)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth, h = window.innerHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
      cssSizeRef.current = { w, h, dpr }
    }

    resize()
    window.addEventListener('resize', resize)

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!mq.matches) rafRef.current = requestAnimationFrame(draw)

    const onMotion = (e) => {
      if (e.matches) { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
      else { if (!rafRef.current) rafRef.current = requestAnimationFrame(draw) }
    }
    mq.addEventListener('change', onMotion)

    return () => {
      window.removeEventListener('resize', resize)
      mq.removeEventListener('change', onMotion)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity: 0.6, transition: 'opacity 0.6s ease' }}
    />
  )
}

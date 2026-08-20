/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // 语义化颜色令牌 — 通过 CSS 变量驱动，支持 4 套主题切换
      colors: {
        // 语义表面色
        surface:       'hsl(var(--surface) / <alpha-value>)',
        foreground:    'hsl(var(--foreground) / <alpha-value>)',
        muted:         'hsl(var(--muted) / <alpha-value>)',
        'muted-fg':    'hsl(var(--muted-fg) / <alpha-value>)',
        border:        'hsl(var(--border) / <alpha-value>)',
        accent:        'hsl(var(--accent) / <alpha-value>)',
        'accent-fg':   'hsl(var(--accent-fg) / <alpha-value>)',

        // 主色调
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          fg:      'hsl(var(--primary-fg) / <alpha-value>)',
          50:  'hsl(var(--primary-50) / <alpha-value>)',
          100: 'hsl(var(--primary-100) / <alpha-value>)',
          200: 'hsl(var(--primary-200) / <alpha-value>)',
          300: 'hsl(var(--primary-300) / <alpha-value>)',
          400: 'hsl(var(--primary-400) / <alpha-value>)',
          500: 'hsl(var(--primary-500) / <alpha-value>)',
          600: 'hsl(var(--primary-600) / <alpha-value>)',
          700: 'hsl(var(--primary-700) / <alpha-value>)',
        },

        /* 语义化文字色 — 替换 hardcoded text-gray-*（随主题自动切换亮/暗） */
        tx: {
          heading:  'hsl(var(--tx-heading) / <alpha-value>)',   // 替换 text-gray-800/900
          body:     'hsl(var(--tx-body) / <alpha-value>)',       // 替换 text-gray-600/700
          muted:    'hsl(var(--tx-muted) / <alpha-value>)',      // 替换 text-gray-500
          subtle:   'hsl(var(--tx-subtle) / <alpha-value>)',     // 替换 text-gray-300/400
        },

        /* 语义化背景色 — 替换 hardcoded bg-white / bg-gray-*（随主题自动切换亮/暗） */
        surf: {
          card:   'hsl(var(--surface) / <alpha-value>)',         // 替换 bg-white
          muted:  'hsl(var(--muted) / <alpha-value>)',           // 替换 bg-gray-100/50
        },

        // 保留旧绿色系兼容（部分组件仍有引用）
        cream: {
          50:  '#fefefe',
          100: '#faf9f6',
          200: '#f5f4ef',
        },
      },

      // 背景色语义别名
      backgroundColor: {
        'app':       'hsl(var(--surface) / <alpha-value>)',
        'app-muted': 'hsl(var(--muted) / <alpha-value>)',
      },

      // 文字色语义别名
      textColor: {
        'app':       'hsl(var(--foreground) / <alpha-value>)',
        'app-muted': 'hsl(var(--muted-fg) / <alpha-value>)',
      },

      // 边框色语义别名
      borderColor: {
        'app': 'hsl(var(--border) / <alpha-value>)',
      },

      // 圆角
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      // 阴影
      boxShadow: {
        'soft':  '0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)',
        'card':  '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'hover': '0 4px 20px -2px rgba(0,0,0,0.12), 0 2px 8px -1px rgba(0,0,0,0.07)',
      },

      // 字体(系统字体栈,不依赖外部 CDN,渲染更快、国内/弱网更稳)
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"',
          '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"',
          '"Noto Sans SC"', 'sans-serif',
        ],
        serif: [
          'Georgia', '"Times New Roman"',
          '"Songti SC"', '"SimSun"', '"Noto Serif SC"', 'serif',
        ],
        mono: ['"JetBrains Mono"', 'Consolas', 'Monaco', 'monospace'],
      },

      // 动画
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'fade-in':    'fade-in 0.3s ease-out',
        'slide-in':   'slide-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}

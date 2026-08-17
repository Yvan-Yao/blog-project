/**
 * @file src/components/editor/RichTextEditor.jsx
 * @description 所见即所得富文本编辑器 - 基于 TipTap
 *   工具栏提供：Bold / Italic / Underline / Strike / Code |
 *             H1 / H2 / H3 | 列表 / 有序列表 / 引用 | 链接 / 图片
 */
import { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import ImageExtension from '@tiptap/extension-image'
import UnderlineExtension from '@tiptap/extension-underline'
import {
  Bold, Italic, Underline, Strikethrough, Code,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  Link2, ImagePlus
} from 'lucide-react'

/* ── 工具栏按钮定义 ── */

function ToolbarGroup({ children }) {
  return <div className="flex items-center gap-0.5">{children}</div>
}

function ToolbarSeparator() {
  return <div className="w-px h-5 bg-app mx-1" />
}

function ToolbarButton({ editor, command, isActive, icon: Icon, title }) {
  const active = typeof isActive === 'function' ? isActive(editor) : editor.isActive(isActive)
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); command(editor) }}
      title={title}
      className={`p-1.5 rounded-md transition-colors
        ${active
          ? 'bg-primary-100/60 text-primary dark:bg-primary-900/30 dark:text-primary-light'
          : 'text-tx-muted hover:text-tx-body hover:bg-surf-muted'
        }`}
    >
      <Icon size={16} />
    </button>
  )
}

/* ── 链接弹窗 ── */

function LinkDialog({ editor, onClose }) {
  const previousUrl = editor.getAttributes('link').href || ''

  function setLink(e) {
    e.preventDefault()
    const url = e.target.url.value.trim()
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    onClose()
  }

  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-surf-card border border-app rounded-xl p-3 shadow-xl min-w-[260px]">
      <form onSubmit={setLink} className="flex gap-2">
        <input
          type="url"
          name="url"
          defaultValue={previousUrl}
          placeholder="https://example.com"
          className="input text-sm flex-1 px-2.5 py-1.5"
          autoFocus
        />
        <button type="submit" className="btn-primary text-xs px-3 py-1.5 rounded-lg">确定</button>
      </form>
      {previousUrl && (
        <button
          type="button"
          onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); onClose() }}
          className="text-xs text-red-500 hover:underline mt-1.5"
        >
          移除链接
        </button>
      )}
    </div>
  )
}

function ImageDialog({ editor, onClose }) {
  function insertImage(e) {
    e.preventDefault()
    const url = e.target.url.value.trim()
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
    onClose()
  }

  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-surf-card border border-app rounded-xl p-3 shadow-xl min-w-[280px]">
      <form onSubmit={insertImage} className="flex gap-2">
        <input
          type="url"
          name="url"
          placeholder="https://example.com/image.jpg"
          className="input text-sm flex-1 px-2.5 py-1.5"
          autoFocus
        />
        <button type="submit" className="btn-primary text-xs px-3 py-1.5 rounded-lg">插入</button>
      </form>
    </div>
  )
}

/* ── 主编辑器组件 ── */

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = '开始写作...',
  className = '',
  error = false,
  editorRef,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline underline-offset-2' },
      }),
      Placeholder.configure({ placeholder }),
      ImageExtension.configure({
        HTMLAttributes: { class: 'rounded-xl max-w-full my-2' },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html)
    },
    editorProps: {
      attributes: {
        class: 'prose-blog outline-none min-h-[400px] px-4 py-3 focus:ring-0',
      },
    },
  })

  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)

  /* 暴露编辑器实例给父组件 */
  useEffect(() => {
    if (editorRef) editorRef.current = editor
  }, [editor, editorRef])

  /* 同步外部 value 变化 */
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) return null

  /* ── 工具栏 ── */
  const Toolbar = (
    <div className={`flex items-center gap-0.5 flex-wrap px-3 py-2 border-b border-app bg-surf-muted/50 rounded-t-xl
      ${error ? 'border-red-400' : ''}`}>
      {/* 内联格式 */}
      <ToolbarGroup>
        <ToolbarButton editor={editor} isActive="bold" command={e => e.chain().focus().toggleBold().run()} icon={Bold} title="加粗 (Ctrl+B)" />
        <ToolbarButton editor={editor} isActive="italic" command={e => e.chain().focus().toggleItalic().run()} icon={Italic} title="斜体 (Ctrl+I)" />
        <ToolbarButton editor={editor} isActive="underline" command={e => e.chain().focus().toggleUnderline().run()} icon={Underline} title="下划线 (Ctrl+U)" />
        <ToolbarButton editor={editor} isActive="strike" command={e => e.chain().focus().toggleStrike().run()} icon={Strikethrough} title="删除线" />
        <ToolbarButton editor={editor} isActive="code" command={e => e.chain().focus().toggleCode().run()} icon={Code} title="代码" />
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* 标题 */}
      <ToolbarGroup>
        <ToolbarButton editor={editor} isActive="heading" isActive={e => e.isActive('heading', { level: 1 })} command={e => e.chain().focus().toggleHeading({ level: 1 }).run()} icon={Heading1} title="标题 1" />
        <ToolbarButton editor={editor} isActive="heading" isActive={e => e.isActive('heading', { level: 2 })} command={e => e.chain().focus().toggleHeading({ level: 2 }).run()} icon={Heading2} title="标题 2" />
        <ToolbarButton editor={editor} isActive="heading" isActive={e => e.isActive('heading', { level: 3 })} command={e => e.chain().focus().toggleHeading({ level: 3 }).run()} icon={Heading3} title="标题 3" />
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* 段落 */}
      <ToolbarGroup>
        <ToolbarButton editor={editor} isActive="bulletList" command={e => e.chain().focus().toggleBulletList().run()} icon={List} title="无序列表" />
        <ToolbarButton editor={editor} isActive="orderedList" command={e => e.chain().focus().toggleOrderedList().run()} icon={ListOrdered} title="有序列表" />
        <ToolbarButton editor={editor} isActive="blockquote" command={e => e.chain().focus().toggleBlockquote().run()} icon={Quote} title="引用" />
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* 链接 & 图片 */}
      <ToolbarGroup>
        <div className="relative">
          <ToolbarButton
            editor={editor}
            isActive="link"
            command={() => setShowLinkDialog(p => !p)}
            icon={Link2}
            title="插入链接"
          />
          {showLinkDialog && <LinkDialog editor={editor} onClose={() => setShowLinkDialog(false)} />}
        </div>
        <div className="relative">
          <ToolbarButton
            editor={editor}
            isActive={() => false}
            command={() => setShowImageDialog(p => !p)}
            icon={ImagePlus}
            title="插入图片"
          />
          {showImageDialog && <ImageDialog editor={editor} onClose={() => setShowImageDialog(false)} />}
        </div>
      </ToolbarGroup>
    </div>
  )

  return (
    <div className={`border border-app rounded-xl overflow-hidden transition-colors
      ${error ? 'border-red-400 ring-1 ring-red-200' : 'focus-within:ring-2 focus-within:ring-primary-300/40'}
      ${className}`}>
      {Toolbar}
      <EditorContent editor={editor} />
    </div>
  )
}

/**
 * @file src/pages/WritePage.jsx
 * @description 发帖/编辑文章页面 — 所见即所得富文本编辑器
 */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { marked } from 'marked'
import { Save, Send, Sparkles, ImagePlus, Loader2, Copy } from 'lucide-react'
import { postsApi, categoriesApi, aiApi } from '@/api/index'
import { useTranslation } from '@/contexts/LanguageContext'
import RichTextEditor from '@/components/editor/RichTextEditor'
import toast from 'react-hot-toast'

/** 从 HTML 中提取纯文本 */
function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

export default function WritePage() {
  const { token } = useParams()
  const isEditing = !!token
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [fieldErrors, setFieldErrors] = useState({})
  const { t, lang } = useTranslation()
  const editorRef = useRef(null)

  const [form, setForm] = useState({
    title: '',
    content: '',
    summary: '',
    category_id: '',
    status: 'draft',
  })

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  })
  const categories = catData?.data || []

  // 编辑模式：根据 token 获取文章详情
  const { data: postData } = useQuery({
    queryKey: ['post-edit', token],
    queryFn: () => postsApi.getBySlug(token),
    enabled: isEditing,
  })

  useEffect(() => {
    if (postData) {
      const raw = postData?.data ?? postData
      const c = raw.content || ''
      // 如果是旧 Markdown（无 HTML 标签），用 marked 转为 HTML
      const html = /<[a-z][\s\S]*>/i.test(c) ? c : marked(c)
      setForm({
        title: raw.title || '',
        content: html,
        summary: raw.summary || '',
        category_id: raw.category_id || '',
        status: raw.status || 'draft',
      })
    }
  }, [postData])

  const createMutation = useMutation({ mutationFn: postsApi.create })
  const updateMutation = useMutation({ mutationFn: (data) => postsApi.update(token, data) })

  function handleSave(status = 'draft') {
    const errs = {}
    const title = form.title.trim()
    const plainText = stripHtml(form.content).trim()
    if (!title)               errs.title = t('validation.required') || '请输入标题'
    else if (title.length < 2) errs.title = t('validation.minLength', { min: 2 }) || '标题至少 2 个字符'
    else if (title.length > 200) errs.title = t('validation.maxLength', { min: 2, max: 200 }) || '标题最多 200 个字符'
    if (!plainText)               errs.content = t('validation.required') || '请输入正文'
    else if (plainText.length < 10) errs.content = t('validation.minLength', { min: 10 }) || '正文至少 10 个字符'
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    const payload = { ...form, status, category_id: form.category_id || null }
    const callbacks = {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['posts'] })
        toast.success(t('messages.saveSuccess'))
        if (!isEditing) {
          navigate(`/post/${data.data.url_token}`)
        } else {
          navigate(-1)
        }
      },
      onError: (err) => {
        const errors = err.response?.data?.errors
        if (errors?.length) {
          const mapped = {}
          errors.forEach(e => { if (e.field) mapped[e.field] = e.message })
          if (Object.keys(mapped).length) { setFieldErrors(mapped); return }
          toast.error(errors.map(e => e.message).join('；'))
        } else {
          toast.error(err.response?.data?.message || t('messages.error'))
        }
      },
    }
    if (isEditing) {
      updateMutation.mutate(payload, callbacks)
    } else {
      createMutation.mutate(payload, callbacks)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  // ── AI 功能 ──
  const [polishing, setPolishing] = useState(false)
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageGenerating, setImageGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState([])

  // AI 润色
  async function handlePolish() {
    const editor = editorRef.current
    if (!editor) return

    // 获取纯文本（优先选区）
    let textToPolish
    const { from, to } = editor.state.selection
    if (from !== to) {
      textToPolish = editor.state.doc.textBetween(from, to, ' ')
    } else {
      textToPolish = editor.getText()
    }

    if (!textToPolish.trim()) return toast.error(t('ai.noSelection'))
    if (textToPolish.length < 10) return toast.error(t('validation.minLength', { min: 10 }))

    setPolishing(true)
    try {
      const res = await aiApi.polish({ text: textToPolish, style: 'formal', lang })
      const polished = res.data?.polished
      if (polished) {
        if (from !== to) {
          // 替换选区
          editor.chain().focus().deleteRange({ from, to }).insertContent(polished).run()
        } else {
          // 替换全文
          editor.commands.setContent(`<p>${polished}</p>`)
        }
        toast.success(t('ai.polished'))
      }
    } catch (err) {
      const msg = err.response?.data?.message || t('messages.error')
      toast.error(msg)
    } finally {
      setPolishing(false)
    }
  }

  // AI 生图
  async function handleGenerateImage() {
    if (!imagePrompt.trim()) return toast.error(t('ai.imagePromptPlaceholder'))
    setImageGenerating(true)
    try {
      const res = await aiApi.generateImage({ prompt: imagePrompt, size: '1024x1024' })
      const { url, refinedPrompt } = res.data || {}

      if (url) {
        setGeneratedImages(prev => [{ url, prompt: imagePrompt, time: Date.now() }, ...prev].slice(0, 10))
        setImagePrompt('')
        toast.success(t('ai.imageGenerated'))
      } else if (refinedPrompt) {
        setGeneratedImages(prev => [{ refinedPrompt, prompt: imagePrompt, time: Date.now(), mode: 'chat' }, ...prev].slice(0, 10))
        setImagePrompt('')
        toast.success(t('ai.promptRefined') || 'AI 已生成精炼图片提示词')
      }
    } catch (err) {
      const msg = err.response?.data?.message || t('messages.error')
      toast.error(msg)
    } finally {
      setImageGenerating(false)
    }
  }

  // 插入图片到编辑器
  function insertImageToEditor(url, prompt) {
    const editor = editorRef.current
    if (editor) {
      editor.chain().focus().setImage({ src: url, alt: prompt?.substring(0, 50) || 'image' }).run()
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* 顶部工具栏 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <h1 className="text-xl font-serif font-semibold text-tx-heading">
          {isEditing ? t('post.editPost') : t('post.createPost')}
        </h1>

        <div className="flex items-center gap-2">
          {/* AI 润色 */}
          <button
            onClick={handlePolish}
            disabled={polishing}
            className="btn-ghost py-2 px-3 flex items-center gap-1.5 text-sm
                       text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20
                       border border-purple-200 dark:border-purple-700/50
                       rounded-xl transition-colors disabled:opacity-50"
            title={t('ai.polishHint')}
          >
            {polishing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {polishing ? t('ai.polishing') : t('ai.polish')}
          </button>

          <button
            onClick={() => handleSave('draft')}
            disabled={isLoading}
            className="btn-secondary py-2 px-4 flex items-center gap-1.5 text-sm"
          >
            <Save size={14} />
            {form.status === 'published' ? t('post.draft') : t('post.saveDraft')}
          </button>

          <button
            onClick={() => handleSave('published')}
            disabled={isLoading}
            className="btn-primary py-2 px-4 flex items-center gap-1.5 text-sm"
          >
            <Send size={14} />
            {form.status === 'published' ? t('common.edit') : t('post.publish')}
          </button>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* 主编辑区 */}
        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={form.title}
              onChange={(e) => {
                setForm(f => ({ ...f, title: e.target.value }))
                if (fieldErrors.title) setFieldErrors(p => ({ ...p, title: '' }))
              }}
              placeholder={t('post.titlePlaceholder')}
              className={`input text-xl font-serif py-3 placeholder:font-sans w-full ${fieldErrors.title ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : ''}`}
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <RichTextEditor
              value={form.content}
              onChange={(html) => {
                setForm(f => ({ ...f, content: html }))
                if (fieldErrors.content) setFieldErrors(p => ({ ...p, content: '' }))
              }}
              placeholder={t('post.contentPlaceholder')}
              error={!!fieldErrors.content}
              editorRef={editorRef}
            />
            {fieldErrors.content && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{fieldErrors.content}</p>
            )}
          </div>
        </div>

        {/* 右侧设置面板 */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-medium text-tx-body mb-3">{t('post.summary')}</h3>
            <textarea
              value={form.summary}
              onChange={(e) => setForm(f => ({ ...f, summary: e.target.value }))}
              placeholder={t('user.bioPlaceholder')}
              rows={3}
              className="input resize-none text-sm"
              maxLength={200}
            />
            <p className="text-xs text-tx-subtle mt-1">{form.summary.length}/200</p>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-medium text-tx-body mb-3">{t('post.category')}</h3>
            <select
              value={form.category_id}
              onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="input text-sm"
            >
              <option value="">{t('home.categoryAll')}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* AI 生图面板 */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-tx-body mb-3 flex items-center gap-1.5">
              <ImagePlus size={14} className="text-purple-500" />
              {t('ai.generateImage')}
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateImage()}
                placeholder={t('ai.imagePromptPlaceholder')}
                className="input text-sm flex-1"
              />
              <button
                onClick={handleGenerateImage}
                disabled={imageGenerating || !imagePrompt.trim()}
                className="btn-primary py-2 px-3 flex items-center gap-1 text-sm shrink-0
                           disabled:opacity-50"
              >
                {imageGenerating
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Sparkles size={14} />}
              </button>
            </div>

            {/* 已生成图片列表 */}
            {generatedImages.length > 0 && (
              <div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto">
                {generatedImages.map((img, i) => (
                  <div key={img.time} className="relative group">
                    {img.url ? (
                      <>
                        <img
                          src={img.url}
                          alt={img.prompt}
                          className="w-full rounded-lg border border-app"
                          loading="lazy"
                        />
                        <button
                          onClick={() => insertImageToEditor(img.url, img.prompt)}
                          className="absolute bottom-2 right-2 btn-primary py-1 px-2.5 text-xs
                                     shadow-lg opacity-0 group-hover:opacity-100 transition-opacity
                                     flex items-center gap-1"
                        >
                          <ImagePlus size={11} />
                          {t('ai.insertImage')}
                        </button>
                      </>
                    ) : img.refinedPrompt ? (
                      <div className="rounded-lg border border-purple-500/30 bg-purple-50 dark:bg-purple-900/10 p-3 relative">
                        <p className="text-xs text-tx-muted mb-1 font-medium">AI 精炼提示词</p>
                        <p className="text-sm text-tx-body leading-relaxed whitespace-pre-wrap break-words">{img.refinedPrompt}</p>
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={() => { navigator.clipboard.writeText(img.refinedPrompt); toast.success('已复制') }}
                            className="btn-ghost py-1 px-2 text-xs flex items-center gap-1
                                       opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy size={11} />
                            复制
                          </button>
                          <button
                            onClick={() => insertImageToEditor(img.refinedPrompt, img.prompt)}
                            className="btn-ghost py-1 px-2 text-xs flex items-center gap-1
                                       opacity-0 group-hover:opacity-100 transition-opacity
                                       text-purple-600 dark:text-purple-400"
                          >
                            <ImagePlus size={11} />
                            插入为图片
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

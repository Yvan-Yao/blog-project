/**
 * @file src/components/ui/CommentSection.jsx
 * @description 评论区组件 — 支持表情选择器、图片上传（含尺寸控制）
 */

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commentsApi } from '@/api/index'
import useAuthStore from '@/store/authStore'
import { MessageCircle, CornerDownRight, Trash2, Send, Smile, ImagePlus, X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/contexts/LanguageContext'
import { formatApiError } from '@/utils/apiError'

// ── 常用表情分组 ────────────────────────────
const EMOJI_GROUPS = {
  smileys: ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😋','😜','🤪','😝','🤗','🤔','🤨','😐','😶','🙄','😏','😒','😔','😴','😪','🤤','😷','🤒','🤕','🥺','😢','😭','😤','😡','🤬'],
  gestures: ['👍','👎','👏','🙌','🤝','💪','✌️','🤞','👌','🤟','👋','🙏','✍️','💅','👀','👁️','🧠','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💯','🔥','⭐','✨'],
  objects: ['🎉','🎊','🎈','🎁','🏆','🥇','📚','💡','🔑','💻','📱','⌨️','🖥️','🎵','🎶','☕','🍕','🍺','🌈','🌍','🌸','🌺','🌻','🍀','⛄','☀️','🌙','⚡','💧','🌀'],
  symbols: ['✅','❌','⚠️','🚫','❓','❗','💬','💭','🔗','📌','📍','📎','✂️','⏰','⌛','🔔','🔕','➡️','⬅️','⬆️','⬇️','🔄','➕','➖','1️⃣','2️⃣','3️⃣','💲','©️','™️'],
}

// ── 表情选择器组件 ──────────────────────────
function EmojiPicker({ onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute bottom-full left-0 mb-2 z-50 rounded-xl border shadow-xl p-3 w-72"
      style={{
        backgroundColor: 'hsl(var(--surface))',
        borderColor: 'hsl(var(--border))',
        opacity: 1,
      }}
    >
      {Object.entries(EMOJI_GROUPS).map(([group, emojis]) => (
        <div key={group} className="mb-2 last:mb-0">
          <div className="flex flex-wrap gap-1">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSelect(emoji)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:scale-125 transition-transform"
                style={{ backgroundColor: 'hsl(var(--primary) / 0.08)' }}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  )
}

// ── 单条评论展示 ────────────────────────────
function CommentItem({ comment, postId, onReply, onDelete, t, dateLocale, apiBase }) {
  const { user } = useAuthStore()
  const isAdminFn = useAuthStore((s) => s.isAdmin)
  const canDelete = user && (user.id === comment.author_id || isAdminFn())

  const dateStr = format(new Date(comment.created_at), 'M月d日 HH:mm', { locale: dateLocale })
  const imageUrl = comment.image ? `${apiBase}${comment.image}` : null

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full text-sm font-semibold flex-shrink-0 flex items-center justify-center mt-0.5"
        style={{
          backgroundColor: 'hsl(var(--primary) / 0.15)',
          color: 'hsl(var(--primary-700))',
        }}>
        {comment.author_name?.[0]?.toUpperCase() || 'U'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
            {comment.author_name}
          </span>
          <span className="text-xs" style={{ color: 'hsl(var(--muted-fg))' }}>{dateStr}</span>
        </div>

        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'hsl(var(--foreground))' }}>
          {comment.content}
        </p>

        {/* 评论附带的图片 */}
        {imageUrl && (
          <div className="mt-2">
            <img
              src={imageUrl}
              alt="评论图片"
              loading="lazy"
              style={{
                width: comment.image_width ? `${Math.min(comment.image_width, 400)}px` : 'auto',
                height: comment.image_height ? `${Math.min(comment.image_height, 400)}px` : 'auto',
                maxWidth: '100%',
              }}
              className="rounded-lg border"
            />
          </div>
        )}

        <div className="flex items-center gap-3 mt-2">
          {user && (
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'hsl(var(--muted-fg))' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--primary))' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-fg))' }}
            >
              <CornerDownRight size={11} />
              {t('post.reply')}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'hsl(var(--muted-fg))' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-fg))' }}
            >
              <Trash2 size={11} />
              {t('common.delete')}
            </button>
          )}
        </div>

        {comment.replies?.length > 0 && (
          <div className="mt-3 space-y-3 pl-3" style={{ borderLeft: '2px solid hsl(var(--border))' }}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                onReply={onReply}
                onDelete={onDelete}
                t={t}
                dateLocale={dateLocale}
                apiBase={apiBase}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 评论输入框（含表情 + 图片） ────────────
function CommentInput({ postId, parentComment, onCancel, onSuccess, t, apiBase }) {
  const [content, setContent] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [imageFile, setImageFile] = useState(null)     // 本地预览 URL
  const [imageWidth, setImageWidth] = useState('')
  const [imageHeight, setImageHeight] = useState('')
  const [uploadedUrl, setUploadedUrl] = useState(null) // 服务器返回的 URL
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data) => commentsApi.create(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      setContent('')
      setImageFile(null)
      setUploadedUrl(null)
      setImageWidth('')
      setImageHeight('')
      onSuccess?.()
      toast.success(parentComment ? t('post.replySuccess') : t('post.commentSuccess'))
    },
    onError: (err) => {
      toast.error(formatApiError(err, t('messages.error')))
    },
  })

  /** 在光标位置插入文本 */
  function insertAtCursor(text) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const before = content.substring(0, start)
    const after = content.substring(end)
    setContent(before + text + after)
    // 恢复光标位置
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + text.length
      el.setSelectionRange(pos, pos)
    })
  }

  /** 选择表情 */
  function handleEmojiSelect(emoji) {
    insertAtCursor(emoji)
    setShowEmoji(false)
    textareaRef.current?.focus()
  }

  /** 选择图片 */
  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // 校验类型
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error(t('post.imageSizeHint'))
      return
    }

    // 校验大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB')
      return
    }

    // 本地预览
    const previewUrl = URL.createObjectURL(file)
    setImageFile(previewUrl)
    setUploadedUrl(null)
    setImageWidth('')
    setImageHeight('')

    // 上传到服务器
    setUploading(true)
    const formData = new FormData()
    formData.append('image', file)

    commentsApi.uploadImage(formData)
      .then((res) => {
        setUploadedUrl(res.data.url)
        // 读取原始尺寸
        const img = new Image()
        img.onload = () => {
          setImageWidth(String(img.naturalWidth))
          setImageHeight(String(img.naturalHeight))
        }
        img.src = previewUrl
      })
      .catch((err) => {
        const msg = err.response?.data?.message || '上传失败'
        toast.error(msg)
        setImageFile(null)
      })
      .finally(() => setUploading(false))
  }

  /** 移除图片 */
  function handleRemoveImage() {
    setImageFile(null)
    setUploadedUrl(null)
    setImageWidth('')
    setImageHeight('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return toast.error('请输入内容')

    mutation.mutate({
      content: content.trim(),
      parent_id: parentComment?.id || null,
      image: uploadedUrl || null,
      image_width: imageWidth || null,
      image_height: imageHeight || null,
    })
  }

  // 点击外部关闭表情面板
  const emojiContainerRef = useRef(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3"
    >
      {parentComment && (
        <p className="text-xs mb-2" style={{ color: 'hsl(var(--muted-fg))' }}>
          回复 <span className="font-medium" style={{ color: 'hsl(var(--primary))' }}>
            @{parentComment.author_name}
          </span>
        </p>
      )}

      {/* 图片预览区 */}
      {imageFile && (
        <div className="mb-3 flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <img
              src={imageFile}
              alt="预览"
              className="w-24 h-24 object-cover rounded-lg border"
              style={{ borderColor: 'hsl(var(--border))' }}
            />
            {uploading && (
              <div className="absolute inset-0 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'hsl(var(--bg) / 0.7)' }}>
                <Loader2 size={20} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            {/* 宽高控制 */}
            <div className="flex items-center gap-2">
              <label className="text-xs flex-shrink-0" style={{ color: 'hsl(var(--muted-fg))' }}>
                {t('post.imageWidth')}
              </label>
              <input
                type="number"
                value={imageWidth}
                onChange={(e) => setImageWidth(e.target.value)}
                placeholder="auto"
                min="1"
                max="4096"
                className="input text-xs py-1 px-2 w-20"
              />
              <label className="text-xs flex-shrink-0" style={{ color: 'hsl(var(--muted-fg))' }}>
                {t('post.imageHeight')}
              </label>
              <input
                type="number"
                value={imageHeight}
                onChange={(e) => setImageHeight(e.target.value)}
                placeholder="auto"
                min="1"
                max="4096"
                className="input text-xs py-1 px-2 w-20"
              />
              <span className="text-xs ml-1" style={{ color: 'hsl(var(--muted-fg))' }}>px</span>
            </div>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: '#ef4444' }}
            >
              <X size={12} />
              {t('post.removeImage')}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={parentComment
              ? t('post.replyPlaceholder', { username: parentComment.author_name })
              : t('post.commentPlaceholder')}
            rows={3}
            className="input resize-none text-sm w-full"
            maxLength={1000}
          />

          {/* 工具栏 */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1" ref={emojiContainerRef}>
            {/* 表情按钮 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmoji(!showEmoji)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'hsl(var(--muted-fg))' }}
                title={t('post.emoji')}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <Smile size={16} />
              </button>
              <AnimatePresence>
                {showEmoji && (
                  <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
                )}
              </AnimatePresence>
            </div>

            {/* 图片按钮 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'hsl(var(--muted-fg))' }}
              title={t('post.addImage')}
              disabled={uploading}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <ImagePlus size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* 字数统计 */}
            <span className="text-xs ml-auto" style={{ color: 'hsl(var(--muted-fg))' }}>
              {content.length}/1000
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-5">
          <button type="submit" disabled={mutation.isPending || uploading}
            className="btn-primary py-2 px-3 flex items-center gap-1 text-sm">
            <Send size={13} />
            {mutation.isPending ? t('common.sending') : t('common.send')}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="btn-secondary py-2 px-3 text-sm">{t('common.cancel')}</button>
          )}
        </div>
      </form>
    </motion.div>
  )
}

// ── 主评论区组件 ────────────────────────────
export default function CommentSection({ postId }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [replyTarget, setReplyTarget] = useState(null)
  const { t, lang } = useTranslation()
  const dateLocale = lang === 'zh' ? zhCN : enUS
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  const { data, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => commentsApi.getByPost(postId),
  })

  const comments = data?.data || []

  const deleteMutation = useMutation({
    mutationFn: commentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      toast.success(t('messages.deleteSuccess'))
    },
  })

  function handleDelete(commentId) {
    if (window.confirm(t('admin.deleteCommentConfirm'))) {
      deleteMutation.mutate(commentId)
    }
  }

  return (
    <section>
      <h3 className="flex items-center gap-2 text-lg font-serif font-semibold mb-6"
        style={{ color: 'hsl(var(--foreground))' }}>
        <MessageCircle size={18} style={{ color: 'hsl(var(--primary))' }} />
        {t('post.comments')}
        {comments.length > 0 && (
          <span style={{ color: 'hsl(var(--primary))' }}>({comments.length})</span>
        )}
      </h3>

      {user ? (
        <div className="rounded-2xl p-4 border mb-6"
          style={{
            backgroundColor: 'hsl(var(--surface))',
            borderColor: 'hsl(var(--border))',
          }}>
          <CommentInput postId={postId} t={t} apiBase={apiBase} onSuccess={() => setReplyTarget(null)} />
        </div>
      ) : (
        <div className="rounded-2xl p-4 mb-6 text-center"
          style={{ backgroundColor: 'hsl(var(--primary) / 0.08)' }}>
          <p className="text-sm" style={{ color: 'hsl(var(--muted-fg))' }}>
            <Link to="/login" className="font-medium hover:underline"
              style={{ color: 'hsl(var(--primary))' }}>
              {t('nav.login')}
            </Link>
            {t('post.loginToComment')}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'hsl(var(--muted-fg))' }}>
          <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t('post.noComments')}</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-5">
            {comments.map((comment, i) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-4 border transition-all duration-200"
                style={{
                  backgroundColor: 'hsl(var(--surface))',
                  borderColor: 'hsl(var(--border))',
                }}
              >
                <CommentItem
                  comment={comment}
                  postId={postId}
                  onReply={setReplyTarget}
                  onDelete={handleDelete}
                  t={t}
                  dateLocale={dateLocale}
                  apiBase={apiBase}
                />
                {replyTarget?.id === comment.id && (
                  <div className="pl-11 mt-2">
                    <CommentInput
                      postId={postId}
                      parentComment={replyTarget}
                      onCancel={() => setReplyTarget(null)}
                      onSuccess={() => setReplyTarget(null)}
                      t={t}
                      apiBase={apiBase}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </section>
  )
}

/**
 * @file src/pages/admin/AdminCommentsPage.jsx
 * @description 评论管理页面（Admin 专用）
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trash2, ExternalLink } from 'lucide-react'
import { adminApi } from '@/api/index'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import client from '@/api/client'
import { useTranslation } from '@/contexts/LanguageContext'

export default function AdminCommentsPage() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  // 获取所有评论（通过各文章获取，此处简化为直接调用后端）
  const { data, isLoading } = useQuery({
    queryKey: ['admin-comments'],
    queryFn: () => client.get('/admin/comments').catch(() => ({ data: [] })),
  })

  // 简化处理：如果没有专用接口，展示提示
  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-comments'] })
      toast.success(t('messages.deleteSuccess'))
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold text-tx-heading mb-6">{t('admin.manageComments')}</h1>

      <div className="card p-6">
        <div className="flex items-center gap-3 text-tx-muted py-8 justify-center">
          <p className="text-sm">
            {t('admin.commentsDesc')}
          </p>
        </div>
        <div className="text-center">
          <a href="/" target="_blank" rel="noreferrer"
            className="btn-primary inline-flex items-center gap-2">
            <ExternalLink size={14} />
            {t('admin.goToBlog')}
          </a>
        </div>
      </div>
    </div>
  )
}

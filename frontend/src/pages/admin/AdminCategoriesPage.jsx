/**
 * @file src/pages/admin/AdminCategoriesPage.jsx
 * @description 分类管理页面（Admin 专用）
 * 功能：查看所有分类、创建、编辑、删除分类（含颜色选择器）
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, Plus, Pencil, Trash2, Check, X, Palette } from 'lucide-react'
import { categoriesApi } from '@/api/index'
import toast from 'react-hot-toast'
import { useTranslation } from '@/contexts/LanguageContext'

const PRESET_COLORS = [
  '#4ade80', '#34d399', '#10b981', '#059669',  // greens
  '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8',  // blues
  '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9',  // purples
  '#fb923c', '#f97316', '#ea580c', '#c2410c',  // oranges
  '#f87171', '#ef4444', '#dc2626', '#b91c1c',  // reds
  '#facc15', '#eab308', '#ca8a04', '#a16207',  // yellows
  '#f472b6', '#ec4899', '#db2777', '#be185d',  // pinks
  '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e',  // teals
]

/** 分类表单组件（创建 & 编辑共用） */
function CategoryForm({ category, onSave, onCancel, isSaving, error }) {
  const { t } = useTranslation()
  const [name, setName] = useState(category?.name || '')
  const [slug, setSlug] = useState(category?.slug || '')
  const [description, setDescription] = useState(category?.description || '')
  const [color, setColor] = useState(category?.color || '#4ade80')
  const [showColorPicker, setShowColorPicker] = useState(false)

  const handleNameBlur = () => {
    if (slug || category?.slug) return
    const generated = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    setSlug(generated)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ name, slug, description, color })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-tx-muted mb-1">{t('admin.categoryName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder={t('admin.categoryNamePlaceholder')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-app
                       focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300
                       transition-colors"
            autoFocus
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-tx-muted mb-1">
            {t('admin.categorySlug')}
            <span className="font-normal text-tx-subtle ml-1">({t('admin.categorySlugHint')})</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder={t('admin.categorySlugPlaceholder')}
            pattern="^[a-z0-9-]+$"
            className="w-full px-3 py-2 text-sm rounded-lg border border-app
                       focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300
                       transition-colors font-mono"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-tx-muted mb-1">{t('admin.categoryDescription')}</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('admin.categoryDescriptionPlaceholder')}
          className="w-full px-3 py-2 text-sm rounded-lg border border-app
                     focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300
                     transition-colors"
        />
      </div>

      {/* 颜色选择器 */}
      <div>
        <label className="block text-xs font-medium text-tx-muted mb-2">{t('admin.categoryColor')}</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-lg border-2 transition-all duration-200
                ${color === c
                  ? 'border-gray-800 scale-110 shadow-md'
                  : 'border-transparent hover:scale-105 hover:shadow-sm'}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          {/* 自定义颜色按钮 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`w-7 h-7 rounded-lg border-2 transition-all duration-200 flex items-center justify-center
                ${showColorPicker ? 'border-gray-800' : 'border-app hover:border-gray-400'}`}
            >
              <Palette size={12} className="text-tx-subtle" />
            </button>
            {showColorPicker && (
              <div className="absolute top-10 left-0 z-10 glass p-2 rounded-xl border border-app shadow-xl">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                />
              </div>
            )}
          </div>
          {!PRESET_COLORS.includes(color) && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surf-muted text-xs text-tx-body">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              {color}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary py-1.5 px-4 text-sm flex items-center gap-1.5"
        >
          <Check size={14} />
          {isSaving ? t('common.saving') || '...' : t('admin.saveCategory')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary py-1.5 px-4 text-sm flex items-center gap-1.5"
        >
          <X size={14} />
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

export default function AdminCategoriesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  // 获取分类列表
  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: categoriesApi.getAll,
  })

  const categories = data?.data || []

  // 创建分类
  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setShowCreate(false)
      setFormError('')
      toast.success(t('messages.saveSuccess'))
    },
    onError: (err) => {
      setFormError(err?.response?.data?.message || t('messages.error'))
    },
  })

  // 更新分类
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setEditingId(null)
      setFormError('')
      toast.success(t('messages.saveSuccess'))
    },
    onError: (err) => {
      setFormError(err?.response?.data?.message || t('messages.error'))
    },
  })

  // 删除分类
  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(t('messages.deleteSuccess'))
    },
    onError: () => {
      toast.error(t('messages.error'))
    },
  })

  return (
    <div>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-serif font-semibold text-tx-heading">
          {t('admin.manageCategories')}
          <span className="text-sm font-sans text-tx-muted ml-1">
            {t('common.total', { count: categories.length })}
          </span>
        </h1>
        <button
          onClick={() => { setShowCreate(!showCreate); setFormError('') }}
          className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5"
        >
          <Plus size={16} />
          {t('admin.createCategory')}
        </button>
      </div>

      {/* 新建分类表单 */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="card p-5 border-2 border-primary-200 bg-primary-50/30">
              <h3 className="text-sm font-medium text-tx-body mb-3">{t('admin.createCategory')}</h3>
              <CategoryForm
                category={null}
                onSave={(data) => createMutation.mutate(data)}
                onCancel={() => setShowCreate(false)}
                isSaving={createMutation.isPending}
                error={formError}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 分类列表 */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-lg" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <Tag size={36} className="mx-auto mb-3 text-tx-subtle" />
            <p className="text-tx-muted text-sm">{t('admin.noCategories')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                {editingId === cat.id ? (
                  <div className="p-5 bg-primary-50/20">
                    <h3 className="text-sm font-medium text-tx-body mb-3">{t('admin.editCategory')}</h3>
                    <CategoryForm
                      category={cat}
                      onSave={(data) => updateMutation.mutate({ id: cat.id, data })}
                      onCancel={() => { setEditingId(null); setFormError('') }}
                      isSaving={updateMutation.isPending}
                      error={formError}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-surf-muted/50 transition-colors group">
                    {/* 颜色指示器 */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1"
                      style={{ backgroundColor: cat.color, '--tw-ring-color': cat.color + '40' }}
                    />

                    {/* 分类信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-tx-heading text-sm">{cat.name}</span>
                        <span className="text-xs text-tx-subtle font-mono">{cat.slug}</span>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-tx-muted mt-0.5 truncate">{cat.description}</p>
                      )}
                    </div>

                    {/* 文章数 */}
                    <span className="text-xs text-tx-subtle whitespace-nowrap">
                      {cat.post_count ?? 0} {t('admin.postCount')}
                    </span>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(cat.id); setFormError('') }}
                        title={t('common.edit')}
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(t('admin.deleteCategoryConfirm', { name: cat.name }))) {
                            deleteMutation.mutate(cat.id)
                          }
                        }}
                        title={t('common.delete')}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

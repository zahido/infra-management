'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { isAuthenticated } from '@/lib/auth'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CloudIcon,
  ServerIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

// ── Types ─────────────────────────────────────────────────────────────────────
interface OptionItem {
  id: string
  name: string
  created_at: string
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  return (
    <Layout>
      {/* Page Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage dropdown options used across the server management forms.
        </p>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OptionsCard
          title="Environments"
          description="Deployment environments available when adding or editing servers."
          icon={<CloudIcon className="h-5 w-5 text-emerald-600" />}
          color="emerald"
          fetchUrl="/api/environments"
          createUrl="/api/environments"
          updateUrl={(id) => `/api/environments/${id}`}
          deleteUrl={(id) => `/api/environments/${id}`}
          responseKey="environments"
          placeholder="e.g. Production"
          duplicateLabel="environment"
        />
        <OptionsCard
          title="Physical Servers"
          description="Physical host machines that virtual servers can be assigned to."
          icon={<ServerIcon className="h-5 w-5 text-blue-600" />}
          color="blue"
          fetchUrl="/api/physical-servers"
          createUrl="/api/physical-servers"
          updateUrl={(id) => `/api/physical-servers/${id}`}
          deleteUrl={(id) => `/api/physical-servers/${id}`}
          responseKey="physical_servers"
          placeholder="e.g. ESXI-06"
          duplicateLabel="physical server"
        />
      </div>
    </Layout>
  )
}

// ── Options Card ──────────────────────────────────────────────────────────────
interface OptionsCardProps {
  title: string
  description: string
  icon: React.ReactNode
  color: 'emerald' | 'blue'
  fetchUrl: string
  createUrl: string
  updateUrl: (id: string) => string
  deleteUrl: (id: string) => string
  responseKey: string
  placeholder: string
  duplicateLabel: string
}

function OptionsCard({
  title, description, icon, color,
  fetchUrl, createUrl, updateUrl, deleteUrl,
  responseKey, placeholder, duplicateLabel,
}: OptionsCardProps) {
  const [items, setItems]               = useState<OptionItem[]>([])
  const [loading, setLoading]           = useState(true)
  const [addValue, setAddValue]         = useState('')
  const [addError, setAddError]         = useState('')
  const [adding, setAdding]             = useState(false)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [editValue, setEditValue]       = useState('')
  const [editError, setEditError]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<OptionItem | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)

  const colors = {
    emerald: {
      badge:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      addBtn:    'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
      saveBtn:   'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700',
      headerBar: 'from-emerald-600 to-teal-600',
      countBg:   'bg-emerald-500/20 text-emerald-100',
      iconBg:    'bg-emerald-50',
      editRing:  'focus:ring-emerald-500 focus:border-emerald-400',
    },
    blue: {
      badge:     'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
      addBtn:    'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      saveBtn:   'text-blue-600 hover:bg-blue-50 hover:text-blue-700',
      headerBar: 'from-blue-600 to-indigo-600',
      countBg:   'bg-blue-500/20 text-blue-100',
      iconBg:    'bg-blue-50',
      editRing:  'focus:ring-blue-500 focus:border-blue-400',
    },
  }[color]

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(fetchUrl)
      setItems(res.data[responseKey] || [])
    } catch {
      toast.error(`Failed to load ${title.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }, [fetchUrl, responseKey, title])

  useEffect(() => { fetchItems() }, [fetchItems])

  // Focus edit input when edit mode activates
  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  const startEdit = (item: OptionItem) => {
    setEditingId(item.id)
    setEditValue(item.name)
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
    setEditError('')
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = addValue.trim()
    if (!name) { setAddError('Name cannot be empty'); return }
    if (items.some(i => i.name.toLowerCase() === name.toLowerCase())) {
      setAddError(`This ${duplicateLabel} name already exists`)
      return
    }
    setAdding(true)
    setAddError('')
    try {
      const res = await api.post(createUrl, { name })
      setItems(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)))
      setAddValue('')
      toast.success(`${title.slice(0, -1)} added`)
    } catch (err: any) {
      const msg = err?.response?.data?.error
      if (err?.response?.status === 409 || msg?.toLowerCase().includes('already exists')) {
        setAddError(`This ${duplicateLabel} name already exists`)
      } else {
        toast.error(msg || `Failed to add ${duplicateLabel}`)
      }
    } finally {
      setAdding(false)
    }
  }

  const handleSaveEdit = async (id: string) => {
    const name = editValue.trim()
    if (!name) { setEditError('Name cannot be empty'); return }

    // Client-side duplicate check — skip the item being edited
    if (items.some(i => i.id !== id && i.name.toLowerCase() === name.toLowerCase())) {
      setEditError(`This ${duplicateLabel} name already exists`)
      return
    }

    // No change — just cancel
    const current = items.find(i => i.id === id)
    if (current?.name === name) { cancelEdit(); return }

    setSaving(true)
    setEditError('')
    try {
      await api.put(updateUrl(id), { name })
      setItems(prev =>
        prev.map(i => i.id === id ? { ...i, name } : i)
            .sort((a, b) => a.name.localeCompare(b.name))
      )
      toast.success(`${title.slice(0, -1)} updated`)
      cancelEdit()
    } catch (err: any) {
      const msg = err?.response?.data?.error
      if (err?.response?.status === 409 || msg?.toLowerCase().includes('already exists')) {
        setEditError(`This ${duplicateLabel} name already exists`)
      } else {
        toast.error(msg || `Failed to update ${duplicateLabel}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(deleteUrl(deleteTarget.id))
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id))
      toast.success(`${title.slice(0, -1)} deleted`)
      setDeleteTarget(null)
    } catch {
      toast.error(`Failed to delete ${duplicateLabel}`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col">

        {/* Card Header */}
        <div className={`px-5 py-4 bg-gradient-to-r ${colors.headerBar}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">{icon}</div>
              <div>
                <h2 className="text-sm font-bold text-white">{title}</h2>
                <p className="text-xs text-white/70 mt-0.5 max-w-[230px]">{description}</p>
              </div>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.countBg}`}>
              {loading ? '…' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Add Form */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <form onSubmit={handleAdd} className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={addValue}
                onChange={e => { setAddValue(e.target.value); setAddError('') }}
                placeholder={placeholder}
                disabled={adding}
                className={`w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 transition-colors ${
                  addError
                    ? 'border-red-400 focus:ring-red-300 bg-red-50 text-red-900 placeholder-red-300'
                    : `border-slate-200 ${colors.editRing} bg-white text-slate-900 placeholder-slate-400`
                }`}
              />
              {addError && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                  {addError}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={adding || !addValue.trim()}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${colors.addBtn}`}
            >
              {adding
                ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                : <PlusIcon className="h-4 w-4" />
              }
              Add
            </button>
          </form>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto max-h-[420px]">
          {loading ? (
            <div className="px-5 py-4 space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between py-2">
                  <div className="h-7 w-32 bg-slate-100 rounded-lg" />
                  <div className="flex gap-2">
                    <div className="h-7 w-7 bg-slate-100 rounded-lg" />
                    <div className="h-7 w-7 bg-slate-100 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-4">
              <div className={`h-11 w-11 rounded-full ${colors.iconBg} flex items-center justify-center mb-3`}>
                {icon}
              </div>
              <p className="text-sm font-medium text-slate-700">No {title.toLowerCase()} yet</p>
              <p className="text-xs text-slate-400 mt-1">Add your first one using the form above.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {items.map((item, idx) => (
                <li key={item.id} className="group">
                  {editingId === item.id ? (
                    /* ── Inline edit row ── */
                    <div className="flex items-start gap-2 px-5 py-2.5 bg-slate-50">
                      <span className="text-xs text-slate-400 font-mono w-5 shrink-0 mt-2.5">{idx + 1}</span>
                      <div className="flex-1">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={e => { setEditValue(e.target.value); setEditError('') }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit(item.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          disabled={saving}
                          className={`w-full rounded-lg px-3 py-1.5 text-sm border focus:outline-none focus:ring-2 transition-colors ${
                            editError
                              ? 'border-red-400 focus:ring-red-300 bg-red-50 text-red-900'
                              : `border-slate-300 ${colors.editRing} bg-white text-slate-900`
                          }`}
                        />
                        {editError && (
                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            <ExclamationTriangleIcon className="h-3 w-3 shrink-0" />
                            {editError}
                          </p>
                        )}
                      </div>
                      {/* Save */}
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        disabled={saving || !editValue.trim()}
                        className={`mt-0.5 p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${colors.saveBtn}`}
                        title="Save"
                      >
                        {saving
                          ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                          : <CheckIcon className="h-4 w-4" />
                        }
                      </button>
                      {/* Cancel */}
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="mt-0.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40"
                        title="Cancel"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    /* ── Normal row ── */
                    <div className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-slate-400 font-mono w-5 shrink-0">{idx + 1}</span>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full truncate max-w-[200px] ${colors.badge}`}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {/* Edit */}
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title={`Edit ${item.name}`}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title={`Delete ${item.name}`}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {!loading && items.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircleIcon className="h-3.5 w-3.5 text-slate-300" />
              {items.length} {title.toLowerCase()} configured
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          type={title.slice(0, -1)}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => !deleting && setDeleteTarget(null)}
        />
      )}
    </>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({
  name, type, loading, onConfirm, onCancel,
}: {
  name: string
  type: string
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!loading ? onCancel : undefined}
      />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-500" />

        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 flex items-center justify-center h-11 w-11 rounded-full bg-red-50 ring-4 ring-red-50">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete {type}</h3>
              <p className="mt-1 text-sm text-slate-500">
                Are you sure you want to remove this {type.toLowerCase()}?
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 shrink-0">Name</span>
              <span className="text-sm font-semibold text-slate-900 truncate">{name}</span>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400 text-center">
            Servers already using this value won&apos;t be affected, but it will no longer appear in the dropdown.
          </p>
        </div>

        <div className="px-6 pb-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Deleting…
              </>
            ) : (
              <>
                <TrashIcon className="h-4 w-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

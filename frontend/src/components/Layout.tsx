'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUserData, removeAuthToken } from '@/lib/auth'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
  ServerStackIcon, ArrowRightStartOnRectangleIcon, Cog6ToothIcon,
  LockClosedIcon, EyeIcon, EyeSlashIcon, XMarkIcon, ShieldCheckIcon,
  ExclamationCircleIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface LayoutProps {
  children: ReactNode
}

function passwordStrength(pwd: string): { level: 0 | 1 | 2 | 3; label: string; color: string; bg: string } {
  if (pwd.length === 0) return { level: 0, label: '', color: '', bg: 'bg-slate-200' }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { level: 1, label: 'Weak', color: 'text-red-500', bg: 'bg-red-400' }
  if (score === 2) return { level: 2, label: 'Medium', color: 'text-amber-500', bg: 'bg-amber-400' }
  return { level: 3, label: 'Strong', color: 'text-emerald-500', bg: 'bg-emerald-500' }
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const strength = passwordStrength(form.new_password)

  const errors: Record<string, string> = {}
  if (!form.current_password) errors.current_password = 'Current password is required'
  if (!form.new_password) errors.new_password = 'New password is required'
  else if (form.new_password.length < 6) errors.new_password = 'Must be at least 6 characters'
  if (!form.confirm_password) errors.confirm_password = 'Please confirm your new password'
  else if (form.new_password !== form.confirm_password) errors.confirm_password = 'Passwords do not match'

  const fieldError = (name: string) => submitAttempted && errors[name] ? errors[name] : null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    if (Object.keys(errors).length > 0) return
    setLoading(true)
    try {
      await api.post('/api/auth/change-password', form)
      toast.success('Password changed successfully')
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const toggleKey = (key: keyof typeof show) => setShow(p => ({ ...p, [key]: !p[key] }))

  const inputBase = (name: string) =>
    `w-full rounded-xl px-4 py-3 text-sm border bg-white focus:outline-none focus:ring-2 transition-all pr-11 ${
      fieldError(name)
        ? 'border-red-300 focus:ring-red-200 text-red-900 placeholder-red-300'
        : 'border-slate-200 focus:ring-blue-200 focus:border-blue-400 text-slate-800'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 rounded-xl">
                <ShieldCheckIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Change Password</h3>
                <p className="text-xs text-slate-300 mt-0.5">Update your account password</p>
              </div>
            </div>
            <button
              type="button" onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate autoComplete="off" className="px-6 py-6 space-y-5">

          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={show.current ? 'text' : 'password'}
                name="current_password"
                value={form.current_password}
                onChange={handleChange}
                placeholder="Enter current password"
                autoComplete="current-password"
                className={inputBase('current_password')}
              />
              <button type="button" onClick={() => toggleKey('current')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600">
                {show.current ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {fieldError('current_password') && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('current_password')}
              </p>
            )}
          </div>

          <div className="border-t border-slate-100" />

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={show.next ? 'text' : 'password'}
                name="new_password"
                value={form.new_password}
                onChange={handleChange}
                placeholder="Enter new password"
                autoComplete="new-password"
                className={inputBase('new_password')}
              />
              <button type="button" onClick={() => toggleKey('next')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600">
                {show.next ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {fieldError('new_password') && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('new_password')}
              </p>
            )}

            {/* Strength meter */}
            {form.new_password.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      strength.level >= i ? strength.bg : 'bg-slate-200'
                    }`} />
                  ))}
                </div>
                <p className={`text-xs font-medium ${strength.color}`}>{strength.label} password</p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={show.confirm ? 'text' : 'password'}
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className={inputBase('confirm_password')}
              />
              <button type="button" onClick={() => toggleKey('confirm')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600">
                {show.confirm ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {fieldError('confirm_password') && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('confirm_password')}
              </p>
            )}
            {!fieldError('confirm_password') && form.confirm_password && form.new_password === form.confirm_password && (
              <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />Passwords match
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-2">
              {loading ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>Updating…</>
              ) : (
                <><ShieldCheckIcon className="h-4 w-4" />Update Password</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [showChangePassword, setShowChangePassword] = useState(false)

  useEffect(() => {
    setUser(getUserData())
  }, [])

  const handleLogout = () => {
    removeAuthToken()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??'

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg border-b border-slate-700">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-blue-600 shadow-md">
                <ServerStackIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-base tracking-tight">InfraManage</span>
                <span className="hidden sm:block text-slate-400 text-xs leading-none mt-0.5">
                  Server Management Console
                </span>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* User badge */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-xs font-bold shadow">
                  {initials}
                </div>
                <div className="hidden sm:block">
                  <p className="text-white text-sm font-medium leading-tight">{user?.username}</p>
                  <p className="text-slate-400 text-xs leading-tight">Administrator</p>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-600" />

              <button
                onClick={() => setShowChangePassword(true)}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm font-medium transition-colors px-2 py-1.5 rounded-lg hover:bg-white/10"
                title="Change Password"
              >
                <LockClosedIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Password</span>
              </button>

              <div className="h-6 w-px bg-slate-600" />

              <button
                onClick={() => router.push(pathname === '/settings' ? '/dashboard' : '/settings')}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors px-2 py-1.5 rounded-lg ${
                  pathname === '/settings'
                    ? 'text-white bg-white/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Settings"
              >
                <Cog6ToothIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>

              <div className="h-6 w-px bg-slate-600" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm font-medium transition-colors px-2 py-1.5 rounded-lg hover:bg-white/10"
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto py-7 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  )
}

'use client'

import { Toaster, toast, type Toast } from 'react-hot-toast'

// ── Per-type config ───────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  success: {
    label:      'Success',
    bar:        'bg-emerald-500',
    ring:       'ring-emerald-100',
    iconBg:     'bg-emerald-50',
    iconColor:  'text-emerald-500',
    labelColor: 'text-emerald-800',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    label:      'Error',
    bar:        'bg-red-500',
    ring:       'ring-red-100',
    iconBg:     'bg-red-50',
    iconColor:  'text-red-500',
    labelColor: 'text-red-800',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  loading: {
    label:      'Loading',
    bar:        'bg-blue-500',
    ring:       'ring-blue-100',
    iconBg:     'bg-blue-50',
    iconColor:  'text-blue-500',
    labelColor: 'text-blue-800',
    icon: (
      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    ),
  },
  blank: {
    label:      'Info',
    bar:        'bg-slate-400',
    ring:       'ring-slate-200',
    iconBg:     'bg-slate-50',
    iconColor:  'text-slate-500',
    labelColor: 'text-slate-800',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
} as const

// ── Custom toast card ─────────────────────────────────────────────────────────
function ToastCard({ t }: { t: Toast }) {
  const type   = (t.type === 'custom' ? 'blank' : t.type) as keyof typeof TYPE_CONFIG
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.blank

  // Extract plain string from message (supports string | JSX | function)
  const message =
    typeof t.message === 'function'
      ? String(t.message(t))
      : typeof t.message === 'string'
      ? t.message
      : ''

  return (
    <div
      style={{
        opacity:    t.visible ? 1 : 0,
        transform:  t.visible ? 'translateX(0) scale(1)' : 'translateX(20px) scale(0.97)',
        transition: 'opacity 200ms ease, transform 200ms ease',
      }}
      className="w-[360px] bg-white rounded-xl shadow-xl ring-1 ring-slate-200 overflow-hidden"
    >
      {/* Coloured top accent bar */}
      <div className={`h-1 w-full ${config.bar}`} />

      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Icon badge */}
        <div className={`flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full ${config.iconBg} ${config.iconColor} mt-0.5`}>
          {config.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className={`text-sm font-semibold leading-tight ${config.labelColor}`}>
            {config.label}
          </p>
          {message && (
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed break-words">
              {message}
            </p>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => toast.dismiss(t.id)}
          className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors mt-0.5"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      {t.type !== 'loading' && (
        <div className="h-0.5 bg-slate-100">
          <div
            className={`h-full ${config.bar} opacity-30`}
            style={{
              animation: `shrink ${t.duration ?? 4000}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────
export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerStyle={{ top: 20, right: 20 }}
      toastOptions={{
        duration: 4000,
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
          maxWidth: '360px',
        },
      }}
    >
      {(t) => <ToastCard t={t} />}
    </Toaster>
  )
}

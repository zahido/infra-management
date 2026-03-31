'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserData, removeAuthToken } from '@/lib/auth'
import toast from 'react-hot-toast'
import { ServerStackIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

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
    </div>
  )
}

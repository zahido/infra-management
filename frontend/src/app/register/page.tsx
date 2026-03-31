import { redirect } from 'next/navigation'

export default function Register() {
  redirect('/login')
}

// ── Registration UI (reserved for future use) ─────────────────────────────────
//
// 'use client'
//
// import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation'
// import { useForm } from 'react-hook-form'
// import Link from 'next/link'
// import toast from 'react-hot-toast'
// import api from '@/lib/api'
// import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
// import { User, Mail, Lock, Eye, EyeOff, UserPlus, ArrowRight } from 'lucide-react'
//
// interface RegisterForm {
//   username: string
//   email: string
//   password: string
//   confirmPassword: string
// }
//
// export default function Register() {
//   const [isLoading, setIsLoading] = useState(false)
//   const [showPassword, setShowPassword] = useState(false)
//   const [showConfirm, setShowConfirm] = useState(false)
//   const [apiError, setApiError] = useState<string | null>(null)
//   const router = useRouter()
//   const {
//     register,
//     handleSubmit,
//     watch,
//     formState: { errors },
//   } = useForm<RegisterForm>()
//
//   const passwordValue = watch('password')
//
//   const mouseX = useMotionValue(0)
//   const mouseY = useMotionValue(0)
//   const springX = useSpring(mouseX, { stiffness: 50, damping: 20 })
//   const springY = useSpring(mouseY, { stiffness: 50, damping: 20 })
//
//   useEffect(() => {
//     const handleMouseMove = (e: MouseEvent) => {
//       mouseX.set(e.clientX)
//       mouseY.set(e.clientY)
//     }
//     window.addEventListener('mousemove', handleMouseMove)
//     return () => window.removeEventListener('mousemove', handleMouseMove)
//   }, [mouseX, mouseY])
//
//   const onSubmit = async (data: RegisterForm) => {
//     setIsLoading(true)
//     setApiError(null)
//     try {
//       await api.post('/api/auth/register', {
//         username: data.username,
//         email: data.email,
//         password: data.password,
//       })
//       toast.success('Account created! Please sign in.')
//       router.push('/login')
//     } catch (error: any) {
//       const message = error.response?.data?.error || 'Registration failed. Please try again.'
//       setApiError(message)
//     } finally {
//       setIsLoading(false)
//     }
//   }
//
//   return (
//     <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-950 font-sans cursor-default">
//       {/* Dynamic background glow */}
//       <motion.div
//         style={{ x: springX, y: springY, translateX: '-50%', translateY: '-50%' }}
//         className="absolute w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none z-0"
//       />
//
//       {/* Static background elements */}
//       <div className="absolute inset-0 overflow-hidden pointer-events-none">
//         <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[100px] rounded-full animate-pulse" />
//         <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[100px] rounded-full animate-pulse [animation-delay:2s]" />
//       </div>
//
//       <motion.div
//         initial={{ opacity: 0, scale: 0.95 }}
//         animate={{ opacity: 1, scale: 1 }}
//         transition={{ duration: 0.8, ease: 'easeOut' }}
//         className="relative z-10 w-full max-w-md px-6 py-8"
//       >
//         <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] space-y-7">
//           {/* Header */}
//           <div className="text-center space-y-3">
//             <motion.div
//               initial={{ rotate: 10, scale: 0.8 }}
//               animate={{ rotate: 0, scale: 1 }}
//               transition={{ type: 'spring', stiffness: 200, damping: 15 }}
//               className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 border border-white/10 mb-2"
//             >
//               <UserPlus className="w-8 h-8 text-indigo-400" />
//             </motion.div>
//             <h1 className="text-4xl font-extrabold text-white tracking-tight">Create Account</h1>
//             <p className="text-slate-400 text-sm font-medium">Set up your InfraManage credentials</p>
//           </div>
//
//           {/* Form */}
//           <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
//             <AnimatePresence>
//               {apiError && (
//                 <motion.div
//                   key="api-error"
//                   initial={{ opacity: 0, y: -8, scale: 0.97 }}
//                   animate={{ opacity: 1, y: 0, scale: 1 }}
//                   exit={{ opacity: 0, y: -8, scale: 0.97 }}
//                   transition={{ type: 'spring', stiffness: 300, damping: 25 }}
//                   className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium"
//                 >
//                   <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
//                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                   </svg>
//                   {apiError}
//                 </motion.div>
//               )}
//             </AnimatePresence>
//
//             <div className="space-y-4">
//               {/* Username */}
//               <FormField label="Username" error={errors.username?.message}
//                 icon={<User className="h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />}>
//                 <input
//                   {...register('username', {
//                     required: 'Username is required',
//                     minLength: { value: 3, message: 'At least 3 characters' },
//                     pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Letters, numbers and underscores only' },
//                   })}
//                   type="text" autoComplete="off" placeholder="john_doe" className={inputCls} />
//               </FormField>
//
//               {/* Email */}
//               <FormField label="Email" error={errors.email?.message}
//                 icon={<Mail className="h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />}>
//                 <input
//                   {...register('email', {
//                     required: 'Email is required',
//                     pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
//                   })}
//                   type="email" autoComplete="email" placeholder="john@example.com" className={inputCls} />
//               </FormField>
//
//               {/* Password */}
//               <FormField label="Password" error={errors.password?.message}
//                 icon={<Lock className="h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />}
//                 rightSlot={
//                   <button type="button" onClick={() => setShowPassword(!showPassword)}
//                     className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors">
//                     {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                   </button>
//                 }>
//                 <input
//                   {...register('password', {
//                     required: 'Password is required',
//                     minLength: { value: 6, message: 'At least 6 characters' },
//                   })}
//                   type={showPassword ? 'text' : 'password'} autoComplete="new-password"
//                   placeholder="••••••••" className={`${inputCls} pr-12`} />
//               </FormField>
//
//               {/* Confirm Password */}
//               <FormField label="Confirm Password" error={errors.confirmPassword?.message}
//                 icon={<Lock className="h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />}
//                 rightSlot={
//                   <button type="button" onClick={() => setShowConfirm(!showConfirm)}
//                     className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors">
//                     {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                   </button>
//                 }>
//                 <input
//                   {...register('confirmPassword', {
//                     required: 'Please confirm your password',
//                     validate: v => v === passwordValue || 'Passwords do not match',
//                   })}
//                   type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
//                   placeholder="••••••••" className={`${inputCls} pr-12`} />
//               </FormField>
//             </div>
//
//             <motion.button
//               whileHover={{ scale: 1.02, translateY: -2 }}
//               whileTap={{ scale: 0.98 }}
//               type="submit"
//               disabled={isLoading}
//               className="relative w-full flex items-center justify-center py-4 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-bold rounded-2xl shadow-[0_10px_20px_rgba(99,102,241,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
//             >
//               <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
//               <AnimatePresence mode="wait">
//                 {isLoading ? (
//                   <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center">
//                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//                     </svg>
//                     Creating account…
//                   </motion.div>
//                 ) : (
//                   <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
//                     Create Account
//                     <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </motion.button>
//           </form>
//
//           {/* Login link */}
//           <p className="text-center text-sm text-slate-500">
//             Already have an account?{' '}
//             <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
//               Sign in
//             </Link>
//           </p>
//         </div>
//       </motion.div>
//     </div>
//   )
// }
//
// const inputCls =
//   'block w-full pl-11 py-3.5 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:bg-white/[0.05] transition-all sm:text-sm'
//
// function FormField({
//   label, error, icon, rightSlot, children,
// }: {
//   label: string
//   error?: string
//   icon: React.ReactNode
//   rightSlot?: React.ReactNode
//   children: React.ReactNode
// }) {
//   return (
//     <div className="space-y-2">
//       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">{label}</label>
//       <div className="relative group">
//         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">{icon}</div>
//         {children}
//         {rightSlot}
//       </div>
//       {error && (
//         <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
//           className="text-xs text-red-400 font-medium ml-1">{error}</motion.p>
//       )}
//     </div>
//   )
// }

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { login } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth.store'
import { getErrorMessage } from '@/lib/api'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const setUser      = useAuthStore((s) => s.setUser)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      const res = await login(data)
      setUser(res)
      const from = searchParams.get('from') ?? '/dashboard'
      router.push(from)
    } catch (err) {
      setServerError(getErrorMessage(err))
    }
  }

  return (
    <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl p-8 shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Welcome back</h1>
        <p className="text-white/50 text-sm mt-1">Sign in to your organization</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
            Email address
          </label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className={`w-full h-10 px-3 rounded-lg bg-white/[0.06] border text-white text-sm
                        placeholder:text-white/25 outline-none transition-colors
                        focus:bg-white/[0.08] focus:border-indigo-500/60
                        ${errors.email ? 'border-red-500/60' : 'border-white/10'}`}
          />
          {errors.email && (
            <p className="text-red-400 text-xs">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
              Password
            </label>
            <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Forgot password?
            </a>
          </div>
          <input
            {...register('password')}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={`w-full h-10 px-3 rounded-lg bg-white/[0.06] border text-white text-sm
                        placeholder:text-white/25 outline-none transition-colors
                        focus:bg-white/[0.08] focus:border-indigo-500/60
                        ${errors.password ? 'border-red-500/60' : 'border-white/10'}`}
          />
          {errors.password && (
            <p className="text-red-400 text-xs">{errors.password.message}</p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <p className="text-red-400 text-sm">{serverError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm
                     font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                     mt-2"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-xs text-white/40 mt-6">
        Don&apos;t have an organization?{' '}
        <Link href="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Create one
        </Link>
      </p>
    </div>
  )
}

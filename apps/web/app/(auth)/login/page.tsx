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
</div>
  )
}

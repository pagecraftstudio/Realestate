'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { register as registerOrg } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'

const schema = z.object({
  orgName:   z.string().min(2, 'Organization name is required'),
  orgSlug:   z.string().min(2, 'Subdomain must be at least 2 characters')
               .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  email:     z.string().email('Enter a valid email'),
  password:  z.string().min(8, 'Password must be at least 8 characters')
               .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and a number'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router   = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Auto-generate slug from org name
  function handleOrgNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    setValue('orgName', name)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setValue('orgSlug', slug)
  }

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      await registerOrg(data)
      router.push('/dashboard')
    } catch (err) {
      setServerError(getErrorMessage(err))
    }
  }

  const field = (
    name: keyof FormData,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
    onChange?: React.ChangeEventHandler<HTMLInputElement>,
  ) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
        {label}
      </label>
      <input
        {...register(name)}
        {...props}
        onChange={onChange ?? props.onChange}
        className={`w-full h-10 px-3 rounded-lg bg-white/[0.06] border text-white text-sm
                    placeholder:text-white/25 outline-none transition-colors
                    focus:bg-white/[0.08] focus:border-indigo-500/60
                    ${errors[name] ? 'border-red-500/60' : 'border-white/10'}`}
      />
      {errors[name] && (
        <p className="text-red-400 text-xs">{errors[name]!.message}</p>
      )}
    </div>
  )

  return (
    <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl p-8 shadow-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Create organization</h1>
        <p className="text-white/50 text-sm mt-1">Get your team started in minutes</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Org info */}
        <div className="space-y-4 pb-4 border-b border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Organization</p>
          {field('orgName', 'Organization name', { placeholder: 'Acme Properties', onChange: handleOrgNameChange })}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Subdomain</label>
            <div className="flex items-center">
              <input
                {...register('orgSlug')}
                placeholder="acme-properties"
                className={`flex-1 h-10 px-3 rounded-l-lg bg-white/[0.06] border-y border-l text-white text-sm
                            placeholder:text-white/25 outline-none transition-colors
                            focus:bg-white/[0.08] focus:border-indigo-500/60
                            ${errors.orgSlug ? 'border-red-500/60' : 'border-white/10'}`}
              />
              <div className="h-10 px-3 bg-white/[0.03] border-y border-r border-white/10 rounded-r-lg
                              flex items-center text-white/30 text-sm whitespace-nowrap">
                .recrm.io
              </div>
            </div>
            {errors.orgSlug && (
              <p className="text-red-400 text-xs">{errors.orgSlug.message}</p>
            )}
          </div>
        </div>

        {/* Admin user */}
        <div className="space-y-4 pt-2">
          <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Admin account</p>
          <div className="grid grid-cols-2 gap-3">
            {field('firstName', 'First name', { placeholder: 'Ahmed' })}
            {field('lastName',  'Last name',  { placeholder: 'Hassan' })}
          </div>
          {field('email',    'Email',    { type: 'email',    placeholder: 'ahmed@acme.com', autoComplete: 'email' })}
          {field('password', 'Password', { type: 'password', placeholder: '••••••••',      autoComplete: 'new-password' })}
        </div>

        {serverError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <p className="text-red-400 text-sm">{serverError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm
                     font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {isSubmitting ? 'Creating…' : 'Create organization'}
        </button>
      </form>

      <p className="text-center text-xs text-white/40 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}

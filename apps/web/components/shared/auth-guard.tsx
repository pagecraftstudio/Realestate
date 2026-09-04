'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMe } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth.store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const setUser  = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)
  const loading  = useAuthStore((s) => s.loading)

  useEffect(() => {
    getMe()
      .then((user) => {
        setUser(user)
        setLoading(false)
      })
      .catch(() => {
        setUser(null)
        setLoading(false)
        router.push('/login')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">RE</span>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

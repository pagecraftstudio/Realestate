'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Bell, Moon, Sun, LogOut, User, ChevronRight } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/stores/auth.store'
import { logout } from '@/lib/auth'
import { initials } from '@/lib/utils'

const BREADCRUMBS: Record<string, string> = {
  dashboard:    'Dashboard',
  leads:        'Leads',
  customers:    'Customers',
  pipeline:     'Pipeline',
  projects:     'Projects',
  buildings:    'Buildings',
  units:        'Units',
  viewings:     'Viewings',
  offers:       'Offers',
  reservations: 'Reservations',
  deals:        'Deals',
  payments:     'Payments',
  installments: 'Installments',
  commissions:  'Commissions',
  tasks:        'Tasks',
  calendar:     'Calendar',
  communication:'Communications',
  reports:      'Reports',
  analytics:    'Analytics',
  team:         'Team',
  settings:     'Settings',
}

export function Topbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const user     = useAuthStore((s) => s.user)
  const setUser  = useAuthStore((s) => s.setUser)

  const segments = pathname.split('/').filter(Boolean)
  const crumbs   = segments.map((s, i) => ({
    label: BREADCRUMBS[s] ?? s,
    href:  '/' + segments.slice(0, i + 1).join('/'),
    last:  i === segments.length - 1,
  }))

  async function handleLogout() {
    await logout()
    setUser(null)
    router.push('/login')
  }

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm
                       flex items-center justify-between px-6 shrink-0 z-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {!crumb.last ? (
              <>
                <a href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </a>
                <ChevronRight size={13} className="text-muted-foreground/40" />
              </>
            ) : (
              <span className="text-foreground font-medium">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 rounded-md flex items-center justify-center
                     text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications */}
        <button className="w-8 h-8 rounded-md flex items-center justify-center
                           text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative">
          <Bell size={15} />
          {/* Unread dot placeholder */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
        </button>

        {/* User menu */}
        <div className="flex items-center gap-2 ml-1 pl-2 border-l border-border">
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-[11px] font-semibold">
              {user?.profile
                ? initials(user.profile.firstName, user.profile.lastName)
                : user?.email?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>

          {/* Name + role */}
          <div className="hidden md:flex flex-col leading-none">
            <span className="text-xs font-medium text-foreground">
              {user?.profile?.firstName
                ? `${user.profile.firstName} ${user.profile.lastName ?? ''}`
                : user?.email}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">
              {user?.role?.replace('_', ' ').toLowerCase()}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-7 h-7 rounded-md flex items-center justify-center
                       text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  GitBranch,
  Building2,
  DoorOpen,
  Calendar,
  FileText,
  Handshake,
  BookMarked,
  CreditCard,
  Receipt,
  BadgeDollarSign,
  CheckSquare,
  CalendarDays,
  MessageSquare,
  BarChart3,
  TrendingUp,
  UsersRound,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

interface NavItem {
  label:  string
  href:   string
  icon:   React.ElementType
  roles?: string[]
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
      { label: 'Analytics',    href: '/analytics',    icon: TrendingUp,      roles: ['COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN', 'MARKETING_MANAGER', 'ACCOUNTANT'] },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Leads',        href: '/leads',        icon: Users },
      { label: 'Customers',    href: '/customers',    icon: UserCheck },
      { label: 'Pipeline',     href: '/pipeline',     icon: GitBranch },
      { label: 'Viewings',     href: '/viewings',     icon: DoorOpen },
      { label: 'Offers',       href: '/offers',       icon: FileText },
      { label: 'Reservations', href: '/reservations', icon: BookMarked },
      { label: 'Deals',        href: '/deals',        icon: Handshake },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Payments',     href: '/payments',     icon: CreditCard,      roles: ['COMPANY_ADMIN', 'SALES_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'] },
      { label: 'Installments', href: '/installments', icon: Receipt,         roles: ['COMPANY_ADMIN', 'SALES_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'] },
      { label: 'Commissions',  href: '/commissions',  icon: BadgeDollarSign, roles: ['COMPANY_ADMIN', 'SALES_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'] },
    ],
  },
  {
    label: 'Property',
    items: [
      { label: 'Projects',     href: '/projects',     icon: Building2,       roles: ['COMPANY_ADMIN', 'PROPERTY_MANAGER', 'SUPER_ADMIN', 'SALES_MANAGER'] },
      { label: 'Units',        href: '/units',        icon: DoorOpen,        roles: ['COMPANY_ADMIN', 'PROPERTY_MANAGER', 'SUPER_ADMIN', 'SALES_MANAGER'] },
    ],
  },
  {
    label: 'Work',
    items: [
      { label: 'Tasks',        href: '/tasks',        icon: CheckSquare },
      { label: 'Calendar',     href: '/calendar',     icon: CalendarDays },
      { label: 'Comms',        href: '/communication', icon: MessageSquare },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Reports',      href: '/reports',      icon: BarChart3,       roles: ['COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN'] },
      { label: 'Team',         href: '/team',         icon: UsersRound,      roles: ['COMPANY_ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN'] },
      { label: 'Settings',     href: '/settings',     icon: Settings,        roles: ['COMPANY_ADMIN', 'SUPER_ADMIN'] },
    ],
  },
]

export function Sidebar() {
  const pathname    = usePathname()
  const user        = useAuthStore((s) => s.user)
  const [collapsed, setCollapsed] = useState(false)
  const role        = user?.role ?? ''

  function isVisible(item: NavItem) {
    if (!item.roles) return true
    return item.roles.includes(role)
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar border-r border-sidebar-border shrink-0 transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[220px]',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-14 border-b border-sidebar-border px-4', collapsed && 'justify-center px-0')}>
        <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold tracking-tight">RE</span>
        </div>
        {!collapsed && (
          <span className="ml-2.5 text-sidebar-foreground font-semibold text-sm tracking-tight truncate">
            RE CRM
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter(isVisible)
          if (!visible.length) return null
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const Icon   = item.icon
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'sidebar-item',
                          active && 'sidebar-item-active',
                          collapsed && 'justify-center px-0 py-2',
                        )}
                      >
                        <Icon size={15} className="shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'sidebar-item w-full',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed
            ? <ChevronRight size={15} />
            : <><ChevronLeft size={15} /><span className="text-xs">Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}

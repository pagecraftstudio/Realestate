import { UserRole } from '@prisma/client'

// ─── Resource × Action matrix ────────────────────────────────────────────────
// Deny by default. Explicit allow per role × resource × action.

export type Resource =
  | 'orgs'
  | 'users'
  | 'teams'
  | 'leads'
  | 'customers'
  | 'projects'
  | 'buildings'
  | 'floors'
  | 'units'
  | 'viewings'
  | 'offers'
  | 'reservations'
  | 'deals'
  | 'payment-plans'
  | 'installments'
  | 'payments'
  | 'commissions'
  | 'tasks'
  | 'notifications'
  | 'communications'
  | 'documents'
  | 'analytics'
  | 'audit-logs'
  | 'campaigns'
  | 'settings'

export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage'

type PermissionMap = Partial<Record<Resource, Action[]>>

const PERMISSIONS: Record<UserRole, PermissionMap> = {
  SUPER_ADMIN: {
    orgs: ['manage'],
    users: ['manage'],
    settings: ['manage'],
    'audit-logs': ['read'],
    analytics: ['read'],
  },

  COMPANY_ADMIN: {
    users: ['manage'],
    teams: ['manage'],
    leads: ['manage'],
    customers: ['manage'],
    projects: ['manage'],
    buildings: ['manage'],
    floors: ['manage'],
    units: ['manage'],
    viewings: ['manage'],
    offers: ['manage'],
    reservations: ['manage'],
    deals: ['manage'],
    'payment-plans': ['manage'],
    installments: ['manage'],
    payments: ['manage'],
    commissions: ['manage'],
    tasks: ['manage'],
    notifications: ['manage'],
    communications: ['manage'],
    documents: ['manage'],
    analytics: ['read'],
    'audit-logs': ['read'],
    campaigns: ['manage'],
    settings: ['manage'],
  },

  SALES_MANAGER: {
    users: ['read'],
    teams: ['manage'],
    leads: ['manage'],
    customers: ['manage'],
    viewings: ['manage'],
    offers: ['manage'],
    reservations: ['manage'],
    deals: ['manage'],
    tasks: ['manage'],
    notifications: ['read'],
    communications: ['manage'],
    documents: ['read'],
    analytics: ['read'],
    campaigns: ['read'],
  },

  SALES_AGENT: {
    leads: ['create', 'read', 'update'],
    customers: ['create', 'read', 'update'],
    viewings: ['create', 'read', 'update'],
    offers: ['create', 'read', 'update'],
    reservations: ['create', 'read'],
    deals: ['read'],
    tasks: ['create', 'read', 'update'],
    notifications: ['read'],
    communications: ['create', 'read'],
    documents: ['create', 'read'],
  },

  MARKETING_MANAGER: {
    leads: ['read'],
    campaigns: ['manage'],
    analytics: ['read'],
    communications: ['read'],
  },

  ACCOUNTANT: {
    payments: ['manage'],
    installments: ['manage'],
    commissions: ['manage'],
    deals: ['read'],
    customers: ['read'],
    analytics: ['read'],
    documents: ['read'],
  },

  PROPERTY_MANAGER: {
    projects: ['manage'],
    buildings: ['manage'],
    floors: ['manage'],
    units: ['manage'],
    documents: ['manage'],
  },

  VIEWER: {
    leads: ['read'],
    customers: ['read'],
    projects: ['read'],
    buildings: ['read'],
    floors: ['read'],
    units: ['read'],
    viewings: ['read'],
    offers: ['read'],
    deals: ['read'],
    analytics: ['read'],
  },
}

function hasAction(allowed: Action[], requested: Action): boolean {
  if (allowed.includes('manage')) return true
  return allowed.includes(requested)
}

export function can(role: UserRole, resource: Resource, action: Action): boolean {
  const perms = PERMISSIONS[role]
  if (!perms) return false
  const resourcePerms = perms[resource]
  if (!resourcePerms) return false
  return hasAction(resourcePerms, action)
}

export function assertCan(role: UserRole, resource: Resource, action: Action): void {
  if (!can(role, resource, action)) {
    throw new ForbiddenError(`Role ${role} cannot ${action} ${resource}`)
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/**
 * @recrm/types — shared TypeScript types used by both API and Web.
 *
 * Keep this file free of Node.js or browser-specific imports.
 * Import this package as:
 *   import type { AuthUser, ApiResponse } from '@recrm/types'
 */

// ─── Auth ──────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'SALES_MANAGER'
  | 'SALES_AGENT'
  | 'MARKETING_MANAGER'
  | 'ACCOUNTANT'
  | 'PROPERTY_MANAGER'
  | 'VIEWER'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'INVITED' | 'SUSPENDED'

export interface AuthUser {
  id:             string
  userId:         string   // alias — same value as id
  organizationId: string
  role:           UserRole
  supabaseUid:    string
}

// ─── API response shapes ───────────────────────────────────────────────────────

export interface ApiError {
  error:   string
  issues?: Array<{ field: string; message: string }>
}

export interface PageMeta {
  page:       number
  limit:      number
  total:      number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PageMeta
}

// ─── Organization ─────────────────────────────────────────────────────────────

export type OrgPlan   = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
export type OrgStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'

export interface Organization {
  id:        string
  name:      string
  slug:      string
  plan:      OrgPlan
  status:    OrgStatus
  createdAt: string
}

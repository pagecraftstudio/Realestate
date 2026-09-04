// ─── Shared API types ─────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  meta: { page: number; limit: number; total: number; pages: number }
}

// ─── Enums (mirror backend) ───────────────────────────────────────────────────

export type LeadStatus =
  | 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED'
  | 'VIEWING_SCHEDULED' | 'VIEWING_COMPLETED' | 'NEGOTIATION'
  | 'RESERVED' | 'WON' | 'LOST'

export type LeadTemperature = 'HOT' | 'WARM' | 'COLD'

export type LeadSource =
  | 'WEBSITE' | 'FACEBOOK' | 'INSTAGRAM' | 'WHATSAPP'
  | 'GOOGLE_ADS' | 'PROPERTY_PORTAL' | 'REFERRAL'
  | 'PHONE' | 'WALK_IN' | 'MANUAL' | 'IMPORT' | 'OTHER'

export type PropertyType =
  | 'RESIDENTIAL' | 'COMMERCIAL' | 'ADMINISTRATIVE' | 'RETAIL' | 'LAND' | 'OTHER'

export type PurchasePurpose = 'OWN_USE' | 'INVESTMENT' | 'RENTAL' | 'RESALE' | 'UNDECIDED'
export type FinancingPreference = 'CASH' | 'MORTGAGE' | 'INSTALLMENT' | 'UNDECIDED'

export type DealStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'ON_HOLD'

// ─── Lead ─────────────────────────────────────────────────────────────────────

export interface AgentRef {
  id: string
  profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null
}

export interface Lead {
  id: string
  organizationId: string
  assignedAgentId: string | null
  teamId: string | null
  campaignId: string | null
  fullName: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  country: string | null
  city: string | null
  source: LeadSource
  status: LeadStatus
  temperature: LeadTemperature
  leadScore: number
  budgetMin: string | null
  budgetMax: string | null
  preferredType: PropertyType | null
  preferredLocation: string | null
  bedrooms: number | null
  areaMin: string | null
  areaMax: string | null
  purchasePurpose: PurchasePurpose | null
  financingPref: FinancingPreference | null
  tags: string[]
  notes: string | null
  lastContactedAt: string | null
  nextFollowupAt: string | null
  isArchived: boolean
  duplicateOfId: string | null
  createdAt: string
  updatedAt: string
  assignedAgent: AgentRef | null
  team: { id: string; name: string } | null
  campaign: { id: string; name: string; source: string } | null
}

export interface LeadActivity {
  id: string
  type: string
  payload: Record<string, unknown>
  createdAt: string
  actor: AgentRef & { role: string }
}

export interface LeadDetail extends Lead {
  customer: { id: string; fullName: string; phone: string | null; email: string | null } | null
  activities: LeadActivity[]
  viewings: Array<{
    id: string
    scheduledAt: string
    status: string
    outcome: string | null
    unit: { id: string; unitNumber: string; project: { name: string } }
  }>
  offers: Array<{
    id: string
    offeredPrice: string
    status: string
    createdAt: string
    unit: { id: string; unitNumber: string; project: { name: string } }
  }>
  savedUnits: Array<{
    unit: {
      id: string; unitNumber: string; unitType: string
      area: string | null; price: string; status: string
      project: { id: string; name: string }
    }
  }>
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  organizationId: string
  leadId: string | null
  assignedAgentId: string | null
  fullName: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  nationality: string | null
  country: string | null
  city: string | null
  address: string | null
  idNumber: string | null
  budgetMin: string | null
  budgetMax: string | null
  tags: string[]
  notes: string | null
  createdAt: string
  updatedAt: string
  assignedAgent: AgentRef | null
}

export interface CustomerDetail extends Customer {
  lead: { id: string; source: LeadSource; status: LeadStatus } | null
  deals: Array<{
    id: string; status: DealStatus; dealValue: string; pipelineStage: string
    unit: { id: string; unitNumber: string; project: { name: string } }
  }>
}

// ─── Deal (pipeline) ──────────────────────────────────────────────────────────

export interface Deal {
  id: string
  organizationId: string
  customerId: string
  unitId: string
  assignedAgentId: string | null
  dealValue: string
  status: DealStatus
  pipelineStage: string
  createdAt: string
  updatedAt: string
  customer: { id: string; fullName: string; phone: string | null }
  unit: { id: string; unitNumber: string; project: { name: string } }
  agent: AgentRef | null
}

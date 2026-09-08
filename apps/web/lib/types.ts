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

// ─── Campaign ─────────────────────────────────────────────────────────────────

export type CampaignSource = LeadSource

export interface Campaign {
  id:             string
  organizationId: string
  name:           string
  source:         CampaignSource
  description:    string | null
  budget:         string | null
  startDate:      string | null
  endDate:        string | null
  isActive:       boolean
  metadata:       Record<string, unknown>
  createdAt:      string
  updatedAt:      string
  _count: { leads: number }
}

export interface CampaignDetail extends Campaign {
  leads: Array<{
    id: string; fullName: string; status: LeadStatus; source: LeadSource; createdAt: string
    assignedAgent: AgentRef | null
  }>
}

export interface CampaignStats {
  total:          number
  won:            number
  conversionRate: number
  byStatus:       Record<string, number>
}

// ─── Contract ─────────────────────────────────────────────────────────────────

export type ContractStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'
export type ContractType   = 'SALE' | 'RENTAL' | 'RESERVATION' | 'OTHER'

export interface Contract {
  id:             string
  organizationId: string
  dealId:         string
  customerId:     string
  unitId:         string
  agentId:        string
  contractNumber: string
  contractType:   ContractType
  status:         ContractStatus
  contractDate:   string | null
  handoverDate:   string | null
  expiresAt:      string | null
  signedAt:       string | null
  totalValue:     string
  currency:       string
  terms:          string | null
  notes:          string | null
  documentUrl:    string | null
  signatureUrl:   string | null
  createdAt:      string
  updatedAt:      string
  deal:     { id: string; dealNumber: string; salePrice: string; status: string; pipelineStage: string }
  customer: { id: string; fullName: string; phone: string | null; email: string | null }
  unit: {
    id: string; unitNumber: string; unitType: string; area: string | null; price: string
    project:  { id: string; name: string }
    building: { id: string; name: string }
  }
  agent: { id: string; userProfile: { firstName: string | null; lastName: string | null } | null }
}

// ─── Property Matching ────────────────────────────────────────────────────────

export type MatchRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface PropertyMatchResult {
  id:            string
  score:         number
  reasons:       string[]
  isShortlisted: boolean
  unit: {
    id: string; unitNumber: string; unitType: string; status: string
    price: string; area: string | null; bedrooms: number | null
    project:  { id: string; name: string; propertyType: string; city: string | null }
    building: { id: string; name: string }
  }
}

export interface PropertyMatchRequest {
  id:                string
  organizationId:    string
  leadId:            string | null
  customerId:        string | null
  agentId:           string
  status:            MatchRequestStatus
  budgetMin:         string | null
  budgetMax:         string | null
  propertyType:      PropertyType | null
  preferredLocation: string | null
  bedrooms:          number | null
  areaMin:           string | null
  areaMax:           string | null
  purpose:           PurchasePurpose | null
  financing:         FinancingPreference | null
  notes:             string | null
  createdAt:         string
  updatedAt:         string
  lead:     { id: string; fullName: string; status: LeadStatus; source: LeadSource } | null
  customer: { id: string; fullName: string; phone: string | null; email: string | null } | null
  agent: { id: string; userProfile: { firstName: string | null; lastName: string | null } | null }
  results: PropertyMatchResult[]
}

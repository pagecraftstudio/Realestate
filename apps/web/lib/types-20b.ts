// ─── Phase 20B types (extend lib/types.ts) ────────────────────────────────────

export type UnitStatus = 'AVAILABLE' | 'ON_HOLD' | 'RESERVED' | 'CONTRACTED' | 'SOLD' | 'RENTED' | 'UNAVAILABLE'
export type UnitType = 'APARTMENT' | 'VILLA' | 'TOWNHOUSE' | 'DUPLEX' | 'PENTHOUSE' | 'STUDIO' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'LAND_PLOT' | 'OTHER'
export type UnitFinishing = 'UNFINISHED' | 'SEMI_FINISHED' | 'FULLY_FINISHED' | 'FURNISHED' | 'SUPER_LUX'
export type ProjectStatus = 'PLANNING' | 'UNDER_CONSTRUCTION' | 'READY' | 'COMPLETED' | 'ON_HOLD'
export type ViewingStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED'
export type OfferStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN'
export type ReservationStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'CONVERTED'

export interface Project {
  id: string
  organizationId: string
  name: string
  developer: string | null
  description: string | null
  propertyType: string
  status: ProjectStatus
  address: string | null
  city: string | null
  district: string | null
  country: string | null
  lat: string | null
  lng: string | null
  startingPrice: string | null
  amenities: string[]
  imageUrls: string[]
  completionDate: string | null
  createdAt: string
  updatedAt: string
  _count?: { units: number; buildings: number }
  unitStatusSummary?: Record<UnitStatus, number>
}

export interface Building {
  id: string
  projectId: string
  name: string
  buildingNumber: string | null
  floorsCount: number
  floors?: Floor[]
}

export interface Floor {
  id: string
  buildingId: string
  floorNumber: number
  label: string | null
  units?: Unit[]
}

export interface Unit {
  id: string
  organizationId: string
  projectId: string
  buildingId: string | null
  floorId: string | null
  unitNumber: string
  unitType: UnitType
  propertyType: string
  status: UnitStatus
  area: string | null
  builtUpArea: string | null
  bedrooms: number | null
  bathrooms: number | null
  parking: number | null
  view: string | null
  finishing: UnitFinishing
  price: string
  pricePerMeter: string | null
  imageUrls: string[]
  deliveryDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  project?: { id: string; name: string }
  building?: { id: string; name: string } | null
  floor?: { id: string; floorNumber: number } | null
  reservation?: { id: string; expiresAt: string | null; status: string } | null
  deal?: { id: string; status: string; dealNumber: string } | null
}

export interface Viewing {
  id: string
  organizationId: string
  leadId: string | null
  customerId: string | null
  unitId: string | null
  agentId: string
  scheduledAt: string
  endAt: string | null
  location: string | null
  status: ViewingStatus
  customerFeedback: string | null
  agentFeedback: string | null
  outcome: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  lead?: { id: string; fullName: string; phone: string | null } | null
  customer?: { id: string; fullName: string; phone: string | null } | null
  unit?: { id: string; unitNumber: string; project: { name: string } } | null
  agent: { id: string; profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null }
}

export interface Offer {
  id: string
  organizationId: string
  leadId: string | null
  customerId: string | null
  unitId: string
  agentId: string
  originalPrice: string
  offeredPrice: string
  discount: string
  discountPct: string
  downPayment: string | null
  installmentCount: number | null
  status: OfferStatus
  expiresAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  lead?: { id: string; fullName: string } | null
  customer?: { id: string; fullName: string } | null
  unit: { id: string; unitNumber: string; project: { name: string } }
  agent: { id: string; profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null }
}

export interface Reservation {
  id: string
  organizationId: string
  unitId: string
  customerId: string
  agentId: string
  dealId: string | null
  reservationDate: string
  expiresAt: string | null
  reservationAmount: string | null
  status: ReservationStatus
  paymentStatus: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  unit: { id: string; unitNumber: string; project: { name: string; city: string | null }; price: string }
  customer: { id: string; fullName: string; phone: string | null }
  agent: { id: string; profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null }
}

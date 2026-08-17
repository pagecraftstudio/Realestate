/**
 * Shared enums as const string unions — mirrors prisma/schema.prisma exactly.
 * Using string const objects (not TS enums) so Zod nativeEnum and string
 * literal comparisons both work without casting.
 */

export const Plan = { FREE:'FREE', STARTER:'STARTER', PROFESSIONAL:'PROFESSIONAL', ENTERPRISE:'ENTERPRISE' } as const
export type Plan = typeof Plan[keyof typeof Plan]

export const OrgStatus = { ACTIVE:'ACTIVE', SUSPENDED:'SUSPENDED', CANCELLED:'CANCELLED', TRIAL:'TRIAL' } as const
export type OrgStatus = typeof OrgStatus[keyof typeof OrgStatus]

export const UserRole = { SUPER_ADMIN:'SUPER_ADMIN', COMPANY_ADMIN:'COMPANY_ADMIN', SALES_MANAGER:'SALES_MANAGER', SALES_AGENT:'SALES_AGENT', MARKETING_MANAGER:'MARKETING_MANAGER', ACCOUNTANT:'ACCOUNTANT', PROPERTY_MANAGER:'PROPERTY_MANAGER', VIEWER:'VIEWER' } as const
export type UserRole = typeof UserRole[keyof typeof UserRole]

export const UserStatus = { ACTIVE:'ACTIVE', INACTIVE:'INACTIVE', INVITED:'INVITED', SUSPENDED:'SUSPENDED' } as const
export type UserStatus = typeof UserStatus[keyof typeof UserStatus]

export const LeadStatus = { NEW:'NEW', CONTACTED:'CONTACTED', QUALIFIED:'QUALIFIED', UNQUALIFIED:'UNQUALIFIED', VIEWING_SCHEDULED:'VIEWING_SCHEDULED', VIEWING_COMPLETED:'VIEWING_COMPLETED', NEGOTIATION:'NEGOTIATION', RESERVED:'RESERVED', WON:'WON', LOST:'LOST' } as const
export type LeadStatus = typeof LeadStatus[keyof typeof LeadStatus]

export const LeadTemperature = { HOT:'HOT', WARM:'WARM', COLD:'COLD' } as const
export type LeadTemperature = typeof LeadTemperature[keyof typeof LeadTemperature]

export const LeadSource = { WEBSITE:'WEBSITE', FACEBOOK:'FACEBOOK', INSTAGRAM:'INSTAGRAM', WHATSAPP:'WHATSAPP', GOOGLE_ADS:'GOOGLE_ADS', PROPERTY_PORTAL:'PROPERTY_PORTAL', REFERRAL:'REFERRAL', PHONE:'PHONE', WALK_IN:'WALK_IN', MANUAL:'MANUAL', IMPORT:'IMPORT', OTHER:'OTHER' } as const
export type LeadSource = typeof LeadSource[keyof typeof LeadSource]

export const PurchasePurpose = { OWN_USE:'OWN_USE', INVESTMENT:'INVESTMENT', RENTAL:'RENTAL', RESALE:'RESALE', UNDECIDED:'UNDECIDED' } as const
export type PurchasePurpose = typeof PurchasePurpose[keyof typeof PurchasePurpose]

export const FinancingPreference = { CASH:'CASH', MORTGAGE:'MORTGAGE', INSTALLMENT:'INSTALLMENT', UNDECIDED:'UNDECIDED' } as const
export type FinancingPreference = typeof FinancingPreference[keyof typeof FinancingPreference]

export const PropertyType = { RESIDENTIAL:'RESIDENTIAL', COMMERCIAL:'COMMERCIAL', ADMINISTRATIVE:'ADMINISTRATIVE', RETAIL:'RETAIL', LAND:'LAND', OTHER:'OTHER' } as const
export type PropertyType = typeof PropertyType[keyof typeof PropertyType]

export const UnitType = { APARTMENT:'APARTMENT', VILLA:'VILLA', TOWNHOUSE:'TOWNHOUSE', DUPLEX:'DUPLEX', PENTHOUSE:'PENTHOUSE', STUDIO:'STUDIO', OFFICE:'OFFICE', SHOP:'SHOP', WAREHOUSE:'WAREHOUSE', LAND_PLOT:'LAND_PLOT', OTHER:'OTHER' } as const
export type UnitType = typeof UnitType[keyof typeof UnitType]

export const UnitStatus = { AVAILABLE:'AVAILABLE', ON_HOLD:'ON_HOLD', RESERVED:'RESERVED', CONTRACTED:'CONTRACTED', SOLD:'SOLD', RENTED:'RENTED', UNAVAILABLE:'UNAVAILABLE' } as const
export type UnitStatus = typeof UnitStatus[keyof typeof UnitStatus]

export const UnitFinishing = { UNFINISHED:'UNFINISHED', SEMI_FINISHED:'SEMI_FINISHED', FULLY_FINISHED:'FULLY_FINISHED', FURNISHED:'FURNISHED', SUPER_LUX:'SUPER_LUX' } as const
export type UnitFinishing = typeof UnitFinishing[keyof typeof UnitFinishing]

export const ProjectStatus = { PLANNING:'PLANNING', UNDER_CONSTRUCTION:'UNDER_CONSTRUCTION', READY:'READY', COMPLETED:'COMPLETED', ON_HOLD:'ON_HOLD' } as const
export type ProjectStatus = typeof ProjectStatus[keyof typeof ProjectStatus]

export const ViewingStatus = { SCHEDULED:'SCHEDULED', CONFIRMED:'CONFIRMED', COMPLETED:'COMPLETED', CANCELLED:'CANCELLED', NO_SHOW:'NO_SHOW', RESCHEDULED:'RESCHEDULED' } as const
export type ViewingStatus = typeof ViewingStatus[keyof typeof ViewingStatus]

export const OfferStatus = { DRAFT:'DRAFT', SENT:'SENT', ACCEPTED:'ACCEPTED', REJECTED:'REJECTED', EXPIRED:'EXPIRED', WITHDRAWN:'WITHDRAWN' } as const
export type OfferStatus = typeof OfferStatus[keyof typeof OfferStatus]

export const ReservationStatus = { ACTIVE:'ACTIVE', EXPIRED:'EXPIRED', CANCELLED:'CANCELLED', CONVERTED:'CONVERTED' } as const
export type ReservationStatus = typeof ReservationStatus[keyof typeof ReservationStatus]

export const DealStatus = { DRAFT:'DRAFT', RESERVED:'RESERVED', CONTRACTED:'CONTRACTED', PARTIALLY_PAID:'PARTIALLY_PAID', COMPLETED:'COMPLETED', CANCELLED:'CANCELLED' } as const
export type DealStatus = typeof DealStatus[keyof typeof DealStatus]

export const PipelineStage = { NEW_LEAD:'NEW_LEAD', CONTACTED:'CONTACTED', QUALIFIED:'QUALIFIED', PROPERTY_MATCHING:'PROPERTY_MATCHING', VIEWING_SCHEDULED:'VIEWING_SCHEDULED', VIEWING_COMPLETED:'VIEWING_COMPLETED', OFFER:'OFFER', NEGOTIATION:'NEGOTIATION', RESERVATION:'RESERVATION', CONTRACT:'CONTRACT', CLOSED_WON:'CLOSED_WON', CLOSED_LOST:'CLOSED_LOST' } as const
export type PipelineStage = typeof PipelineStage[keyof typeof PipelineStage]

export const InstallmentStatus = { UPCOMING:'UPCOMING', DUE:'DUE', PARTIALLY_PAID:'PARTIALLY_PAID', PAID:'PAID', OVERDUE:'OVERDUE', CANCELLED:'CANCELLED' } as const
export type InstallmentStatus = typeof InstallmentStatus[keyof typeof InstallmentStatus]

export const PaymentMethod = { CASH:'CASH', BANK_TRANSFER:'BANK_TRANSFER', CARD:'CARD', CHEQUE:'CHEQUE', OTHER:'OTHER' } as const
export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod]

export const PaymentStatus = { PENDING:'PENDING', COMPLETED:'COMPLETED', FAILED:'FAILED', REFUNDED:'REFUNDED', CANCELLED:'CANCELLED' } as const
export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus]

export const CommissionStatus = { PENDING:'PENDING', APPROVED:'APPROVED', PAYABLE:'PAYABLE', PAID:'PAID', CANCELLED:'CANCELLED' } as const
export type CommissionStatus = typeof CommissionStatus[keyof typeof CommissionStatus]

export const TaskPriority = { LOW:'LOW', MEDIUM:'MEDIUM', HIGH:'HIGH', URGENT:'URGENT' } as const
export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority]

export const TaskStatus = { TODO:'TODO', IN_PROGRESS:'IN_PROGRESS', DONE:'DONE', CANCELLED:'CANCELLED' } as const
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus]

export const CommunicationChannel = { WHATSAPP:'WHATSAPP', EMAIL:'EMAIL', PHONE:'PHONE', IN_PERSON:'IN_PERSON', SMS:'SMS', OTHER:'OTHER' } as const
export type CommunicationChannel = typeof CommunicationChannel[keyof typeof CommunicationChannel]

export const CommunicationDirection = { INBOUND:'INBOUND', OUTBOUND:'OUTBOUND' } as const
export type CommunicationDirection = typeof CommunicationDirection[keyof typeof CommunicationDirection]

export const NotificationType = { LEAD_ASSIGNED:'LEAD_ASSIGNED', LEAD_STATUS_CHANGED:'LEAD_STATUS_CHANGED', VIEWING_SCHEDULED:'VIEWING_SCHEDULED', VIEWING_REMINDER:'VIEWING_REMINDER', TASK_DUE:'TASK_DUE', TASK_OVERDUE:'TASK_OVERDUE', INSTALLMENT_DUE:'INSTALLMENT_DUE', INSTALLMENT_OVERDUE:'INSTALLMENT_OVERDUE', RESERVATION_EXPIRING:'RESERVATION_EXPIRING', DEAL_STAGE_CHANGED:'DEAL_STAGE_CHANGED', COMMISSION_APPROVED:'COMMISSION_APPROVED', SYSTEM:'SYSTEM' } as const
export type NotificationType = typeof NotificationType[keyof typeof NotificationType]

export const AssignmentStrategy = { ROUND_ROBIN:'ROUND_ROBIN', LEAST_ACTIVE_LEADS:'LEAST_ACTIVE_LEADS', GEOGRAPHIC:'GEOGRAPHIC', TEAM:'TEAM', MANUAL:'MANUAL' } as const
export type AssignmentStrategy = typeof AssignmentStrategy[keyof typeof AssignmentStrategy]

export const AuditAction = { CREATE:'CREATE', UPDATE:'UPDATE', DELETE:'DELETE', STATUS_CHANGE:'STATUS_CHANGE', ASSIGN:'ASSIGN', LOGIN:'LOGIN', LOGOUT:'LOGOUT' } as const
export type AuditAction = typeof AuditAction[keyof typeof AuditAction]

export const DocumentRelatedType = { LEAD:'LEAD', CUSTOMER:'CUSTOMER', DEAL:'DEAL', RESERVATION:'RESERVATION', UNIT:'UNIT', PROJECT:'PROJECT' } as const
export type DocumentRelatedType = typeof DocumentRelatedType[keyof typeof DocumentRelatedType]

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

# MASTER PROMPT
# REAL ESTATE CRM / SALES OPERATING SYSTEM
## Enterprise-Grade Multi-Tenant SaaS

---

# 0. ROLE

You are a senior:

- SaaS Product Architect
- Full-Stack Engineer
- Software Architect
- UI/UX Designer
- Database Architect
- Security Engineer
- DevOps Engineer
- QA Engineer

Your task is to DESIGN AND BUILD a production-ready, enterprise-grade **Real Estate CRM / Real Estate Sales Operating System**.

Do not build a generic CRM.

Build a specialized platform designed around how real estate companies actually acquire leads, manage customers, sell properties, schedule viewings, manage reservations, collect payments, calculate commissions, and analyze sales performance.

The platform must be scalable enough to become a commercial SaaS product that can be sold to multiple real estate companies.

---

# 1. PRODUCT VISION

The platform should manage the complete real estate sales lifecycle:

LEAD
↓
QUALIFICATION
↓
ASSIGNMENT
↓
CUSTOMER
↓
PROPERTY MATCHING
↓
VIEWING
↓
OFFER
↓
NEGOTIATION
↓
RESERVATION
↓
CONTRACT
↓
PAYMENTS
↓
COMMISSION
↓
SALE

The CRM must make it possible for a company to manage its entire sales operation from one system.

The primary objective is:

> Give real estate companies one centralized system to manage leads, agents, customers, properties, viewings, deals, payments, commissions, communication, and performance.

---

# 2. CORE PRODUCT PRINCIPLES

The application must be:

- Production-ready
- Secure
- Scalable
- Multi-tenant
- Responsive
- Fast
- Maintainable
- Modular
- Type-safe
- Accessible
- Enterprise-grade
- Arabic + English ready
- RTL + LTR ready

Do NOT create fake functionality.

Do NOT use mock data as a replacement for real backend functionality.

Every important UI action should connect to a real data layer.

Do not build a static prototype.

Build the actual application.

---

# 3. TARGET CUSTOMERS

The platform should support:

## Real Estate Agencies

Companies that sell properties from multiple developers.

## Property Developers

Companies selling their own projects and units.

## Brokerage Companies

Companies with large sales teams and multiple branches.

## Property Management / Rental Companies

Companies managing rental properties.

The architecture must support all of these without requiring a complete rewrite.

---

# 4. MULTI-TENANCY

This is a SaaS platform.

Multiple companies must be able to use the same application.

Each company is a TENANT / ORGANIZATION.

Example:

Organization A
- Users
- Leads
- Customers
- Properties
- Projects
- Deals
- Payments
- Commissions

Organization B
- Users
- Leads
- Customers
- Properties
- Projects
- Deals
- Payments
- Commissions

Organization A must NEVER be able to access Organization B's data.

Implement strong tenant isolation at the database and application levels.

Every organization-owned entity must contain an organization/tenant relationship.

Never rely solely on frontend filtering for tenant security.

---

# 5. USER ROLES

Implement RBAC.

Default roles:

## SUPER_ADMIN

Platform owner.

Can manage:

- Organizations
- Subscriptions
- Platform settings
- System configuration
- All tenants
- Global analytics

## COMPANY_ADMIN

Can manage the entire organization.

## SALES_MANAGER

Can manage:

- Sales team
- Leads
- Customers
- Opportunities
- Viewings
- Deals
- Sales analytics

## SALES_AGENT

Can manage assigned:

- Leads
- Customers
- Viewings
- Opportunities
- Deals

## MARKETING_MANAGER

Can manage:

- Lead sources
- Campaigns
- Marketing analytics
- Lead acquisition

## ACCOUNTANT

Can manage:

- Payments
- Installments
- Commissions
- Financial records
- Financial reports

## PROPERTY_MANAGER

Can manage:

- Projects
- Buildings
- Units
- Property availability

## VIEWER

Read-only access.

Permissions must be granular enough to support future custom roles.

---

# 6. MAIN APPLICATION MODULES

Build the application around these modules:

1. Dashboard
2. Leads
3. Customers
4. Sales Pipeline
5. Properties
6. Projects
7. Buildings
8. Units
9. Property Matching
10. Viewings
11. Offers
12. Reservations
13. Deals
14. Contracts
15. Payments
16. Installments
17. Commissions
18. Tasks
19. Calendar
20. Communication
21. WhatsApp Integration
22. Marketing
23. Reports
24. Analytics
25. Team Management
26. Notifications
27. Documents
28. Settings
29. Audit Logs
30. Billing / Subscription
31. Platform Administration

---

# 7. DASHBOARD

Create a premium executive dashboard.

The dashboard must change depending on the user's role.

## COMPANY ADMIN / SALES MANAGER

Show:

- Total Leads
- New Leads
- Qualified Leads
- Active Opportunities
- Scheduled Viewings
- Completed Viewings
- Reservations
- Closed Deals
- Revenue
- Expected Revenue
- Pending Payments
- Outstanding Installments
- Total Commissions
- Conversion Rate
- Average Deal Value
- Agent Performance
- Lead Sources
- Sales Funnel
- Property Performance

## SALES AGENT

Show:

- My Leads
- New Leads
- Follow-ups Due
- Overdue Follow-ups
- Today's Viewings
- Upcoming Viewings
- Active Opportunities
- My Reservations
- My Deals
- My Revenue
- My Commission

## DASHBOARD VISUALIZATIONS

Include:

- Sales funnel
- Revenue chart
- Leads over time
- Lead source breakdown
- Agent leaderboard
- Property/project performance
- Conversion metrics
- Pipeline value

Charts must use real database data.

---

# 8. LEAD MANAGEMENT

Leads are one of the most important entities.

Lead fields should include:

- ID
- Full name
- Phone
- WhatsApp number
- Email
- Country
- City
- Source
- Campaign
- Assigned agent
- Assigned team
- Status
- Temperature
- Budget
- Preferred property type
- Preferred location
- Bedrooms
- Minimum area
- Maximum area
- Purchase purpose
- Financing preference
- Notes
- Tags
- Created date
- Last contacted
- Next follow-up
- Lead score

## LEAD SOURCES

Support:

- Website
- Facebook
- Instagram
- WhatsApp
- Google Ads
- Property portals
- Referral
- Phone
- Walk-in
- Manual
- Import
- Other

## LEAD STATUSES

Example:

New
Contacted
Qualified
Unqualified
Viewing Scheduled
Negotiation
Reserved
Won
Lost

Statuses should be configurable.

## LEAD TIMELINE

Every lead must have a chronological activity timeline.

Examples:

- Lead created
- Assigned to agent
- Status changed
- Call logged
- WhatsApp conversation
- Email sent
- Note added
- Viewing scheduled
- Property added
- Offer created
- Deal created
- Payment received

---

# 9. LEAD SCORING

Implement configurable lead scoring.

Example signals:

+10 valid phone
+10 WhatsApp available
+10 budget provided
+15 qualified
+15 viewing scheduled
+20 viewing completed
+20 offer created
+30 reservation

Allow administrators to configure scoring rules later.

Display:

- Score
- Score category
- Hot
- Warm
- Cold

---

# 10. AUTOMATIC LEAD ASSIGNMENT

Support configurable assignment strategies:

- Round robin
- Agent with least active leads
- Geographic assignment
- Team assignment
- Manual assignment

Example:

New Facebook lead
→ Campaign detected
→ Source recorded
→ Matching team selected
→ Agent automatically assigned
→ Agent notified
→ Follow-up task created

---

# 11. CUSTOMER MANAGEMENT

A customer may originate from a lead.

Customer profile must include:

- Personal information
- Contact information
- Preferences
- Budget
- Requirements
- Documents
- Lead history
- Viewing history
- Offers
- Reservations
- Deals
- Payments
- Communication history
- Notes
- Tasks

One customer may have multiple deals.

---

# 12. PROPERTY MANAGEMENT

Create a hierarchical property architecture:

PROJECT
→ BUILDING
→ FLOOR
→ UNIT

Support:

- Residential
- Commercial
- Administrative
- Retail
- Land
- Other

## PROJECT

Fields:

- Name
- Developer
- Location
- Address
- Latitude
- Longitude
- Description
- Amenities
- Images
- Videos
- Completion date
- Status
- Starting price
- Payment plans

## BUILDING

Fields:

- Name
- Building number
- Floors
- Project
- Description

## UNIT

Fields:

- Unit number
- Building
- Floor
- Type
- Area
- Bedrooms
- Bathrooms
- View
- Orientation
- Price
- Price per meter
- Status
- Finishing
- Delivery date
- Payment plan
- Images
- Notes

---

# 13. UNIT STATUS

Support:

- Available
- On Hold
- Reserved
- Contracted
- Sold
- Rented
- Unavailable

Status changes must be tracked in the audit log.

Prevent two agents from successfully reserving the same unit simultaneously.

Use proper transaction handling / concurrency control.

---

# 14. PROPERTY MATCHING ENGINE

Build a property recommendation system.

Given a customer's:

- Budget
- Location
- Property type
- Bedrooms
- Area
- Purpose
- Payment preference

The system should identify matching properties.

Display:

MATCH SCORE

Example:

92% Match

Reasons:

✓ Within budget
✓ Preferred location
✓ Correct property type
✓ Meets bedroom requirement
✓ Suitable area

Allow agents to save recommended properties to a customer.

---

# 15. SALES PIPELINE

Create a Kanban pipeline.

Default stages:

New Lead
Contacted
Qualified
Property Matching
Viewing Scheduled
Viewing Completed
Offer
Negotiation
Reservation
Contract
Closed Won
Closed Lost

Each opportunity should show:

- Customer
- Agent
- Property
- Unit
- Deal value
- Probability
- Expected close date
- Next action
- Last activity

Allow custom pipeline stages.

---

# 16. VIEWINGS

Create a dedicated viewing management system.

Viewing fields:

- Customer
- Lead
- Agent
- Property
- Unit
- Date
- Start time
- End time
- Location
- Status
- Notes
- Customer feedback
- Agent feedback
- Outcome
- Next action

Statuses:

Scheduled
Confirmed
Completed
Cancelled
No-show
Rescheduled

Integrate viewings with the calendar.

---

# 17. OFFERS

Agents should be able to create offers.

Offer fields:

- Customer
- Property
- Unit
- Original price
- Offered price
- Discount
- Payment plan
- Down payment
- Installments
- Offer expiry
- Status
- Notes

Statuses:

Draft
Sent
Accepted
Rejected
Expired
Withdrawn

---

# 18. RESERVATIONS

Create a reservation workflow.

Reservation contains:

- Customer
- Unit
- Agent
- Reservation date
- Reservation amount
- Expiry date
- Payment status
- Reservation document
- Notes

Unit should automatically become:

AVAILABLE → RESERVED

when a valid reservation is created.

Expired reservations should be detectable automatically.

---

# 19. DEAL MANAGEMENT

A deal represents the actual transaction.

Fields:

- Customer
- Property
- Unit
- Sales agent
- Manager
- Sale price
- Discount
- Net sale value
- Payment plan
- Contract date
- Closing date
- Deal status
- Commission
- Documents

Deal statuses:

Draft
Reserved
Contracted
Partially Paid
Completed
Cancelled

---

# 20. PAYMENT MANAGEMENT

Implement real payment tracking.

Payment fields:

- Deal
- Customer
- Amount
- Currency
- Payment method
- Payment date
- Reference number
- Status
- Receipt
- Notes

Payment methods:

- Cash
- Bank transfer
- Card
- Cheque
- Other

---

# 21. INSTALLMENT MANAGEMENT

Support payment plans.

Example:

Property price:
5,000,000

Down payment:
1,000,000

Remaining:
4,000,000

Installments:
40 × 100,000

Generate installment schedule automatically.

Each installment:

- Due date
- Amount
- Paid amount
- Remaining
- Status
- Payment date
- Overdue days

Statuses:

Upcoming
Due
Partially Paid
Paid
Overdue
Cancelled

---

# 22. COMMISSION ENGINE

Build a configurable commission system.

Commission can depend on:

- Agent
- Team
- Property
- Project
- Developer
- Deal value
- Commission percentage
- Fixed commission
- Tier

Example:

Deal = 5,000,000

Agent commission = 2%

Agent commission = 100,000

Support multiple commission recipients.

Example:

Agent: 2%
Manager: 0.5%
Company: remaining

Commission statuses:

Pending
Approved
Payable
Paid
Cancelled

---

# 23. TASK MANAGEMENT

Users should be able to create:

- Calls
- Follow-ups
- Meetings
- Viewings
- Emails
- WhatsApp follow-ups
- General tasks

Each task:

- Title
- Type
- Related lead
- Customer
- Deal
- Assigned user
- Due date
- Priority
- Status
- Notes

Statuses:

Pending
In Progress
Completed
Cancelled

---

# 24. SMART FOLLOW-UP SYSTEM

The system should identify leads that need attention.

Examples:

"No contact in 3 days"

"Follow-up overdue"

"Viewing tomorrow"

"Offer expires tomorrow"

"Reservation expires today"

"Installment overdue"

Display these as actionable alerts.

---

# 25. CALENDAR

Create calendar views:

- Day
- Week
- Month

Show:

- Tasks
- Calls
- Meetings
- Viewings
- Follow-ups
- Important deal dates

---

# 26. COMMUNICATION CENTER

Create a unified communication layer.

Support architecture for:

- WhatsApp
- Email
- SMS
- Phone call logs

Every communication should be associated with the relevant:

Lead
Customer
Deal

Store communication history.

---

# 27. WHATSAPP

Design a provider abstraction so the application is not locked to one WhatsApp provider.

Architecture should allow:

WhatsAppProvider
├── Provider A
├── Provider B
└── Provider C

Support:

- Incoming messages
- Outgoing messages
- Templates
- Attachments
- Conversation history
- Agent assignment
- Webhooks
- Delivery status
- Read status

Do NOT hard-code the CRM around one WhatsApp vendor.

---

# 28. MARKETING

Create marketing attribution.

Campaign fields:

- Name
- Platform
- Budget
- Start date
- End date
- Source
- Leads
- Qualified leads
- Viewings
- Reservations
- Sales
- Revenue
- ROI

Track:

Campaign
→ Lead
→ Opportunity
→ Viewing
→ Reservation
→ Deal
→ Revenue

This allows management to determine which marketing channels actually generate sales.

---

# 29. DOCUMENT MANAGEMENT

Allow documents to be associated with:

- Leads
- Customers
- Deals
- Reservations
- Properties

Examples:

- ID
- Contract
- Reservation form
- Payment receipt
- Property documents
- Other attachments

Store metadata securely.

Do not expose private documents through public URLs.

---

# 30. NOTIFICATION SYSTEM

Implement notifications for:

- New lead
- Lead assignment
- New task
- Overdue task
- New viewing
- Viewing reminder
- Offer update
- Reservation created
- Reservation expiry
- Payment received
- Installment overdue
- Deal status change

Support:

- In-app notifications
- Email notification architecture
- WhatsApp notification architecture

---

# 31. SEARCH

Implement global search.

Search across:

- Leads
- Customers
- Properties
- Units
- Deals
- Reservations
- Tasks

Search should support:

- Name
- Phone
- Email
- Unit number
- Property name
- Deal ID

---

# 32. FILTERING

Every major data table should support:

- Search
- Filters
- Sorting
- Pagination
- Date ranges
- Status
- Assigned agent
- Team
- Source
- Property
- Project

Filters should be reusable.

---

# 33. REPORTING

Create professional reports.

## Sales Reports

- Sales by agent
- Sales by project
- Sales by property
- Sales by month
- Sales by source
- Revenue
- Average deal value

## Lead Reports

- Leads by source
- Leads by agent
- Conversion rate
- Lead response time
- Lost leads
- Lost reasons

## Financial Reports

- Revenue
- Payments
- Outstanding installments
- Overdue installments
- Commission liabilities

## Performance Reports

- Agent leaderboard
- Calls
- Follow-ups
- Viewings
- Offers
- Reservations
- Closed deals

---

# 34. AUDIT LOG

Every sensitive action should be logged.

Examples:

- User login
- Lead assignment
- Lead deletion
- Property modification
- Unit status change
- Reservation
- Payment
- Commission change
- Role change
- Permission change

Audit log:

- User
- Action
- Entity
- Entity ID
- Previous value
- New value
- IP
- Timestamp

Audit logs must be immutable to normal users.

---

# 35. SETTINGS

Company settings:

- Company profile
- Logo
- Currency
- Timezone
- Language
- Number formats
- Lead statuses
- Pipeline stages
- Property types
- Lead sources
- Commission rules
- Notification preferences
- WhatsApp settings
- Email settings

---

# 36. INTERNATIONALIZATION

The platform must be designed for:

- English
- Arabic

Support:

- RTL
- LTR
- Arabic typography
- Localized dates
- Localized numbers
- Currency formatting

Do not hard-code UI text.

All user-facing strings should be translation-ready.

---

# 37. UI/UX DIRECTION

The interface must feel like a premium modern SaaS product.

Design inspiration:

- Linear
- Stripe Dashboard
- Vercel
- Notion
- HubSpot
- Salesforce

But DO NOT copy their UI.

Create an original visual language.

Characteristics:

- Clean
- Premium
- Minimal
- Professional
- High information density
- Excellent spacing
- Clear hierarchy
- Subtle borders
- Elegant cards
- Modern tables
- Powerful filters
- Excellent empty states
- Excellent loading states
- Excellent error states

Avoid:

- Excessive gradients
- Huge rounded cards
- Unnecessary animations
- Cheap-looking dashboards
- Excessive shadows
- Generic template appearance

---

# 38. RESPONSIVE DESIGN

The application must work on:

- Desktop
- Laptop
- Tablet
- Mobile

Desktop is the primary experience.

Tables must become usable mobile layouts rather than simply overflowing horizontally.

---

# 39. DATABASE ARCHITECTURE

Use a relational database.

Recommended:

PostgreSQL.

Core entities should include approximately:

Organization
User
Role
Permission
Team
Lead
Customer
LeadSource
Campaign
Property
Project
Developer
Building
Unit
UnitStatusHistory
PropertyFeature
Viewing
Offer
Reservation
Opportunity
Deal
Contract
Payment
Installment
PaymentPlan
Commission
CommissionRule
Task
Activity
Communication
Conversation
Message
Document
Notification
AuditLog
Subscription
Invoice
Setting

Design proper:

- Primary keys
- Foreign keys
- Unique constraints
- Indexes
- Cascades
- Soft deletion where appropriate

Avoid unnecessary database duplication.

---

# 40. DATABASE SECURITY

Tenant isolation is mandatory.

Never allow a request to access another organization's records.

Validate organization ownership server-side.

Use authorization checks in every protected service.

Do not trust:

- Frontend tenant IDs
- Frontend user IDs
- Frontend role information

The backend must derive identity from authenticated context.

---

# 41. API ARCHITECTURE

Create a clean REST API.

Organize endpoints by domain.

Examples:

/api/auth
/api/organizations
/api/users
/api/leads
/api/customers
/api/properties
/api/projects
/api/buildings
/api/units
/api/viewings
/api/offers
/api/reservations
/api/deals
/api/payments
/api/installments
/api/commissions
/api/tasks
/api/calendar
/api/communications
/api/reports
/api/notifications

Use:

- DTO validation
- Authentication guards
- Authorization
- Pagination
- Filtering
- Sorting
- Error handling
- Consistent response structures

---

# 42. BACKEND ARCHITECTURE

Use modular architecture.

Prefer:

Domain-driven modules
+
Clean Architecture principles
+
SOLID
+
Separation of concerns

Do not create a giant monolithic service file.

Each domain should have clear:

- Controller
- Service / Use Cases
- Repository
- DTO
- Domain models
- Validation
- Authorization

Business logic must live in the backend/domain layer rather than React components.

---

# 43. FRONTEND ARCHITECTURE

Use a scalable component architecture.

Organize by:

- Features
- Shared UI
- Layouts
- Hooks
- API clients
- State
- Utilities
- Types

Avoid massive components.

Avoid duplicated UI logic.

Use reusable components for:

- Data tables
- Filters
- Modals
- Forms
- Drawers
- Status badges
- Charts
- Empty states
- Loading states
- Confirmation dialogs

---

# 44. AUTHENTICATION

Implement secure authentication.

Support architecture for:

- Email/password
- Password reset
- Email verification
- Session management
- Role-based authorization
- Organization membership

Design the system so SSO can be added later.

Never store plaintext passwords.

---

# 45. SECURITY

Follow enterprise security principles.

Protect against:

- SQL injection
- XSS
- CSRF where applicable
- IDOR
- Broken access control
- Mass assignment
- Tenant leakage
- Unauthorized file access
- Rate abuse

Validate all inputs server-side.

Never trust client-side authorization.

Implement rate limiting where appropriate.

---

# 46. PERFORMANCE

The CRM may eventually contain:

- Millions of leads
- Hundreds of thousands of customers
- Large property inventories
- Large communication histories

Therefore:

- Index database queries
- Paginate large datasets
- Avoid N+1 queries
- Lazy load heavy resources
- Cache appropriate data
- Optimize dashboard queries
- Avoid loading entire datasets into the browser

---

# 47. CONCURRENCY

Pay special attention to:

- Unit reservations
- Payments
- Installments
- Commission calculations

Example:

Two agents attempt to reserve the same unit at exactly the same time.

Only one reservation should succeed.

Use database transactions and appropriate locking / unique constraints.

---

# 48. FILE STORAGE

Use private object storage for documents.

Separate:

Public assets
from
Private customer documents.

Implement:

- Upload validation
- File size limits
- MIME validation
- Secure access
- Signed URLs where appropriate

---

# 49. ERROR HANDLING

Create consistent errors.

Examples:

400 → Validation Error
401 → Unauthenticated
403 → Forbidden
404 → Not Found
409 → Conflict
422 → Business Rule Violation
429 → Rate Limited
500 → Internal Error

Never expose sensitive internal errors to users.

---

# 50. UX STATES

Every major feature must have:

- Loading state
- Empty state
- Error state
- Success state
- Confirmation state

Example:

Empty leads:

"No leads yet"

with CTA:

"Add Lead"

---

# 51. DATA TABLE UX

Tables should support:

- Column visibility
- Sorting
- Filtering
- Pagination
- Search
- Row actions
- Bulk actions
- Export architecture

Avoid overwhelming users.

Prioritize the most important fields.

---

# 52. BULK ACTIONS

Support bulk actions for leads:

- Assign agent
- Change status
- Add tag
- Delete/archive
- Export
- Create task

But destructive bulk actions must require confirmation.

---

# 53. IMPORT / EXPORT

Build architecture for:

CSV import
CSV export
Excel import/export where appropriate.

Import workflow:

Upload
→ Validate
→ Preview
→ Detect duplicates
→ Confirm
→ Import
→ Report results

Do not silently import invalid data.

---

# 54. DUPLICATE DETECTION

Detect potential duplicate leads using:

- Phone
- Email
- WhatsApp number

When a duplicate is detected:

Show warning.

Allow:

- Merge
- Keep separate
- Cancel

Do not automatically destroy data.

---

# 55. ACTIVITY TIMELINE

Create a reusable timeline component.

It should display events from multiple modules.

Example:

10:30 — Lead created
10:32 — Assigned to Ahmed
11:00 — WhatsApp sent
13:20 — Call completed
Tomorrow — Viewing scheduled
Next week — Offer created

This timeline should become a core CRM UX pattern.

---

# 56. GLOBAL COMMAND / QUICK ACTION SYSTEM

Add a command menu.

Example:

Search:
"Ahmed"

Actions:

- Add lead
- Add customer
- Add property
- Schedule viewing
- Create task
- Create reservation

Keyboard shortcut:

CMD/CTRL + K

---

# 57. NOTIFICATION CENTER

Add a notification bell.

Show:

- New lead
- Assignment
- Reminder
- Viewing
- Payment
- Reservation
- Deal updates

Unread count should be visible.

---

# 58. PLATFORM ADMIN

Create a separate Super Admin environment.

Super Admin can see:

- Total organizations
- Active organizations
- Users
- Leads across platform
- Subscription status
- Usage
- Revenue
- System health

Super Admin must be clearly separated from tenant application data.

---

# 59. SAAS BILLING ARCHITECTURE

Design the system for subscription plans.

Example:

STARTER
PRO
BUSINESS
ENTERPRISE

Plans may limit:

- Users
- Leads
- Properties
- WhatsApp conversations
- Storage
- Automations
- Reports

Do not hard-code plan limits directly into UI.

Create a feature/entitlement system.

---

# 60. AUTOMATION ENGINE

Design a future-proof automation engine.

Example:

WHEN:
Lead created

IF:
Source = Facebook

THEN:
Assign to Sales Team A
+
Create follow-up task
+
Send WhatsApp template

Another example:

WHEN:
Viewing completed

THEN:
Create follow-up task after 1 day

Architecture should allow future automation rules without rewriting the CRM.

---

# 61. AI-READY ARCHITECTURE

Do not make AI mandatory for the MVP, but design the architecture so AI can be added.

Future AI features:

- Lead scoring
- Lead qualification
- Property recommendations
- Conversation summaries
- Next-best-action
- Follow-up suggestions
- Sales forecasting
- Customer intent detection
- AI receptionist
- AI WhatsApp agent

Create service boundaries that allow these features later.

---

# 62. REAL ESTATE-SPECIFIC ANALYTICS

Important KPIs:

Lead → Contact Rate
Contact → Qualified Rate
Qualified → Viewing Rate
Viewing → Offer Rate
Offer → Reservation Rate
Reservation → Sale Rate

Also:

Average Response Time
Average Sales Cycle
Average Deal Value
Revenue per Agent
Revenue per Source
Revenue per Project
Revenue per Property Type
Lost Lead Rate
Viewing No-show Rate

---

# 63. SALES FORECASTING

Create architecture for:

Pipeline value
Weighted pipeline value
Expected revenue
Expected closing date

Example:

Deal value = 5M
Probability = 60%

Weighted pipeline = 3M

Do not present predictive analytics as guaranteed revenue.

---

# 64. BUSINESS RULES

Implement business rules such as:

- A sold unit cannot be reserved.
- A reserved unit cannot be reserved again.
- A cancelled reservation can release a unit.
- Payment cannot exceed deal amount unless explicitly allowed.
- Installment totals should match payment plan.
- Commission should be recalculated when deal values change.
- Only authorized users can modify financial data.
- Closed deals should have controlled editing.
- Critical financial changes must be audited.

---

# 65. DEVELOPMENT WORKFLOW

DO NOT attempt to generate an enormous amount of disconnected code blindly.

Work systematically.

PHASE 1:
Architecture

PHASE 2:
Database

PHASE 3:
Authentication + RBAC

PHASE 4:
Core CRM

PHASE 5:
Properties

PHASE 6:
Sales pipeline

PHASE 7:
Viewings + Offers + Reservations

PHASE 8:
Deals + Payments + Installments

PHASE 9:
Commissions

PHASE 10:
Communication

PHASE 11:
Reports + Analytics

PHASE 12:
Automation

PHASE 13:
Billing

PHASE 14:
Security + QA

PHASE 15:
Production deployment

---

# 66. IMPLEMENTATION PRIORITY

Prioritize the MVP in this exact order:

## LEVEL 1 — CORE CRM

- Authentication
- Organizations
- Users
- Roles
- Leads
- Customers
- Tasks
- Activity timeline
- Dashboard

## LEVEL 2 — REAL ESTATE

- Projects
- Properties
- Buildings
- Units
- Property matching
- Viewings

## LEVEL 3 — SALES

- Pipeline
- Offers
- Reservations
- Deals

## LEVEL 4 — FINANCE

- Payment plans
- Installments
- Payments
- Commissions

## LEVEL 5 — COMMUNICATION

- WhatsApp architecture
- Conversations
- Messages
- Notifications

## LEVEL 6 — BUSINESS INTELLIGENCE

- Reports
- Analytics
- Sales forecasting
- Marketing attribution

## LEVEL 7 — AUTOMATION / AI

- Automation engine
- AI-ready services
- Smart lead scoring
- AI recommendations

---

# 67. TECH STACK

Unless there is a compelling technical reason otherwise, use:

Frontend:
Next.js
TypeScript

UI:
Tailwind CSS
shadcn/ui or equivalent high-quality component system

Backend:
NestJS
TypeScript

Database:
PostgreSQL

ORM:
Prisma

Validation:
Zod and/or class-validator depending on architecture

Authentication:
Secure production-grade authentication system

Storage:
S3-compatible object storage

API:
REST

Charts:
A mature React charting library

Testing:
Unit tests
Integration tests
E2E tests

Deployment architecture:
Container-ready
Production-ready
Environment-based configuration

---

# 68. CODE QUALITY

Use:

- Strict TypeScript
- ESLint
- Formatting
- Strong typing
- DTO validation
- Reusable abstractions
- Clear naming
- Small functions
- Modular architecture

Avoid:

- any abuse
- duplicated logic
- magic strings
- giant files
- giant components
- business logic inside UI
- insecure shortcuts

---

# 69. TESTING

Create tests for critical workflows.

At minimum:

## Authentication

- Login
- Logout
- Authorization

## Multi-tenancy

- Organization isolation
- Cross-tenant access prevention

## Leads

- Create
- Update
- Assignment
- Duplicate detection

## Properties

- Create project
- Create unit
- Update availability

## Reservations

- Reserve unit
- Prevent duplicate reservation
- Cancel reservation

## Payments

- Create payment
- Update installment

## Commissions

- Calculate commission

## Permissions

- Agent cannot access restricted resources
- Manager access works correctly

---

# 70. SEED DATA

Create realistic seed data for development.

Include:

- One demo organization
- Several users
- Sales manager
- Agents
- Projects
- Buildings
- Units
- Leads
- Customers
- Viewings
- Deals
- Payments

Seed data must clearly be development/demo data.

---

# 71. README

Create an excellent README.

Include:

- Project overview
- Architecture
- Tech stack
- Folder structure
- Environment variables
- Database setup
- Migration instructions
- Seed instructions
- Development commands
- Testing
- Production deployment
- Security notes

---

# 72. ENVIRONMENT VARIABLES

Never hard-code:

- Database credentials
- API keys
- JWT secrets
- Storage credentials
- WhatsApp credentials
- Email credentials
- Payment provider credentials

Use environment variables.

Create a `.env.example`.

Never commit real secrets.

---

# 73. PRODUCTION DEPLOYMENT

Prepare the application for production.

Include:

- Build scripts
- Database migrations
- Health checks
- Logging
- Error monitoring architecture
- Environment configuration
- Secure headers
- HTTPS assumptions
- Backup strategy documentation

---

# 74. DESIGN DETAILS

Use a professional application shell.

Desktop:

LEFT SIDEBAR
+
TOP BAR
+
MAIN CONTENT

Sidebar:

Dashboard
Leads
Customers
Pipeline
Properties
Viewings
Deals
Payments
Commissions
Tasks
Calendar
Communication
Reports
Team
Settings

Top bar:

Global Search
Quick Create
Notifications
Help
Profile

---

# 75. LEAD DETAIL PAGE

This page is extremely important.

Layout:

Header:
Name
Status
Lead score
Assigned agent
Actions

Main content:

Contact information
Requirements
Timeline
Tasks
Communication
Properties
Viewings
Offers
Deals

Right side:

Next follow-up
Lead source
Campaign
Tags
Important metadata

Make this one of the strongest pages in the product.

---

# 76. CUSTOMER DETAIL PAGE

Show:

Profile
Requirements
Communication
Activity
Viewings
Saved properties
Offers
Reservations
Deals
Payments
Documents

Everything related to the customer should be accessible from one place.

---

# 77. PROPERTY DETAIL PAGE

Show:

Property overview
Images
Location
Project
Units
Availability
Pricing
Payment plans
Features
Interested customers
Viewings
Sales performance

---

# 78. UNIT DETAIL PAGE

Show:

Unit number
Project
Building
Floor
Type
Area
Price
Availability
Payment plan
Reservation status
Buyer
Agent
Deal
Payment status

Provide clear CTA:

Reserve Unit

But enforce backend validation before reservation.

---

# 79. DEAL DETAIL PAGE

Show:

Customer
Property
Unit
Agent
Deal value
Pipeline stage
Payment plan
Installments
Payments
Commission
Documents
Timeline
Audit history

---

# 80. MOBILE EXPERIENCE

On mobile prioritize:

- Leads
- Calls
- Follow-ups
- Viewings
- Customers
- Notifications

Sales agents should be able to manage their daily work from a phone.

---

# 81. ACCESSIBILITY

Follow WCAG principles.

Support:

- Keyboard navigation
- Proper labels
- Focus states
- Screen reader compatibility
- Sufficient contrast
- Semantic HTML

---

# 82. SEO

The authenticated CRM itself does not need heavy SEO.

Public-facing pages, if included later, should be SEO-ready.

Keep the architecture flexible for a future:

Public Property Portal
+
CRM

combination.

---

# 83. FUTURE PROPERTY PORTAL

Do not build it now unless required.

But architecture should allow a future public website where:

Visitors can:

- Browse properties
- Filter units
- View projects
- Submit inquiries
- Request viewing
- Contact agents

Those inquiries should automatically enter the CRM as leads.

---

# 84. IMPORTANT UX PHILOSOPHY

The CRM should always answer:

"What should I do next?"

For an agent:

- Who needs a follow-up?
- Who is ready to buy?
- Which viewings are today?
- Which offers are waiting?
- Which reservations are expiring?
- Which leads are becoming cold?

For a manager:

- Which agents are performing?
- Which sources produce revenue?
- Where are leads dropping?
- Which projects are selling?
- What is the pipeline worth?
- What revenue is expected?

For management:

- How much did we sell?
- How much are we expected to sell?
- Where is revenue coming from?
- What is outstanding?
- How much commission do we owe?

---

# 85. NON-FUNCTIONAL REQUIREMENTS

The application should be:

Reliable
Secure
Observable
Maintainable
Scalable
Testable

Do not optimize prematurely, but avoid architectural decisions that make future scaling difficult.

---

# 86. IMPORTANT DEVELOPMENT RULE

Do not sacrifice functionality for visual appearance.

The application must have REAL:

- CRUD
- Authentication
- Authorization
- Database persistence
- Validation
- Business logic
- Transactions
- Error handling

A beautiful UI with fake buttons is NOT acceptable.

---

# 87. IMPORTANT DESIGN RULE

Do not make every screen look like the same generic dashboard.

Different modules should have interfaces appropriate to their workflow.

Examples:

Leads → CRM table + pipeline
Properties → Inventory management
Units → Property inventory grid/table
Viewings → Calendar
Deals → Sales workspace
Payments → Financial tables
Analytics → Data visualization

---

# 88. IMPLEMENTATION RULE

Before writing substantial code:

1. Analyze the requirements.
2. Identify architectural risks.
3. Define the domain model.
4. Define database relationships.
5. Define API boundaries.
6. Define authorization model.
7. Define folder structure.
8. Define implementation phases.

Then implement.

Do not repeatedly ask me to confirm obvious implementation decisions.

Make sensible engineering decisions yourself.

Only ask questions when the decision would materially change the architecture or product.

---

# 89. FILE GENERATION RULE

When building the project:

Create the actual project files.

Do not merely explain what the files should contain.

Do not give pseudo-code where production code is expected.

Do not omit critical files.

Keep dependencies minimal and justified.

---

# 90. FINAL QUALITY STANDARD

Before considering the project complete, verify:

- Can a company sign up?
- Can users log in?
- Can users be assigned roles?
- Is tenant isolation enforced?
- Can agents create leads?
- Can managers assign leads?
- Can customers be created?
- Can properties be created?
- Can units be managed?
- Can customers be matched with properties?
- Can viewings be scheduled?
- Can offers be created?
- Can units be reserved?
- Can deals be created?
- Can payment plans be generated?
- Can payments be recorded?
- Can commissions be calculated?
- Can managers see performance?
- Are activities audited?
- Are permissions enforced?
- Are important workflows tested?

If any answer is NO, the implementation is not complete.

---

# 91. YOUR EXECUTION INSTRUCTION

Start by treating this as a REAL SOFTWARE PRODUCT, not a coding exercise.

First produce:

1. Product architecture
2. System architecture
3. Domain model
4. Database schema
5. RBAC model
6. API architecture
7. Frontend architecture
8. Folder structure
9. Implementation roadmap

Then begin implementation.

Build the application incrementally.

After each major module:

- Validate types
- Validate database relationships
- Validate authorization
- Validate critical workflows
- Add tests
- Fix errors
- Continue

Never knowingly leave broken code behind.

When you encounter a technical issue, diagnose the root cause and fix it rather than working around it with an insecure or temporary hack.

The final result should feel like a serious commercial product that a real estate company could use every day.

The ultimate product positioning is:

> **A complete Real Estate Sales Operating System — from first lead to final payment.**

Build it accordingly.
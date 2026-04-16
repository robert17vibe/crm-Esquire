// ─── Enums ───────────────────────────────────────────────────────────────────

export type DealStage =
  | 'prospecting'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost'

export type ActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'task'
  | 'note'
  | 'linkedin'

export type ContactRole =
  | 'champion'
  | 'economic_buyer'
  | 'decision_maker'
  | 'influencer'
  | 'user'
  | 'blocker'

export type Priority = 'low' | 'medium' | 'high' | 'critical'

// ─── Core entities ───────────────────────────────────────────────────────────

export interface Company {
  id: string
  name: string
  domain?: string
  industry?: string
  size?: string // '1-50' | '51-200' | '201-1000' | '1000+'
  website?: string
  linkedin?: string
  country?: string
  city?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Contact {
  id: string
  companyId?: string
  company?: Company
  firstName: string
  lastName: string
  email?: string
  phone?: string
  role?: ContactRole
  jobTitle?: string
  linkedin?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Deal {
  id: string
  companyId: string
  company?: Company
  title: string
  value: number
  currency: string
  stage: DealStage
  probability?: number // 0-100
  expectedCloseDate?: string
  ownerId: string
  owner?: User
  contacts?: DealContact[]
  tags?: string[]
  lostReason?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface DealContact {
  contactId: string
  contact?: Contact
  role?: ContactRole
  isPrimary: boolean
}

export interface Activity {
  id: string
  dealId?: string
  deal?: Deal
  contactId?: string
  contact?: Contact
  companyId?: string
  type: ActivityType
  subject: string
  description?: string
  dueDate?: string
  completedAt?: string
  priority?: Priority
  ownerId: string
  owner?: User
  createdAt: string
  updatedAt: string
}

export interface Meeting {
  id: string
  dealId?: string
  deal?: Deal
  title: string
  scheduledAt: string
  durationMinutes?: number
  attendees?: string[]
  plaudNoteId?: string       // Integração Plaud Note
  transcriptUrl?: string
  transcriptText?: string
  aiSummary?: string         // Resumo gerado por IA
  keyPoints?: string[]
  actionItems?: string[]
  recordingUrl?: string
  ownerId: string
  owner?: User
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: 'admin' | 'manager' | 'sales'
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export interface PipelineColumn {
  stage: DealStage
  label: string
  color: string
  deals: Deal[]
  totalValue: number
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalPipelineValue: number
  dealsCount: number
  activitiesThisWeek: number
  meetingsThisWeek: number
  wonDealsThisMonth: number
  wonValueThisMonth: number
  conversionRate: number
  avgCycleLength: number // days
}

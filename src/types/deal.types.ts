import type { StageId } from '@/constants/pipeline'

export interface Owner {
  id: string
  name: string
  initials: string
  avatar_color: string
}

export interface Stakeholder {
  initials: string
  color: string
  name: string
}

export interface NextActivity {
  type: 'meeting' | 'call' | 'task' | 'email'
  label: string
  due_date: string
}

export type CompanySize = '1-50' | '51-200' | '201-1000' | '1000+'
export type ArrRange   = '<100k' | '100k-500k' | '500k-1M' | '>1M'
export type LeadSource = 'Indicação' | 'Inbound' | 'Outbound' | 'Evento'

export interface Deal {
  id: string
  company_id: string

  // ── Deal ──────────────────────────────────────────────
  title: string
  stage_id: StageId
  value: number
  currency: string
  probability: number
  days_in_stage: number
  expected_close?: string
  notes?: string
  tags?: string[]

  // ── Owner / stakeholders ──────────────────────────────
  owner_id: string
  owner: Owner
  stakeholders?: Stakeholder[]

  // ── Activity ──────────────────────────────────────────
  next_activity?: NextActivity | null
  last_activity_at?: string

  // ── Primary contact ───────────────────────────────────
  contact_name?: string
  contact_title?: string
  contact_email?: string
  contact_phone?: string
  contact_linkedin?: string

  // ── Company ───────────────────────────────────────────
  company_name: string
  company_website?: string
  company_sector?: string
  company_size?: CompanySize
  company_arr_range?: ArrRange

  // ── Lead metadata ─────────────────────────────────────
  lead_source?: LeadSource
  loss_reason?: string | null

  // ── Timestamps ───────────────────────────────────────
  created_at: string
  updated_at: string
}

export type GroupedDeals = Record<StageId, Deal[]>

// ─── Activity timeline entry ──────────────────────────────────────────────────

export interface DealActivity {
  id: string
  deal_id: string
  type: 'call' | 'email' | 'meeting' | 'task' | 'note'
  subject: string
  body?: string
  owner: Owner
  created_at: string
  meeting_id?: string
}

// ─── Meeting (Plaud Note integration) ────────────────────────────────────────

export interface DealMeeting {
  id: string
  deal_id: string
  title: string
  scheduled_at: string
  duration_minutes: number
  attendees: string[]
  plaud_note_id?: string
  transcript_excerpt?: string
  ai_summary?: string
  key_points?: string[]
  action_items?: string[]
  owner: Owner
}

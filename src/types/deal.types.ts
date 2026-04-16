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
  next_activity?: NextActivity
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

  // ── Timestamps ───────────────────────────────────────
  created_at: string
  updated_at: string
}

export type GroupedDeals = Record<StageId, Deal[]>

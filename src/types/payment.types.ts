export type ContractFrequency = 'one_time' | 'monthly' | 'quarterly' | 'yearly'
export type ContractStatus    = 'draft' | 'active' | 'paused' | 'cancelled' | 'completed'
export type PaymentStatus     = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded'
export type DeliveryStatus    = 'pending' | 'in_progress' | 'delivered' | 'cancelled'
export type SigningStatus     = 'unsigned' | 'pending_signature' | 'signed'

export interface Contract {
  id:              string
  deal_id:         string
  proposal_id?:    string | null
  owner_id?:       string | null
  value:           number
  installments:    number
  frequency:       ContractFrequency
  signed_at?:      string | null
  start_date?:     string | null
  end_date?:       string | null
  status:          ContractStatus
  contract_url?:   string | null
  notes?:          string | null
  delivery_status:  DeliveryStatus
  delivery_notes?:  string | null
  signing_status:   SigningStatus
  signing_token?:   string | null
  paused_at?:       string | null
  created_at:       string
  updated_at:       string
}

export interface Payment {
  id:             string
  contract_id:    string
  deal_id:        string
  owner_id?:      string | null
  installment_no: number
  amount:         number
  due_date:       string
  paid_at?:       string | null
  status:         PaymentStatus
  method?:        string | null
  reference?:     string | null
  notes?:         string | null
  created_at:     string
  updated_at:     string
}


export interface PaymentWithDeal extends Payment {
  contract?: {
    value: number
    frequency: ContractFrequency
    installments: number
  }
  deal_company_name: string
  deal_contact_name: string | null
}

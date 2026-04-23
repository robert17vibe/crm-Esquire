export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskType     = 'call' | 'email' | 'meeting' | 'follow_up' | 'other'

export interface Task {
  id:           string
  title:        string
  description?: string
  deal_id?:     string | null
  deal_title?:  string        // joined client-side
  assigned_to?: string | null
  created_by?:  string | null
  due_date?:    string | null  // date string YYYY-MM-DD
  completed_at?: string | null
  priority:     TaskPriority
  task_type:    TaskType
  created_at:   string
  updated_at:   string
}

export type TaskGroup = 'overdue' | 'today' | 'week' | 'future' | 'no_date' | 'done'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'
import { useMeetingStore } from './useMeetingStore'
import { useOwnerStore } from './useOwnerStore'
import type { Task, TaskPriority, TaskType } from '@/types/task.types'

interface NewTask {
  title:       string
  description?: string
  deal_id?:    string | null
  due_date?:   string | null
  priority?:   TaskPriority
  task_type?:  TaskType
}

interface TaskState {
  tasks:    Task[]
  loading:  boolean
  fetch:    () => Promise<void>
  create:   (t: NewTask) => Promise<string | null>
  complete: (id: string) => Promise<void>
  uncomplete:(id: string) => Promise<void>
  remove:   (id: string) => Promise<void>
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks:   [],
  loading: false,

  fetch: async () => {
    const userId = useAuthStore.getState().profile?.id
    if (!userId) return
    set({ loading: true })
    const { data } = await supabase
      .from('tasks')
      .select('*, deal:deals(title)')
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .order('due_date', { ascending: true, nullsFirst: false })
    set({
      loading: false,
      tasks: (data ?? []).map((row) => ({
        ...row,
        deal_title: (row.deal as { title?: string } | null)?.title ?? undefined,
        deal: undefined,
      })),
    })
  },

  create: async (t) => {
    const userId = useAuthStore.getState().profile?.id
    if (!userId) return null
    const payload = {
      title:       t.title.trim(),
      description: t.description ?? null,
      deal_id:     t.deal_id ?? null,
      due_date:    t.due_date ?? null,
      priority:    t.priority ?? 'medium',
      task_type:   t.task_type ?? 'other',
      assigned_to: userId,
      created_by:  userId,
    }
    const { data, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select('*, deal:deals(title)')
      .single()
    if (error || !data) return error?.message ?? 'Erro ao criar tarefa'
    const task: Task = { ...data, deal_title: (data.deal as { title?: string } | null)?.title ?? undefined, deal: undefined }
    set((s) => ({ tasks: [...s.tasks, task] }))

    // Sync meeting tasks → calendar
    if (t.task_type === 'meeting' && t.due_date && t.deal_id) {
      const owners = useOwnerStore.getState().owners
      const owner = owners.find((o) => o.id === userId) ?? owners[0]
      if (owner) {
        useMeetingStore.getState().addMeeting({
          deal_id: t.deal_id,
          title: t.title.trim(),
          scheduled_at: `${t.due_date}T09:00:00`,
          duration_minutes: 60,
          attendees: [],
          owner,
        }).catch(() => { /* non-blocking */ })
      }
    }

    return null
  },

  complete: async (id) => {
    const now = new Date().toISOString()
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, completed_at: now } : t) }))
    await supabase.from('tasks').update({ completed_at: now }).eq('id', id)
  },

  uncomplete: async (id) => {
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, completed_at: null } : t) }))
    await supabase.from('tasks').update({ completed_at: null }).eq('id', id)
  },

  remove: async (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    await supabase.from('tasks').delete().eq('id', id)
  },
}))

// Fetch on auth ready
useAuthStore.subscribe((s) => {
  if (s.profile?.id) {
    const state = useTaskStore.getState()
    if (state.tasks.length === 0 && !state.loading) state.fetch()
  }
})

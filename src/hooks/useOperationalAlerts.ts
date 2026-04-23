import { useEffect } from 'react'
import { useDealStore } from '@/store/useDealStore'
import { useNotificationStore } from '@/store/useNotificationStore'

const SLA_HOURS   = 48  // first-contact SLA threshold
const INACT_DAYS  = 21  // inactivity alert threshold

export function useOperationalAlerts() {
  const deals         = useDealStore((s) => s.deals)
  const addAlertIfNew = useNotificationStore((s) => s.addAlertIfNew)

  useEffect(() => {
    const now  = Date.now()
    const slaMs   = SLA_HOURS  * 3_600_000
    const inactMs = INACT_DAYS * 86_400_000

    deals.forEach((d) => {
      if (['closed_won', 'closed_lost'].includes(d.stage_id)) return

      // SLA breach: lead criado há +48h sem nenhuma atividade registrada
      const createdMs = new Date(d.created_at).getTime()
      if (!d.last_activity_at && now - createdMs > slaMs) {
        const hours = Math.round((now - createdMs) / 3_600_000)
        addAlertIfNew(d.id, d.company_name, 'sla_breach', `${hours}h sem primeiro contato`)
      }

      // Atividade vencida: next_activity com due_date no passado
      if (d.next_activity?.due_date) {
        const due = new Date(d.next_activity.due_date + 'T00:00:00').getTime()
        if (now > due) {
          const days = Math.round((now - due) / 86_400_000)
          addAlertIfNew(d.id, d.company_name, 'overdue_activity', `vencida há ${days}d — ${d.next_activity.label}`)
        }
      }

      // Inatividade prolongada (fallback: SLA já cobre o sem-atividade)
      if (d.last_activity_at) {
        const lastMs = new Date(d.last_activity_at).getTime()
        if (now - lastMs > inactMs) {
          const days = Math.round((now - lastMs) / 86_400_000)
          addAlertIfNew(d.id, d.company_name, 'overdue_activity', `${days}d sem atividade`)
        }
      }
    })
  // Run once per deals load, not on every addAlertIfNew change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals])
}

import { useDealStore } from '@/store/useDealStore'
import { useImpersonationStore } from '@/store/useImpersonationStore'

/** Returns deals filtered to the impersonated user's perspective (or all deals if not impersonating) */
export function useVisibleDeals() {
  const deals          = useDealStore((s) => s.deals)
  const impersonatedId = useImpersonationStore((s) => s.impersonatedId)

  if (!impersonatedId) return deals
  return deals.filter((d) => d.owner_id === impersonatedId)
}

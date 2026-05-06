-- ═══════════════════════════════════════════════════════════════════
-- Corrigir RLS em todas as tabelas secundárias
-- Objetivo: user vê APENAS os seus dados; admin vê tudo
-- Todas as secções são idempotentes e condicionais (IF EXISTS)
-- ═══════════════════════════════════════════════════════════════════

-- ── deal_relations ────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deal_relations') THEN
    DROP POLICY IF EXISTS "auth users can read deal_relations"   ON public.deal_relations;
    DROP POLICY IF EXISTS "auth users can insert deal_relations" ON public.deal_relations;
    DROP POLICY IF EXISTS "auth users can delete deal_relations" ON public.deal_relations;
    DROP POLICY IF EXISTS "deal_relations: select"              ON public.deal_relations;
    DROP POLICY IF EXISTS "deal_relations: insert"              ON public.deal_relations;
    DROP POLICY IF EXISTS "deal_relations: delete"              ON public.deal_relations;

    CREATE POLICY "deal_relations: select" ON public.deal_relations
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.deals d
          WHERE d.id = deal_id
            AND d.deleted_at IS NULL
            AND (d.owner_id = auth.uid()::text OR is_admin())
        )
      );
    CREATE POLICY "deal_relations: insert" ON public.deal_relations
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.deals d
          WHERE d.id = deal_id
            AND (d.owner_id = auth.uid()::text OR is_admin())
        )
      );
    CREATE POLICY "deal_relations: delete" ON public.deal_relations
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.deals d
          WHERE d.id = deal_id
            AND (d.owner_id = auth.uid()::text OR is_admin())
        )
      );
  END IF;
END $$;

-- ── deal_stakeholders_v2 ──────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deal_stakeholders_v2') THEN
    DROP POLICY IF EXISTS "auth users read deal_stakeholders_v2"   ON public.deal_stakeholders_v2;
    DROP POLICY IF EXISTS "auth users insert deal_stakeholders_v2" ON public.deal_stakeholders_v2;
    DROP POLICY IF EXISTS "auth users update deal_stakeholders_v2" ON public.deal_stakeholders_v2;
    DROP POLICY IF EXISTS "auth users delete deal_stakeholders_v2" ON public.deal_stakeholders_v2;
    DROP POLICY IF EXISTS "stakeholders: select"                   ON public.deal_stakeholders_v2;
    DROP POLICY IF EXISTS "stakeholders: insert"                   ON public.deal_stakeholders_v2;
    DROP POLICY IF EXISTS "stakeholders: update"                   ON public.deal_stakeholders_v2;
    DROP POLICY IF EXISTS "stakeholders: delete"                   ON public.deal_stakeholders_v2;

    CREATE POLICY "stakeholders: select" ON public.deal_stakeholders_v2
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.deleted_at IS NULL AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
    CREATE POLICY "stakeholders: insert" ON public.deal_stakeholders_v2
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
    CREATE POLICY "stakeholders: update" ON public.deal_stakeholders_v2
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
    CREATE POLICY "stakeholders: delete" ON public.deal_stakeholders_v2
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
  END IF;
END $$;

-- ── deal_stage_history ────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deal_stage_history') THEN
    DROP POLICY IF EXISTS "deal_stage_history_read"   ON public.deal_stage_history;
    DROP POLICY IF EXISTS "deal_stage_history_insert" ON public.deal_stage_history;
    DROP POLICY IF EXISTS "stage_history: select"     ON public.deal_stage_history;
    DROP POLICY IF EXISTS "stage_history: insert"     ON public.deal_stage_history;

    CREATE POLICY "stage_history: select" ON public.deal_stage_history
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.deleted_at IS NULL AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
    CREATE POLICY "stage_history: insert" ON public.deal_stage_history
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
  END IF;
END $$;

-- ── meeting_records ───────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_records') THEN
    DROP POLICY IF EXISTS "meeting_records_all"     ON public.meeting_records;
    DROP POLICY IF EXISTS "meeting_records: select" ON public.meeting_records;
    DROP POLICY IF EXISTS "meeting_records: write"  ON public.meeting_records;

    CREATE POLICY "meeting_records: select" ON public.meeting_records
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.deal_meetings m
          JOIN public.deals d ON d.id = m.deal_id
          WHERE m.id = meeting_id
            AND d.deleted_at IS NULL
            AND (d.owner_id = auth.uid()::text OR is_admin())
        )
      );
    CREATE POLICY "meeting_records: write" ON public.meeting_records
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.deal_meetings m
          JOIN public.deals d ON d.id = m.deal_id
          WHERE m.id = meeting_id
            AND (d.owner_id = auth.uid()::text OR is_admin())
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.deal_meetings m
          JOIN public.deals d ON d.id = m.deal_id
          WHERE m.id = meeting_id
            AND (d.owner_id = auth.uid()::text OR is_admin())
        )
      );
  END IF;
END $$;

-- ── renewal_proposals ─────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'renewal_proposals') THEN
    DROP POLICY IF EXISTS "renewal_proposals_all"     ON public.renewal_proposals;
    DROP POLICY IF EXISTS "renewal_proposals: select" ON public.renewal_proposals;
    DROP POLICY IF EXISTS "renewal_proposals: write"  ON public.renewal_proposals;

    CREATE POLICY "renewal_proposals: select" ON public.renewal_proposals
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.deleted_at IS NULL AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
    CREATE POLICY "renewal_proposals: write" ON public.renewal_proposals
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
  END IF;
END $$;

-- ── deal_materials ────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deal_materials') THEN
    DROP POLICY IF EXISTS "deal_materials_all"     ON public.deal_materials;
    DROP POLICY IF EXISTS "deal_materials: select" ON public.deal_materials;
    DROP POLICY IF EXISTS "deal_materials: write"  ON public.deal_materials;

    CREATE POLICY "deal_materials: select" ON public.deal_materials
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.deleted_at IS NULL AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
    CREATE POLICY "deal_materials: write" ON public.deal_materials
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
  END IF;
END $$;

-- ── deal_deliverables ─────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deal_deliverables') THEN
    DROP POLICY IF EXISTS "deal_deliverables_all"     ON public.deal_deliverables;
    DROP POLICY IF EXISTS "deal_deliverables: select" ON public.deal_deliverables;
    DROP POLICY IF EXISTS "deal_deliverables: write"  ON public.deal_deliverables;

    CREATE POLICY "deal_deliverables: select" ON public.deal_deliverables
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.deleted_at IS NULL AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
    CREATE POLICY "deal_deliverables: write" ON public.deal_deliverables
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
  END IF;
END $$;

-- ── deal_delivery_notes ───────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deal_delivery_notes') THEN
    DROP POLICY IF EXISTS "deal_delivery_notes_all"     ON public.deal_delivery_notes;
    DROP POLICY IF EXISTS "deal_delivery_notes: select" ON public.deal_delivery_notes;
    DROP POLICY IF EXISTS "deal_delivery_notes: write"  ON public.deal_delivery_notes;

    CREATE POLICY "deal_delivery_notes: select" ON public.deal_delivery_notes
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.deleted_at IS NULL AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
    CREATE POLICY "deal_delivery_notes: write" ON public.deal_delivery_notes
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
  END IF;
END $$;

-- ── proposals (propostas comerciais) ─────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposals') THEN
    DROP POLICY IF EXISTS "proposals_all"     ON public.proposals;
    DROP POLICY IF EXISTS "proposals: select" ON public.proposals;
    DROP POLICY IF EXISTS "proposals: write"  ON public.proposals;

    CREATE POLICY "proposals: select" ON public.proposals
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.deleted_at IS NULL AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
    CREATE POLICY "proposals: write" ON public.proposals
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.owner_id = auth.uid()::text OR is_admin()))
      );
  END IF;
END $$;

-- =============================================================================
-- Migration: 00008_realtime.sql
-- Enable realtime for selected tables (idempotent)
-- =============================================================================

-- ─── Enable realtime publication for selected tables ──────────────────────────
-- Supabase uses the `supabase_realtime` publication by default.
-- Wrapped in DO blocks to be idempotent on re-run.

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.leads;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.units;
exception when duplicate_object then null;
end $$;

# Algorithmic Art — SQL Reference

Reference copies of the Supabase migrations that power the Algorithmic Art feature.
The authoritative migrations live in `supabase/migrations/` — these are kept here
for convenience when working inside the `engines/` area.

## Files

- `20260404000001_add_sketch_config_to_summaries.sql` — adds `sketch_config JSONB` column to `summaries`
- `20260404000002_create_sketch_interactions.sql` — creates `sketch_interactions` tracking table with RLS
- `20260404000003_document_sketch_block_type.sql` — documents the new `sketch` block type for `summary_blocks`

## Keep in sync

If you edit a file here, mirror the change in `supabase/migrations/` (or vice versa).
The Supabase CLI only applies migrations from `supabase/migrations/`.

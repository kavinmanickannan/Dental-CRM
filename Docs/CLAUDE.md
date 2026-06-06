# CLAUDE.md — Pummelo Health App

## Slot Partition RLS (§6.3 / migration 004+)

When generating the monthly slot partition cron (migration 005 / §6.3), each
`CREATE TABLE sch.slots_YYYY_MM PARTITION OF sch.slots ...` must be immediately
followed by:

```sql
ALTER TABLE sch.slots_YYYY_MM ENABLE ROW LEVEL SECURITY;
CREATE POLICY slots_patient_read ON sch.slots_YYYY_MM
    FOR SELECT USING (status = 'open');
```

**Why:** PostgreSQL partition tables do not inherit RLS from the parent.
Direct access to a partition bypasses the parent's policies entirely.
Application queries always route through the parent `sch.slots`, but the
partition must be independently secured. Service role (Edge Functions, pg_cron)
bypasses RLS by default — no write policy is needed on partitions.

## Practitioner Login Setup

Practitioners are created by the admin onboarding flow without a usable password.
Admin approval at `/admin/practitioners/[id]/verify` now owns practitioner login
setup:

- Pending or rejected practitioners require an initial password before KYC can be
  approved and marked `verified`.
- Verified practitioners show a `Practitioner Login` management section where
  admins can set or reset the practitioner's password.
- Password changes use Supabase Admin Auth `updateUserById` with
  `email_confirm: true`, so the practitioner can sign in at
  `/practitioner/login` with their email and the admin-provided password.
- Password reset actions write a `practitioner.password_reset` event to `outbox`
  for downstream audit/notification processing.

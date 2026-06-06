# CLAUDE.md — Dental EMR

> **For AI agents:** This file documents durable, non-obvious conventions for
> this project. Read it before making structural changes — especially during
> the ongoing migration from a single-clinic local app to a multi-clinic SaaS
> backend (see `system_architecture.md` §7 and `database_schema.md`).

## Classic-Script Global Scope (no bundler, no modules)

`index.html` loads `js/utils.js`, `app.js`, and `data-management.js` as plain
`<script src="...">` tags sharing one global scope — there is no bundler and no
ES module graph in the browser. `js/utils.js` declares its helpers
(`formatINR`, `escapeHtml`, `calculateEarnedPoints`, etc.) as top-level
`const`/`function` bindings; `app.js` and `data-management.js` reference them
as implicit globals.

**Why it matters:** `eslint.config.js` has to explicitly list these names as
`readonly` globals for `app.js`/`data-management.js` (see the comment block
there) — if you add a new shared helper to `utils.js`, add its name to that
globals list too, or `no-undef` will flag every call site.

Tests load `js/utils.js` via `tests/helpers/loadUtils.js`, which evaluates the
script source with `new Function(...)` to capture its bindings without
changing how the browser loads it — keep new helpers as plain top-level
`const`/`function` declarations so that loader keeps working.

## Data Layer: IndexedDB (primary) + localStorage (mirror) → migrating to Supabase

Today, all persistence goes through `initDB()`, `loadData`/`saveData`
(`STORAGE_KEYS` in `app.js`), and `ensureTreatmentMasterSeed()` — IndexedDB is
primary, localStorage is a mirror for resilience. `DATABASE_ARCHITECTURE.md`
documents this in depth.

The project is migrating to a hosted multi-tenant Postgres backend on Supabase
(see `system_architecture.md` §7 and `database_schema.md` for the target
schema). The migration plan introduces a `js/api.js` module that exposes the
**same function names/shapes** as today's persistence functions, so
`app.js`'s rendering, billing math, and event-handling code does not need to
change — only the implementation behind those call sites does.

## Multi-Tenant RLS Pattern (target architecture)

Every cloud table (`clinics`, `clinic_users`, `patients`, `treatments`,
`billing`, `reward_wallets`, `treatment_master`) carries a `clinic_id` and is
isolated via Row Level Security using a `SECURITY DEFINER` helper:

```sql
create function my_clinic_id() returns uuid language sql security definer stable as $$
  select clinic_id from clinic_users where user_id = auth.uid() limit 1
$$;
```

Each table then gets a uniform policy: `using (clinic_id = my_clinic_id())`
(and the same expression in `with check` for inserts/updates).

**Why this approach over `auth.jwt() ->> 'clinic_id'`:** custom JWT claims
require configuring Supabase Auth Hooks; the `clinic_users` join-table +
helper-function approach gives the same isolation guarantee with zero auth
configuration overhead, and it's the pattern the `clinic_users` table was
designed for.

## Composite Primary Keys on Patient-Scoped Tables

`patients` uses `PRIMARY KEY (clinic_id, id)` — **not** a bare
`id TEXT PRIMARY KEY` — and `treatments`/`billing`/`reward_wallets` use
composite foreign keys: `FOREIGN KEY (clinic_id, patient_id) REFERENCES patients (clinic_id, id)`.

**Why:** patient IDs are human-friendly strings like `PAT-0001`, generated
per-clinic by `generatePatientId()` in `app.js`. A bare global primary key
would make two different clinics' first patients collide ("PAT-0001" vs
"PAT-0001"). The composite key lets the same friendly ID repeat across
clinics — and because `app.js` already always has the current clinic's context
when looking up a patient, **no UUID/shim translation layer is needed**:
`patient.id` / `treatment.patientId` / `rewardPoints[patientId]` keep their
existing shapes unchanged.

## Reward Points Math Must Match Exactly

`calculateEarnedPoints`/`calculateRedeemFromPoints` in `js/utils.js` encode
the clinic's loyalty-program formulas (point earn rate, points-per-block,
points-per-redeemed-rupee). These constants are moving from hardcoded values
in `app.js` (`CLINIC_NAME`, `POINT_EARN_RATE`, etc.) to per-clinic columns on
the `clinics` table (`product_requirements.md` §5) — when wiring that up,
preserve the exact formulas; `database_schema.md` documents the reference
calculations and `tests/utils.test.js` has coverage to protect them.

# Git Naming Conventions — Pummelo Care

> **For AI agents:** Read this document before creating branches, writing commit messages, or opening PRs. Follow these conventions exactly — do not invent alternative formats.

---

## 1. Branch Naming

### Structure

```
[category]/[issue-id]-[brief-description]
```

- **Category** — see table below
- **Issue ID** — Linear ticket (e.g. `PUM-102`). Include when a ticket exists; omit for housekeeping work with no ticket.
- **Brief description** — 2–4 words, lowercase, hyphen-separated. Be specific.

### Category Types

| Category | Use for | Example |
|---|---|---|
| `feature/` | New user-facing features | `feature/PUM-45-practitioner-onboarding` |
| `fix/` | Bug fixes | `fix/PUM-102-slot-booking-null-crash` |
| `chore/` | Deps, config, tooling, CI | `chore/upgrade-supabase-client` |
| `docs/` | Documentation only | `docs/update-rls-setup-guide` |
| `refactor/` | Code restructure, no behaviour change | `refactor/extract-booking-service` |
| `perf/` | Performance improvements | `perf/cache-practitioner-availability` |
| `migration/` | Database schema migrations only | `migration/PUM-88-add-slots-partition` |
| `test/` | Adding or fixing tests | `test/booking-flow-integration` |

### Rules

- **Lowercase only** — avoids cross-OS case-sensitivity bugs.
- **Hyphens** as separators — no underscores, no spaces.
- **No author names** in branch names — Git history already tracks authorship.
- `main` and `develop` are protected. Never commit directly.

---

## 2. Commit Messages — Conventional Commits

### Structure

```
<type>(<scope>): <short description>

[optional body — explain WHY, not WHAT]

[optional footer — e.g. Closes PUM-102]
```

### Type Values

| Type | Use for |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance, deps, tooling |
| `docs` | Documentation |
| `refactor` | Code restructure |
| `perf` | Performance |
| `test` | Tests |
| `migration` | DB schema migration |
| `revert` | Reverting a prior commit |

### Scope (optional but encouraged)

Use the affected area: `auth`, `booking`, `slots`, `practitioners`, `patients`, `ui`, `api`, `rls`, `cron`, `edge-fn`, `deps`.

### Imperative mood — always

The description must complete: *"If applied, this commit will…"*

- ✅ `feat(auth): add Supabase OTP login for patients`
- ✅ `fix(slots): handle null availability when no rules defined`
- ✅ `migration(slots): add monthly partition cron for 2026`
- ❌ `fixed login bug`
- ❌ `added auth`
- ❌ `WIP`

### Examples

```
feat(booking): add real-time slot availability via Supabase Realtime

fix(rls): re-apply RLS policies on slots partition tables

chore(deps): bump googleapis from 143 to 144

migration(practitioners): add cat.availability_rules DDL

docs(rls): document partition RLS requirement in CLAUDE.md

refactor(api): extract slot-locking logic into shared util
```

---

## 3. Pull Request Titles

Mirror the commit convention but describe the business/technical value at a higher level.

### Formula

```
[Type] (Issue-ID): Plain-English description of what changes and why
```

### Examples

- `Feat (PUM-12): Add email OTP login for patient onboarding`
- `Fix (PUM-89): Resolve slot double-booking under concurrent requests`
- `Migration (PUM-101): Partition sch.slots by month with RLS on each partition`
- `Chore: Upgrade Supabase JS client to v2.50`

### PR Body Template (`.github/pull_request_template.md`)

Every PR should answer:

1. **What does this PR do?** — one sentence summary
2. **Why?** — link to ticket or brief context
3. **How to test?** — steps a reviewer can follow
4. **Breaking changes?** — migrations, API changes, env vars added/removed
5. **Checklist:**
   - [ ] RLS policies applied (if schema changed)
   - [ ] Migrations are idempotent / reversible where possible
   - [ ] Edge Functions tested locally with `supabase functions serve`
   - [ ] TypeScript types regenerated if schema changed (`supabase gen types`)

---

## 4. Release Tags — Semantic Versioning

Format: `vMAJOR.MINOR.PATCH`

| Increment | When |
|---|---|
| `MAJOR` | Breaking API or schema change that requires coordinated deploys |
| `MINOR` | New feature, backward-compatible |
| `PATCH` | Bug fix, backward-compatible |

Examples: `v0.1.0` (first beta), `v1.0.0` (public launch), `v1.2.3` (patch)

---

## 5. Project-Specific Notes for AI Agents

- **Linear tickets** use the prefix `PUM-` (Pummelo Care). Always include the ticket ID in branch and PR names when one exists.
- **Database migrations** live in `supabase/migrations/` and follow the naming pattern `YYYYMMDDHHMMSS_<description>.sql`. Generate them via `supabase migration new <description>`.
- **RLS is mandatory on every partition table** — see `CLAUDE.md` §Slot Partition RLS before writing any `CREATE TABLE ... PARTITION OF` statement.
- **Edge Functions** live in `supabase/functions/`. Each function gets its own directory. Commits touching functions should use scope `edge-fn`.
- **Do not** commit `.env`, `.env.local`, or any file containing secrets. These are gitignored.
- **TypeScript types** should be regenerated (`supabase gen types typescript`) after any schema migration and committed alongside the migration.

---

## 6. Enforcement

| Tool | What it checks |
|---|---|
| `commitlint` + Husky | Commit message format on every local commit |
| GitHub Actions | PR title format before merge |
| Branch protection rules | PRs required; direct pushes to `main`/`develop` blocked |
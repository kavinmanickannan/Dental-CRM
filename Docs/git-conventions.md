# Git Naming Conventions — Dental EMR

> **For AI agents:** Read this document before creating branches, writing commit messages, or opening PRs. Follow these conventions exactly — do not invent alternative formats.

---

## 1. Branch Naming

### Structure

```
[category]/[brief-description]
```

- **Category** — see table below
- **Brief description** — 2–4 words, lowercase, hyphen-separated. Be specific.
- This project does not currently use an external issue tracker — omit ticket
  IDs from branch names. If one is adopted later, slot it in as
  `[category]/[issue-id]-[brief-description]`.

### Category Types

| Category | Use for | Example |
|---|---|---|
| `feature/` | New user-facing features | `feature/multi-clinic-login` |
| `fix/` | Bug fixes | `fix/billing-summary-undefined-var` |
| `chore/` | Deps, config, tooling, CI | `chore/add-vitest-framework` |
| `docs/` | Documentation only | `docs/update-dental-emr-conventions` |
| `refactor/` | Code restructure, no behaviour change | `refactor/extract-utils-helpers` |
| `perf/` | Performance improvements | `perf/optimize-patient-table-render` |
| `migration/` | Database schema migrations only | `migration/add-clinic-rls-policies` |
| `test/` | Adding or fixing tests | `test/utils-formatting-coverage` |

### Rules

- **Lowercase only** — avoids cross-OS case-sensitivity bugs.
- **Hyphens** as separators — no underscores, no spaces.
- **No author names** in branch names — Git history already tracks authorship.
- `main` is the default branch. Avoid committing directly once collaborators are added.

---

## 2. Commit Messages — Conventional Commits

### Structure

```
<type>(<scope>): <short description>

[optional body — explain WHY, not WHAT]

[optional footer]
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

Use the affected area of **this** app: `patients`, `treatments`, `billing`,
`rewards`, `treatment-master`, `auth`, `api`, `rls`, `ui`, `data-management`,
`utils`, `deps`.

### Imperative mood — always

The description must complete: *"If applied, this commit will…"*

- ✅ `feat(auth): add Supabase email/password login gating the app`
- ✅ `fix(billing): handle undefined summary variable in totals calculation`
- ✅ `migration(patients): add composite primary key (clinic_id, id)`
- ❌ `fixed login bug`
- ❌ `added auth`
- ❌ `WIP`

### Examples (drawn from this project's actual history)

```
feat(auth): add Supabase login gating the app per clinic

fix(billing): fix broken billing summary — undefined variable and unawaited promise

fix(security): escape rendered user data and remove inline event handlers (XSS)

chore(test): add Vitest test framework and extract pure helpers to js/utils.js

migration(patients): switch to composite primary key (clinic_id, id) to avoid cross-clinic ID collisions

docs(claude): document multi-tenant RLS pattern and composite-key convention
```

---

## 3. Pull Request Titles

Mirror the commit convention but describe the business/technical value at a higher level.

### Formula

```
[Type]: Plain-English description of what changes and why
```

(No issue-ID segment — this project has no external tracker today. If one is
adopted, switch to `[Type] (Issue-ID): ...`.)

### Examples

- `Feat: Add multi-clinic login with per-clinic data isolation`
- `Fix: Resolve billing summary crash from undefined totals variable`
- `Migration: Add clinic_id RLS policies across all tenant tables`
- `Chore: Add ESLint, Prettier, and Vitest tooling`

### PR Body Template

Every PR should answer:

1. **What does this PR do?** — one sentence summary
2. **Why?** — brief context or link to relevant planning doc (`database_schema.md`, `system_architecture.md`, `product_requirements.md`)
3. **How to test?** — steps a reviewer can follow (include `npm run lint`, `npm test`, and manual browser verification where relevant)
4. **Breaking changes?** — schema migrations, env vars added/removed, data shape changes
5. **Checklist:**
   - [ ] RLS policies applied (if a new table or schema change touches the multi-tenant data)
   - [ ] Migrations are idempotent / reversible where possible
   - [ ] `npm run lint` and `npm test` pass locally
   - [ ] No secrets (`.env`, service-role keys) committed

---

## 4. Release Tags — Semantic Versioning

Format: `vMAJOR.MINOR.PATCH`

| Increment | When |
|---|---|
| `MAJOR` | Breaking schema or data-shape change requiring coordinated migration |
| `MINOR` | New feature, backward-compatible |
| `PATCH` | Bug fix, backward-compatible |

Examples: `v0.1.0` (first tagged baseline), `v1.0.0` (first hosted/multi-clinic release), `v1.2.3` (patch)

---

## 5. Project-Specific Notes for AI Agents

- **No external issue tracker is configured today.** Omit ticket IDs from
  branches, commits, and PR titles unless the user introduces one.
- **No commitlint/Husky is configured** (`package.json` only has
  `lint`/`lint:fix`/`format`/`format:check`/`test`/`test:watch` scripts) —
  commit message format is enforced by convention and review, not tooling.
  Don't claim otherwise in PR descriptions.
- **Linting and formatting**: run `npm run lint` (ESLint) and
  `npm run format:check` (Prettier) before committing; `npm test` runs the
  Vitest suite (`tests/`).
- **`Docs/` planning documents** (`database_schema.md`, `system_architecture.md`,
  `product_requirements.md`) describe the target multi-tenant Supabase
  architecture this project is migrating toward — reference them for context
  on schema/RLS/migration decisions, and keep them in sync with `CLAUDE.md`
  as the migration progresses.
- **Do not** commit `.env`, `.env.local`, Supabase service-role keys, or any
  file containing secrets.
- Once Supabase migrations exist, keep them in `supabase/migrations/` named
  `YYYYMMDDHHMMSS_<description>.sql` (the Supabase CLI default), and commit
  them alongside the application code that depends on them.

---

## 6. Enforcement

| Tool | What it checks |
|---|---|
| ESLint (`npm run lint`) | JS code-quality rules (`eslint.config.js`) |
| Prettier (`npm run format:check`) | Formatting consistency |
| Vitest (`npm test`) | Unit tests for `js/utils.js` helpers |

There is currently no commit-hook or CI enforcement of these conventions —
they are followed by agreement and code review.

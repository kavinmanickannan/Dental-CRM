# AARMA Dental Clinic — Clinic Management System

A browser-based CRM for dental clinics: patient records, treatment tracking,
billing with a built-in rewards program, a forms library, and local-first data
storage with export/import and automatic backups. Everything runs client-side
in the browser — no server required for day-to-day use.

> Currently a single-clinic, locally-installed app (data lives in the
> browser's IndexedDB/localStorage). A hosted multi-clinic SaaS version is
> planned — see [system_architecture.md](./system_architecture.md) and
> [database_schema.md](./database_schema.md) for that roadmap.

## What it does

- **Dashboard** — clinic overview (patients served, payments received, top
  treatments), a follow-up appointment tracker (overdue/today/upcoming),
  treatment-status breakdown, and per-dentist performance stats.
- **Patients** — full CRUD with auto-generated `PAT-XXXX` IDs, age calculated
  from date of birth, search/sort/pagination, and a patient detail panel
  showing full treatment history and consent documents.
- **Treatments** — full CRUD with a "Treatment Master" catalog (pre-seeded
  with 31 standard dental procedures across 8 categories), autocomplete
  description fields that auto-fill price, and status tracking
  (Scheduled / In Progress / Completed / Cancelled).
- **Billing & Rewards** — payment recording (Cash/Card/UPI/Other), automatic
  reward-point earning and redemption against configurable rates, and
  per-patient reward balances.
- **Forms Library** — upload, store, and print clinic document templates
  (consent forms, referral letters, medical certificates, insurance claims),
  including custom form types.
- **Data Management** — one-click JSON export/import of all clinic data, plus
  automatic local backups via the File System Access API (Chromium browsers).
- **Authorization gate** — a trial/full version switch with a
  machine-fingerprint + password check, so the app can be distributed without
  a backend license server.

For the full functional spec, see [product_requirements.md](./product_requirements.md).

## Tech stack

- Vanilla JavaScript (ES modules), no framework or build step
- HTML/CSS for the UI (`index.html`, `styles.css`)
- Browser storage: IndexedDB mirrored to localStorage (`js/db.js`)
- [Vitest](https://vitest.dev/) + [jsdom](https://github.com/jsdom/jsdom) for unit tests
- [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) for linting/formatting

## Project structure

The app is split into focused ES modules under [js/](./js/), each owning one
feature area. [app.js](./app.js) is the bootstrap: it imports every module,
loads persisted data, and wires up DOM event handlers.

| Module | Responsibility |
|---|---|
| [js/state.js](./js/state.js) | Shared mutable app state and clinic-wide constants |
| [js/db.js](./js/db.js) | IndexedDB/localStorage persistence layer |
| [js/ui.js](./js/ui.js) | DOM element cache, navigation, theming, toasts |
| [js/utils.js](./js/utils.js) | Pure helper functions (formatting, escaping, points math) |
| [js/auth.js](./js/auth.js) | Trial/full version gate (machine fingerprint + password) |
| [js/patients.js](./js/patients.js) | Patient CRUD, search, detail panel |
| [js/treatments.js](./js/treatments.js) | Treatment CRUD and Treatment Master catalog |
| [js/billing.js](./js/billing.js) | Payment recording and reward-point logic |
| [js/dashboard.js](./js/dashboard.js) | Clinic overview, follow-ups, dentist performance |
| [js/forms.js](./js/forms.js) | Forms Library catalog, upload, and printing |
| [js/consent.js](./js/consent.js) | Per-treatment consent document handling |
| [js/invoice.js](./js/invoice.js) | PDF invoice generation |
| [js/backup.js](./js/backup.js) | Auto-backup, manual backup, export/import |
| [js/api.js](./js/api.js) | Placeholder for the future cloud backend integration layer |

## Getting started

This is a static, no-build-step app — open it directly in a browser:

```bash
# from the project root
npx serve .
# then open the printed local URL (a static file server is required because
# the app uses ES modules, which browsers block under file:// for security)
```

On first launch you'll be asked to choose **Trial** (no password) or
**Full** version (password-gated). Trial mode auto-authorizes the current
machine and gives full access to every feature.

### Running tests and linters

```bash
npm install
npm test          # run the Vitest suite once
npm run test:watch
npm run lint
npm run lint:fix
npm run format
```

## Documentation

| Doc | Covers |
|---|---|
| [product_requirements.md](./product_requirements.md) | Full functional spec — every module's requirements (REQ-IDs) |
| [system_architecture.md](./system_architecture.md) | Current architecture and the planned cloud-migration path |
| [database_schema.md](./database_schema.md) | Data models, including the planned multi-clinic Postgres/Supabase schema |
| [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) | How local persistence (IndexedDB/localStorage) is structured today |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | UI design tokens, components, and styling conventions |
| [error_handling_and_testing.md](./error_handling_and_testing.md) | Validation rules and test cases |
| [DPDP_Compliance/](./DPDP_Compliance/) | Privacy policy, data processing agreement, breach/deletion procedures (India DPDP Act) |
| [Docs/](./Docs/) | Contributor guidance and git conventions |

## Roadmap

The app is built to evolve from a single-clinic local install into a hosted,
multi-clinic SaaS product — moving persistence from IndexedDB to a shared
cloud database (Supabase/Postgres) with per-clinic login and data isolation.
See the "Multi-clinic SaaS" entry in
[product_requirements.md](./product_requirements.md#2-modules) and §7 of
[system_architecture.md](./system_architecture.md) for the planned migration
phases.

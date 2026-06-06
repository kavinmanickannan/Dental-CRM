# System Architecture — AARMA Dental Clinic Management System

> **Cross-references:** See [database_schema.md](./database_schema.md) for data models, [product_requirements.md](./product_requirements.md) for feature inventory, [error_handling_and_testing.md](./error_handling_and_testing.md) for error patterns and test coverage.

---

## 1. Application Overview

AARMA Dental Clinic Management System is a **single-page application (SPA)** built entirely with vanilla HTML, CSS, and JavaScript. It runs fully in the browser with zero server dependencies in its current form. All data is persisted locally using **IndexedDB** (primary) with **localStorage** as a fallback mirror.

The application is currently deployed as a **local desktop app** — staff open `index.html` directly in a Chromium-based browser. The roadmap is to migrate it to a **hosted SaaS model** so multiple dental clinics can use it online.

---

## 2. Current Architecture (Local/Desktop Mode)

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Runtime                          │
│                                                             │
│  index.html ──── styles.css                                 │
│       │                                                     │
│       └──── app.js  (4,277 lines — monolith)               │
│                │                                            │
│         ┌──────┴──────────────────────────┐                 │
│         │       In-Memory State            │                 │
│         │  patients[], treatments[],       │                 │
│         │  billingHistory[], rewardPoints{}│                 │
│         │  treatmentMasters[], forms{}     │                 │
│         └──────┬──────────────────────────┘                 │
│                │  read/write via loadData() / saveData()    │
│         ┌──────┴──────────────────────────┐                 │
│         │       IndexedDB                  │                 │
│         │   DB: "DentalClinicDB" v2        │                 │
│         │   ObjectStore: "data" (KV)       │                 │
│         └──────┬──────────────────────────┘                 │
│                │  fallback mirror                           │
│         ┌──────┴──────────────────────────┐                 │
│         │       localStorage               │                 │
│         │   Keys: dental_patients, etc.    │                 │
│         └─────────────────────────────────┘                 │
│                                                             │
│  File System API (Consent PDFs + Auto-Backup)               │
│  External: jsPDF 2.5.1 (CDN) for invoice generation        │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Key Modules in `app.js`

| Module / Concern | Key Functions |
|---|---|
| DB Lifecycle | `initDB()`, `loadData(key)`, `saveData(key, value)` |
| App Bootstrap | `initializeApp()`, `attemptLegacyRecovery()` |
| Auth Guard | Obfuscated IIFE — trial vs. full version gate |
| Patient CRUD | `handlePatientSubmit()`, `editPatient()`, `deletePatient()`, `renderPatients()` |
| Treatment CRUD | `handleTreatmentSubmit()`, `editTreatment()`, `deleteTreatment()`, `renderTreatments()` |
| Treatment Master | `ensureTreatmentMasterSeed()`, `handleTreatmentMasterSubmit()`, `renderTreatmentMasterTable()` |
| Billing & Rewards | `handleBillingSubmit()`, `calculateOutstanding()`, `calculateEarnedPoints()`, `calculateRedeemFromPoints()` |
| Dashboard Stats | `updateDashboardStats()`, `updateTreatmentStatus()`, `updateFollowUpPanel()` |
| Consent Uploads | `saveConsentFile()`, `resolveConsentFileHandle()`, `refreshConsentSection()` |
| Forms Library | `renderFormsLibrary()`, `handleFormsActionClick()`, `handleAddFormTypeSubmit()` |
| Backup | `performAutoBackup()`, `performManualBackup()`, `exportAllData()`, `importAllData()` |
| Invoice PDF | `handleGenerateInvoiceClick()` using jsPDF |
| Pagination | `renderPagination()`, `changePage()` |
| Theme | `initTheme()`, `toggleTheme()` |

---

## 3. Data Flow

```
User Action
    │
    ▼
Event Handler (in app.js)
    │
    ├── Validate input
    ├── Mutate in-memory array (e.g., patients.push(newPatient))
    ├── Call saveData(key, value)
    │       ├── IndexedDB write (primary)
    │       ├── localStorage mirror write (always)
    │       └── trigger performAutoBackup() if enabled
    └── Re-render UI (renderPatients(), etc.)
         └── Invalidate dashboardStatsCache
```

---

## 4. Authorization System

The app contains an obfuscated IIFE-based auth system that runs before `initializeApp()`:

- **Trial version**: Auto-authorized, all features unlocked, no password.
- **Full version**: Password required. Machine signature (browser fingerprint hash) is stored in localStorage after first successful auth. Subsequent opens on the same machine skip the prompt.
- Password is stored obfuscated via `atob("THVmZnlAMTIz")` → `Luffy@123`.

> **Migration note:** For the hosted version, replace this entirely with server-side JWT/session authentication. See [Section 7](#7-target-hosted-architecture-low-cost) below.

---

## 5. Storage Architecture

See [database_schema.md](./database_schema.md) for full schema details.

| Layer | Technology | Role |
|---|---|---|
| Primary storage | IndexedDB (`DentalClinicDB`, version 2) | All app data |
| Mirror / Fallback | localStorage (same keys) | Survives IndexedDB eviction |
| File storage | File System Access API | Consent PDFs per treatment |
| Backup | JSON export via `exportAllData()` | Manual + auto to user folder |

**Persistence caveat:** Browser storage is device- and browser-specific. IndexedDB can be evicted by the browser after ~1–2 weeks of inactivity on non-persistent origins. The app calls `navigator.storage.persist()` to request a persistent-storage grant and mirrors data to localStorage to survive eviction.

---

## 6. External Dependencies

| Dependency | Version | Source | Purpose |
|---|---|---|---|
| jsPDF | 2.5.1 | cdnjs CDN | Invoice PDF generation |
| (none else) | — | — | All other functionality is vanilla JS |

---

## 7. Target Hosted Architecture (Low-Cost)

To host AARMA for multiple dental clinics, the recommended stack is **fully free-tier or near-zero-cost** using proven open-source tools.

### 7.1 Recommended Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS (current codebase, refactored) | Free |
| Backend API | **Node.js + Express** or **Supabase Edge Functions** | Free tier |
| Database | **Supabase (PostgreSQL)** — 500 MB free, 2 projects | Free |
| Auth | **Supabase Auth** (built-in) | Free |
| File Storage | **Supabase Storage** (1 GB free) — for consent PDFs | Free |
| Hosting (Frontend) | **Vercel** or **Netlify** | Free |
| Hosting (Backend) | **Supabase** (handles backend via BaaS) or **Railway** (free $5 credit/mo) | Free / ~₹0–₹500/mo |
| Custom Domain | Cloudflare Registrar (~₹800/yr for `.in`) | ~₹800/yr |
| Email (Notifications) | **Resend** (100 emails/day free) or **Brevo** | Free |

**Total estimated monthly cost: ₹0–₹500** for a single clinic, scaling to ₹1,000–₹3,000/mo for 10–20 clinics.

### 7.2 Hosted Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        Dental Clinic Staff                        │
│                    (Chrome / Firefox browser)                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Frontend — Vercel / Netlify                       │
│           index.html + styles.css + app.js (refactored)          │
│   - Static file serving (CDN-backed, global)                     │
│   - Each clinic gets a subdomain: clinicname.aarma.in            │
└────────────────────────────┬─────────────────────────────────────┘
                             │ REST/GraphQL API calls
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Backend — Supabase (BaaS)                       │
│                                                                  │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│   │  Supabase    │   │  Supabase    │   │  Supabase        │   │
│   │  Auth        │   │  PostgreSQL  │   │  Storage         │   │
│   │  (JWT-based) │   │  (Data)      │   │  (Consent PDFs)  │   │
│   └──────────────┘   └──────────────┘   └──────────────────┘   │
│                                                                  │
│   Row Level Security (RLS) — per clinic data isolation           │
└──────────────────────────────────────────────────────────────────┘
```

### 7.3 Multi-Tenancy Model

Each dental clinic is a **tenant**. Data isolation is enforced at the database layer:

- Every table has a `clinic_id` (UUID) foreign key.
- Supabase **Row Level Security (RLS)** policies enforce that users can only read/write rows belonging to their clinic.
- Clinic admin creates staff user accounts; staff log in with email + password via Supabase Auth.

```sql
-- Example RLS policy
CREATE POLICY "clinic_isolation" ON patients
  USING (clinic_id = auth.jwt() ->> 'clinic_id');
```

### 7.4 Migration Path from Local to Hosted

1. **Phase 1 — API Layer**: Replace `saveData()`/`loadData()` with `fetch()` calls to Supabase REST API. Keep IndexedDB as an offline cache.
2. **Phase 2 — Auth**: Replace the IIFE auth guard with Supabase Auth. Issue JWTs per clinic.
3. **Phase 3 — File Storage**: Replace File System Access API with Supabase Storage bucket. Consent PDFs are uploaded via signed URLs.
4. **Phase 4 — Multi-tenancy**: Add `clinic_id` to all tables. Configure RLS.
5. **Phase 5 — Offline-first (optional)**: Use a service worker + IndexedDB to cache data locally and sync when online. Suitable if clinics have unreliable internet.

### 7.5 Folder Structure for Hosted Version

```
dental-crm/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js              # Refactored — API calls replace storage calls
│   ├── api.js              # New: Supabase client + all API calls
│   └── auth.js             # New: Supabase Auth integration
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql   # See database_schema.md
│   └── seed.sql            # Treatment master seed data
├── vercel.json             # Vercel deployment config
└── .env                    # SUPABASE_URL, SUPABASE_ANON_KEY
```

---

## 8. Performance Considerations

| Concern | Current Approach | Hosted Approach |
|---|---|---|
| Patient lookup | `Map`-based O(1) cache (`patientLookupMap`) | DB index on `id`, same cache in frontend |
| Dashboard stats | `dashboardStatsCache` invalidated on write | DB aggregation queries or materialized views |
| Pagination | Client-side slice of in-memory arrays | Server-side `LIMIT`/`OFFSET` or cursor pagination |
| Search | In-memory `.filter()` | PostgreSQL `ILIKE` with index on `name` |

---

## 9. Security Considerations (for Hosted Version)

- All API calls must go over **HTTPS**.
- Supabase **anon key** is safe to expose in frontend; RLS enforces data isolation.
- Supabase **service key** must never be exposed in frontend code.
- Consent PDF URLs should use **signed URLs** (time-limited) rather than public bucket URLs.
- Patient data is **PHI (Protected Health Information)** — follow applicable local regulations (India: DPDP Act 2023).
- Implement **audit logging** for sensitive operations (patient delete, billing edits).
- Input sanitization: `escapeHtml()` is already in use — preserve it in hosted version.

---

## 10. Clinic Onboarding Flow (SaaS)

```
Clinic Admin visits aarma.in
    │
    ▼
Signs up → Supabase creates user + clinic record
    │
    ▼
Clinic subdomain provisioned (e.g., xyz-dental.aarma.in)
    │
    ▼
Admin invites staff → staff receive email invite
    │
    ▼
Staff log in → scoped to clinic_id via JWT
    │
    ▼
Treatment master pre-seeded with default treatments
    │
    ▼
Clinic is live
```

---

## 11. Backup Strategy (Hosted)

| Mechanism | Details |
|---|---|
| Supabase daily backups | Automatic on paid plan (free plan: manual snapshots) |
| App-level export | Preserve existing `exportAllData()` as JSON download |
| App-level import | Preserve existing `importAllData()` for clinic data migration |
| Point-in-time recovery | Available on Supabase Pro plan (~$25/mo if needed) |

---

*Last updated: May 2026 | See also: [product_requirements.md](./product_requirements.md) · [database_schema.md](./database_schema.md) · [error_handling_and_testing.md](./error_handling_and_testing.md)*

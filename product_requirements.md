# Product Requirements — AARMA Dental Clinic Management System

> **Cross-references:** See [system_architecture.md](./system_architecture.md) for architecture decisions, [database_schema.md](./database_schema.md) for data models, [error_handling_and_testing.md](./error_handling_and_testing.md) for validation rules and test cases.

---

## 1. Purpose & Scope

This document defines the complete functional and non-functional requirements for the AARMA Dental Clinic Management System — a web-based CRM for dental clinics covering patient management, treatment tracking, billing, rewards, reporting, and document management.

**Target users:** Front-desk staff, dentists, clinic administrators.  
**Current deployment:** Local browser-based app (Chromium).  
**Planned deployment:** Hosted SaaS for multiple dental clinics.

---

## 2. Modules

| Module | Status | Description |
|---|---|---|
| Dashboard | ✅ Implemented | Clinic overview, follow-up tracker, dentist performance |
| Patients | ✅ Implemented | Full CRUD for patient records |
| Treatments | ✅ Implemented | Full CRUD for treatment records with master list |
| Billing & Rewards | ✅ Implemented | Payment processing, reward points earn/redeem |
| Forms Library | ✅ Implemented | Upload and manage clinic forms (consent, referral, etc.) |
| Authorization | ✅ Implemented | Trial/full version gate with machine fingerprint |
| Data Management | ✅ Implemented | Export/import, auto-backup, consent PDF uploads |
| Multi-clinic SaaS | 🔲 Planned | Hosted version with per-clinic auth and data isolation |

---

## 3. Module Requirements

### 3.1 Dashboard

**Follow-up Appointments panel:**
- REQ-DASH-01: Display all patients with treatments in status `Scheduled` or `In Progress` that have a `nextVisit` date set.
- REQ-DASH-02: Classify each item as `overdue` (past due), `today`, or `upcoming` based on `nextVisit` vs. current date.
- REQ-DASH-03: Display overdue count and upcoming count in the summary bar.
- REQ-DASH-04: Filter follow-ups by: All / Overdue / Upcoming.
- REQ-DASH-05: Each follow-up item must show patient name, phone (click-to-call `tel:` link), treatment name, dentist name, next visit date, and status label.
- REQ-DASH-06: Paginate follow-up list at 5 items per page.

**Clinic Overview panel:**
- REQ-DASH-07: Show stats for configurable time ranges: Today, Last 7 Days, Last 30 Days, Last Month.
- REQ-DASH-08: Stats: Patients Served (unique patients with billing in range), Payments Received (total amount paid in range), Top Treatment (most frequent treatment description in range).
- REQ-DASH-09: Payment breakdown by method: Cash, Card, UPI, Other.

**Treatment Status Overview panel:**
- REQ-DASH-10: Show count of treatments per status (Scheduled, In Progress, Completed, Cancelled) for selected date range.
- REQ-DASH-11: Clicking a status card opens a slide-in panel listing all patients with that status.

**Dentist Performance panel:**
- REQ-DASH-12: Group treatments by dentist name (case-insensitive) for selected date range.
- REQ-DASH-13: Show per-dentist: Total Visits, Total Patients, New Patients (registered in range), Total Revenue.
- REQ-DASH-14: Clicking a dentist card opens a slide-in panel with full patient + treatment list for that dentist.

**Data Management panel:**
- REQ-DASH-15: Export All Data button — exports all data as JSON file with timestamp in filename.
- REQ-DASH-16: Import Backup button — imports a previously exported JSON file, replaces current data after confirmation.

---

### 3.2 Patient Management

**Adding a patient:**
- REQ-PAT-01: Required fields: Full Name, Contact Number, Date of Birth, Sex (Male/Female/Other), Address.
- REQ-PAT-02: Optional field: Patient History / Notes (free text, multi-line).
- REQ-PAT-03: System auto-generates patient ID in format `PAT-XXXX` (zero-padded sequential counter stored in localStorage key `dental_patient_counter`).
- REQ-PAT-04: System auto-calculates age from DOB. DOB must be in the past.
- REQ-PAT-05: `createdAt` ISO timestamp is stored on creation and must not change on update.

**Editing a patient:**
- REQ-PAT-06: All fields are editable except patient ID.
- REQ-PAT-07: `createdAt` is preserved on update.

**Deleting a patient:**
- REQ-PAT-08: Deletion requires confirmation dialog.
- REQ-PAT-09: Cascading delete removes all related treatments, billing records, and reward points.

**Patient list:**
- REQ-PAT-10: Display columns: ID, Name (click to open Patient Snapshot), Contact, DOB, Age, Sex, Address, Actions.
- REQ-PAT-11: Search by name or ID (case-insensitive, partial match).
- REQ-PAT-12: Sort by most recently created first (by `createdAt`, fallback to ID number).
- REQ-PAT-13: Paginate at 10 records per page.

**Patient Snapshot / Detail Panel:**
- REQ-PAT-14: Click patient name to open detail panel showing: ID, Name, Age, Sex, Contact, DOB, Address, Patient History.
- REQ-PAT-15: Panel includes full treatment history for the patient with consent form section per treatment.
- REQ-PAT-16: Consent section per treatment: upload button (accepts PDF/JPG/PNG up to 5 MB), view button, status indicator.

---

### 3.3 Treatment Management

**Adding a treatment:**
- REQ-TRT-01: Required fields: Patient (search by name or ID), Treatment Category, Treatment Description, Date, Dentist Name, Status.
- REQ-TRT-02: Optional fields: Cost (₹), Next Appointment date.
- REQ-TRT-03: `Next Appointment` becomes required when Status = `In Progress`.
- REQ-TRT-04: Date field pre-fills with today's date.
- REQ-TRT-05: Treatment Description is an autocomplete input backed by the Treatment Master list (filtered by selected category).
- REQ-TRT-06: Selecting a Treatment Description auto-fills the Cost field from the master's `default_price` (only if cost field is empty or was previously auto-filled).
- REQ-TRT-07: Treatment ID is a UUID generated at creation.
- REQ-TRT-08: `consent_file_path` is preserved across edits (not reset to empty on update).

**Status values:**
- REQ-TRT-09: Valid statuses: `Scheduled`, `In Progress`, `Completed`, `Cancelled`.

**Treatment list:**
- REQ-TRT-10: Display columns: Patient Name, Treatment Description, Date (sortable), Cost (₹), Dentist, Status, Actions.
- REQ-TRT-11: Date column supports toggle sort: Recent First ↓ / Oldest First ↑.
- REQ-TRT-12: Paginate at 15 records per page.

**Treatment Master:**
- REQ-TRT-13: Treatment Master is a modal list of all treatment types with Category, Name, Default Price, Active/Inactive toggle.
- REQ-TRT-14: Pre-seeded with 31 standard dental treatments across 8 categories (see [database_schema.md § Treatment Master Seed](./database_schema.md#treatment-master-seed-data)).
- REQ-TRT-15: New treatments can be added. Treatment names must be unique (case-insensitive).
- REQ-TRT-16: Inactive treatments are hidden from the treatment form autocomplete but remain in historical records.
- REQ-TRT-17: Paginate Treatment Master table at 5 records per page.

---

### 3.4 Billing & Rewards

**Billing form:**
- REQ-BIL-01: Patient selected by search (name or ID). Hidden field stores patient ID.
- REQ-BIL-02: Summary row shows: Outstanding Balance (sum of all treatment costs minus total payments), Reward Wallet (current points), Redeemable Value (₹).
- REQ-BIL-03: Payment Type: Full or Partial.
  - Full: amount is auto-calculated as `outstanding - redeemValue (if redeem checked)`. Field is read-only.
  - Partial: user enters any amount up to outstanding balance.
- REQ-BIL-04: Payment Method: Cash, Card, UPI, Other.
- REQ-BIL-05: Redeem reward points checkbox: when checked, redeemable value is deducted from payment amount.
- REQ-BIL-06: Payment amount must not exceed outstanding balance.

**Reward points engine:**
- REQ-RWD-01: **Earn rate:** ₹100 spent → 4 points (whole blocks only; ₹250 → 8 points, not 10).
  - Formula: `floor(amount / 100) * 4`
- REQ-RWD-02: **Redeem rate:** 4 points = ₹1 (whole rupees only).
  - Formula: `floor(points / 4)` rupees redeemable.
- REQ-RWD-03: Points are earned on the cash amount paid, not on reward-value-covered amount.
- REQ-RWD-04: Points are deducted from wallet when redeemed. Net formula: `new_points = old_points - points_redeemed + points_earned`.
- REQ-RWD-05: Manual points can be added (for referrals, promotions) via the "Add Reward Points" field — no minimum constraint, staff enters any positive integer.

**Billing history:**
- REQ-BIL-07: Display columns: Date, Patient Name, Amount Paid (₹), Payment Method, Points Earned, Points Redeemed, Reward Credit (₹).
- REQ-BIL-08: Search billing history by patient name or ID.
- REQ-BIL-09: Sort by most recent first (by `createdAt`, fallback to `date`).
- REQ-BIL-10: Paginate at 15 records per page.

**Invoice generation:**
- REQ-BIL-11: After a payment is processed, a "Generate Invoice (PDF)" button appears.
- REQ-BIL-12: Invoice includes: clinic name, address, phone; patient name and ID; date; payment amount; payment method; points earned/redeemed; reward credit.
- REQ-BIL-13: Invoice is generated client-side using jsPDF and downloaded as a PDF.

---

### 3.5 Forms Library

- REQ-FRM-01: Built-in forms: Consent Form, Referral Letter, Medical Certificate, Insurance Claim Form.
- REQ-FRM-02: Staff can upload one or more files per form type (PDF, JPG, PNG only).
- REQ-FRM-03: Staff can add custom form types with a name and optional description.
- REQ-FRM-04: Each uploaded file can be downloaded/opened inline.
- REQ-FRM-05: File metadata (name, size) is stored in IndexedDB; the file binary is stored as a Blob/ArrayBuffer in IndexedDB under key `dental_forms_library`.
- REQ-FRM-06: Custom form types are stored in `dental_forms_catalog`.

---

### 3.6 Consent PDF Management

- REQ-CNS-01: Consent files are stored in the local file system via the File System Access API (Chrome/Edge only).
- REQ-CNS-02: Staff selects a folder once per session; the app requests persistent `readwrite` permission.
- REQ-CNS-03: File naming convention: `consents/{patientId}/{treatmentId}/Consent_{patientId}_{treatmentId}.{ext}`.
- REQ-CNS-04: Allowed types: PDF, JPG, PNG. Max size: 5 MB.
- REQ-CNS-05: Only one consent file per treatment. Uploading a new file prompts to overwrite; old file is deleted.
- REQ-CNS-06: View button opens the consent in a new browser tab using an object URL (auto-revoked after 10 seconds).
- REQ-CNS-07: `consent_file_path` is stored on the treatment record as a relative path string.

> **Hosted version change:** Replace File System Access API with Supabase Storage. Upload via signed URL; store object path in `consent_file_path` column.

---

### 3.7 Data Backup & Restore

- REQ-BAK-01: Manual backup: exports all data as a single JSON file named `CLINIC_NAME-Data-{ISO_timestamp}.json`.
- REQ-BAK-02: Auto-backup: staff can select a folder; every `saveData()` call triggers a backup to that folder.
- REQ-BAK-03: Import: accepts a JSON file previously exported by this app. Merges or replaces data. Requires confirmation.
- REQ-BAK-04: Backup JSON format includes: `patients`, `treatments`, `billing`, `rewards`, `treatmentMasters`, `forms`, `formsCatalog`, `exportedAt`, `version`, `clinicName`.

---

### 3.8 Authorization (Current Local Version)

- REQ-AUTH-01: On first load, prompt user to choose Trial or Full version. Choice persisted in localStorage.
- REQ-AUTH-02: Trial version: no password, auto-authorized.
- REQ-AUTH-03: Full version: prompt for authorization key. Key validated against obfuscated value. Machine signature (browser fingerprint hash) stored in `dental_app_auth_machines`. Subsequent loads on same machine skip prompt.
- REQ-AUTH-04: Cancel button on auth prompt renders a "Authorization Required" static page; app does not load.

> **Hosted version:** Replace with Supabase Auth (email + password). JWTs scoped to `clinic_id`. See [system_architecture.md § 7](./system_architecture.md#7-target-hosted-architecture-low-cost).

---

### 3.9 UI / UX Requirements

- REQ-UX-01: Single-page app with tab-based navigation: Dashboard, Patients, Treatments, Billing, Forms.
- REQ-UX-02: Light / Dark theme toggle. Theme preference persisted in localStorage key `dental_app_theme`.
- REQ-UX-03: Toast notifications for all user actions (success and error), displayed for ~3 seconds.
- REQ-UX-04: All HTML output must be sanitized via `escapeHtml()` before rendering to prevent XSS.
- REQ-UX-05: Search fields use live filtering (on `input` event).
- REQ-UX-06: All forms show cancel/reset button that clears in-progress edits.
- REQ-UX-07: Responsive layout for standard desktop and tablet screens (min-width ~768px).

---

## 4. Non-Functional Requirements

| Requirement | Specification |
|---|---|
| **Performance** | Page load and re-render under 500ms for up to 1,000 patients, 5,000 treatments |
| **Storage** | IndexedDB primary; localStorage mirror; request persistent storage on load |
| **Browser support** | Chrome 90+, Edge 90+ (File System Access API required for consent/backup) |
| **Offline** | App must function fully offline (all data local); no network dependency in current version |
| **Data integrity** | Patient delete must cascade; payment must not exceed outstanding; duplicate treatment names blocked |
| **Security (hosted)** | HTTPS only; Supabase RLS per clinic; no service key in frontend; signed URLs for files |
| **Accessibility** | `aria-label`, `role`, `aria-pressed` attributes on interactive elements; `sr-only` labels on search inputs |
| **Localization** | Currency: Indian Rupee (₹). Dates: `YYYY-MM-DD`. Language: English. |

---

## 5. Clinic Configuration Constants

These are currently hardcoded in `app.js` and should be made configurable per clinic in the hosted version:

| Constant | Value | Description |
|---|---|---|
| `CLINIC_NAME` | `"AARMA Dental clinic"` | Displayed in header and invoices |
| `CLINIC_ADDRESS` | `"Navaladiyan complex, 1st floor, Thanthonimalai Karur"` | Printed on invoices |
| `CLINIC_PHONE` | `"+91 9489266309"` | Printed on invoices |
| `POINT_EARN_RATE` | `100` | ₹ per earn block |
| `POINTS_PER_EARN_BLOCK` | `4` | Points earned per ₹100 |
| `POINTS_PER_REDEEM_RUPEE` | `4` | Points required to redeem ₹1 |
| `CONSENT_MAX_SIZE` | `5 * 1024 * 1024` | 5 MB max consent file size |
| `DB_NAME` | `"DentalClinicDB"` | IndexedDB name |
| `DB_VERSION` | `2` | IndexedDB schema version |

---

## 6. Planned Features for Hosted Version

| Feature | Priority | Notes |
|---|---|---|
| Multi-clinic login | P0 | Supabase Auth + clinic_id isolation |
| SMS / WhatsApp follow-up reminders | P1 | Integrate Twilio or MSG91 (free tier) |
| Appointment scheduling calendar | P1 | Replace manual `nextVisit` date field |
| Treatment invoice email delivery | P2 | Resend / Brevo integration |
| Clinic settings page | P0 | Editable clinic name, address, phone, reward rates |
| Staff roles (admin vs. receptionist) | P1 | Role-based access control |
| Analytics export (CSV) | P2 | Dashboard stats downloadable as CSV |
| Patient portal (read-only) | P3 | Patient views own treatment history via link |

---

*Last updated: May 2026 | See also: [system_architecture.md](./system_architecture.md) · [database_schema.md](./database_schema.md) · [error_handling_and_testing.md](./error_handling_and_testing.md)*

# Patient Data Deletion Procedure
## Dental Clinic Management System

**Version:** 1.0  
**Effective Date:** [INSERT DATE BEFORE LAUNCH]  
**Legal Basis:** DPDP Act 2023, Section 12 (Right to Erasure) and DPDP Rules 2025, Rule 14  
**Owner:** AARMA Grievance Officer (kavinmanickannan@gmail.com)

---

## 1. Overview

Under Section 12 of the Digital Personal Data Protection Act, 2023, a **Data Principal** (patient) has the right to request erasure of their personal data when:

- The purpose for which the data was collected is fulfilled (e.g., treatment is complete and no ongoing care is needed).
- The patient withdraws consent to their data being processed.
- The patient believes the data is being retained unnecessarily.

**Response deadline:** AARMA and the clinic must complete erasure within **90 days** of the verified request (DPDP Rules 2025, Rule 14).  
**Pre-erasure notice:** AARMA must provide at least **48 hours' advance notice** to the clinic before purging data (DPDP Rules 2025, Rule 8).

---

## 2. Parties Responsible

| Party | Responsibility |
|---|---|
| **Patient (Data Principal)** | Initiates the deletion request |
| **Dental Clinic (Data Fiduciary)** | Verifies the patient's identity, reviews the request, authorises or disputes deletion |
| **AARMA (Data Processor)** | Executes the technical deletion from all storage layers once authorised by the clinic |

The clinic **cannot** refuse a deletion request without a lawful basis (e.g., statutory retention obligation). AARMA will not delete patient data without clinic authorisation **except** where ordered by the Data Protection Board of India (DPBI).

---

## 3. Deletion Request Workflow

```
Step 1: Patient submits deletion request
    │
    ▼
Step 2: Clinic receives and logs the request (within 48 hours)
    │
    ▼
Step 3: Clinic verifies patient identity (within 7 days)
    │
    ├── Identity not verified → Reject with reason, notify patient
    │
    ▼
Step 4: Clinic reviews if statutory retention applies (within 14 days)
    │
    ├── Statutory hold applies (e.g., billing records < 8 years old)
    │       → Partial deletion: delete non-statutory data,
    │         retain only legally required records,
    │         notify patient of what was retained and why
    │
    ├── No hold → Authorise full deletion
    │
    ▼
Step 5: Clinic submits deletion authorisation to AARMA
    │
    ▼
Step 6: AARMA sends 48-hour advance notice to clinic (confirming scheduled purge)
    │
    ▼
Step 7: AARMA executes technical deletion (within 90 days of original request)
    │
    ▼
Step 8: AARMA confirms deletion to clinic in writing
    │
    ▼
Step 9: Clinic confirms deletion to patient
```

---

## 4. How Patients Submit a Deletion Request

Patients may request deletion through **any** of the following channels:

1. **In person:** Ask clinic staff to initiate the request on their behalf.
2. **Phone / WhatsApp:** Call or message the clinic; staff logs the request in the system.
3. **Email:** Send to the clinic's registered email; clinic staff logs the request.
4. **Future digital channel (v2.1):** Patient portal with a self-service deletion request form — planned for AARMA v2.1.

The clinic must log every deletion request with:
- Patient name and ID (PAT-XXXX)
- Date of request
- Channel through which request was received
- Staff member who received it

---

## 5. Identity Verification

Before processing a deletion request, the clinic must verify the identity of the requesting person. Acceptable verification methods:

| Method | Acceptable for |
|---|---|
| Patient presents themselves in person with valid photo ID (Aadhaar, PAN, driving licence) | In-person requests |
| Clinic's existing patient registration details match (name + DOB + phone) | Phone / WhatsApp requests |
| Email received from phone number or email on record | Email requests |
| For minor patients: parent / guardian presents ID and proof of relationship | Minor patients |

If identity cannot be verified, the clinic must reject the request and inform the patient of the reason in writing (or verbally, documented in the log).

---

## 6. What Data Is Deleted

### 6.1 Full Deletion (when no statutory hold applies)

When a clinic authorises full deletion, AARMA deletes the following:

| Data | Storage Location | Action |
|---|---|---|
| Patient record (name, contact, DOB, sex, address, notes) | IndexedDB / PostgreSQL `patients` table | Hard delete |
| All treatment records for the patient | IndexedDB / PostgreSQL `treatments` table | Hard delete (cascading) |
| All billing records for the patient | IndexedDB / PostgreSQL `billing` table | Hard delete (cascading) |
| Reward points balance | IndexedDB / PostgreSQL `reward_wallets` table | Hard delete (cascading) |
| Consent form files | Local file system (current) / Supabase Storage (hosted) | File deleted from storage; path reference deleted from treatment record |
| Patient ID counter reference | localStorage `dental_patient_counter` | Counter is NOT reset (ID is not reused) |
| Any in-app search cache | In-memory `patientLookupMap` | Invalidated and rebuilt on next load |

### 6.2 Partial Deletion (when statutory retention applies)

Some data must be retained by law even after a deletion request:

| Data | Retention obligation | What is retained | What is deleted |
|---|---|---|---|
| Billing records | Income Tax Act — 8 years | Amount, date, payment method, outstanding values | Patient name replaced with "DELETED-[PAT-XXXX]"; personal identifiers anonymised |
| Treatment records | Clinical Establishments Act — 3 years minimum | Treatment type, date, cost, dentist | Patient name anonymised; medical notes deleted |
| Consent forms | 3 years | File retained if treatment < 3 years old | Deleted after retention period expires |

**Anonymisation method for partial deletion:**

When full deletion is not possible due to a statutory hold, patient identifiers are anonymised as follows:
- `name` → `"ANONYMISED"`
- `contact` → `"000000000"`
- `dob` → `"0000-00-00"`
- `address` → `"ANONYMISED"`
- `notes` → `""` (cleared)
- `sex` → `"other"`

The `patientId` (PAT-XXXX) is retained as a reference key for linked records but is no longer associable with a real individual.

---

## 7. Technical Implementation — Current Version (Local / IndexedDB)

In the current local version, deletion is handled by the existing `deletePatient()` function in `app.js`. This function already performs a cascading delete of patients, treatments, billing, and reward points.

### What is complete:

```javascript
// app.js — existing deletePatient() — already handles cascading delete
window.deletePatient = function (patientId) {
  if (!confirm("Delete this patient and all related treatments, billing, and rewards?")) return;
  
  // Removes patient from in-memory array
  patients.splice(index, 1);
  
  // Removes all treatments for this patient
  treatments = treatments.filter(t => t.patientId !== patientId);
  
  // Removes all billing records for this patient
  billingHistory = billingHistory.filter(b => b.patientId !== patientId);
  
  // Removes reward points
  delete rewardPoints[patientId];
  
  // Saves all changes to IndexedDB
  saveData(STORAGE_KEYS.patients, patients);
  saveData(STORAGE_KEYS.treatments, treatments);
  saveData(STORAGE_KEYS.billing, billingHistory);
  saveData(STORAGE_KEYS.rewards, rewardPoints);
};
```

### What needs to be added (v1.x patch):

1. **Deletion log:** After `deletePatient()` completes, write a deletion log entry to a separate `dental_deletion_log` key in IndexedDB:

```javascript
const deletionLog = await loadData('dental_deletion_log') || [];
deletionLog.push({
  patientId,
  deletedAt: new Date().toISOString(),
  deletedBy: 'staff', // replace with logged-in staff name in v2
  requestDate: '...', // staff inputs this when processing the request
  method: 'full'
});
await saveData('dental_deletion_log', deletionLog);
```

2. **Consent file deletion:** After deleting the patient, if `consentDirectoryHandle` is active, iterate over the patient's treatments and call `treatmentDir.removeEntry(filename)` for any consent files. Currently consent files are left orphaned on the file system when a patient is deleted.

---

## 8. Technical Implementation — Hosted Version (Supabase / PostgreSQL)

### 8.1 API Endpoint

```
DELETE /api/patients/{patientId}
Authorization: Bearer {clinic_jwt}
```

The endpoint:
1. Verifies the JWT and confirms `clinic_id` in the token matches the patient's `clinic_id`.
2. Checks if the deletion is a full or partial delete (based on statutory hold logic).
3. For full delete: executes `DELETE FROM patients WHERE id = $1 AND clinic_id = $2` — PostgreSQL `ON DELETE CASCADE` handles all related records automatically.
4. For partial delete: runs the anonymisation UPDATE statements.
5. Deletes consent files from Supabase Storage bucket path `consents/{clinic_id}/{patient_id}/`.
6. Writes a deletion audit log entry.
7. Returns `200 OK` with a deletion confirmation payload.

### 8.2 Deletion Audit Log Table (PostgreSQL)

```sql
CREATE TABLE deletion_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id),
  patient_id      TEXT NOT NULL,           -- PAT-XXXX (no FK — patient already deleted)
  deleted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by      UUID REFERENCES clinic_users(id),
  request_date    DATE NOT NULL,           -- Date patient submitted the request
  deletion_method TEXT NOT NULL CHECK (deletion_method IN ('full', 'partial', 'anonymised')),
  notes           TEXT DEFAULT ''
);
```

### 8.3 30-Day Soft Delete Buffer

Before hard deletion, the hosted version should implement a 30-day soft delete:

```sql
-- Add to patients table
ALTER TABLE patients ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE patients ADD COLUMN deletion_requested_at TIMESTAMPTZ DEFAULT NULL;

-- Soft delete: marks patient as deleted, schedules hard delete
UPDATE patients
SET deleted_at = NOW() + INTERVAL '30 days',
    deletion_requested_at = NOW()
WHERE id = $1 AND clinic_id = $2;

-- Cron job / Supabase Edge Function runs nightly:
DELETE FROM patients
WHERE deleted_at IS NOT NULL AND deleted_at <= NOW();
```

This 30-day buffer:
- Allows clinics to recover accidental deletions within 30 days.
- Satisfies the DPDP Rules requirement that erasure happens "as soon as the purpose is no longer served" — 30 days is a reasonable operational period.
- Patients who are soft-deleted are immediately excluded from all UI views.

---

## 9. Deletion Confirmation to Patient

After deletion is completed, the clinic must provide written confirmation to the patient. Template:

---

**Subject: Confirmation of Personal Data Deletion — [Clinic Name]**

Dear [Patient Name],

This is to confirm that your personal data held in our records at [Clinic Name] has been deleted as requested on [Request Date].

The following data has been permanently removed:
- Personal details (name, date of birth, contact, address)
- Treatment history
- Payment and billing records
- Reward points balance
- Uploaded consent forms

[If partial deletion:] The following data has been retained for [X years] as required by applicable law: [describe retained data briefly].

If you have any questions, please contact us at [clinic email/phone].

Yours sincerely,  
[Staff Name]  
[Clinic Name]

---

## 10. What Happens If the Clinic Does Not Respond to a Deletion Request

If a patient submits a deletion request to the clinic and receives no response within **90 days**, they may:

1. Contact AARMA's Grievance Officer at kavinmanickannan@gmail.com.
2. AARMA will contact the clinic within 5 business days to resolve the matter.
3. If the clinic is unresponsive, AARMA may exercise discretion to anonymise the patient's data after giving the clinic 48 hours' notice.
4. If still unresolved, the patient may file a complaint with the **Data Protection Board of India (DPBI)** once constituted.

---

## 11. Gaps to Address — Improvement Roadmap

| Gap | Impact | Target Version |
|---|---|---|
| Consent file deletion not triggered when patient is deleted (current) | Orphaned files remain on disk after patient deletion | v1.x patch |
| No deletion log in current version | Cannot demonstrate compliance if audited | v1.x patch |
| No patient-facing self-service deletion portal | Forces all requests through clinic staff | v2.1 |
| Partial anonymisation not implemented | Full delete currently; no graceful handling of statutory holds | v2.0 |
| 30-day soft delete buffer | Not present in local version | v2.0 |
| Automated purge of soft-deleted records | Manual process currently | v2.0 |
| Minor patient deletion — parental consent check | Not enforced in current UI | v2.1 |

---

*See also: [privacy_policy.md](./privacy_policy.md) · [breach_notification_process.md](./breach_notification_process.md) · [data_processing_agreement.md](./data_processing_agreement.md) · [database_schema.md](../database_schema.md)*

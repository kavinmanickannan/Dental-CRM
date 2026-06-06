# Privacy Policy
## Dental Clinic Management System

**Version:** 1.0  
**Effective Date:** [INSERT DATE BEFORE LAUNCH]  
**Last Reviewed:** May 2026  
**Governed by:** Digital Personal Data Protection Act, 2023 (DPDP Act) and DPDP Rules, 2025 (notified 13 November 2025)

---

> **Competitor benchmark note (internal):** As of May 2026, Dentsoftware's privacy policy (last updated April 2022) is a generic TermsFeed-generated template referencing CCPA and GDPR — with no mention of the DPDP Act, no patient health data section, and no erasure or breach procedures. Dentee does not publish a standalone data processing policy. AARMA is positioned to be the **only DPDP-compliant dental CRM in India** at launch.

---

## Part A — Who We Are and What This Policy Covers

**Dental CRM** ("AARMA", "we", "us", "our") is a Software-as-a-Service (SaaS) platform that provides dental clinic management software to dental clinics and practitioners across India.

**Legal entity:** [YOUR REGISTERED COMPANY NAME]  
**Registered address:** [YOUR REGISTERED ADDRESS]  
**Grievance Officer / Data Protection Contact:** Kavin Manickannan  
**Contact email:** kavinmanickannan@gmail.com  
**Response time:** Within 48 hours of receiving any privacy-related query.

### Roles Under the DPDP Act, 2023

Understanding who controls what data is important for compliance:

| Party | Role under DPDP Act | Description |
|---|---|---|
| **Dental Clinic** (your customer) | **Data Fiduciary** | Decides the purpose and means of collecting patient data. Legally responsible to patients for how their data is used. |
| **AARMA** | **Data Processor** | Processes patient data strictly on the instructions of the dental clinic. Bound by the Data Processing Agreement with each clinic. |
| **Patient** | **Data Principal** | The individual whose personal data is being processed. Holds rights under the DPDP Act. |
| **Clinic Staff / Dentists** | **Authorised Users** | Access and operate the system on behalf of the dental clinic (Data Fiduciary). |

This Privacy Policy covers two distinct areas:

1. **Platform data** — data AARMA collects about clinics and their staff when they sign up and use the platform.
2. **Patient data** — personal data that clinics process through AARMA's system on behalf of their patients. AARMA processes this data only as instructed by the clinic (Data Fiduciary).

---

## Part B — Data AARMA Collects About Clinics and Staff

When a dental clinic signs up for AARMA, we collect:

### B.1 Clinic Account Data

| Data Element | Purpose | Legal Basis |
|---|---|---|
| Clinic name, address, phone, email | Create and operate the clinic account | Contractual necessity |
| GSTIN (if provided) | Generate GST-compliant invoices | Contractual necessity |
| Subdomain name (e.g., xyz-dental.aarma.in) | Identify clinic on the platform | Contractual necessity |
| Reward rate configuration (earn/redeem rates) | Operate rewards engine per clinic settings | Contractual necessity |
| Subscription and billing records | Process payments, issue invoices | Contractual necessity + legal obligation |

### B.2 Staff / User Account Data

| Data Element | Purpose | Legal Basis |
|---|---|---|
| Name, email address | Create login credentials | Contractual necessity |
| Role (admin / receptionist / dentist) | Enforce access permissions | Contractual necessity |
| Login timestamps, IP address | Security auditing, fraud prevention | Legitimate interest |
| Password (hashed — never stored in plain text) | Authentication | Contractual necessity |

### B.3 Data AARMA Does NOT Collect About Clinics / Staff

- Payment card numbers (handled directly by Razorpay / payment gateway)
- Aadhaar numbers or government IDs of staff
- Biometric data

---

## Part C — Patient Data Processed Through AARMA

Dental clinics use AARMA to collect and store patient personal data. AARMA processes this data **only as a Data Processor**, strictly under the instructions of the clinic (Data Fiduciary). The clinic is legally responsible to patients for obtaining lawful consent and managing patient rights.

### C.1 Categories of Patient Personal Data Processed

| Category | Data Elements | Sensitivity |
|---|---|---|
| **Identity** | Full name, date of birth, age, sex | Personal data |
| **Contact** | Phone number, address | Personal data |
| **Health / Treatment** | Treatment descriptions, treatment dates, dentist name, treatment cost, treatment status, next appointment date, patient history / medical notes | **Sensitive personal data (health data)** |
| **Financial** | Payment amounts, payment method (Cash/Card/UPI/Other), outstanding balance, billing history | Personal data |
| **Loyalty / Rewards** | Reward points balance, points earned/redeemed per transaction | Personal data |
| **Documents** | Consent form files (PDF/JPG/PNG) uploaded per treatment | **Sensitive personal data** |
| **Identifiers** | System-generated Patient ID (PAT-XXXX), Treatment UUID, Billing UUID | Personal data |

### C.2 Health Data — Special Note

Treatment records, medical notes, and consent forms constitute **health data**, which the DPDP Act treats as sensitive personal data. Clinics (as Data Fiduciaries) are responsible for:

- Obtaining patient consent before collecting health data.
- Informing patients of the purpose for which health data is collected.
- Not using health data for any purpose beyond providing dental care.

Under DPDP Rules 2025, healthcare providers (clinics) are **exempt from seeking fresh consent** for processing health data that is strictly necessary to provide the health service the patient is attending for. However, this exemption applies to the **clinic**, not to AARMA as a platform provider. AARMA processes health data strictly as instructed by the clinic.

### C.3 What AARMA Does Not Do With Patient Data

- AARMA does not sell, rent, or share patient data with third parties for marketing.
- AARMA does not use patient data to train machine learning models (current version).
- AARMA does not run advertisements in the platform using patient data.
- AARMA does not share patient data between different clinic accounts. Each clinic's data is isolated via Row Level Security (see [system_architecture.md](../system_architecture.md)).

---

## Part D — Data Retention

### D.1 Patient Data Retention

| Data Type | Retention Period | Basis |
|---|---|---|
| Active patient records | Duration of clinic's active subscription + 3 years | Medical record-keeping obligations; Indian Medical Council guidelines |
| Billing records | 8 years from transaction date | Income Tax Act, 1961 (Section 128) |
| Consent form files | Duration of clinic subscription + 3 years | Clinical Establishments (Registration and Regulation) Act, 2010 |
| Reward points records | Duration of active subscription | Contractual |
| Deleted patient records | Purged within **30 days** of deletion request | DPDP Act, Section 8(3) |

### D.2 Platform Data Retention (Clinic / Staff)

| Data Type | Retention Period |
|---|---|
| Clinic account data | Duration of subscription + 90 days after cancellation |
| Staff login records and audit logs | 2 years |
| Subscription and payment records | 8 years (statutory requirement) |

### D.3 Erasure Notice

As required by DPDP Rules 2025, Rule 8: before erasing a Data Principal's data upon purpose fulfilment or consent withdrawal, AARMA will provide the clinic (Data Fiduciary) with at least **48 hours' advance notice**, and the clinic must notify the patient accordingly.

---

## Part E — Patient Rights Under DPDP Act, 2023

Patients whose data is processed through AARMA's platform have the following rights under the DPDP Act:

| Right | What it means | How to exercise | Response time |
|---|---|---|---|
| **Right to access** (Section 11) | Know what personal data the clinic holds about you | Contact your dental clinic directly | 30 days |
| **Right to correction** (Section 12) | Correct inaccurate or incomplete personal data | Contact your dental clinic | 30 days |
| **Right to erasure** (Section 12) | Request deletion of your personal data when the purpose is fulfilled | Submit request to clinic; clinic submits to AARMA | 90 days (DPDP Rules, Rule 14) |
| **Right to grievance redressal** (Section 13) | Raise a complaint if your rights are not honoured | Contact AARMA Grievance Officer at kavinmanickannan@gmail.com | 48 hours acknowledgement; resolution within 30 days |
| **Right to nominate** (Section 14) | Nominate another person to exercise rights in case of death or incapacity | Contact your dental clinic | 30 days |
| **Right to withdraw consent** | Withdraw consent to data processing at any time | Contact your dental clinic; withdrawal does not affect prior lawful processing | 30 days |

**Important:** For most of these rights, **patients must first contact their dental clinic** (the Data Fiduciary). If the clinic does not respond, patients may contact AARMA's Grievance Officer. If AARMA does not respond satisfactorily, patients may escalate to the **Data Protection Board of India (DPBI)** once it is constituted.

---

## Part F — Security Safeguards

AARMA implements the following security measures as required under DPDP Act Section 8(5):

### Current (Local Version — AARMA v1.x)
- All data stored locally in the clinic's own browser (IndexedDB + localStorage).
- No patient data transmitted to external servers.
- Authorization guard prevents unauthorized access.
- `escapeHtml()` sanitization on all rendered user data to prevent XSS.
- Consent files stored on local file system with File System Access API.

### Hosted Version (AARMA v2.x — in development)
- All data transmitted over **HTTPS / TLS 1.3** only.
- Data stored in **Supabase (PostgreSQL)** with **Row Level Security (RLS)** — each clinic can only access its own data.
- Passwords hashed using **bcrypt** (via Supabase Auth) — never stored in plain text.
- JWT tokens scoped to `clinic_id` — cross-clinic data access is structurally impossible.
- Consent PDFs stored in **Supabase Storage** with time-limited signed URLs.
- Audit logs for all sensitive operations (patient delete, billing modification).
- Regular automated backups (Supabase daily snapshots).
- Staff access limited by role (admin / receptionist / dentist).

---

## Part G — Third-Party Services (Hosted Version)

| Service | Purpose | Data shared | Their privacy policy |
|---|---|---|---|
| Supabase (USA) | Database, auth, file storage | Clinic and patient data (encrypted at rest) | supabase.com/privacy |
| Vercel / Netlify | Static hosting | No patient data | vercel.com/legal/privacy-policy |
| Resend / Brevo | Transactional emails (staff accounts only) | Staff email address only | resend.com/legal/privacy-policy |
| Razorpay (India) | Payment processing (clinic subscriptions only) | Clinic billing info | razorpay.com/privacy |

AARMA does not share **patient data** with any third-party service except Supabase (infrastructure), which acts as a sub-processor under contractual obligations consistent with this Policy.

---

## Part H — Children's Data

The dental platform may collect data of patients under 18 years of age (minors). Under DPDP Rules 2025, Rule 10:

- The **dental clinic** (Data Fiduciary) is responsible for obtaining verifiable parental/guardian consent before collecting health data of a minor patient.
- Consent verification for minors is recommended via DigiLocker-based parent verification (where available).
- AARMA does not knowingly market to, or profile, individuals under 18.
- The `sex` field in patient records accepts only `Male`, `Female`, `Other` — no age-based profiling is performed by AARMA.

---

## Part I — Cookies and Tracking (Website and Platform)

| Cookie type | Used | Purpose |
|---|---|---|
| Strictly necessary | Yes | Session token, login state (JWT) |
| Preference | Yes | Light/Dark theme (`dental_app_theme` in localStorage) |
| Analytics | No (current version) | Not used |
| Advertising | No | AARMA does not run or serve ads |
| Third-party tracking | No | Not used |

The platform does not use Google Analytics, Facebook Pixel, or any behavioural tracking tool on the clinical management interface. The AARMA marketing website may use analytics — this will be covered in a separate cookie notice.

---

## Part J — Changes to This Policy

AARMA will notify clinic administrators of material changes to this Privacy Policy via:
1. Email to the registered clinic admin email address.
2. An in-app notice on the dashboard upon next login.

Minor changes (grammar, clarifications, contact updates) will be made without notice. The "Last Reviewed" date at the top of this document will always reflect the most current version. Clinics are responsible for communicating relevant changes to their patients.

---

## Part K — How to Contact Us

**For privacy queries, right-to-erasure requests, or grievances:**

Grievance Officer: Kavin Manickannan  
Email: kavinmanickannan@gmail.com  
Response SLA: 48 hours (acknowledgement), 30 days (resolution)

**For breach-related notifications from clinics:**  
Follow the procedure in [breach_notification_process.md](./breach_notification_process.md).

**For escalation to India's Data Protection Board:**  
Once constituted, complaints can be filed at: [www.dpboard.gov.in](https://www.dpboard.gov.in) (URL subject to change upon constitution of the Board).

---

## Appendix — Gaps to Address Before Hosted Launch

The following items are identified for improvement before the hosted version goes live. They are documented here for transparency and internal tracking.

| Gap | Current State | Required Action | Target Version |
|---|---|---|---|
| Formal consent banner | Not present | Add DPDP-compliant consent notice on first clinic login and on patient registration form | v2.0 |
| Patient-facing consent form | Clinics use physical consent forms only | Add digital consent capture in the app for each patient | v2.1 |
| Data retention automation | Manual/not implemented | Auto-purge patient data 30 days after deletion request; notify clinic 48h before purge | v2.0 |
| Audit log | Not present | Log all sensitive operations (patient delete, billing edit, data export) with user ID + timestamp | v2.0 |
| Children's data flag | No age-based flag in system | Add `is_minor` flag (auto-set when DOB < 18 years) to trigger parental consent prompt in clinic UI | v2.1 |
| Data portability | Manual JSON export only | Add patient-level data export (JSON/PDF) for portability right | v2.1 |
| DPBI complaint portal link | Not present | Add link to Data Protection Board complaint portal once constituted | v2.0 |
| Sub-processor agreements | Not present | Execute DPA with Supabase; review Vercel and Resend terms | Pre-launch |
| DPO appointment | Not required yet (not an SDF) | Monitor if AARMA becomes a Significant Data Fiduciary; appoint DPO when required | As needed |

---

*This document is governed by the laws of India. Disputes shall be subject to jurisdiction of courts in [YOUR CITY], India.*

*See also: [data_deletion_procedure.md](./data_deletion_procedure.md) · [breach_notification_process.md](./breach_notification_process.md) · [data_processing_agreement.md](./data_processing_agreement.md)*

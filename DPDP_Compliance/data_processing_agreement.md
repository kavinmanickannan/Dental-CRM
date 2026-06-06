# Data Processing Agreement (DPA)
## Between Dental CRM and [Clinic Name]

**Version:** 1.0  
**Effective Date:** [INSERT DATE]  
**Legal Basis:** DPDP Act 2023, Section 8 (Data Processor obligations) and DPDP Rules 2025  
**Jurisdiction:** Republic of India

> **How to use this document:** This DPA must be signed by each dental clinic before they are given access to the AARMA hosted platform. In the current local version, clinics should acknowledge this agreement digitally (e.g., checkbox at first login). For the hosted SaaS version, a digital signature or checkbox acceptance at account creation is sufficient under Indian contract law (Information Technology Act, 2000, Section 10A).

---

## Parties

**Data Processor:**  
[YOUR REGISTERED COMPANY NAME] ("AARMA")  
[Registered Address]  
Email: kavinmanickannan@gmail.com  
Represented by: Kavin Manickannan

**Data Fiduciary (Clinic):**  
[CLINIC LEGAL NAME] ("Clinic")  
[Clinic Address]  
Email: [CLINIC EMAIL]  
Represented by: [AUTHORISED SIGNATORY NAME AND DESIGNATION]

Collectively referred to as "the Parties."

---

## Recitals

A. The Clinic is a dental practice that collects and processes personal data of its patients, including health data, in the course of providing dental care. Under the DPDP Act 2023, the Clinic is a **Data Fiduciary**.

B. AARMA provides a cloud-based dental clinic management platform that enables the Clinic to store, organise, and manage patient data. Under the DPDP Act 2023, AARMA is a **Data Processor** — it processes patient personal data strictly on behalf of and under the instruction of the Clinic.

C. DPDP Act 2023, Section 8 requires that a Data Fiduciary ensure its Data Processor implements reasonable security safeguards and processes data only as instructed.

D. The Parties enter into this Data Processing Agreement to set out their respective obligations, the scope of processing, and the safeguards to be maintained.

---

## Article 1 — Definitions

| Term | Meaning |
|---|---|
| **DPDP Act** | Digital Personal Data Protection Act, 2023 |
| **DPDP Rules** | Digital Personal Data Protection Rules, 2025 (notified 13 November 2025) |
| **Personal Data** | Any data about an identifiable individual, as defined in the DPDP Act |
| **Health Data** | Personal data relating to a patient's physical or mental health, treatment records, and medical history — treated as sensitive personal data |
| **Processing** | Any operation on personal data including collection, storage, use, retrieval, sharing, or deletion |
| **Data Principal** | The patient whose personal data is being processed |
| **Data Breach** | Any unauthorised access, disclosure, alteration, destruction, or loss of personal data |
| **Sub-Processor** | A third party engaged by AARMA to assist in processing, e.g., Supabase (infrastructure) |
| **DPBI** | Data Protection Board of India |

---

## Article 2 — Scope of Processing

### 2.1 Categories of Personal Data Processed

AARMA processes the following categories of patient personal data on behalf of the Clinic:

| Category | Data Elements | Sensitivity |
|---|---|---|
| Identity | Patient name, date of birth, age, sex | Personal data |
| Contact | Phone number, address | Personal data |
| Health | Treatment descriptions, dates, dentist name, treatment status, next appointment, patient history notes | **Sensitive (health data)** |
| Financial | Payment amounts, payment method, billing history, outstanding balance | Personal data |
| Loyalty | Reward points balance, earn/redeem history | Personal data |
| Documents | Consent form files (PDF/JPG/PNG) | **Sensitive (health data)** |
| Identifiers | System-generated patient ID (PAT-XXXX) | Personal data |

### 2.2 Purpose of Processing

AARMA processes the above data **solely** for the following purposes:

1. Enabling the Clinic to maintain patient records.
2. Enabling the Clinic to record and track treatment history.
3. Enabling the Clinic to manage billing and payment records.
4. Enabling the Clinic to operate the patient rewards programme.
5. Enabling the Clinic to store and retrieve patient consent documents.
6. Generating dashboard analytics and reports visible only to the Clinic.
7. Providing technical support to the Clinic when authorised by the Clinic.

AARMA shall not process the data for any other purpose without the prior written consent of the Clinic.

### 2.3 Duration of Processing

AARMA processes patient data for the duration of the Clinic's active subscription to the AARMA platform, plus a 90-day post-termination period to enable data export by the Clinic. After 90 days post-termination, all patient data is permanently deleted from AARMA's systems.

---

## Article 3 — Obligations of AARMA (Data Processor)

### 3.1 Process Only on Instructions

AARMA shall process patient personal data only on documented instructions from the Clinic. This DPA and any subsequent written instructions constitute the Clinic's instructions. If AARMA is required by law to process data beyond these instructions, AARMA shall inform the Clinic to the extent permitted by law.

### 3.2 Confidentiality

AARMA shall ensure that all persons authorised to process patient data (AARMA employees, contractors, support staff) are bound by a duty of confidentiality. AARMA staff shall not access individual clinic patient data except to provide technical support, and only with the Clinic's prior written consent.

### 3.3 Security Safeguards

AARMA shall implement and maintain the following security measures, consistent with DPDP Act Section 8(5):

**Current (Local Version v1.x):**
- Browser-level isolation — data stored only in the clinic's own device.
- Authorization guard preventing unauthorised app access.
- Input sanitisation (`escapeHtml()`) on all rendered data.
- Confirmation prompts before all destructive operations (delete patient, delete treatment).

**Hosted Version v2.x (in development):**
- All data transmitted over HTTPS / TLS 1.3.
- Database encrypted at rest (Supabase / PostgreSQL AES-256).
- Row Level Security (RLS) enforcing per-clinic data isolation.
- Passwords hashed using bcrypt — never stored in plain text.
- JWT authentication scoped to `clinic_id`.
- Role-based access control (admin, receptionist, dentist).
- Audit logs for all sensitive operations.
- Automated daily database backups.
- Time-limited signed URLs for consent file access.

### 3.4 Sub-Processors

AARMA currently engages the following sub-processors (hosted version):

| Sub-Processor | Location | Purpose | Safeguard |
|---|---|---|---|
| Supabase Inc. | USA (data stored in selected region) | Database, authentication, file storage | Supabase DPA; SOC 2 Type II compliant |
| Vercel Inc. | USA | Static frontend hosting | No patient data stored; Vercel DPA available |
| Resend Inc. / Brevo | USA / EU | Transactional email for staff accounts only | No patient data transmitted |

AARMA shall not engage a new sub-processor that will have access to patient personal data without providing the Clinic with at least **14 days' advance notice** in writing (email to the registered clinic admin email). The Clinic may object to the new sub-processor within 14 days. If the Clinic objects and the Parties cannot resolve the objection, the Clinic may terminate this Agreement without penalty.

AARMA shall execute written sub-processor agreements with each sub-processor that impose data protection obligations no less stringent than those in this DPA.

### 3.5 Assistance with Data Principal Rights

AARMA shall assist the Clinic in fulfilling Data Principal rights requests (access, correction, erasure, portability) where the fulfilment requires AARMA's technical cooperation. AARMA shall respond to such requests from the Clinic within **10 business days**.

Specific procedures are documented in [data_deletion_procedure.md](./data_deletion_procedure.md).

### 3.6 Breach Notification to the Clinic

Upon becoming aware of a personal data breach affecting the Clinic's patient data, AARMA shall notify the Clinic **without undue delay and in no case later than 48 hours** of discovery. The breach notification shall include the information set out in [breach_notification_process.md](./breach_notification_process.md).

### 3.7 Data Return and Deletion on Termination

Upon termination or expiry of the Clinic's subscription:

1. AARMA shall provide the Clinic with a full data export in JSON format within **30 days** of termination, at no additional charge.
2. After the 90-day post-termination period, AARMA shall permanently delete all patient personal data from its systems and sub-processors, and provide written confirmation to the Clinic.
3. Deletion logs shall be retained for 5 years.

### 3.8 Audit Rights

The Clinic may, with reasonable notice (minimum 7 days), request:

1. Written confirmation from AARMA that security safeguards are in place.
2. A summary of AARMA's most recent security review.
3. Evidence of sub-processor agreements.

AARMA is not obligated to provide access to its infrastructure or source code, but shall cooperate with reasonable documentation requests.

---

## Article 4 — Obligations of the Clinic (Data Fiduciary)

### 4.1 Lawful Basis for Processing

The Clinic warrants that it has a lawful basis (consent or legitimate use under DPDP Act) to collect patient personal data before entering that data into the AARMA platform. The Clinic is responsible for obtaining informed patient consent for data collection and informing patients of their rights.

### 4.2 Accuracy of Data

The Clinic is responsible for ensuring that patient data entered into AARMA is accurate and up to date. AARMA is not liable for inaccurate data entered by the Clinic.

### 4.3 Staff Training and Access Control

The Clinic shall:
- Only grant AARMA platform access to staff who require it for their role.
- Revoke access immediately when a staff member leaves or changes role.
- Ensure staff do not share login credentials.
- Maintain the confidentiality of their clinic's admin password.

### 4.4 Patient Notifications

The Clinic is responsible for:
- Informing patients (at the point of registration) that their data is stored in AARMA's system.
- Providing patients with AARMA's Privacy Policy or a summary of their rights.
- Notifying patients of any data breach within 72 hours of receiving AARMA's breach notification.
- Processing patient deletion requests as described in [data_deletion_procedure.md](./data_deletion_procedure.md).

### 4.5 Device Security (Local Version)

For the current local version of AARMA:
- The Clinic shall ensure the device running AARMA is protected with a strong OS password.
- The Clinic shall not use AARMA on shared or public computers.
- The Clinic shall maintain regular JSON backups using AARMA's export function.
- The Clinic shall report any device theft, loss, or suspected unauthorised access to AARMA within 24 hours.

### 4.6 No Unauthorised Use

The Clinic shall not:
- Use AARMA to process data for any purpose other than managing its own dental practice.
- Share patient data exported from AARMA with unauthorised third parties.
- Attempt to access patient data of another clinic through AARMA's system.

---

## Article 5 — Liability

### 5.1 AARMA's Liability

AARMA is liable to the Clinic for data breaches or DPDP Act violations that are directly caused by AARMA's failure to comply with this DPA or to implement the security safeguards described in Article 3.3.

AARMA's total liability under this DPA, in aggregate, shall not exceed **the total subscription fees paid by the Clinic to AARMA in the 12 months preceding the event giving rise to the claim**.

### 5.2 Clinic's Liability

The Clinic is liable to its patients for:
- Failures in obtaining lawful consent.
- Failures in notifying patients of their rights.
- Failures in responding to patient rights requests within the required timeframe.
- Data breaches arising from the Clinic's own actions (e.g., sharing login credentials, loss of a device).

### 5.3 Shared Liability for Breaches

If a breach results from the combined failures of both Parties, liability shall be apportioned in proportion to each Party's contribution to the breach.

---

## Article 6 — Term and Termination

### 6.1 Term

This DPA is effective from the date the Clinic activates their AARMA account and remains in force for the duration of the Clinic's subscription.

### 6.2 Termination

Either Party may terminate this DPA with **30 days' written notice**. Termination of this DPA automatically terminates the Clinic's subscription. Obligations of confidentiality and data deletion survive termination.

---

## Article 7 — Governing Law and Dispute Resolution

This DPA is governed by the laws of the Republic of India. Any disputes arising from this DPA shall first be attempted to be resolved through good-faith negotiation between the Parties. If unresolved within 30 days, disputes shall be submitted to the exclusive jurisdiction of the courts at **[YOUR CITY], India**.

---

## Article 8 — Amendments

AARMA may update this DPA to reflect changes in the law (DPDP Act, DPDP Rules, or any sector-specific health data regulation). The Clinic will be notified of material changes at least **14 days** before they take effect. Continued use of the platform after the effective date constitutes acceptance of the updated DPA.

---

## Execution

By activating an account on the AARMA platform (digitally checking "I agree to the Data Processing Agreement"), the Clinic's authorised representative confirms they have read, understood, and agree to be bound by this DPA on behalf of the Clinic.

**For AARMA:**

Name: Kavin Manickannan  
Designation: Founder / Grievance Officer  
Email: kavinmanickannan@gmail.com  
Date: [DATE]  
Signature: ___________________________

---

**For the Clinic:**

Clinic Name: ___________________________  
Authorised Signatory Name: ___________________________  
Designation: ___________________________  
Email: ___________________________  
Date: ___________________________  
Signature: ___________________________

---

## Appendix A — Clinic Onboarding Checklist

Before a clinic is granted access to the AARMA hosted platform, the following must be confirmed:

- [ ] DPA accepted (digital checkbox or wet signature)
- [ ] Clinic admin email verified
- [ ] Clinic name, address, phone entered in settings
- [ ] At least one staff user account created
- [ ] Privacy Policy acknowledged by clinic admin
- [ ] Clinic informed of their obligations as Data Fiduciary
- [ ] Clinic informed of breach notification procedure

---

## Appendix B — Gaps and Improvement Roadmap

| Gap | Impact | Target Version |
|---|---|---|
| DPA is manual / paper-based (current) | No automated acceptance tracking | v2.0 — digital checkbox at account creation with timestamp stored in DB |
| No sub-processor DPA with Supabase yet | Risk if Supabase processes data before agreement is signed | Pre-launch — execute Supabase DPA |
| No formal audit procedure | Cannot demonstrate compliance if queried by DPBI | v2.0 — annual internal security review documented |
| No cyber liability insurance | Financial exposure in event of large breach | Obtain before hosted launch |
| No lawyer review of this DPA | Risk of unenforceability in specific clauses | Review by Indian IT/privacy law practitioner before v2.0 launch |
| Liability cap is undefined in current version | No protection against disproportionate claims | Define in v2.0 subscription terms |

---

*This document is for internal reference and should be reviewed by a qualified Indian technology / data privacy lawyer before use in live contracts. It is based on the DPDP Act 2023 and DPDP Rules 2025 (notified November 2025). Full compliance deadline: 13 May 2027.*

*See also: [privacy_policy.md](./privacy_policy.md) · [data_deletion_procedure.md](./data_deletion_procedure.md) · [breach_notification_process.md](./breach_notification_process.md)*

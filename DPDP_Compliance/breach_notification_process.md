# Breach Notification Process
## AARMA Dental Clinic Management System

**Version:** 1.0  
**Effective Date:** [INSERT DATE BEFORE LAUNCH]  
**Legal Basis:** DPDP Act 2023, Section 8(6) and DPDP Rules 2025, Rule 7  
**Owner:** AARMA Grievance Officer (kavinmanickannan@gmail.com)  
**Penalty for non-compliance:** Up to ₹200 crore per incident (DPDP Act, Section 33)

---

## 1. What Is a Personal Data Breach

A **personal data breach** means any unauthorised access, disclosure, alteration, destruction, or loss of personal data that AARMA or a clinic processes. This includes:

| Breach Type | Examples |
|---|---|
| **Unauthorised access** | A staff member accesses patient records they are not authorised to view; a former staff member's credentials are not revoked after they leave the clinic |
| **Data exposure** | Patient data is accidentally exported and shared with the wrong person; a file upload goes to the wrong patient folder |
| **System compromise** | A third party gains access to the hosted AARMA database via a vulnerability |
| **Accidental loss** | IndexedDB data is wiped when a browser is uninstalled; a clinic's device containing local data is stolen |
| **Ransomware / malware** | Malicious software encrypts or exfiltrates patient data from the clinic's device |
| **Unauthorised sharing** | Clinic staff shares patient treatment or billing information on WhatsApp or email without authorisation |

**Not a breach (but still a reportable incident):** System outages that don't result in data exposure, failed login attempts (unless they indicate a successful compromise), or routine security alerts that are contained before data is accessed.

---

## 2. Roles in Breach Response

| Role | Person / Team | Responsibility |
|---|---|---|
| **Incident Lead** | AARMA Grievance Officer (Kavin Manickannan) | Coordinates all breach response activities |
| **Technical Lead** | AARMA developer / hosting admin | Investigates technical cause; implements containment |
| **Clinic Contact** | Clinic Administrator (Data Fiduciary) | Notifies affected patients; cooperates with AARMA's investigation |
| **Legal Advisor** | External counsel (to be appointed) | Reviews breach severity; advises on DPBI reporting obligation |

---

## 3. Breach Response Timeline

The DPDP Rules 2025, Rule 7 mandates a **72-hour window** from the time a breach is discovered to notify both the Data Protection Board of India (DPBI) and affected Data Principals.

```
T=0  │  Breach discovered (by AARMA, clinic staff, or third party)
     │
T+2h │  AARMA Incident Lead notified
     │  Initial assessment: is personal data involved?
     │       │
     │       ├── No personal data involved → Log as security incident,
     │       │   not a breach; no DPBI notification required
     │       │
     │       └── Personal data involved → PROCEED
     │
T+6h │  Containment actions taken
     │  (revoke credentials, isolate server, stop data export, etc.)
     │
T+24h│  Internal breach report drafted
     │  Affected data and patients identified
     │
T+48h│  DPBI preliminary notification submitted (Rule 7)
     │  Clinic notified in writing
     │
T+72h│  Affected patients notified (via clinic)
     │  Full breach report submitted to DPBI
     │
T+7d │  Root cause analysis completed
T+14d│  Remediation plan implemented
T+30d│  Follow-up report to DPBI (if required)
```

**Note:** The 72-hour clock starts from the moment the breach is **discovered**, not when it is confirmed. AARMA must err on the side of early notification.

---

## 4. Step-by-Step Response Procedure

### Step 1 — Detection and Initial Assessment (T=0 to T+6h)

**How breaches may be detected:**

| Detection Source | How It Reaches AARMA |
|---|---|
| Supabase security alerts (hosted version) | Automated email / dashboard alert |
| Clinic staff report | Clinic admin emails kavinmanickannan@gmail.com |
| Patient complaint | Patient contacts clinic; clinic escalates to AARMA |
| Third-party security researcher | Responsible disclosure email |
| AARMA's own audit log review | Scheduled security review |

**Immediate actions on discovery:**
1. Log the incident: date, time, who reported it, initial description.
2. Assess: Is personal data (patient records, billing, health data) involved?
3. If yes — notify the Incident Lead immediately (even outside business hours).
4. Do NOT delete any logs, database entries, or communications related to the breach. These are evidence.

### Step 2 — Containment (T+2h to T+6h)

Containment actions depend on breach type:

| Breach Type | Containment Action |
|---|---|
| Compromised staff login (hosted) | Immediately revoke JWT tokens; force password reset for affected user; review audit logs for all actions taken under that credential |
| Database exposure | Revoke Supabase API keys; regenerate anon + service keys; review RLS policies |
| Device theft (local version) | Advise clinic to change browser profile password; if OS-level encryption was not enabled, treat all data on device as exposed |
| Accidental data export / wrong recipient | Contact recipient immediately to confirm deletion; document their response |
| Ransomware on clinic device | Advise clinic to isolate device from network; restore from last clean backup |

### Step 3 — Internal Breach Report (T+6h to T+24h)

Prepare an internal report covering:

```
Breach Report Template — Internal

Incident ID:         [YYYY-MM-DD-001]
Date/Time Discovered: 
Reported By:         
Date/Time of Actual Breach (estimated): 
Description of Breach: 
Systems Affected:    
Data Types Exposed:  
  [ ] Patient names
  [ ] Contact details
  [ ] Health / treatment records
  [ ] Billing records
  [ ] Consent form files
  [ ] Login credentials
  [ ] Other: ___________
Estimated Number of Affected Patients: 
Affected Clinics:    
Containment Actions Taken: 
Is the Breach Contained?  [ ] Yes  [ ] No  [ ] Partially
Risk to Affected Patients:
  [ ] Low (data not sensitive; no financial risk)
  [ ] Medium (contact details exposed; risk of phishing)
  [ ] High (health data, financial data, or consent forms exposed)
  [ ] Critical (large-scale exposure; identity theft risk)
Prepared By:         
Date Prepared:       
```

### Step 4 — DPBI Notification (T+48h)

**Where to notify:** Data Protection Board of India (DPBI) — once constituted, the reporting portal will be at [www.dpboard.gov.in](https://www.dpboard.gov.in). Until the Board is constituted (expected 2026–2027), formal breach reporting obligations are not yet enforceable; however AARMA will maintain internal breach records as if the Board is active.

**What to include in the DPBI notification (Rule 7):**

1. A description of the nature of the breach (broad facts and causes).
2. Categories and approximate number of Data Principals affected.
3. Categories of personal data involved.
4. Likely consequences of the breach.
5. Measures taken or proposed to mitigate harm.
6. Findings regarding persons or entities responsible (if known).
7. Steps implemented to prevent recurrence.
8. Summary of notifications issued to affected Data Principals.
9. AARMA's contact details (Grievance Officer name + email).

### Step 5 — Clinic Notification (T+48h)

AARMA must notify the affected clinic(s) in writing using the template below:

---

**BREACH NOTIFICATION — AARMA DENTAL CRM**

**To:** [Clinic Administrator Name], [Clinic Name]  
**From:** Kavin Manickannan, AARMA Grievance Officer  
**Date:** [DATE]  
**Incident ID:** [YYYY-MM-DD-001]  
**Confidential — Not for further distribution**

Dear [Clinic Name] Team,

We are writing to inform you of a personal data security incident that may affect patient data managed through AARMA Dental CRM for your clinic.

**What happened:**  
[Factual description — 2–3 sentences. Do not speculate on cause or blame.]

**Data affected:**  
[List specific data types: e.g., "Patient names and contact details of approximately X patients. Treatment records were not affected."]

**When it happened:**  
Approximately [date/time range].

**What we have done:**  
[List containment steps taken.]

**What you need to do:**  
As the Data Fiduciary for your patients' data, you are required under the DPDP Act to notify affected patients within 72 hours of this communication. We have prepared a draft patient notification template below for your use.

**Risk assessment:**  
[High / Medium / Low] — [brief explanation of risk to patients].

Please contact us immediately at kavinmanickannan@gmail.com or [phone] with any questions.

Regards,  
Kavin Manickannan  
Grievance Officer, AARMA Dental CRM

---

### Step 6 — Patient Notification (T+72h, via clinic)

The clinic (Data Fiduciary) is responsible for notifying affected patients. AARMA provides the following template for clinic use:

---

**Subject: Important Notice Regarding Your Personal Data — [Clinic Name]**

Dear [Patient Name],

We are writing to inform you of a security incident that may have affected your personal information stored at [Clinic Name].

**What happened:**  
[Plain-language description. Avoid technical jargon.]

**What information was involved:**  
[e.g., "Your name and contact number may have been accessed. Your treatment records and payment details were not affected."]

**What we are doing:**  
We have taken immediate steps to contain the incident and have reported it to the relevant authorities. [Specific actions taken.]

**What you can do to protect yourself:**  
- Be cautious of unexpected calls or messages claiming to be from our clinic.
- If you receive suspicious communications requesting personal or financial information, do not respond and report it to us.
- [If financial data was involved: Monitor your bank accounts / UPI for unauthorised transactions.]

**Your rights:**  
You have the right to contact us at [clinic email/phone] to ask questions about how your data was affected. You may also contact the Data Protection Board of India.

**Contact us:**  
[Clinic Name] | [Address] | [Phone] | [Email]

We sincerely apologise for any concern this may cause.

Yours sincerely,  
[Staff Name]  
[Clinic Name]

---

### Step 7 — Root Cause Analysis and Remediation (T+7d to T+30d)

After the immediate breach is contained:

1. Conduct a full root cause analysis — what vulnerability or process failure enabled the breach?
2. Implement technical or procedural fixes.
3. Update the breach log with findings.
4. If required by the DPBI, submit a follow-up report within 30 days.
5. Review and update this document if the process revealed gaps.

---

## 5. Breach Severity Classification

| Severity | Data Involved | Number Affected | Required Action |
|---|---|---|---|
| **Critical** | Health records, consent forms, financial data | Any number | DPBI notification + patient notification within 72h; legal counsel engaged |
| **High** | Contact details, names, patient IDs | >50 patients | DPBI notification + patient notification within 72h |
| **Medium** | Contact details, names | <50 patients | DPBI notification; patient notification at clinic discretion |
| **Low** | No patient data exposed; staff data only | Any | Internal log; no DPBI notification required |
| **Non-breach** | No personal data involved | — | Security incident log only |

---

## 6. Breach Register

AARMA must maintain a **Breach Register** — a permanent log of all incidents (including those that did not result in DPBI notification). This register must be retained for a minimum of 5 years.

```
Breach Register Entry Template:

Incident ID:             [YYYY-MM-DD-NNN]
Date Discovered:         
Date of Actual Breach:   
Nature of Breach:        
Data Types Affected:     
Number of Patients:      
Clinics Affected:        
Severity:                [ ] Critical [ ] High [ ] Medium [ ] Low [ ] Non-breach
Containment Date:        
DPBI Notified:           [ ] Yes — Date: ___   [ ] No — Reason: ___
Patients Notified:       [ ] Yes — Date: ___   [ ] No — Reason: ___
Root Cause:              
Remediation Completed:   [ ] Yes — Date: ___   [ ] No — In progress
Closed Date:             
Notes:                   
```

---

## 7. Current Version — Local App Breach Scenarios

The current local-only version has a fundamentally different threat landscape from the hosted version. Key breach scenarios and responses specific to the local deployment:

| Scenario | Likely Cause | Response |
|---|---|---|
| Clinic device stolen / lost | Physical theft | Treat all data as exposed; advise clinic to immediately notify patients; review whether device had OS-level encryption |
| Staff accesses records without authorisation | Shared machine; no staff-level access controls | Add staff PIN/passcode to the app as a short-term fix; implement role-based access in v2.0 |
| Data export JSON file shared in error | Manual export used to transfer data; wrong recipient | Contact recipient immediately; request confirmation of deletion; log as breach |
| Browser IndexedDB wiped (browser reinstalled / cleared) | Data loss — not a confidentiality breach | Not a DPBI-reportable breach; but clinic should restore from most recent JSON backup |
| Authorization password guessed or shared | Weak password; `Luffy@123` visible via `atob()` in source | Change password immediately; transition to hosted auth as priority |

---

## 8. Gaps to Address — Improvement Roadmap

| Gap | Impact | Target Version |
|---|---|---|
| No automated breach detection (current version) | Breaches may go undetected without manual discovery | v2.0 — Supabase security alerts + audit log anomaly detection |
| No audit log for suspicious access patterns | Cannot retroactively determine if unauthorised access occurred | v2.0 |
| Auth password trivially reversible (`atob`) | Low barrier for exploitation in local version | Patch immediately; full replacement in v2.0 |
| No staff-level access control | Any user of the machine can access all records | v2.0 — role-based access |
| No formal DPBI notification tooling | Manual email process; risk of delay beyond 72h | v2.0 — automated breach notification workflow |
| DPBI portal integration | DPBI is not yet constituted; portal URL not confirmed | Monitor; integrate once portal is live |
| Insurance | No cyber liability insurance | Obtain basic cyber insurance before hosting goes live |

---

*See also: [privacy_policy.md](./privacy_policy.md) · [data_deletion_procedure.md](./data_deletion_procedure.md) · [data_processing_agreement.md](./data_processing_agreement.md)*

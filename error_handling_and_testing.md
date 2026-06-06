# Error Handling & Testing — AARMA Dental Clinic Management System

> **Cross-references:** See [system_architecture.md](./system_architecture.md) for storage layers, [product_requirements.md](./product_requirements.md) for validation rules (REQ-*), [database_schema.md](./database_schema.md) for data integrity constraints.

---

## 1. Error Handling Philosophy

The app follows a **never-crash, graceful-degradation** principle:

1. **Storage errors** → fall back to the next available layer (IndexedDB → localStorage → empty array).
2. **Validation errors** → show a toast notification, abort the operation, preserve form state.
3. **File system errors** → show specific message to guide the user; abort silently if user cancelled.
4. **Authorization errors** → block app initialization; show static "Authorization Required" page.
5. **Render errors** → show empty-state placeholder instead of broken UI.

---

## 2. Storage Error Handling

### 2.1 Three-Tier Fallback

Implemented in `loadData(key)` and `saveData(key, value)`:

```
Attempt 1: IndexedDB read/write
    │ on error / db not initialized
    ▼
Attempt 2: localStorage read/write
    │ on error (e.g., QuotaExceededError)
    ▼
Attempt 3: Return empty array / silently log error
```

**`loadData()` error scenarios and behaviour:**

| Scenario | Behaviour |
|---|---|
| IndexedDB not yet initialized | Calls `initDB()` before proceeding |
| `db.transaction()` throws (e.g., DB closed) | Falls back to `localStorage.getItem(key)` |
| `localStorage` has valid JSON | Returns parsed data + migrates to IndexedDB |
| `localStorage` is empty | Returns `[]` (patients/treatments/billing) or `{}` (rewards) |
| JSON parse fails | Returns `[]` |

**`saveData()` error scenarios and behaviour:**

| Scenario | Behaviour |
|---|---|
| `db.transaction()` write fails | Falls back to `localStorage.setItem(key, JSON.stringify(value))` |
| `QuotaExceededError` on localStorage | Logs warning: `"localStorage mirror full; IndexedDB is still saved."` — does not throw |
| Both fail | Function resolves (not rejects) — data loss is not catastrophic since in-memory state is still correct for the session |

### 2.2 Legacy Data Recovery

On app start, if all three primary data stores (patients, treatments, billing) are empty, `attemptLegacyRecovery()` scans all localStorage keys for any data that structurally resembles patient/treatment/billing/reward records. If found, it restores the data and shows a toast: `"Recovered data from legacy storage."`.

Recovery heuristics:
- Patient record: has `id`, and (`name` or `contact` or `address`).
- Treatment record: has `id`, `patientId`, and (`description` or `date`).
- Billing record: has `patientId`, and (`amount` or `amountPaid` or `paymentMethod` or `date`).
- Rewards object: plain object where all values are numbers.

### 2.3 Storage Persistence

The app calls `navigator.storage.persist()` at startup to request the browser mark IndexedDB as persistent (less likely to be evicted):

```javascript
function requestPersistentStorage() {
  if (navigator.storage && typeof navigator.storage.persist === "function") {
    navigator.storage.persist().then((granted) => {
      if (granted) console.info("Storage marked persistent.");
    }).catch(() => {});
  }
}
```

If not granted (common on non-installed pages), IndexedDB data survives inactivity periods of 1–2 weeks. The localStorage mirror is a safety net.

---

## 3. Form Validation Errors

All validation uses the `showToast(message)` function to surface errors. No form is submitted if validation fails.

### 3.1 Patient Form Validation

| Condition | Error Message |
|---|---|
| Any of name, contact, dob, address, sex is empty | `"Please fill all required patient fields."` |
| DOB is in the future (`age < 0`) | `"DOB must be in the past."` |

### 3.2 Treatment Form Validation

| Condition | Error Message |
|---|---|
| patientId, description, date, or dentist is empty | `"Please complete all required fields."` |
| cost is provided but invalid (NaN or < 0) | `"Please enter a valid cost amount."` |
| status = "In Progress" and nextVisit is empty | `"Next appointment is required for in-progress treatments."` |

### 3.3 Billing Form Validation

| Condition | Error Message |
|---|---|
| No patient selected | `"Select a patient to process billing."` |
| amount is 0 or NaN | `"Enter a valid payment amount."` |
| paymentMethod not selected | `"Select a payment method."` |
| outstanding balance ≤ 0 | `"This patient has no outstanding balance."` |
| Full payment: entered amount ≠ calculated full amount | `"Full payment amount cannot be changed. Please use the calculated amount."` |
| Partial payment: amount > outstanding | `"Payment exceeds outstanding balance."` |
| User tries to manually change full payment amount | `"Full payment amount cannot be changed. It is automatically calculated."` |

### 3.4 Treatment Master Form Validation

| Condition | Error Message |
|---|---|
| category, name, or price is empty | `"Please complete all treatment master fields."` |
| price is NaN or < 0 | `"Enter a valid default price."` |
| Duplicate treatment name (case-insensitive) | `"Treatment name already exists."` |

### 3.5 Manual Reward Points Validation

| Condition | Error Message |
|---|---|
| No patient selected | `"Select a patient before adding reward points."` |
| Value is empty, NaN, or ≤ 0 | `"Enter a valid number of points to add."` |

### 3.6 Add Form Type Validation

| Condition | Behaviour |
|---|---|
| Name is empty | HTML `required` attribute prevents submission |

---

## 4. File System Error Handling

### 4.1 Consent File Upload

`saveConsentFile({ patientId, treatmentId, file })` returns one of:
- `{ path: "consents/..." }` — success
- `{ error: "message" }` — validation or permission failure
- `{ cancelled: true }` — user dismissed the overwrite confirmation

| Scenario | Behaviour |
|---|---|
| `showDirectoryPicker` not supported (non-Chromium) | `alert("Your browser does not support local file storage. Use Chrome or Edge.")` → returns `null` |
| User clicks Cancel on folder picker | `AbortError` caught silently → returns `null` |
| Permission denied for folder | `showToast("Consent folder permission denied.")` → returns `null` |
| File exceeds 5 MB | Returns `{ error: "File exceeds 5 MB limit." }` |
| Invalid file type | Returns `{ error: "Unsupported file type. Use PDF, JPG, or PNG." }` |
| Existing consent file found | `confirm("A consent form already exists... Overwrite it?")` — if No, returns `{ cancelled: true }` |
| `writable.write()` fails | Caught by outer `try/catch` → shows `"Upload failed. Please try again."` |

### 4.2 Auto-Backup

`performAutoBackup()` failures are caught silently (backup is best-effort). Manual backup via `performManualBackup()` uses the same mechanism but shows a toast on success/failure.

---

## 5. Authorization Error Handling

| Scenario | Behaviour |
|---|---|
| First load, version not selected | Shows version selection dialog before `initializeApp()` |
| Full version, wrong password | Shows error inline: `"Invalid credentials"`. Input cleared, border flashes red for 2 seconds. |
| Full version, user clicks Cancel | `document.body.innerHTML` replaced with static "Authorization Required" page. App never initializes. |
| Auth check throws unexpected error | `console.error('System validation failed')` — `initializeApp()` is never called |

---

## 6. UI / Render Error Handling

| Scenario | Behaviour |
|---|---|
| No patients | Table body shows `<td colspan="8" class="empty-state">No patients yet.</td>` |
| No treatments | Table body shows empty-state row |
| No billing history | Table body shows empty-state row |
| Patient not found in `viewPatient()` | Detail panel shows `"Patient not found."` |
| Unknown patient ID in treatment/billing | `getPatientName()` returns `"Unknown"`, `getPatientById()` returns `undefined` |
| `parseDateInput()` receives invalid date | Returns `null`; follow-up item shown as `"Not scheduled"` |
| Consent file not found on disk | `resolveConsentFileHandle()` returns `null` → status shows `"No consent uploaded"`, view button disabled |

---

## 7. `escapeHtml()` — XSS Prevention

All user-provided text rendered as HTML goes through `escapeHtml()`:

```javascript
const escapeHtml = (text) => {
  if (!text && text !== 0) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
};
```

This prevents stored XSS through patient names, treatment descriptions, dentist names, and other free-text fields. Any addition of new rendered content **must** use this function.

---

## 8. Testing Strategy

The current codebase has no automated tests. The following plan covers the full testing pyramid for the hosted version. All tests should be written before the hosting migration begins.

### 8.1 Unit Tests

Use **Vitest** (fast, ESM-native, compatible with vanilla JS).

#### Storage Layer

```javascript
// Test: loadData returns [] when IndexedDB is empty
test("loadData returns empty array on fresh DB", async () => {
  const data = await loadData("dental_patients");
  expect(data).toEqual([]);
});

// Test: saveData then loadData round-trips correctly
test("saveData persists and loadData retrieves", async () => {
  const patient = { id: "PAT-0001", name: "Test Patient", ... };
  await saveData("dental_patients", [patient]);
  const result = await loadData("dental_patients");
  expect(result).toEqual([patient]);
});

// Test: loadData falls back to localStorage when IndexedDB is unavailable
test("loadData falls back to localStorage", async () => {
  // Mock IndexedDB to throw
  localStorage.setItem("dental_patients", JSON.stringify([{ id: "PAT-0001" }]));
  const result = await loadData("dental_patients");
  expect(result[0].id).toBe("PAT-0001");
});
```

#### Rewards Engine

```javascript
// calculateEarnedPoints
test.each([
  [0, 0],
  [99, 0],       // below one block
  [100, 4],
  [250, 8],      // NOT 10 — whole blocks only
  [400, 16],
])("calculateEarnedPoints(%i) === %i", (amount, expected) => {
  expect(calculateEarnedPoints(amount)).toBe(expected);
});

// calculateRedeemFromPoints
test.each([
  [0, 100, { pointsToRedeem: 0, rupeesToApply: 0 }],
  [4, 100, { pointsToRedeem: 4, rupeesToApply: 1 }],
  [16, 100, { pointsToRedeem: 16, rupeesToApply: 4 }],
  [20, 3, { pointsToRedeem: 12, rupeesToApply: 3 }], // capped by maxRupees
  [3, 100, { pointsToRedeem: 0, rupeesToApply: 0 }], // insufficient points
])("calculateRedeemFromPoints(%i pts, max ₹%i)", (points, max, expected) => {
  expect(calculateRedeemFromPoints(points, max)).toEqual(expected);
});
```

#### Outstanding Balance

```javascript
test("calculateOutstanding returns correct balance", () => {
  treatments = [
    { patientId: "PAT-0001", cost: 1000 },
    { patientId: "PAT-0001", cost: 500 },
  ];
  billingHistory = [
    { patientId: "PAT-0001", amount: 300, rewardValue: 0, totalApplied: 300 },
  ];
  expect(calculateOutstanding("PAT-0001")).toBe(1200);
});

test("calculateOutstanding returns 0 when fully paid", () => {
  treatments = [{ patientId: "PAT-0001", cost: 500 }];
  billingHistory = [{ patientId: "PAT-0001", amount: 500, rewardValue: 0, totalApplied: 500 }];
  expect(calculateOutstanding("PAT-0001")).toBe(0);
});

test("calculateOutstanding never returns negative", () => {
  treatments = [{ patientId: "PAT-0001", cost: 100 }];
  billingHistory = [{ patientId: "PAT-0001", amount: 150, rewardValue: 0, totalApplied: 150 }];
  expect(calculateOutstanding("PAT-0001")).toBeGreaterThanOrEqual(0);
});
```

#### Utility Functions

```javascript
// calculateAge
test.each([
  ["2000-01-01", /* ~25 */],
  ["1990-06-15", /* ~35 */],
])("calculateAge does not return negative", (dob) => {
  expect(calculateAge(dob)).toBeGreaterThanOrEqual(0);
});

// escapeHtml
test("escapeHtml sanitizes script tags", () => {
  expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("escapeHtml handles null/undefined", () => {
  expect(escapeHtml(null)).toBe("");
  expect(escapeHtml(undefined)).toBe("");
  expect(escapeHtml(0)).toBe("0");
});

// parseDateInput
test.each([
  ["2025-06-15", new Date(2025, 5, 15)],
  ["", null],
  ["invalid-date", null],
])("parseDateInput('%s')", (input, expectedDate) => {
  const result = parseDateInput(input);
  if (expectedDate === null) {
    expect(result).toBeNull();
  } else {
    expect(result?.toDateString()).toBe(expectedDate.toDateString());
  }
});

// generatePatientId
test("generatePatientId generates sequential PAT-XXXX IDs", () => {
  localStorage.setItem("dental_patient_counter", "0");
  const id1 = generatePatientId();
  const id2 = generatePatientId();
  expect(id1).toBe("PAT-0001");
  expect(id2).toBe("PAT-0002");
});
```

---

### 8.2 Integration Tests

Use **Playwright** (end-to-end, browser-based).

#### Patient CRUD

```javascript
test("add patient and verify in table", async ({ page }) => {
  await page.goto("file:///path/to/index.html");
  // Skip auth (trial version)
  await page.click("#trialVersionBtn");
  await page.click('[data-section="patients"]');
  await page.fill("#patientName", "John Doe");
  await page.fill("#patientContact", "9876543210");
  await page.fill("#patientDOB", "1990-06-15");
  await page.selectOption("#patientSex", "male");
  await page.fill("#patientAddress", "123 Main St");
  await page.click('[type="submit"]');
  await expect(page.locator("#patientTableBody")).toContainText("John Doe");
});

test("delete patient cascades to treatments and billing", async ({ page }) => {
  // Setup patient with treatment and billing
  // Delete patient
  // Assert treatments and billing for that patient are gone
});

test("search patient by ID shows exact match", async ({ page }) => {
  // Add patient, get their ID
  // Search by ID
  // Assert only that patient appears
});
```

#### Billing & Rewards

```javascript
test("full payment clears outstanding balance", async ({ page }) => {
  // Add patient, add ₹500 treatment
  // Process full payment
  // Re-open billing for same patient
  // Assert outstanding shows ₹0
});

test("reward points earned on payment", async ({ page }) => {
  // Add patient, add ₹500 treatment
  // Process ₹500 payment
  // expectedPoints = floor(500/100) * 4 = 20
  // Assert billing points display shows 20 pts
});

test("redeem points reduces payment amount", async ({ page }) => {
  // Set patient reward points to 40 (= ₹10)
  // Outstanding = ₹200
  // Check redeem checkbox
  // Assert payment amount = 190
});
```

#### Dashboard

```javascript
test("dashboard stats update after billing", async ({ page }) => {
  // Process a payment
  // Go to dashboard, select "Today"
  // Assert payments received reflects the payment
});

test("follow-up shows overdue when nextVisit is in past", async ({ page }) => {
  // Add treatment with nextVisit = yesterday, status = "In Progress"
  // Go to dashboard
  // Assert follow-up item shows "Overdue"
});
```

---

### 8.3 Validation / Edge Case Tests

| Test Case | Expected Result |
|---|---|
| DOB set to today | Toast: "DOB must be in the past." Form not submitted |
| Payment amount = 0 | Toast: "Enter a valid payment amount." |
| Payment amount > outstanding | Toast: "Payment exceeds outstanding balance." |
| Treatment with status "In Progress" and no nextVisit | Toast: "Next appointment is required..." |
| Duplicate treatment name in master | Toast: "Treatment name already exists." |
| Add patient with empty name | Toast: "Please fill all required patient fields." |
| Consent file > 5 MB | Error message: "File exceeds 5 MB limit." Upload aborted |
| Consent file with invalid type (e.g., .docx) | Error: "Unsupported file type. Use PDF, JPG, or PNG." |
| Import JSON with wrong format | Toast: error message, data unchanged |
| Patient lookup map stale after delete | `patientLookupMap = null` forces rebuild on next access |

---

### 8.4 Performance Tests

| Scenario | Tool | Acceptance Criterion |
|---|---|---|
| Load 1,000 patients | Playwright `performance.now()` | `renderPatients()` completes in < 200ms |
| Load 5,000 treatments | Playwright | `renderTreatments()` completes in < 500ms |
| Dashboard stats with 5,000 billing records | Playwright | `updateDashboardStats()` completes in < 300ms |
| Patient search live filter | Playwright | Search results appear within 100ms of keystroke |
| `buildPatientLookupMap()` for 1,000 patients | Vitest | Completes in < 10ms |

---

### 8.5 Security Tests (Hosted Version)

| Test | Method |
|---|---|
| XSS via patient name field | Enter `<img src=x onerror=alert(1)>` as patient name; verify no alert fires |
| XSS via treatment description | Same as above |
| SQL injection (hosted) | Supabase client uses parameterized queries — verify no raw string interpolation in SQL |
| RLS: clinic A cannot read clinic B data | Log in as Clinic A user; attempt to query `patients?clinic_id=eq.{clinic_b_id}`; expect 0 rows |
| Unauthenticated access (hosted) | Request any API endpoint without JWT; expect 401 |
| Consent file path traversal | `parseConsentPath("consents/../../../etc/passwd/x/Consent_x_x.pdf")`; expect `null` |

---

### 8.6 Consent File Path Validation Tests

`parseConsentPath(path)` must return `null` for all malicious/malformed paths:

```javascript
test.each([
  // Valid
  ["consents/PAT-0001/abc-uuid/Consent_PAT-0001_abc-uuid.pdf", { patientId: "PAT-0001", treatmentId: "abc-uuid", filename: "Consent_PAT-0001_abc-uuid.pdf" }],
  // Invalid — path traversal
  ["consents/../secret/x/Consent_PAT-0001_x.pdf", null],
  // Invalid — wrong depth
  ["consents/PAT-0001/Consent_PAT-0001.pdf", null],
  // Invalid — null
  [null, null],
  // Invalid — empty
  ["", null],
  // Invalid — filename mismatch
  ["consents/PAT-0001/uuid/Malicious_PAT-0001_uuid.pdf", null],
])("parseConsentPath('%s')", (path, expected) => {
  expect(parseConsentPath(path)).toEqual(expected);
});
```

---

## 9. Known Bugs & Technical Debt

> See also: [engineering:tech-debt skill](../skills/) for structured debt tracking.

| Bug / Issue | Severity | Location | Description |
|---|---|---|---|
| `updateBillingSummary()` calls `loadData()` synchronously | Medium | `app.js:3215` | `loadData()` is async but called without `await`; returns a Promise instead of data |
| `patientLookupMap` not rebuilt after import | Medium | `importAllData()` | After importing data, `patientLookupMap` remains stale until next page load |
| Age is recalculated and overwritten on every patient edit | Low | `handlePatientSubmit()` | Age can change between visits; this is intentional but undocumented |
| No `category` stored on Treatment record | Low | Treatment schema | `category` comes from TreatmentMaster lookup; if master is deleted, category is lost for display |
| Auth password exposed via `atob` | High (local version) | IIFE auth block | Password can be trivially decoded. Irrelevant for hosted version (auth will be replaced). |
| `redeemablePoints` variable referenced but not defined in `updateBillingSummary()` | High | `app.js:3225` | `const canRedeem = redeemablePoints > 0` — `redeemablePoints` is not defined in this scope; likely a bug. Should use computed `rupeesToApply > 0`. |
| `generatePatientId()` uses localStorage not IndexedDB | Low | `generatePatientId()` | Counter stored in localStorage, not IndexedDB, so it's out of sync with the IndexedDB primary store. |

---

## 10. Recommended Testing Tools

| Tool | Purpose |
|---|---|
| **Vitest** | Unit tests for JS functions (no DOM required) |
| **Playwright** | End-to-end browser tests |
| **fake-indexeddb** (npm) | Mock IndexedDB in Node.js for unit tests |
| **OWASP ZAP** | Security scanning for the hosted version |
| **Lighthouse** | Performance and accessibility audits |
| **Supabase local dev** | Local Supabase instance for integration tests |

---

*Last updated: May 2026 | See also: [system_architecture.md](./system_architecture.md) · [product_requirements.md](./product_requirements.md) · [database_schema.md](./database_schema.md)*

// Shared in-memory state and constants used across feature modules.
//
// Mutable state lives on a single exported `state` object rather than as
// individual named `let` exports: ES module imports are read-only live
// bindings, and many of these fields are reassigned (not just mutated -- e.g.
// `state.patients = await loadData(...)`) from functions that live in
// different feature modules. A plain `export let patients` could not be
// reassigned by importing modules. Constants are exported directly.

export const CLINIC_NAME = "Dental clinic";
export const CLINIC_ADDRESS = "Navaladiyan complex, 1st floor, Thanthonimalai Karur";
export const CLINIC_PHONE = "+91 9489266309";
//const CLINIC_WEBSITE = "www.AARMAdentalclinic.com";

export const DASHBOARD_WINDOWS = {
  today: 0,
  weekly: 7,
  monthly: 30,
  lastMonth: 'lastMonth' // Special case - handled separately
};

export const FORM_LIBRARY = [
  {
    id: "consent",
    name: "Consent Form",
    description: "Patient authorization for treatment and procedures."
  },
  {
    id: "referral",
    name: "Referral Letter",
    description: "Referral to specialists or partner clinics."
  },
  {
    id: "medical-certificate",
    name: "Medical Certificate",
    description: "Official certificate for patient documentation."
  },
  {
    id: "insurance-claim",
    name: "Insurance Claim Form",
    description: "Insurance claim submission template."
  }
];

export const DEFAULT_TREATMENT_SEED = [
  { category: "Preventive & Diagnostic", treatment_name: "Consultation" },
  { category: "Preventive & Diagnostic", treatment_name: "Dental Check-up" },
  { category: "Preventive & Diagnostic", treatment_name: "Scaling" },
  { category: "Preventive & Diagnostic", treatment_name: "Polishing" },
  { category: "Preventive & Diagnostic", treatment_name: "X-Ray (IOPA)" },
  { category: "Preventive & Diagnostic", treatment_name: "OPG" },
  { category: "Restorative", treatment_name: "Temporary Filling" },
  { category: "Restorative", treatment_name: "Composite Filling" },
  { category: "Restorative", treatment_name: "GIC Filling" },
  { category: "Restorative", treatment_name: "Amalgam Filling" },
  { category: "Restorative", treatment_name: "Tooth Build-up" },
  { category: "Endodontics", treatment_name: "Root Canal Treatment (Single Canal)" },
  { category: "Endodontics", treatment_name: "Root Canal Treatment (Multi Canal)" },
  { category: "Endodontics", treatment_name: "Re-Root Canal Treatment" },
  { category: "Endodontics", treatment_name: "Pulpotomy" },
  { category: "Prosthodontics", treatment_name: "Metal Crown" },
  { category: "Prosthodontics", treatment_name: "PFM Crown" },
  { category: "Prosthodontics", treatment_name: "Zirconia Crown" },
  { category: "Prosthodontics", treatment_name: "E-Max Crown" },
  { category: "Prosthodontics", treatment_name: "Fixed Bridge" },
  { category: "Prosthodontics", treatment_name: "Complete Denture" },
  { category: "Prosthodontics", treatment_name: "Partial Denture" },
  { category: "Oral Surgery", treatment_name: "Tooth Extraction" },
  { category: "Oral Surgery", treatment_name: "Surgical Extraction" },
  { category: "Oral Surgery", treatment_name: "Wisdom Tooth Removal" },
  { category: "Periodontics", treatment_name: "Deep Cleaning (SRP)" },
  { category: "Periodontics", treatment_name: "Flap Surgery" },
  { category: "Orthodontics", treatment_name: "Metal Braces" },
  { category: "Orthodontics", treatment_name: "Ceramic Braces" },
  { category: "Orthodontics", treatment_name: "Clear Aligners" },
  { category: "Cosmetic", treatment_name: "Teeth Whitening" }
];

export const detailPlaceholder =
  "Select a patient name or search by ID to view details.";

export const THEME_STORAGE_KEY = 'dental_app_theme';

// Consent upload configuration
export const CONSENT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
export const CONSENT_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const CONSENT_ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];

// Pagination page sizes
export const recordsPerPage = 10;
export const treatmentRecordsPerPage = 15;
export const billingRecordsPerPage = 15;
export const followUpRecordsPerPage = 5;
export const treatmentMasterRecordsPerPage = 5;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Shared mutable state -- read AND reassigned across feature module
// boundaries (e.g. patients/treatments/billing handlers reset
// `dashboardStatsCache`/`patientLookupMap`, which dashboard.js rebuilds; ui.js's
// `changePage` reassigns the `current*Page` counters that each feature module
// renders from). Kept on one object so every module shares the same bindings.
export const state = {
  // Initialize data arrays (will be loaded asynchronously)
  patients: [],
  treatments: [],
  billingHistory: [],
  rewardPoints: {},
  treatmentMasters: [],
  formsLibrary: {},
  formsCatalog: [],
  latestInvoiceEntryId: null,

  editingPatientId: null,
  editingTreatmentId: null,
  currentFilter: "",
  currentBillingFilter: "",
  currentDetailPatientId: null,
  currentDashboardRange: "monthly",
  currentOpenStatus: null, // Track which status panel is currently open
  currentOpenDentist: null, // Track which dentist details panel is currently open
  currentFollowUpFilter: "all",
  currentFollowUpPage: 1,
  treatmentMasterSearch: "",
  editingTreatmentMasterId: null,
  currentTreatmentCategory: "",
  currentTreatmentMasterPage: 1,

  // Performance optimization: Cache patient lookup map
  patientLookupMap: null, // Map for O(1) patient lookups
  dashboardStatsCache: null, // Cache for dashboard stats
  lastDashboardRange: null, // Track last range for cache invalidation

  consentDirectoryHandle: null,

  // Pagination state
  currentPatientPage: 1,
  currentTreatmentPage: 1,
  currentBillingPage: 1,

  // Treatment date sort state: 'recent' (newest first) or 'oldest' (oldest first)
  treatmentDateSort: 'recent',

  // Auto-backup configuration
  backupDirectoryHandle: null,
  autoBackupEnabled: false,
  lastBackupTime: null,

  // Store original payment amount for partial payments when redeem checkbox changes
  originalPaymentAmount: null,
};

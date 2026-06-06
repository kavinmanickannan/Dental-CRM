const STORAGE_KEYS = {
  patients: "dental_patients",
  treatments: "dental_treatments",
  billing: "dental_billing",
  patientCounter: "dental_patient_counter",
  rewards: "dental_reward_points",
  treatmentMaster: "dental_treatment_master",
  forms: "dental_forms_library",
  formsCatalog: "dental_forms_catalog",
};

// IndexedDB configuration
const DB_NAME = "DentalClinicDB";
const DB_VERSION = 2;
let db = null;

const CLINIC_NAME = "AARMA Dental clinic";
const CLINIC_ADDRESS = "Navaladiyan complex, 1st floor, Thanthonimalai Karur";
const CLINIC_PHONE = "+91 9489266309";
//const CLINIC_WEBSITE = "www.AARMAdentalclinic.com";
// Rewards configuration
// For every ₹100 spent, add 4 whole points.
// While redeeming, 4 points = ₹1 (whole rupees only).
const POINT_EARN_RATE = 100; // Rupees per earn block
const POINTS_PER_EARN_BLOCK = 4; // Points earned per ₹100
const POINTS_PER_REDEEM_RUPEE = 4; // 4 points = ₹1
const INR_PER_POINT = 1 / POINTS_PER_REDEEM_RUPEE; // Kept for compatibility, not used for math
const DASHBOARD_WINDOWS = {
  today: 0,
  weekly: 7,
  monthly: 30,
  lastMonth: 'lastMonth' // Special case - handled separately
};

// Initialize data arrays (will be loaded asynchronously)
let patients = [];
let treatments = [];
let billingHistory = [];
let rewardPoints = {};
let treatmentMasters = [];
let formsLibrary = {};
let formsCatalog = [];
let latestInvoiceEntryId = null;
const formatINR = (value) => `₹${Number(value || 0).toFixed(2)}`;
const formatCost = (value) => {
  const numValue = Number(value || 0);
  return numValue > 0 ? formatINR(numValue) : "-";
};
const escapeHtml = (text) => {
  if (!text && text !== 0) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
};
const normalizeCategory = (category) => String(category || "").trim().toLowerCase();

function calculateEarnedPoints(amount) {
  if (!amount || amount <= 0) return 0;
  const blocks = Math.floor(amount / POINT_EARN_RATE);
  return blocks * POINTS_PER_EARN_BLOCK;
}

function calculateRedeemFromPoints(points, maxRupees) {
  const safePoints = Math.max(0, Math.floor(points || 0));
  const maxFromPoints = Math.floor(safePoints / POINTS_PER_REDEEM_RUPEE); // max rupees possible
  const safeMaxRupees = Math.floor(Math.max(0, maxRupees || 0));
  const rupeesToApply = Math.min(maxFromPoints, safeMaxRupees);
  const pointsToRedeem = rupeesToApply * POINTS_PER_REDEEM_RUPEE;
  return { pointsToRedeem, rupeesToApply };
}

const FORM_LIBRARY = [
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

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

function getFormMeta(formId) {
  return getCombinedFormsCatalog().find((form) => form.id === formId);
}
const getCombinedFormsCatalog = () => {
  const customForms = Array.isArray(formsCatalog) ? formsCatalog : [];
  return [...FORM_LIBRARY, ...customForms];
};
const slugifyFormName = (name) =>
  String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const DEFAULT_TREATMENT_SEED = [
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
const detailPlaceholder =
  "Select a patient name or search by ID to view details.";

let editingPatientId = null;
let editingTreatmentId = null;
let currentFilter = "";
let currentBillingFilter = "";
let currentDetailPatientId = null;
let currentDashboardRange = "monthly";
let currentOpenStatus = null; // Track which status panel is currently open
let currentOpenDentist = null; // Track which dentist details panel is currently open
let currentFollowUpFilter = "all";
let currentFollowUpPage = 1;
let treatmentMasterSearch = "";
let editingTreatmentMasterId = null;
let currentTreatmentCategory = "";
let currentTreatmentMasterPage = 1;
const treatmentMasterRecordsPerPage = 5;

// Performance optimization: Cache patient lookup map
let patientLookupMap = null; // Map for O(1) patient lookups
let dashboardStatsCache = null; // Cache for dashboard stats
let lastDashboardRange = null; // Track last range for cache invalidation

// Consent upload configuration
const CONSENT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const CONSENT_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const CONSENT_ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];
let consentDirectoryHandle = null;

// Pagination state
let currentPatientPage = 1;
let currentTreatmentPage = 1;
let currentBillingPage = 1;
const recordsPerPage = 10;
const treatmentRecordsPerPage = 15;
const billingRecordsPerPage = 15;
const followUpRecordsPerPage = 5;

// Treatment date sort state: 'recent' (newest first) or 'oldest' (oldest first)
let treatmentDateSort = 'recent';

// Auto-backup configuration
let backupDirectoryHandle = null;
let autoBackupEnabled = false;
let lastBackupTime = null;

// Store original payment amount for partial payments when redeem checkbox changes
let originalPaymentAmount = null;

const elements = {
  sections: document.querySelectorAll(".section"),
  menuButtons: document.querySelectorAll(".app-menu .menu-buttons button"),
  setupBackupBtn: document.getElementById("setupBackupBtn"),
  backupStatus: document.getElementById("backupStatus"),
  manualBackupBtn: document.getElementById("manualBackupBtn"),
  patientForm: document.getElementById("patientForm"),
  patientTableBody: document.getElementById("patientTableBody"),
  patientStats: document.getElementById("patientStats"),
  treatmentForm: document.getElementById("treatmentForm"),
  treatmentPatient: document.getElementById("treatmentPatient"),
  treatmentPatientId: document.getElementById("treatmentPatientId"),
  treatmentPatientResults: document.getElementById("treatmentPatientResults"),
  treatmentCategory: document.getElementById("treatmentCategory"),
  treatmentDescription: document.getElementById("treatmentDescription"),
  treatmentCost: document.getElementById("treatmentCost"),
  treatmentStatus: document.getElementById("treatmentStatus"),
  treatmentNextVisit: document.getElementById("treatmentNextVisit"),
  nextVisitRequired: document.getElementById("nextVisitRequired"),
  treatmentMasterOptions: document.getElementById("treatmentMasterOptions"),
  openTreatmentMaster: document.getElementById("openTreatmentMaster"),
  treatmentMasterModal: document.getElementById("treatmentMasterModal"),
  closeTreatmentMaster: document.getElementById("closeTreatmentMaster"),
  treatmentMasterNew: document.getElementById("treatmentMasterNew"),
  treatmentMasterForm: document.getElementById("treatmentMasterForm"),
  treatmentMasterCategory: document.getElementById("treatmentMasterCategory"),
  treatmentMasterCategoryOptions: document.getElementById("treatmentMasterCategoryOptions"),
  treatmentMasterName: document.getElementById("treatmentMasterName"),
  treatmentMasterPrice: document.getElementById("treatmentMasterPrice"),
  treatmentMasterSubmit: document.getElementById("treatmentMasterSubmit"),
  treatmentMasterCancel: document.getElementById("treatmentMasterCancel"),
  treatmentMasterSearch: document.getElementById("treatmentMasterSearch"),
  treatmentMasterTableBody: document.getElementById("treatmentMasterTableBody"),
  treatmentMasterPagination: document.getElementById("treatmentMasterPagination"),
  treatmentTableBody: document.getElementById("treatmentTableBody"),
  treatmentStats: document.getElementById("treatmentStats"),
  treatmentPagination: document.getElementById("treatmentPagination"),
  billingForm: document.getElementById("billingForm"),
  billingPatient: document.getElementById("billingPatient"),
  billingPatientId: document.getElementById("billingPatientId"),
  billingPatientResults: document.getElementById("billingPatientResults"),
  billingPagination: document.getElementById("billingPagination"),
  patientPagination: document.getElementById("patientPagination"),
  billingTotal: document.getElementById("billingTotal"),
  billingPoints: document.getElementById("billingPoints"),
  billingRewardValue: document.getElementById("billingRewardValue"),
  billingTableBody: document.getElementById("billingTableBody"),
  billingPayment: document.getElementById("billingPayment"),
  paymentType: document.getElementById("paymentType"),
  paymentMethod: document.getElementById("paymentMethod"),
  globalSearch: document.getElementById("globalSearch"),
  billingSearch: document.getElementById("billingSearch"),
  billingStats: document.getElementById("billingStats"),
  cancelEditPatient: document.getElementById("cancelEditPatient"),
  cancelEditTreatment: document.getElementById("cancelEditTreatment"),
  redeemCheckbox: document.getElementById("redeemPoints"),
  manualRewardPointsInput: document.getElementById("manualRewardPoints"),
  addManualRewardPointsBtn: document.getElementById("addManualRewardPointsBtn"),
  patientDetailPanel: document.getElementById("patientDetailPanel"),
  patientDetailContent: document.getElementById("patientDetailContent"),
  closePatientDetail: document.getElementById("closePatientDetail"),
  dashboardRange: document.getElementById("dashboardRange"),
  statPatients: document.getElementById("statPatients"),
  statPayments: document.getElementById("statPayments"),
  statTopTreatment: document.getElementById("statTopTreatment"),
  statCash: document.getElementById("statCash"),
  statCard: document.getElementById("statCard"),
  statUPI: document.getElementById("statUPI"),
  statOther: document.getElementById("statOther"),
  dentistStatsContainer: document.getElementById("dentistStatsContainer"),
  dentistDetailsPanel: document.getElementById("dentistDetailsPanel"),
  dentistDetailsTitle: document.getElementById("dentistDetailsTitle"),
  dentistDetailsContent: document.getElementById("dentistDetailsContent"),
  closeDentistDetailsPanel: document.getElementById("closeDentistDetailsPanel"),
  treatmentStatusContainer: document.getElementById("treatmentStatusContainer"),
  statusPatientsPanel: document.getElementById("statusPatientsPanel"),
  statusPanelTitle: document.getElementById("statusPanelTitle"),
  statusPatientsContent: document.getElementById("statusPatientsContent"),
  closeStatusPanel: document.getElementById("closeStatusPanel"),
  followUpList: document.getElementById("followUpList"),
  followUpSummary: document.getElementById("followUpSummary"),
  followUpFilters: document.querySelectorAll(".followup-filter"),
  followUpPagination: document.getElementById("followUpPagination"),
  toast: document.getElementById("toast"),
  themeToggle: document.getElementById("themeToggle"),
  appMenu: document.querySelector(".app-menu"),
  formsList: document.getElementById("formsList"),
  generateInvoiceBtn: document.getElementById("generateInvoiceBtn"),
  dashboardExportBtn: document.getElementById("dashboardExportBtn"),
  dashboardImportBtn: document.getElementById("dashboardImportBtn"),
  dashboardImportInput: document.getElementById("dashboardImportInput"),
  addFormTypeButton: document.getElementById("addFormTypeButton"),
  addFormTypeModal: document.getElementById("addFormTypeModal"),
  closeAddFormType: document.getElementById("closeAddFormType"),
  cancelAddFormType: document.getElementById("cancelAddFormType"),
  addFormTypeForm: document.getElementById("addFormTypeForm"),
  formTypeName: document.getElementById("formTypeName"),
  formTypeDescription: document.getElementById("formTypeDescription"),
};

// Theme Management
const THEME_STORAGE_KEY = 'dental_app_theme';

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  showToast(`Theme switched to ${newTheme === 'light' ? 'Light' : 'Dark'} mode`);
}

async function ensureTreatmentMasterSeed() {
  if (!Array.isArray(treatmentMasters)) {
    treatmentMasters = [];
  }
  const existingNames = new Set(
    treatmentMasters.map((item) => normalizeTreatmentName(item.treatment_name))
  );
  let added = false;
  DEFAULT_TREATMENT_SEED.forEach((item) => {
    const normalized = normalizeTreatmentName(item.treatment_name);
    if (!existingNames.has(normalized)) {
      treatmentMasters.push({
        id: crypto.randomUUID(),
        category: item.category,
        treatment_name: item.treatment_name,
        default_price: 0,
        is_active: true,
        createdAt: new Date().toISOString()
      });
      existingNames.add(normalized);
      added = true;
    }
  });
  if (added) {
    await saveData(STORAGE_KEYS.treatmentMaster, treatmentMasters);
  }
}

function attemptLegacyRecovery() {
  const recovered = {
    patients: [],
    treatments: [],
    billing: [],
    rewards: null
  };

  const isPatientRecord = (item) =>
    item && typeof item === "object" && item.id && (item.name || item.contact || item.address);
  const isTreatmentRecord = (item) =>
    item && typeof item === "object" && item.id && item.patientId && (item.description || item.date);
  const isBillingRecord = (item) =>
    item && typeof item === "object" && item.patientId &&
    (item.amount || item.amountPaid || item.paymentMethod || item.date);
  const isRewardsObject = (value) =>
    value && typeof value === "object" && !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === "number");

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (Object.values(STORAGE_KEYS).includes(key)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (parsed.every(isPatientRecord)) {
          recovered.patients = parsed;
        } else if (parsed.every(isTreatmentRecord)) {
          recovered.treatments = parsed;
        } else if (parsed.every(isBillingRecord)) {
          recovered.billing = parsed;
        }
      } else if (isRewardsObject(parsed)) {
        recovered.rewards = parsed;
      }
    }
  } catch (error) {
    console.error("Legacy recovery scan failed:", error);
    return { recovered: false };
  }

  const hasAny =
    recovered.patients.length > 0 ||
    recovered.treatments.length > 0 ||
    recovered.billing.length > 0 ||
    recovered.rewards;

  return { recovered: hasAny, data: recovered };
}

// Initialize application
async function initializeApp() {
  try {
    // Initialize IndexedDB
    await initDB();
    // Ask browser to keep storage (helps prevent auto-deletion after 1–2 weeks)
    requestPersistentStorage();

    // Load all data
    patients = await loadData(STORAGE_KEYS.patients);
    treatments = await loadData(STORAGE_KEYS.treatments);
    billingHistory = await loadData(STORAGE_KEYS.billing);
    rewardPoints = await loadData(STORAGE_KEYS.rewards) || {};
    treatmentMasters = await loadData(STORAGE_KEYS.treatmentMaster);
    formsLibrary = await loadData(STORAGE_KEYS.forms) || {};
    formsCatalog = await loadData(STORAGE_KEYS.formsCatalog) || [];

    // Keep localStorage mirror in sync so data survives IndexedDB eviction
    try {
      localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(patients));
      localStorage.setItem(STORAGE_KEYS.treatments, JSON.stringify(treatments));
      localStorage.setItem(STORAGE_KEYS.billing, JSON.stringify(billingHistory));
      localStorage.setItem(STORAGE_KEYS.rewards, JSON.stringify(rewardPoints));
      localStorage.setItem(STORAGE_KEYS.treatmentMaster, JSON.stringify(treatmentMasters));
      localStorage.setItem(STORAGE_KEYS.forms, JSON.stringify(formsLibrary));
      localStorage.setItem(STORAGE_KEYS.formsCatalog, JSON.stringify(formsCatalog));
    } catch (e) {
      if (e.name === "QuotaExceededError") {
        console.warn("localStorage full; mirror skipped.");
      }
    }

    if (patients.length === 0 && treatments.length === 0 && billingHistory.length === 0) {
      const legacy = attemptLegacyRecovery();
      if (legacy.recovered) {
        if (legacy.data.patients.length) patients = legacy.data.patients;
        if (legacy.data.treatments.length) treatments = legacy.data.treatments;
        if (legacy.data.billing.length) billingHistory = legacy.data.billing;
        if (legacy.data.rewards) rewardPoints = legacy.data.rewards;
        saveData(STORAGE_KEYS.patients, patients);
        saveData(STORAGE_KEYS.treatments, treatments);
        saveData(STORAGE_KEYS.billing, billingHistory);
        saveData(STORAGE_KEYS.rewards, rewardPoints);
        showToast("Recovered data from legacy storage.");
      }
    }
    
    // Build patient lookup map for performance
    buildPatientLookupMap();
    
    // Initialize theme
    initTheme();
    
    // Initialize master data
    await ensureTreatmentMasterSeed();
    refreshTreatmentMasterOptions();

    // Initialize UI
  setupNavigation();
  renderPatients();
  renderTreatments();
  renderBilling();
  renderFormsLibrary();
  populatePatientSelects();
  attachHandlers();
  updateBillingSummary();
    updatePaymentAmount();
    updateDashboardStats();
    prefillTreatmentDate();
    updateTreatmentSortIcon();
    updateNextVisitRequirement();
    
    showToast("Application loaded successfully.");
  } catch (error) {
    console.error('Initialization error:', error);
    showToast("Error loading application. Using fallback storage.");
    // Fallback to localStorage
    patients = JSON.parse(localStorage.getItem(STORAGE_KEYS.patients) || '[]');
    treatments = JSON.parse(localStorage.getItem(STORAGE_KEYS.treatments) || '[]');
    billingHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.billing) || '[]');
    rewardPoints = JSON.parse(localStorage.getItem(STORAGE_KEYS.rewards) || '{}');
    treatmentMasters = JSON.parse(localStorage.getItem(STORAGE_KEYS.treatmentMaster) || '[]');
    formsLibrary = JSON.parse(localStorage.getItem(STORAGE_KEYS.forms) || '{}');
    formsCatalog = JSON.parse(localStorage.getItem(STORAGE_KEYS.formsCatalog) || '[]');
    
    setupNavigation();
    renderPatients();
    renderTreatments();
    renderBilling();
    renderFormsLibrary();
    populatePatientSelects();
    attachHandlers();
    ensureTreatmentMasterSeed();
    refreshTreatmentMasterOptions();
    updateBillingSummary();
    updatePaymentAmount();
    updateDashboardStats();
    prefillTreatmentDate();
    updateNextVisitRequirement();
  }
}

// ===================== OBFUSCATED AUTHORIZATION SYSTEM =====================
// Utility functions for system validation
(function() {
  'use strict';
  
  // Obfuscated configuration (harder to find)
  const _cfg = {
    _p1: atob("THVmZnlAMTIz"), 
    _p2: String.fromCharCode(110, 111, 116, 107, 110, 111, 119, 110),
    _k: "dental_app_auth_machines", // Storage key
    _v: 1, // Version
    _versionKey: "dental_app_version_type" // Storage key for version type
  };
  
  // Get stored version type
  function _getVersionType() {
    try {
      return localStorage.getItem(_cfg._versionKey) || null;
    } catch {
      return null;
    }
  }
  
  // Store version type
  function _setVersionType(versionType) {
    try {
      localStorage.setItem(_cfg._versionKey, versionType);
      return true;
    } catch {
      return false;
    }
  }
  
  // Show version selection dialog
  function _showVersionSelectionDialog() {
    return new Promise((resolve) => {
      const _dialog = document.createElement('div');
      _dialog.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Segoe UI', sans-serif;
      `;
      
      _dialog.innerHTML = `
        <div style="background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 500px; width: 90%;">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">🚀</div>
            <h2 style="color: #1b2735; margin: 0 0 0.5rem 0; font-size: 1.5rem;">Select Version</h2>
            <p style="color: #6c7a89; margin: 0; font-size: 0.9rem;">Choose your application version</p>
          </div>
          <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
            <button id="trialVersionBtn" style="padding: 1.25rem; background: #f5f7fb; border: 2px solid #d9e2ec; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s; text-align: left;">
              <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">🆓 Trial Version</div>
              <div style="color: #6c7a89; font-size: 0.9rem; font-weight: normal;">No password required. Full access to all features.</div>
            </button>
            <button id="fullVersionBtn" style="padding: 1.25rem; background: #f5f7fb; border: 2px solid #d9e2ec; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s; text-align: left;">
              <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">🔐 Full Version</div>
              <div style="color: #6c7a89; font-size: 0.9rem; font-weight: normal;">Password protected. Requires authorization key.</div>
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(_dialog);
      
      const _trialBtn = _dialog.querySelector('#trialVersionBtn');
      const _fullBtn = _dialog.querySelector('#fullVersionBtn');
      
      // Hover effects
      _trialBtn.addEventListener('mouseenter', () => {
        _trialBtn.style.background = '#e8f4f8';
        _trialBtn.style.borderColor = '#2374ab';
      });
      _trialBtn.addEventListener('mouseleave', () => {
        _trialBtn.style.background = '#f5f7fb';
        _trialBtn.style.borderColor = '#d9e2ec';
      });
      
      _fullBtn.addEventListener('mouseenter', () => {
        _fullBtn.style.background = '#e8f4f8';
        _fullBtn.style.borderColor = '#2374ab';
      });
      _fullBtn.addEventListener('mouseleave', () => {
        _fullBtn.style.background = '#f5f7fb';
        _fullBtn.style.borderColor = '#d9e2ec';
      });
      
      // Handle selection
      _trialBtn.addEventListener('click', () => {
        _setVersionType('trial');
        document.body.removeChild(_dialog);
        resolve('trial');
      });
      
      _fullBtn.addEventListener('click', () => {
        _setVersionType('full');
        document.body.removeChild(_dialog);
        resolve('full');
      });
    });
  }
  
  // Combine parts (obfuscated)
  function _getKey() {
    return _cfg._p1 + "_" + _cfg._p2;
  }
  
  // Generate machine signature (looks like normal utility)
  // Normalize user agent to remove version numbers (stable across browser updates)
  function _normalizeUA(ua) {
    if (!ua) return '';
    // Remove version numbers from user agent to make it stable across updates
    // Example: "Chrome/120.0.0.0" becomes "Chrome"
    return ua.replace(/\/(\d+\.\d+\.\d+\.\d+)/g, '')
             .replace(/\/(\d+\.\d+)/g, '')
             .replace(/\sVersion\/[\d.]+/g, '');
  }
  
  function _genSig() {
    const _d = [
      _normalizeUA(navigator.userAgent), // Normalized (version-independent)
      navigator.platform,
      screen.width + 'x' + screen.height,
      navigator.hardwareConcurrency,
      new Date().getTimezoneOffset(),
      navigator.language || 'en',
      screen.colorDepth || 24
    ];
    let _h = 0;
    for (let i = 0; i < _d.join('|').length; i++) {
      _h = ((_h << 5) - _h) + _d.join('|').charCodeAt(i);
      _h = _h & _h;
    }
    return Math.abs(_h).toString(16).toUpperCase();
  }
  
  // Get authorized list (looks like data utility)
  function _getAuthList() {
    try {
      const _s = localStorage.getItem(_cfg._k);
      return _s ? JSON.parse(_s) : [];
    } catch {
      return [];
    }
  }
  
  // Validate and add machine (obfuscated)
  function _validateAndAdd(_sig, _input) {
    const _key = _getKey();
    if (_input !== _key) {
      return { ok: false, msg: "Invalid credentials" };
    }
    const _list = _getAuthList();
    if (!_list.includes(_sig)) {
      _list.push(_sig);
      localStorage.setItem(_cfg._k, JSON.stringify(_list));
      return { ok: true, msg: "Authorization successful" };
    }
    return { ok: true, msg: "Already authorized" };
  }
  
  // Check authorization (main validation)
  async function _checkAuth() {
    // Get version type (show dialog if not set)
    let versionType = _getVersionType();
    if (!versionType) {
      versionType = await _showVersionSelectionDialog();
    }
    
    // Trial version: Skip password check, auto-authorize
    if (versionType === 'trial') {
      const _sig = _genSig();
      const _list = _getAuthList();
      // Auto-add to authorized list for trial version
      if (!_list.includes(_sig)) {
        _list.push(_sig);
        localStorage.setItem(_cfg._k, JSON.stringify(_list));
      }
      return true; // Auto-authorized for trial
    }
    
    // Full version: Require password
    const _sig = _genSig();
    const _list = _getAuthList();
    
    if (_list.includes(_sig)) {
      return true; // Already authorized
    }
    
    // Not authorized - show custom password dialog
    return new Promise((resolve) => {
      // Create password dialog
      const _dialog = document.createElement('div');
      _dialog.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Segoe UI', sans-serif;
      `;
      
      _dialog.innerHTML = `
        <div style="background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 450px; width: 90%;">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">🔐</div>
            <h2 style="color: #1b2735; margin: 0 0 0.5rem 0; font-size: 1.5rem;">System Authorization</h2>
            <p style="color: #6c7a89; margin: 0; font-size: 0.9rem;">This system requires authorization</p>
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; color: #1b2735; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">System ID:</label>
            <div style="background: #f5f7fb; padding: 0.75rem; border-radius: 6px; font-family: monospace; font-size: 0.85rem; color: #6c7a89; word-break: break-all;">${_sig}</div>
          </div>
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; color: #1b2735; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">Enter Authorization Key:</label>
            <input type="password" id="authPasswordInput" style="width: 100%; padding: 0.75rem; border: 2px solid #d9e2ec; border-radius: 6px; font-size: 1rem; box-sizing: border-box; outline: none; transition: border-color 0.2s;" placeholder="Enter password..." autofocus />
            <div id="authErrorMsg" style="color: #cc4b4b; font-size: 0.85rem; margin-top: 0.5rem; display: none;"></div>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button id="authSubmitBtn" style="flex: 1; padding: 0.75rem; background: #2374ab; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background 0.2s;">Authorize</button>
            <button id="authCancelBtn" style="flex: 1; padding: 0.75rem; background: transparent; color: #6c7a89; border: 2px solid #d9e2ec; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s;">Cancel</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(_dialog);
      
      const _input = _dialog.querySelector('#authPasswordInput');
      const _submitBtn = _dialog.querySelector('#authSubmitBtn');
      const _cancelBtn = _dialog.querySelector('#authCancelBtn');
      const _errorMsg = _dialog.querySelector('#authErrorMsg');
      
      // Handle Enter key
      _input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          _submitBtn.click();
        }
      });
      
      // Handle submit
      _submitBtn.addEventListener('click', () => {
        const _password = _input.value.trim();
        if (!_password) {
          _errorMsg.textContent = 'Please enter authorization key';
          _errorMsg.style.display = 'block';
          return;
        }
        
        const _result = _validateAndAdd(_sig, _password);
        
        if (_result.ok) {
          document.body.removeChild(_dialog);
          alert("✅ " + _result.msg + "\n\nThe application will now work on this system.");
          resolve(true);
        } else {
          _errorMsg.textContent = _result.msg;
          _errorMsg.style.display = 'block';
          _input.value = '';
          _input.focus();
          // Add visual feedback for wrong password
          _input.style.borderColor = '#cc4b4b';
          setTimeout(() => {
            _input.style.borderColor = '#d9e2ec';
          }, 2000);
        }
      });
      
      // Add hover effects for buttons
      _submitBtn.addEventListener('mouseenter', () => {
        _submitBtn.style.background = '#165078';
      });
      _submitBtn.addEventListener('mouseleave', () => {
        _submitBtn.style.background = '#2374ab';
      });
      
      _cancelBtn.addEventListener('mouseenter', () => {
        _cancelBtn.style.background = '#f5f7fb';
      });
      _cancelBtn.addEventListener('mouseleave', () => {
        _cancelBtn.style.background = 'transparent';
      });
      
      // Handle cancel
      _cancelBtn.addEventListener('click', () => {
        document.body.removeChild(_dialog);
        document.body.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f7fb; font-family: 'Segoe UI', sans-serif;">
            <div style="background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); max-width: 500px; text-align: center;">
              <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
              <h1 style="color: #cc4b4b; margin: 0 0 1rem 0; font-size: 1.8rem;">Authorization Required</h1>
              <p style="color: #6c7a89; margin: 0 0 1.5rem 0; line-height: 1.6;">
                This application requires valid authorization to run.
              </p>
            </div>
          </div>
        `;
        resolve(false);
      });
      
      // Focus input
      setTimeout(() => _input.focus(), 100);
    });
  }
  
  // Execute check before app initialization
  _checkAuth().then(authorized => {
    if (authorized) {
      // Authorization successful - start the app
      initializeApp();
    }
  }).catch(() => {
    // Authorization failed - error already displayed
    console.error('System validation failed');
  });
})();
// ===================== END AUTHORIZATION SYSTEM =====================

// Ask browser to keep storage (reduces automatic eviction after inactivity)
function requestPersistentStorage() {
  try {
    if (navigator.storage && typeof navigator.storage.persist === "function") {
      navigator.storage.persist().then((granted) => {
        if (granted) {
          console.info("Storage marked persistent; data less likely to be cleared.");
        }
      }).catch(() => {});
    }
  } catch (e) {}
}

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      // Create a single object store for all data
      if (!database.objectStoreNames.contains('data')) {
        database.createObjectStore('data');
      }
    };
  });
}

// Load data from IndexedDB
async function loadData(key) {
  try {
    if (!db) {
      await initDB();
    }
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(['data'], 'readonly');
        const store = transaction.objectStore('data');
        const request = store.get(key);
        const hasLocalData = (value) => {
          if (Array.isArray(value)) return value.length > 0;
          if (value && typeof value === "object") return Object.keys(value).length > 0;
          return Boolean(value);
        };
        
        request.onerror = () => {
          // Fallback to localStorage for migration
          try {
            const localData = localStorage.getItem(key);
            if (localData) {
              const parsed = JSON.parse(localData);
              resolve(parsed || []);
              // Migrate to IndexedDB
              saveData(key, parsed).catch(() => {});
              return;
            }
          } catch {}
          resolve([]);
        };
        
        request.onsuccess = () => {
          const result = request.result;
          if (result === undefined) {
            // Check localStorage for migration
            try {
              const localData = localStorage.getItem(key);
              if (localData) {
                const parsed = JSON.parse(localData);
                resolve(parsed || []);
                // Migrate to IndexedDB
                saveData(key, parsed).catch(() => {});
                return;
              }
            } catch {}
            resolve([]);
          } else {
            // If IndexedDB is empty but localStorage has data, recover it
            try {
              const localData = localStorage.getItem(key);
              if (localData) {
                const parsed = JSON.parse(localData);
                if (!hasLocalData(result) && hasLocalData(parsed)) {
                  resolve(parsed);
                  // Migrate recovered data back to IndexedDB
                  saveData(key, parsed).catch(() => {});
                  return;
                }
              }
            } catch {}
            resolve(result);
          }
        };
      } catch (error) {
        console.error('Transaction error:', error);
        // Fallback to localStorage
        try {
          const localData = localStorage.getItem(key);
          resolve(localData ? JSON.parse(localData) : []);
        } catch {
          resolve([]);
        }
      }
    });
  } catch (error) {
    console.error('Error loading data:', error);
    // Fallback to localStorage
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
    }
  }
}

// Save data to IndexedDB
async function saveData(key, value) {
  try {
    if (!db) {
      await initDB();
    }
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(['data'], 'readwrite');
        const store = transaction.objectStore('data');
        const request = store.put(value, key);
        
        request.onerror = () => {
          console.error('Error saving data:', request.error);
          // Fallback to localStorage
          try {
  localStorage.setItem(key, JSON.stringify(value));
          } catch (e) {
            console.error('localStorage fallback failed:', e);
          }
          resolve(); // Don't reject, just use fallback
        };
        
        request.onsuccess = () => {
          // Mirror to localStorage so data survives if IndexedDB is evicted (e.g. after 1–2 weeks)
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch (e) {
            if (e.name === "QuotaExceededError") {
              console.warn("localStorage mirror full; IndexedDB is still saved.");
            }
          }
          // Trigger auto-backup after data is saved
          if (autoBackupEnabled) {
            performAutoBackup();
          }
          resolve();
        };
      } catch (error) {
        console.error('Transaction error:', error);
        // Fallback to localStorage
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
          console.error('localStorage fallback failed:', e);
        }
        resolve(); // Don't reject, just use fallback
      }
    });
  } catch (error) {
    console.error('Error saving data:', error);
    // Fallback to localStorage
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('localStorage fallback failed:', e);
    }
  }
}


function setupNavigation() {
  elements.menuButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.menuButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.section;
      elements.sections.forEach((section) =>
        section.classList.toggle("active", section.id === target)
      );
    });
  });
}

function attachHandlers() {
  // Theme toggle handler
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener("click", toggleTheme);
  }
  
  // Navigation menu is now static - always visible for better UX
  if (elements.appMenu) {
    // Ensure menu is always visible
    elements.appMenu.classList.remove('hidden');
  }
  
  // Backup handlers
  if (elements.setupBackupBtn) {
    elements.setupBackupBtn.addEventListener("click", setupAutoBackup);
  }
  if (elements.manualBackupBtn) {
    elements.manualBackupBtn.addEventListener("click", performManualBackup);
  }
  if (elements.dashboardExportBtn) {
    elements.dashboardExportBtn.addEventListener("click", exportAllData);
  }
  if (elements.dashboardImportBtn && elements.dashboardImportInput) {
    elements.dashboardImportBtn.addEventListener("click", () => {
      elements.dashboardImportInput.click();
    });
    elements.dashboardImportInput.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) {
        importAllData(file);
      }
      event.target.value = "";
    });
  }
  
  // Load backup settings from localStorage
  loadBackupSettings();
  
  elements.globalSearch.addEventListener("input", handleGlobalSearchInput);
  elements.globalSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      openFirstMatchedPatient();
    }
  });
  
  // Billing search
  if (elements.billingSearch) {
    elements.billingSearch.addEventListener("input", handleBillingSearchInput);
  }

  if (elements.formsList) {
    elements.formsList.addEventListener("click", handleFormsActionClick);
    elements.formsList.addEventListener("change", handleFormsFileChange);
  }

  if (elements.generateInvoiceBtn) {
    elements.generateInvoiceBtn.addEventListener("click", handleGenerateInvoiceClick);
  }

  if (elements.addFormTypeButton) {
    elements.addFormTypeButton.addEventListener("click", openAddFormTypeModal);
  }
  if (elements.closeAddFormType) {
    elements.closeAddFormType.addEventListener("click", closeAddFormTypeModal);
  }
  if (elements.cancelAddFormType) {
    elements.cancelAddFormType.addEventListener("click", closeAddFormTypeModal);
  }
  if (elements.addFormTypeForm) {
    elements.addFormTypeForm.addEventListener("submit", handleAddFormTypeSubmit);
  }

  elements.patientForm.addEventListener("submit", handlePatientSubmit);
  elements.cancelEditPatient.addEventListener("click", resetPatientForm);

  elements.treatmentForm.addEventListener("submit", handleTreatmentSubmit);
  elements.cancelEditTreatment.addEventListener("click", resetTreatmentForm);
  if (elements.treatmentStatus) {
    elements.treatmentStatus.addEventListener("change", (event) => {
      updateNextVisitRequirement(event.target.value);
    });
  }
  if (elements.treatmentCategory) {
    elements.treatmentCategory.addEventListener("change", (event) => {
      currentTreatmentCategory = event.target.value || "";
      if (elements.treatmentDescription) {
        elements.treatmentDescription.value = "";
      }
      if (elements.treatmentCost) {
        elements.treatmentCost.value = "";
        delete elements.treatmentCost.dataset.auto;
      }
      refreshTreatmentMasterOptions();
    });
  }
  if (elements.treatmentDescription) {
    elements.treatmentDescription.addEventListener("change", (event) => {
      applyTreatmentMasterDefaults(event.target.value);
    });
  }
  if (elements.treatmentCost) {
    elements.treatmentCost.addEventListener("input", () => {
      elements.treatmentCost.dataset.auto = "false";
    });
  }
  if (elements.openTreatmentMaster) {
    elements.openTreatmentMaster.addEventListener("click", () => {
      openTreatmentMasterModal();
    });
  }
  if (elements.closeTreatmentMaster) {
    elements.closeTreatmentMaster.addEventListener("click", () => {
      closeTreatmentMasterModal();
    });
  }
  if (elements.treatmentMasterNew) {
    elements.treatmentMasterNew.addEventListener("click", () => {
      resetTreatmentMasterForm();
      if (elements.treatmentMasterCategory) elements.treatmentMasterCategory.focus();
    });
  }
  if (elements.treatmentMasterModal) {
    elements.treatmentMasterModal.addEventListener("click", (event) => {
      if (event.target === elements.treatmentMasterModal) {
        closeTreatmentMasterModal();
      }
    });
  }
  if (elements.treatmentMasterForm) {
    elements.treatmentMasterForm.addEventListener("submit", handleTreatmentMasterSubmit);
  }
  if (elements.treatmentMasterCancel) {
    elements.treatmentMasterCancel.addEventListener("click", () => {
      resetTreatmentMasterForm();
    });
  }
  if (elements.treatmentMasterSearch) {
    elements.treatmentMasterSearch.addEventListener("input", (event) => {
      treatmentMasterSearch = event.target.value;
      currentTreatmentMasterPage = 1;
      renderTreatmentMasterTable();
    });
  }
  
  // Patient search for treatment form
  if (elements.treatmentPatient) {
    elements.treatmentPatient.addEventListener("input", (e) => handlePatientSearch(e, "treatment"));
    elements.treatmentPatient.addEventListener("focus", () => {
      if (elements.treatmentPatient.value) {
        handlePatientSearch({ target: elements.treatmentPatient }, "treatment");
      }
    });
  }

  elements.billingForm.addEventListener("submit", handleBillingSubmit);
  
  // Patient search for billing form
  if (elements.billingPatient) {
    elements.billingPatient.addEventListener("input", (e) => {
      originalPaymentAmount = null; // Reset when patient changes
      handlePatientSearch(e, "billing");
    });
    elements.billingPatient.addEventListener("focus", () => {
      if (elements.billingPatient.value) {
        handlePatientSearch({ target: elements.billingPatient }, "billing");
      }
    });
  }
  
  // Also reset when patient is selected via search dropdown
  if (elements.billingPatientResults) {
    // This will be handled in handlePatientSearch when patient is clicked
  }
  
  // Close search results when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".form-row")) {
      if (elements.treatmentPatientResults) elements.treatmentPatientResults.classList.remove("show");
      if (elements.billingPatientResults) elements.billingPatientResults.classList.remove("show");
    }
  });
  elements.redeemCheckbox.addEventListener("change", async () => {
    // Update payment amount first, then update summary
    await updatePaymentAmountOnRedeemChange();
    updateBillingSummary();
  });
  if (elements.paymentType) {
    elements.paymentType.addEventListener("change", () => {
      originalPaymentAmount = null; // Reset when payment type changes
      updatePaymentAmount();
    });
  }
  if (elements.billingPayment) {
    elements.billingPayment.addEventListener("input", () => {
      // Prevent manual entry for full payments
      if (elements.paymentType && elements.paymentType.value === "full") {
        // Calculate expected full payment amount
        const patientId = elements.billingPatientId ? elements.billingPatientId.value : elements.billingPatient.value;
        if (patientId) {
          const outstanding = calculateOutstanding(patientId);
          const redeem = elements.redeemCheckbox.checked;
          const points = Number(rewardPoints[patientId] || 0);
          const { rupeesToApply } = calculateRedeemFromPoints(points, outstanding);
          const redeemValue = redeem ? rupeesToApply : 0;
          const expectedAmount = Math.max(0, outstanding - redeemValue);
          
          // Reset to expected amount if user tries to change it
          const enteredValue = parseInt(elements.billingPayment.value) || 0;
          const expectedAmountInt = Math.round(expectedAmount);
          if (Math.abs(enteredValue - expectedAmountInt) > 0) {
            elements.billingPayment.value = expectedAmountInt > 0 ? expectedAmountInt : "0";
            showToast("Full payment amount cannot be changed. It is automatically calculated.");
          }
        }
      } else if (elements.paymentType && elements.paymentType.value === "partial") {
        // Allow manual entry for partial payments
        // Store original amount when user manually enters (if redeem is not checked)
        const currentValue = parseInt(elements.billingPayment.value) || 0;
        if (currentValue > 0 && !elements.redeemCheckbox.checked) {
          originalPaymentAmount = currentValue;
        } else if (currentValue === 0 || !elements.billingPayment.value) {
          originalPaymentAmount = null;
        }
      }
    });
  }
  if (elements.addManualRewardPointsBtn && elements.manualRewardPointsInput) {
    elements.addManualRewardPointsBtn.addEventListener("click", handleManualRewardPointsAdd);
  }
  elements.closePatientDetail.addEventListener("click", hidePatientDetail);
  if (elements.closeStatusPanel) {
    elements.closeStatusPanel.addEventListener("click", hideStatusPatientsPanel);
  }
  if (elements.closeDentistDetailsPanel) {
    elements.closeDentistDetailsPanel.addEventListener("click", hideDentistDetailsPanel);
  }
  if (elements.followUpFilters && elements.followUpFilters.length) {
    elements.followUpFilters.forEach((button) => {
      button.addEventListener("click", () => {
        const selectedFilter = button.dataset.followupFilter || "all";
        currentFollowUpFilter = selectedFilter;
        currentFollowUpPage = 1;
        elements.followUpFilters.forEach((filterButton) => {
          const isActive = filterButton === button;
          filterButton.classList.toggle("active", isActive);
          filterButton.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
        updateFollowUpPanel();
      });
    });
  }
  if (elements.dashboardRange) {
    elements.dashboardRange.addEventListener("change", (event) => {
      currentDashboardRange = event.target.value;
      updateDashboardStats();
      // If a status panel is open, automatically refresh it with new filter
      if (currentOpenStatus && elements.statusPatientsPanel && !elements.statusPatientsPanel.classList.contains("hidden")) {
        showPatientsByStatus(currentOpenStatus);
      }
      // If dentist details panel is open, refresh it too
      if (currentOpenDentist && elements.dentistDetailsPanel && !elements.dentistDetailsPanel.classList.contains("hidden")) {
        showDentistDetails(currentOpenDentist);
      }
    });
  }
}

function prefillTreatmentDate() {
  const today = new Date();
  const formatted = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  const treatmentDateInput = document.getElementById("treatmentDate");
  if (treatmentDateInput) {
    treatmentDateInput.value = formatted;
  }
}

function updateNextVisitRequirement(statusValue) {
  const status = statusValue || (elements.treatmentStatus ? elements.treatmentStatus.value : "");
  const requiresNextVisit = status === "In Progress";
  if (elements.treatmentNextVisit) {
    elements.treatmentNextVisit.required = requiresNextVisit;
  }
  if (elements.nextVisitRequired) {
    elements.nextVisitRequired.classList.toggle("hidden", !requiresNextVisit);
  }
}

function getActiveTreatmentMasters() {
  return (treatmentMasters || []).filter((item) => item.is_active);
}

function getAllTreatmentMasters() {
  return Array.isArray(treatmentMasters) ? treatmentMasters : [];
}

function normalizeTreatmentName(name) {
  return String(name || "").trim().toLowerCase();
}

function refreshTreatmentMasterOptions() {
  const activeMasters = getActiveTreatmentMasters();
  if (elements.treatmentMasterOptions) {
    const filtered = currentTreatmentCategory
      ? activeMasters.filter((item) => normalizeCategory(item.category) === normalizeCategory(currentTreatmentCategory))
      : activeMasters;
    const options = filtered
      .sort((a, b) => a.treatment_name.localeCompare(b.treatment_name))
      .map((item) => `<option value="${escapeHtml(item.treatment_name)}"></option>`)
      .join("");
    elements.treatmentMasterOptions.innerHTML = options;
  }

  if (elements.treatmentCategory) {
    const categories = Array.from(
      new Set(activeMasters.map((item) => String(item.category || "").trim()).filter(Boolean))
    ).sort();
    const currentValue = elements.treatmentCategory.value || "";
    elements.treatmentCategory.innerHTML = [
      '<option value="">Select category...</option>',
      ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    ].join("");
    if (categories.map(normalizeCategory).includes(normalizeCategory(currentValue))) {
      elements.treatmentCategory.value = currentValue;
    }
  }

  if (elements.treatmentMasterCategoryOptions) {
    const categories = Array.from(
      new Set(activeMasters.map((item) => String(item.category || "").trim()).filter(Boolean))
    ).sort();
    elements.treatmentMasterCategoryOptions.innerHTML = categories
      .map((category) => `<option value="${escapeHtml(category)}"></option>`)
      .join("");
  }

  return activeMasters;
}

function openTreatmentMasterModal() {
  if (!elements.treatmentMasterModal) return;
  elements.treatmentMasterModal.classList.remove("hidden");
  currentTreatmentMasterPage = 1;
  renderTreatmentMasterTable();
}

function closeTreatmentMasterModal() {
  if (!elements.treatmentMasterModal) return;
  elements.treatmentMasterModal.classList.add("hidden");
}

function resetTreatmentMasterForm() {
  editingTreatmentMasterId = null;
  if (elements.treatmentMasterForm) elements.treatmentMasterForm.reset();
  if (elements.treatmentMasterSubmit) elements.treatmentMasterSubmit.textContent = "Save";
  currentTreatmentMasterPage = 1;
}

function getFilteredTreatmentMasters() {
  const search = normalizeTreatmentName(treatmentMasterSearch);
  return getAllTreatmentMasters().filter((item) => {
    const matchesSearch = !search || normalizeTreatmentName(item.treatment_name).includes(search);
    return matchesSearch;
  });
}

function renderTreatmentMasterTable() {
  if (!elements.treatmentMasterTableBody) return;
  refreshTreatmentMasterOptions();

  const filtered = getFilteredTreatmentMasters()
    .sort((a, b) => {
      const categoryCompare = normalizeCategory(a.category).localeCompare(normalizeCategory(b.category));
      if (categoryCompare !== 0) return categoryCompare;
      return a.treatment_name.localeCompare(b.treatment_name);
    });
  const totalPages = Math.ceil(filtered.length / treatmentMasterRecordsPerPage);
  if (currentTreatmentMasterPage > totalPages && totalPages > 0) {
    currentTreatmentMasterPage = 1;
  }
  if (!filtered.length) {
    elements.treatmentMasterTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">No active treatments found.</td>
      </tr>
    `;
    return;
  }

  const startIndex = (currentTreatmentMasterPage - 1) * treatmentMasterRecordsPerPage;
  const endIndex = startIndex + treatmentMasterRecordsPerPage;
  const paginated = filtered.slice(startIndex, endIndex);

  elements.treatmentMasterTableBody.innerHTML = paginated
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.category || "-")}</td>
        <td>${escapeHtml(item.treatment_name)}</td>
        <td>${formatINR(item.default_price)}</td>
        <td>
          <label class="status-toggle">
            <input type="checkbox" ${item.is_active ? "checked" : ""} onchange="toggleTreatmentMasterStatus('${item.id}', this.checked)" />
            <span class="status-slider"></span>
            <span class="status-text">${item.is_active ? "Active" : "Inactive"}</span>
          </label>
        </td>
        <td class="actions">
          <button onclick="editTreatmentMaster('${item.id}')">Edit</button>
        </td>
      </tr>
    `)
    .join("");

  if (elements.treatmentMasterPagination) {
    renderPagination(
      elements.treatmentMasterPagination,
      currentTreatmentMasterPage,
      totalPages,
      "treatmentMaster",
      treatmentMasterRecordsPerPage,
      filtered.length
    );
  }
}

function applyTreatmentMasterDefaults(inputValue) {
  const name = normalizeTreatmentName(inputValue);
  if (!name) return;
  const match = getActiveTreatmentMasters().find((item) => {
    const matchesName = normalizeTreatmentName(item.treatment_name) === name;
    const matchesCategory = !currentTreatmentCategory || item.category === currentTreatmentCategory;
    return matchesName && matchesCategory;
  });
  if (!match || !elements.treatmentCost) return;

  if (elements.treatmentCategory && match.category) {
    elements.treatmentCategory.value = match.category;
    currentTreatmentCategory = match.category;
    refreshTreatmentMasterOptions();
  }

  const shouldAutoFill = !elements.treatmentCost.value || elements.treatmentCost.dataset.auto === "true";
  if (shouldAutoFill) {
    elements.treatmentCost.value = Number(match.default_price || 0).toFixed(2);
    elements.treatmentCost.dataset.auto = "true";
  }
}

function handleGlobalSearchInput(event) {
  currentFilter = event.target.value.trim().toLowerCase();
  renderPatients();

  if (!currentFilter) {
    hidePatientDetail();
    return;
  }

  const exactMatch = patients.find(
    (patient) => patient.id.toLowerCase() === currentFilter
  );

  if (exactMatch) {
    viewPatient(exactMatch.id);
  }
}

function handleBillingSearchInput(event) {
  currentBillingFilter = event.target.value.trim();
  currentBillingPage = 1; // Reset to first page when search changes
  renderBilling();
}

function openFirstMatchedPatient() {
  if (!currentFilter) return;
  const matchById = patients.find(
    (patient) => patient.id.toLowerCase() === currentFilter
  );
  const matchByName = patients.find((patient) =>
    patient.name.toLowerCase().includes(currentFilter)
  );
  const candidate = matchById || matchByName;
  if (candidate) {
    viewPatient(candidate.id);
  }
}

function handlePatientSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("patientName").value.trim();
  const contact = document.getElementById("patientContact").value.trim();
  const dob = document.getElementById("patientDOB").value;
  const sex = document.getElementById("patientSex").value;
  const address = document.getElementById("patientAddress").value.trim();
  const notes = document.getElementById("patientNotes").value.trim();

  if (!name || !contact || !dob || !address || !sex) {
    return showToast("Please fill all required patient fields.");
  }

  const age = calculateAge(dob);
  if (age < 0) {
    return showToast("DOB must be in the past.");
  }

  if (editingPatientId) {
    const index = patients.findIndex((p) => p.id === editingPatientId);
    // Preserve createdAt when updating
    const existingCreatedAt = patients[index].createdAt;
    patients[index] = { ...patients[index], name, contact, dob, sex, address, notes, age };
    // Restore createdAt if it existed
    if (existingCreatedAt) {
      patients[index].createdAt = existingCreatedAt;
    }
    showToast("Patient updated.");
  } else {
    const newPatient = {
      id: generatePatientId(),
      name,
      contact,
      dob,
      sex,
      age,
      address,
      notes,
      createdAt: new Date().toISOString(), // Add timestamp for sorting
    };
    patients.push(newPatient);
    showToast("Patient added.");
  }

  saveData(STORAGE_KEYS.patients, patients);
  // Invalidate cache when data changes
  dashboardStatsCache = null;
  patientLookupMap = null; // Rebuild on next use
  resetPatientForm();
  currentPatientPage = 1; // Reset to first page when adding new patient
  renderPatients();
  populatePatientSelects();
  updateFollowUpPanel();
}

function generatePatientId() {
  const counter =
    Number(localStorage.getItem(STORAGE_KEYS.patientCounter) || "0") + 1;
  localStorage.setItem(STORAGE_KEYS.patientCounter, counter);
  return `PAT-${counter.toString().padStart(4, "0")}`;
}

function calculateAge(dobStr) {
  const today = new Date();
  const dob = new Date(dobStr);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

// Create optimized patient lookup map
function buildPatientLookupMap() {
  patientLookupMap = new Map();
  patients.forEach(patient => {
    patientLookupMap.set(patient.id, patient);
  });
}

// Get patient by ID with optimized lookup
function getPatientById(patientId) {
  if (!patientLookupMap) {
    buildPatientLookupMap();
  }
  return patientLookupMap.get(patientId);
}

function renderPatients() {
  if (!patients.length) {
    elements.patientTableBody.innerHTML = `
      <tr><td colspan="8" class="empty-state">No patients yet.</td></tr>
    `;
    elements.patientStats.textContent = "";
    if (elements.patientPagination) elements.patientPagination.innerHTML = "";
    return;
  }

  const filtered = patients.filter((patient) => {
    if (!currentFilter) return true;
    return (
      patient.name.toLowerCase().includes(currentFilter) ||
      patient.id.toLowerCase().includes(currentFilter)
    );
  });

  elements.patientStats.textContent = `${filtered.length} of ${patients.length} patients`;

  // Sort by most recent first (by createdAt timestamp if available, else by ID)
  const sortedPatients = [...filtered].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt) - new Date(a.createdAt); // Most recent first
    }
    // Fallback to ID number if no timestamp
    const aNum = parseInt(a.id.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.id.replace(/\D/g, '')) || 0;
    return bNum - aNum; // Most recent first
  });

  // Pagination
  const totalPages = Math.ceil(sortedPatients.length / recordsPerPage);
  const startIndex = (currentPatientPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedPatients = sortedPatients.slice(startIndex, endIndex);

  elements.patientTableBody.innerHTML = paginatedPatients.length
    ? paginatedPatients
    .map(
      (patient) => `
        <tr>
          <td>${patient.id}</td>
          <td>
            <button class="link-button" data-view="${patient.id}" onclick="viewPatient('${patient.id}')">
              ${patient.name}
            </button>
          </td>
          <td>${patient.contact}</td>
          <td>${patient.dob}</td>
          <td>${patient.age}</td>
          <td>${patient.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : '-'}</td>
          <td>${patient.address}</td>
          <td class="actions">
            <button onclick="editPatient('${patient.id}')">Edit</button>
            <button class="danger" onclick="deletePatient('${patient.id}')">Delete</button>
          </td>
        </tr>
      `
    )
        .join("")
    : `<tr><td colspan="8" class="empty-state">No patients found.</td></tr>`;

  // Render pagination
  if (elements.patientPagination) {
    renderPagination(elements.patientPagination, currentPatientPage, totalPages, "patient");
  }
}

window.editPatient = function (patientId) {
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return;
  editingPatientId = patientId;
  document.getElementById("patientName").value = patient.name;
  document.getElementById("patientContact").value = patient.contact;
  document.getElementById("patientDOB").value = patient.dob;
  document.getElementById("patientSex").value = patient.sex || "";
  document.getElementById("patientAddress").value = patient.address;
  document.getElementById("patientNotes").value = patient.notes || "";
  showToast(`Editing ${patient.name}`);
};

window.deletePatient = function (patientId) {
  if (
    !confirm(
      "Delete this patient and all related treatments, billing, and rewards?"
    )
  ) {
    return;
  }
  const index = patients.findIndex((p) => p.id === patientId);
  if (index < 0) return;

  patients.splice(index, 1);

  for (let i = treatments.length - 1; i >= 0; i -= 1) {
    if (treatments[i].patientId === patientId) {
      treatments.splice(i, 1);
    }
  }

  for (let i = billingHistory.length - 1; i >= 0; i -= 1) {
    if (billingHistory[i].patientId === patientId) {
      billingHistory.splice(i, 1);
    }
  }

  delete rewardPoints[patientId];

  saveData(STORAGE_KEYS.patients, patients);
  saveData(STORAGE_KEYS.treatments, treatments);
  saveData(STORAGE_KEYS.billing, billingHistory);
  saveData(STORAGE_KEYS.rewards, rewardPoints);

  renderPatients();
  renderTreatments();
  renderBilling();
  populatePatientSelects();
  updateBillingSummary();
  updateDashboardStats();
  if (currentDetailPatientId === patientId) {
    hidePatientDetail();
  }
  showToast("Patient and related records removed.");
};

// ===================== CONSENT UPLOAD =====================
function sanitizeConsentId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getConsentExtension(file) {
  const mime = (file.type || "").toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  const name = (file.name || "").toLowerCase();
  const ext = name.split(".").pop() || "";
  if (CONSENT_ALLOWED_EXTENSIONS.includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return "pdf";
}

function validateConsentFile(file) {
  if (!file) {
    return { valid: false, message: "Select a file to upload." };
  }
  if (file.size > CONSENT_MAX_SIZE) {
    return { valid: false, message: "File exceeds 5 MB limit." };
  }
  const typeOk = CONSENT_ALLOWED_TYPES.includes(file.type);
  const nameExt = (file.name || "").toLowerCase().split(".").pop() || "";
  const normalizedNameExt = nameExt === "jpeg" ? "jpg" : nameExt;
  const extOk = CONSENT_ALLOWED_EXTENSIONS.includes(normalizedNameExt);
  if (!typeOk && !extOk) {
    return { valid: false, message: "Unsupported file type. Use PDF, JPG, or PNG." };
  }
  const extension = typeOk ? getConsentExtension(file) : normalizedNameExt;
  return { valid: true, extension };
}

function parseConsentPath(path) {
  if (!path || typeof path !== "string") return null;
  const parts = path.split("/").filter(Boolean);
  if (parts.length !== 4 || parts[0] !== "consents") return null;
  const [, patientId, treatmentId, filename] = parts;
  const safeIdPattern = /^[a-zA-Z0-9_-]+$/;
  const filePattern = new RegExp(`^Consent_${patientId}_${treatmentId}\\.(pdf|jpg|png)$`, "i");
  if (!safeIdPattern.test(patientId) || !safeIdPattern.test(treatmentId)) return null;
  if (filename.includes("..") || !filePattern.test(filename)) return null;
  return { patientId, treatmentId, filename };
}

async function ensureConsentDirectoryHandle(mode = "readwrite") {
  if (!("showDirectoryPicker" in window)) {
    alert("Your browser does not support local file storage. Use a modern browser like Chrome or Edge.");
    return null;
  }
  if (!consentDirectoryHandle) {
    try {
      consentDirectoryHandle = await window.showDirectoryPicker({
        mode,
        startIn: "documents"
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Consent folder selection failed:", error);
      }
      return null;
    }
  }
  const permission = await consentDirectoryHandle.queryPermission({ mode });
  if (permission !== "granted") {
    const newPermission = await consentDirectoryHandle.requestPermission({ mode });
    if (newPermission !== "granted") {
      showToast("Consent folder permission denied.");
      return null;
    }
  }
  return consentDirectoryHandle;
}

// Helper for saving consent files
async function saveConsentFile({ patientId, treatmentId, file }) {
  const validation = validateConsentFile(file);
  if (!validation.valid) {
    return { error: validation.message };
  }

  const rootHandle = await ensureConsentDirectoryHandle("readwrite");
  if (!rootHandle) {
    return { error: "Consent folder not selected." };
  }

  const safePatientId = sanitizeConsentId(patientId);
  const safeTreatmentId = sanitizeConsentId(treatmentId);
  const extension = validation.extension;
  const consentsRoot = await rootHandle.getDirectoryHandle("consents", { create: true });
  const patientDir = await consentsRoot.getDirectoryHandle(safePatientId, { create: true });
  const treatmentDir = await patientDir.getDirectoryHandle(safeTreatmentId, { create: true });
  const filename = `Consent_${safePatientId}_${safeTreatmentId}.${extension}`;

  // Check for existing consent files (any allowed extension)
  let hasExisting = false;
  for (const ext of ["pdf", "jpg", "png"]) {
    const existingName = `Consent_${safePatientId}_${safeTreatmentId}.${ext}`;
    try {
      await treatmentDir.getFileHandle(existingName);
      hasExisting = true;
      break;
    } catch (error) {
      // File does not exist; continue
    }
  }

  if (hasExisting) {
    const confirmed = confirm(
      "A consent form already exists for this treatment. Overwrite it?"
    );
    if (!confirmed) {
      return { cancelled: true };
    }
  }

  // Remove old files with other extensions to enforce a single consent file
  for (const ext of ["pdf", "jpg", "png"]) {
    const existingName = `Consent_${safePatientId}_${safeTreatmentId}.${ext}`;
    if (existingName === filename) continue;
    try {
      await treatmentDir.removeEntry(existingName);
    } catch (error) {
      // Ignore missing files
    }
  }

  const fileHandle = await treatmentDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();

  const relativePath = `consents/${safePatientId}/${safeTreatmentId}/${filename}`;
  return { path: relativePath };
}

async function resolveConsentFileHandle(consentPath, mode = "read") {
  const parsed = parseConsentPath(consentPath);
  if (!parsed) return null;
  const rootHandle = await ensureConsentDirectoryHandle(mode);
  if (!rootHandle) return null;
  try {
    const consentsRoot = await rootHandle.getDirectoryHandle("consents", { create: false });
    const patientDir = await consentsRoot.getDirectoryHandle(parsed.patientId, { create: false });
    const treatmentDir = await patientDir.getDirectoryHandle(parsed.treatmentId, { create: false });
    return await treatmentDir.getFileHandle(parsed.filename);
  } catch (error) {
    return null;
  }
}

async function refreshConsentSection(treatment, section, requestAccess = false) {
  const statusEl = section.querySelector("[data-consent-status]");
  const viewBtn = section.querySelector("[data-consent-view]");
  if (!statusEl || !viewBtn) return;

  if (!treatment.consent_file_path) {
    statusEl.textContent = "No consent uploaded";
    viewBtn.disabled = true;
    return;
  }

  if (requestAccess && !consentDirectoryHandle) {
    await ensureConsentDirectoryHandle("read");
  }

  if (!consentDirectoryHandle) {
    statusEl.textContent = "Consent uploaded";
    viewBtn.disabled = false;
    return;
  }

  const fileHandle = await resolveConsentFileHandle(treatment.consent_file_path, "read");
  if (!fileHandle) {
    statusEl.textContent = "No consent uploaded";
    viewBtn.disabled = true;
    return;
  }

  const file = await fileHandle.getFile();
  const uploadedOn = new Date(file.lastModified).toLocaleDateString();
  statusEl.textContent = `Consent uploaded on ${uploadedOn}`;
  viewBtn.disabled = false;
}

function setupConsentSections(patientTreatments, patientId) {
  const sections = elements.patientDetailContent.querySelectorAll("[data-consent-section]");
  const shouldRequestAccess = patientTreatments.some((t) => t.consent_file_path);

  sections.forEach((section) => {
    const treatmentId = section.getAttribute("data-treatment-id");
    const treatment = patientTreatments.find((t) => t.id === treatmentId);
    if (!treatment) return;

    const input = section.querySelector("[data-consent-input]");
    const uploadBtn = section.querySelector("[data-consent-upload]");
    const viewBtn = section.querySelector("[data-consent-view]");
    const messageEl = section.querySelector("[data-consent-message]");

    const setMessage = (message, isError = false) => {
      if (!messageEl) return;
      messageEl.textContent = message;
      messageEl.classList.toggle("error", isError);
    };

    if (uploadBtn && input) {
      uploadBtn.addEventListener("click", async () => {
        setMessage("");
        const file = input.files && input.files[0];
        const validation = validateConsentFile(file);
        if (!validation.valid) {
          setMessage(validation.message, true);
          return;
        }

        uploadBtn.disabled = true;
        try {
          const result = await saveConsentFile({ patientId, treatmentId, file });
          if (result?.cancelled) {
            uploadBtn.disabled = false;
            return;
          }
          if (result?.error) {
            setMessage(result.error, true);
            uploadBtn.disabled = false;
            return;
          }

          treatment.consent_file_path = result.path;
          saveData(STORAGE_KEYS.treatments, treatments);
          input.value = "";
          await refreshConsentSection(treatment, section, false);
          showToast("Consent uploaded.");
        } catch (error) {
          console.error("Consent upload failed:", error);
          setMessage("Upload failed. Please try again.", true);
        } finally {
          uploadBtn.disabled = false;
        }
      });
    }

    if (viewBtn) {
      viewBtn.addEventListener("click", async () => {
        if (!treatment.consent_file_path) {
          showToast("No consent uploaded.");
          return;
        }
        const fileHandle = await resolveConsentFileHandle(treatment.consent_file_path, "read");
        if (!fileHandle) {
          showToast("Consent file not found.");
          return;
        }
        const file = await fileHandle.getFile();
        const url = URL.createObjectURL(file);
        window.open(url, "_blank", "noopener");
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      });
    }

    refreshConsentSection(treatment, section, shouldRequestAccess);
  });
}

window.viewPatient = function (patientId) {
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) {
    elements.patientDetailContent.classList.add("empty-state");
    elements.patientDetailContent.textContent = "Patient not found.";
    elements.patientDetailPanel.classList.remove("hidden");
    return;
  }
  currentDetailPatientId = patientId;

  const patientTreatments = treatments.filter((t) => t.patientId === patientId);
  const treatmentMarkup = patientTreatments.length
    ? `<div class="treatment-detail-list">
        ${patientTreatments
          .map(
            (treatment) => `
              <div class="treatment-detail-item">
                <h4>${treatment.description} • ${formatCost(treatment.cost)}</h4>
                <div class="detail-meta">
                  <span>Date: ${treatment.date}</span>
                  <span>Dentist: ${treatment.dentist}</span>
                  <span>Status: ${treatment.status}</span>
                  <span>Next: ${treatment.nextVisit || "N/A"}</span>
                </div>
                <div class="consent-section" data-consent-section data-treatment-id="${treatment.id}">
                  <div class="consent-header">
                    <h5>Consent Form</h5>
                    <span class="consent-status" data-consent-status>Checking...</span>
                  </div>
                  <div class="consent-actions">
                    <input
                      type="file"
                      class="consent-input"
                      data-consent-input
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <button type="button" class="secondary pill" data-consent-upload>Upload</button>
                    <button type="button" class="secondary pill" data-consent-view>View Consent</button>
                  </div>
                  <p class="consent-message" data-consent-message></p>
                </div>
              </div>
            `
          )
          .join("")}
      </div>`
    : '<p class="empty-state">No treatments recorded yet.</p>';

  elements.patientDetailContent.classList.remove("empty-state");
  const sexDisplay = patient.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : "Not specified";
  const notesDisplay = patient.notes ? `<div class="notes-section"><h3>Patient History</h3><p>${patient.notes}</p></div>` : "";
  
  elements.patientDetailContent.innerHTML = `
    <div class="detail-grid">
      <div><span>Patient ID</span><strong>${patient.id}</strong></div>
      <div><span>Name</span><strong>${patient.name}</strong></div>
      <div><span>Age</span><strong>${patient.age}</strong></div>
      <div><span>Sex</span><strong>${sexDisplay}</strong></div>
      <div><span>Contact</span><strong>${patient.contact}</strong></div>
      <div><span>DOB</span><strong>${patient.dob}</strong></div>
      <div><span>Address</span><strong>${patient.address}</strong></div>
    </div>
    ${notesDisplay}
    <div class="treatment-history-section">
      <h3>Treatment History</h3>
      ${treatmentMarkup}
    </div>
  `;

  setupConsentSections(patientTreatments, patientId);
  elements.patientDetailPanel.classList.remove("hidden");
  elements.patientDetailPanel.scrollIntoView({ behavior: "smooth" });
}

function updateTreatmentStatus(start, end) {
  if (!elements.treatmentStatusContainer) return;
  
  // Count treatments by status
  const statusCounts = {
    "Scheduled": 0,
    "In Progress": 0,
    "Completed": 0,
    "Cancelled": 0
  };
  
  treatments.forEach((treatment) => {
    if (isDateWithinRange(treatment.date, start, end)) {
      const status = treatment.status || "Scheduled";
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    }
  });
  
  const totalTreatments = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  
  if (totalTreatments === 0) {
    elements.treatmentStatusContainer.innerHTML = '<p class="empty-state">No treatment data available</p>';
    return;
  }
  
  // Define colors for each status
  const statusColors = {
    "Scheduled": "#3498db",      // Blue
    "In Progress": "#f39c12",    // Orange
    "Completed": "#27ae60",      // Green
    "Cancelled": "#e74c3c"       // Red
  };
  
  elements.treatmentStatusContainer.innerHTML = Object.entries(statusCounts)
    .map(([status, count]) => {
      const color = statusColors[status] || "#95a5a6";
      return `
        <div class="status-card" onclick="showPatientsByStatus('${status}')" style="border-left-color: ${color}">
          <div class="status-header">
            <span class="status-label">${status}</span>
            <span class="status-count">${count}</span>
          </div>
          <div class="status-subtitle">Click to view patients</div>
        </div>
      `;
    })
    .join("");
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateInput(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    const date = new Date(dateStr.getTime());
    date.setHours(0, 0, 0, 0);
    return date;
  }
  const raw = String(dateStr).trim();
  if (!raw) return null;
  if (raw.includes("T")) {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }
  const parts = raw.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildFollowUpItems() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return treatments.reduce((items, treatment) => {
    const statusValue = (treatment.status || "").toLowerCase();
    if (statusValue === "cancelled" || statusValue === "completed") return items;

    const patient = getPatientById(treatment.patientId);
    const patientName = patient ? patient.name : "Unknown";
    const phoneNumber = patient?.contact || "N/A";
    const phoneLink = phoneNumber !== "N/A"
      ? `tel:${phoneNumber.replace(/[^+\d]/g, "")}`
      : "#";
    const treatmentName = treatment.description || "Treatment";
    const dentistName = treatment.dentist || "Unassigned";
    const nextVisitRaw = treatment.nextVisit;
    const isScheduled = statusValue === "scheduled";
    const fallbackDate = isScheduled ? treatment.date : null;
    const effectiveDateRaw = nextVisitRaw || fallbackDate;
    const nextVisitDate = parseDateInput(effectiveDateRaw);

    if (!nextVisitDate) {
      items.push({
        patientName,
        phoneNumber,
        phoneLink,
        treatmentName,
        dentistName,
        nextVisit: nextVisitRaw || fallbackDate || "Not scheduled",
        status: "unscheduled",
        statusLabel: "Needs scheduling",
        diffDays: null
      });
      return items;
    }

    const diffDays = Math.round((nextVisitDate.getTime() - today.getTime()) / MS_PER_DAY);
    let status = "upcoming";
    let statusLabel = "";

    if (diffDays < 0) {
      status = "overdue";
      statusLabel = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
    } else if (diffDays === 0) {
      status = "today";
      statusLabel = "Due today";
    } else {
      status = "upcoming";
      statusLabel = `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
    }

    items.push({
      patientName,
      phoneNumber,
      phoneLink,
      treatmentName,
      dentistName,
      nextVisit: nextVisitRaw || fallbackDate,
      status,
      statusLabel,
      diffDays
    });

    return items;
  }, []);
}

function getFilteredFollowUpItems(filter = "all") {
  const allItems = buildFollowUpItems();
  const filteredItems = allItems.filter((item) => {
    if (filter === "overdue") return item.status === "overdue";
    if (filter === "upcoming") return item.status === "upcoming" || item.status === "today";
    return true;
  });

  filteredItems.sort((a, b) => {
    const aKey = a.diffDays === null ? Number.POSITIVE_INFINITY : a.diffDays;
    const bKey = b.diffDays === null ? Number.POSITIVE_INFINITY : b.diffDays;
    if (aKey !== bKey) return aKey - bKey;
    return a.patientName.localeCompare(b.patientName);
  });

  return filteredItems;
}

function updateFollowUpPanel() {
  if (!elements.followUpList) return;

  const allItems = buildFollowUpItems();
  const overdueCount = allItems.filter(item => item.status === "overdue").length;
  const upcomingCount = allItems.filter(item => item.status === "upcoming" || item.status === "today").length;

  if (elements.followUpSummary) {
    elements.followUpSummary.textContent = `All ${allItems.length} • Overdue ${overdueCount} • Upcoming ${upcomingCount}`;
  }

  const filter = currentFollowUpFilter || "all";
  const filteredItems = getFilteredFollowUpItems(filter);
  const totalPages = Math.ceil(filteredItems.length / followUpRecordsPerPage);
  if (currentFollowUpPage > totalPages && totalPages > 0) {
    currentFollowUpPage = 1;
  }

  if (filteredItems.length === 0) {
    const emptyMessages = {
      all: "No follow-up appointments yet.",
      overdue: "No overdue follow-ups.",
      upcoming: "No upcoming follow-ups."
    };
    elements.followUpList.innerHTML = `<p class="empty-state">${emptyMessages[filter] || emptyMessages.all}</p>`;
    if (elements.followUpPagination) elements.followUpPagination.innerHTML = "";
    return;
  }

  const startIndex = (currentFollowUpPage - 1) * followUpRecordsPerPage;
  const endIndex = startIndex + followUpRecordsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  elements.followUpList.innerHTML = paginatedItems
    .map((item) => {
      const patientName = escapeHtml(item.patientName);
      const treatmentName = escapeHtml(item.treatmentName);
      const dentistName = escapeHtml(item.dentistName || "Unassigned");
      const phoneNumber = escapeHtml(item.phoneNumber || "N/A");
      const nextVisitText = escapeHtml(item.nextVisit || "Not scheduled");
      const phoneDisabled = item.phoneLink === "#" || item.phoneLink === "tel:";
      return `
        <div class="followup-item">
          <div class="followup-row">
            <div class="followup-title">
              <strong>${patientName}</strong>
              <span class="followup-status ${item.status}">${item.statusLabel}</span>
            </div>
            <div class="followup-date">${nextVisitText}</div>
          </div>
          <div class="followup-details">
            <span><strong>Phone:</strong> <a href="${item.phoneLink}" class="followup-phone" ${phoneDisabled ? 'onclick="return false;"' : ""}>${phoneNumber}</a></span>
            <span><strong>Procedure:</strong> ${treatmentName}</span>
            <span><strong>Dentist:</strong> ${dentistName}</span>
            <span>${item.statusLabel}</span>
          </div>
        </div>
      `;
    })
    .join("");

  if (elements.followUpPagination) {
    renderPagination(
      elements.followUpPagination,
      currentFollowUpPage,
      totalPages,
      "followup",
      followUpRecordsPerPage,
      filteredItems.length
    );
  }
}

window.showPatientsByStatus = function(status) {
  if (!elements.statusPatientsPanel || !elements.statusPatientsContent || !elements.statusPanelTitle) return;
  
  // Track the currently open status
  currentOpenStatus = status;
  
  // Get all treatments with this status
  const { start, end } = getRangeWindow(currentDashboardRange);
  const filteredTreatments = treatments.filter((treatment) => {
    return treatment.status === status && isDateWithinRange(treatment.date, start, end);
  });
  
  if (filteredTreatments.length === 0) {
    elements.statusPatientsContent.innerHTML = '<p class="empty-state">No patients found with this status.</p>';
    elements.statusPanelTitle.textContent = `${status} - No Patients`;
    elements.statusPatientsPanel.classList.remove("hidden");
    elements.statusPatientsPanel.scrollIntoView({ behavior: "smooth" });
    return;
  }
  
  // Sort filtered treatments by date (most recent first)
  filteredTreatments.sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
  
  // Get unique patients (by patientId) and their treatments
  const patientMap = new Map();
  
  // Build patient lookup map if needed
  if (!patientLookupMap || patientLookupMap.size !== patients.length) {
    buildPatientLookupMap();
  }
  
  filteredTreatments.forEach((treatment) => {
    const patientId = treatment.patientId;
    if (!patientMap.has(patientId)) {
      const patient = getPatientById(patientId);
      if (patient) {
        patientMap.set(patientId, {
          patient: patient,
          treatments: []
        });
      }
    }
    if (patientMap.has(patientId)) {
      patientMap.get(patientId).treatments.push(treatment);
    }
  });
  
  const patientList = Array.from(patientMap.values());
  
  // Sort treatments for each patient by date (most recent first)
  patientList.forEach(item => {
    item.treatments.sort((a, b) => new Date(b.date) - new Date(a.date));
  });
  
  // Sort patients by name
  patientList.sort((a, b) => a.patient.name.localeCompare(b.patient.name));
  
  elements.statusPanelTitle.textContent = `${status} (${patientList.length} ${patientList.length === 1 ? 'Patient' : 'Patients'})`;
  
  elements.statusPatientsContent.innerHTML = patientList
    .map(({ patient, treatments: patientTreatments }) => {
      const phoneNumber = patient.contact || "N/A";
      const phoneLink = phoneNumber !== "N/A" ? `tel:${phoneNumber}` : "#";
      
      return `
        <div class="status-patient-card">
          <div class="patient-info-main">
            <div class="patient-name-section">
              <strong>${patient.name}</strong>
              <span class="patient-id">${patient.id}</span>
            </div>
            <div class="patient-contact-section">
              <a href="${phoneLink}" class="phone-link" ${phoneNumber === "N/A" ? 'onclick="return false;"' : ''}>
                ${phoneNumber}
              </a>
            </div>
          </div>
          <div class="patient-treatments-info">
            <div class="treatment-count">${patientTreatments.length} ${patientTreatments.length === 1 ? 'treatment' : 'treatments'}</div>
            <div class="treatment-details">
              ${patientTreatments.map(t => `
                <div class="treatment-item">
                  <span>${t.description}</span>
                  <span class="treatment-date">${t.date}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
  
  elements.statusPatientsPanel.classList.remove("hidden");
  elements.statusPatientsPanel.scrollIntoView({ behavior: "smooth" });
}

window.copyPhoneNumber = function(phoneNumber) {
  if (!phoneNumber || phoneNumber === "N/A") return;
  
  navigator.clipboard.writeText(phoneNumber).then(() => {
    showToast(`Phone number copied: ${phoneNumber}`);
  }).catch(() => {
    showToast("Failed to copy phone number");
  });
}

window.showDentistDetails = function(dentistName) {
  if (!elements.dentistDetailsPanel || !elements.dentistDetailsContent || !elements.dentistDetailsTitle) return;
  
  // Track the currently open dentist
  currentOpenDentist = dentistName;
  
  // Get date range
  const { start, end } = getRangeWindow(currentDashboardRange);
  
  // Build patient lookup map if needed
  if (!patientLookupMap || patientLookupMap.size !== patients.length) {
    buildPatientLookupMap();
  }
  
  // Get all treatments by this dentist (case-insensitive)
  const filteredTreatments = treatments.filter((treatment) => {
    const treatmentDentist = treatment.dentist?.trim() || "";
    return treatmentDentist.toLowerCase() === dentistName.toLowerCase() && 
           isDateWithinRange(treatment.date, start, end);
  });
  
  if (filteredTreatments.length === 0) {
    elements.dentistDetailsContent.innerHTML = '<p class="empty-state">No treatments found for this dentist.</p>';
    elements.dentistDetailsTitle.textContent = `Dr. ${dentistName} - No Treatments`;
    elements.dentistDetailsPanel.classList.remove("hidden");
    elements.dentistDetailsPanel.scrollIntoView({ behavior: "smooth" });
    return;
  }
  
  // Calculate stats
  const totalVisits = filteredTreatments.length;
  const totalRevenue = filteredTreatments.reduce((sum, t) => sum + Number(t.cost || 0), 0);
  
  // Get unique patients
  const uniquePatientIds = new Set(filteredTreatments.map(t => t.patientId));
  const uniquePatients = Array.from(uniquePatientIds).map(pid => getPatientById(pid)).filter(Boolean);
  
  // Count new patients (created within date range)
  const newPatients = uniquePatients.filter(p => p.createdAt && isDateWithinRange(p.createdAt, start, end));
  
  // Group treatments by patient
  const patientMap = new Map();
  
  filteredTreatments.forEach((treatment) => {
    const patientId = treatment.patientId;
    if (!patientMap.has(patientId)) {
      const patient = getPatientById(patientId);
      if (patient) {
        patientMap.set(patientId, {
          patient: patient,
          treatments: []
        });
      }
    }
    if (patientMap.has(patientId)) {
      patientMap.get(patientId).treatments.push(treatment);
    }
  });
  
  const patientList = Array.from(patientMap.values());
  
  // Sort treatments for each patient by date (most recent first)
  patientList.forEach(item => {
    item.treatments.sort((a, b) => new Date(b.date) - new Date(a.date));
  });
  
  // Sort patients by name
  patientList.sort((a, b) => a.patient.name.localeCompare(b.patient.name));
  
  // Update title with stats
  elements.dentistDetailsTitle.textContent = `Dr. ${dentistName} (${patientList.length} ${patientList.length === 1 ? 'Patient' : 'Patients'})`;
  
  // Generate summary stats
  const summaryHTML = `
    <div class="dentist-summary-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: rgba(35, 116, 171, 0.05); border-radius: 8px;">
      <div style="text-align: center;">
        <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary);">${totalVisits}</div>
        <div style="font-size: 0.85rem; color: var(--muted);">Total Visits</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary);">${patientList.length}</div>
        <div style="font-size: 0.85rem; color: var(--muted);">Total Patients</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary);">${newPatients.length}</div>
        <div style="font-size: 0.85rem; color: var(--muted);">New Patients</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary);">${formatINR(totalRevenue)}</div>
        <div style="font-size: 0.85rem; color: var(--muted);">Total Revenue</div>
      </div>
    </div>
  `;
  
  // Generate patient list
  elements.dentistDetailsContent.innerHTML = summaryHTML + patientList
    .map(({ patient, treatments: patientTreatments }) => {
      const phoneNumber = patient.contact || "N/A";
      const phoneLink = phoneNumber !== "N/A" ? `tel:${phoneNumber}` : "#";
      const isNewPatient = patient.createdAt && isDateWithinRange(patient.createdAt, start, end);
      const newPatientBadge = isNewPatient ? '<span style="background: var(--accent); color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem;">New</span>' : '';
      
      return `
        <div class="status-patient-card">
          <div class="patient-info-main">
            <div class="patient-name-section">
              <strong>${patient.name}${newPatientBadge}</strong>
              <span class="patient-id">${patient.id}</span>
            </div>
            <div class="patient-contact-section">
              <a href="${phoneLink}" class="phone-link" ${phoneNumber === "N/A" ? 'onclick="return false;"' : ''}>
                ${phoneNumber}
              </a>
            </div>
          </div>
          <div class="patient-treatments-info">
            <div class="treatment-count">${patientTreatments.length} ${patientTreatments.length === 1 ? 'treatment' : 'treatments'}</div>
            <div class="treatment-details">
              ${patientTreatments.map(t => `
                <div class="treatment-item">
                  <span>${t.description || 'N/A'}</span>
                  <span class="treatment-date">${t.date}</span>
                  <span style="margin-left: 0.5rem; color: var(--primary);">${formatCost(t.cost)}</span>
                  ${t.status ? `<span style="margin-left: 0.5rem; padding: 0.2rem 0.5rem; background: ${t.status === 'Completed' ? 'var(--accent)' : t.status === 'Cancelled' ? 'var(--danger)' : 'var(--primary)'}; color: white; border-radius: 4px; font-size: 0.75rem;">${t.status}</span>` : ''}
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
  
  elements.dentistDetailsPanel.classList.remove("hidden");
  elements.dentistDetailsPanel.scrollIntoView({ behavior: "smooth" });
}

function hideStatusPatientsPanel() {
  if (elements.statusPatientsPanel) {
    elements.statusPatientsPanel.classList.add("hidden");
    currentOpenStatus = null; // Clear the tracked status when panel is closed
  }
}

function hideDentistDetailsPanel() {
  if (elements.dentistDetailsPanel) {
    elements.dentistDetailsPanel.classList.add("hidden");
    currentOpenDentist = null; // Clear the tracked dentist when panel is closed
  }
}

function hidePatientDetail() {
  currentDetailPatientId = null;
  elements.patientDetailPanel.classList.add("hidden");
  elements.patientDetailContent.classList.add("empty-state");
  elements.patientDetailContent.textContent = detailPlaceholder;
}

function resetPatientForm() {
  editingPatientId = null;
  elements.patientForm.reset();
}

function populatePatientSelects() {
  // No longer needed for dropdowns, but keep for compatibility
  updateBillingSummary();
}

// Patient search function
function handlePatientSearch(event, formType) {
  const searchTerm = event.target.value.trim().toLowerCase();
  const resultsContainer = formType === "treatment" 
    ? elements.treatmentPatientResults 
    : elements.billingPatientResults;
  const hiddenIdField = formType === "treatment"
    ? elements.treatmentPatientId
    : elements.billingPatientId;
  const searchInput = formType === "treatment"
    ? elements.treatmentPatient
    : elements.billingPatient;

  if (!resultsContainer || !hiddenIdField || !searchInput) return;

    if (!searchTerm) {
    resultsContainer.classList.remove("show");
    hiddenIdField.value = "";
    if (formType === "billing") {
      originalPaymentAmount = null; // Reset when search is cleared
      updateBillingSummary();
      updatePaymentAmount();
    }
    return;
  }

  // Filter patients by name or ID
  const matches = patients.filter((patient) => {
    const nameMatch = patient.name.toLowerCase().includes(searchTerm);
    const idMatch = patient.id.toLowerCase().includes(searchTerm);
    return nameMatch || idMatch;
  }).slice(0, 10); // Limit to 10 results

  if (matches.length === 0) {
    resultsContainer.innerHTML = '<div class="search-result-item">No patients found</div>';
    resultsContainer.classList.add("show");
    hiddenIdField.value = "";
    return;
  }

  resultsContainer.innerHTML = matches
    .map(
      (patient) => `
      <div class="search-result-item" data-id="${patient.id}" data-name="${patient.name}">
        <strong>${patient.name}</strong>
        <small>${patient.id} • ${patient.contact}</small>
      </div>
    `
    )
    .join("");

  resultsContainer.classList.add("show");
  
  // Position dropdown below the input field
  if (searchInput && resultsContainer) {
    const inputRect = searchInput.getBoundingClientRect();
    const formRow = searchInput.closest('.form-row');
    if (formRow) {
      const formRowRect = formRow.getBoundingClientRect();
      const inputBottom = inputRect.bottom - formRowRect.top;
      resultsContainer.style.top = `${inputBottom + 4}px`;
    }
  }

  // Add click handlers to results
  resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", () => {
      const patientId = item.dataset.id;
      const patientName = item.dataset.name;
      hiddenIdField.value = patientId;
      searchInput.value = `${patientName} (${patientId})`;
      resultsContainer.classList.remove("show");
      
      if (formType === "billing") {
        originalPaymentAmount = null; // Reset when patient is selected
  updateBillingSummary();
        updatePaymentAmount();
      }
    });
  });
}

// Pagination rendering function
function renderPagination(container, currentPage, totalPages, type, perPage = recordsPerPage, totalRecordsOverride = null) {
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = "";
    return;
  }

  let html = "";
  
  // Previous button
  html += `<button onclick="changePage('${type}', ${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>Previous</button>`;

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    html += `<button onclick="changePage('${type}', 1)">1</button>`;
    if (startPage > 2) {
      html += `<span class="pagination-info">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button onclick="changePage('${type}', ${i})" class="${i === currentPage ? "active" : ""}">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="pagination-info">...</span>`;
    }
    html += `<button onclick="changePage('${type}', ${totalPages})">${totalPages}</button>`;
  }

  // Next button
  html += `<button onclick="changePage('${type}', ${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>Next</button>`;

  // Page info
  let totalRecords = totalRecordsOverride;
  if (totalRecords === null || totalRecords === undefined) {
    if (type === "patient") {
      const filtered = patients.filter((patient) => {
        if (!currentFilter) return true;
        return (
          patient.name.toLowerCase().includes(currentFilter) ||
          patient.id.toLowerCase().includes(currentFilter)
        );
      });
      totalRecords = filtered.length;
    } else if (type === "treatment") {
      totalRecords = treatments.length;
    } else if (type === "billing") {
      totalRecords = billingHistory.length;
    } else {
      totalRecords = 0;
    }
  }
  
  const startRecord = (currentPage - 1) * perPage + 1;
  const endRecord = Math.min(currentPage * perPage, totalRecords);
  html += `<span class="pagination-info">Showing ${startRecord}-${endRecord} of ${totalRecords}</span>`;

  container.innerHTML = html;
}

// Change page function
window.changePage = function(type, page) {
  if (type === "patient") {
    const filtered = patients.filter((patient) => {
      if (!currentFilter) return true;
      return (
        patient.name.toLowerCase().includes(currentFilter) ||
        patient.id.toLowerCase().includes(currentFilter)
      );
    });
    const totalPages = Math.ceil(filtered.length / recordsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPatientPage = page;
    renderPatients();
  } else if (type === "treatment") {
    const totalPages = Math.ceil(treatments.length / treatmentRecordsPerPage);
    if (page < 1 || page > totalPages) return;
    currentTreatmentPage = page;
    renderTreatments();
  } else if (type === "billing") {
    const totalPages = Math.ceil(billingHistory.length / billingRecordsPerPage);
    if (page < 1 || page > totalPages) return;
    currentBillingPage = page;
    renderBilling();
  } else if (type === "followup") {
    const filteredItems = getFilteredFollowUpItems(currentFollowUpFilter);
    const totalPages = Math.ceil(filteredItems.length / followUpRecordsPerPage);
    if (page < 1 || page > totalPages) return;
    currentFollowUpPage = page;
    updateFollowUpPanel();
  } else if (type === "treatmentMaster") {
    const filteredItems = getFilteredTreatmentMasters();
    const totalPages = Math.ceil(filteredItems.length / treatmentMasterRecordsPerPage);
    if (page < 1 || page > totalPages) return;
    currentTreatmentMasterPage = page;
    renderTreatmentMasterTable();
  }
};

function handleTreatmentSubmit(event) {
  event.preventDefault();
  const patientId = elements.treatmentPatientId.value || elements.treatmentPatient.value;
  const description = document.getElementById("treatmentDescription").value.trim();
  const date = document.getElementById("treatmentDate").value;
  const costInput = document.getElementById("treatmentCost").value.trim();
  const cost = costInput === "" ? 0 : Number(costInput);
  const dentist = document.getElementById("treatmentDentist").value.trim();
  const status = document.getElementById("treatmentStatus").value;
  const nextVisit = document.getElementById("treatmentNextVisit").value;

  // Validate required fields (cost is optional)
  if (!patientId || !description || !date || !dentist) {
    return showToast("Please complete all required fields.");
  }

  // If cost is provided, validate it's a valid number
  if (costInput !== "" && (isNaN(cost) || cost < 0)) {
    return showToast("Please enter a valid cost amount.");
  }

  if (status === "In Progress" && !nextVisit) {
    return showToast("Next appointment is required for in-progress treatments.");
  }

  const existingTreatment = editingTreatmentId
    ? treatments.find((t) => t.id === editingTreatmentId)
    : null;

  const payload = {
    id: editingTreatmentId || crypto.randomUUID(),
    patientId,
    description,
    date,
    cost,
    dentist,
    status,
    nextVisit,
    consent_file_path: existingTreatment?.consent_file_path || "",
    createdAt: editingTreatmentId ? undefined : new Date().toISOString(), // Add timestamp for new treatments
  };

  if (editingTreatmentId) {
    const index = treatments.findIndex((t) => t.id === editingTreatmentId);
    treatments[index] = payload;
    showToast("Treatment updated.");
  } else {
    treatments.push(payload);
    showToast("Treatment added.");
  }

  saveData(STORAGE_KEYS.treatments, treatments);
  // Invalidate cache when data changes
  dashboardStatsCache = null;
  renderTreatments();
  resetTreatmentForm();
  updateBillingSummary();
  prefillTreatmentDate();
  updateNextVisitRequirement();
  updateDashboardStats();
}

function handleTreatmentMasterSubmit(event) {
  event.preventDefault();
  if (!elements.treatmentMasterCategory || !elements.treatmentMasterName || !elements.treatmentMasterPrice) {
    return;
  }

  const category = elements.treatmentMasterCategory.value.trim();
  const name = elements.treatmentMasterName.value.trim();
  const priceInput = elements.treatmentMasterPrice.value.trim();
  const price = Number(priceInput);

  if (!category || !name || priceInput === "") {
    return showToast("Please complete all treatment master fields.");
  }
  if (Number.isNaN(price) || price < 0) {
    return showToast("Enter a valid default price.");
  }

  const normalizedName = normalizeTreatmentName(name);
  const duplicate = treatmentMasters.find((item) => {
    return normalizeTreatmentName(item.treatment_name) === normalizedName &&
      item.id !== editingTreatmentMasterId;
  });
  if (duplicate) {
    return showToast("Treatment name already exists.");
  }

  if (editingTreatmentMasterId) {
    const index = treatmentMasters.findIndex((item) => item.id === editingTreatmentMasterId);
    if (index >= 0) {
      treatmentMasters[index] = {
        ...treatmentMasters[index],
        category,
        treatment_name: name,
        default_price: Number(price.toFixed(2))
      };
      showToast("Treatment updated.");
    }
  } else {
    treatmentMasters.push({
      id: crypto.randomUUID(),
      category,
      treatment_name: name,
      default_price: Number(price.toFixed(2)),
      is_active: true,
      createdAt: new Date().toISOString()
    });
    showToast("Treatment added.");
  }

  saveData(STORAGE_KEYS.treatmentMaster, treatmentMasters);
  resetTreatmentMasterForm();
  renderTreatmentMasterTable();
  refreshTreatmentMasterOptions();
}

window.editTreatmentMaster = function(id) {
  const target = treatmentMasters.find((item) => item.id === id);
  if (!target) return;
  editingTreatmentMasterId = id;
  if (elements.treatmentMasterCategory) elements.treatmentMasterCategory.value = target.category || "";
  if (elements.treatmentMasterName) elements.treatmentMasterName.value = target.treatment_name || "";
  if (elements.treatmentMasterPrice) elements.treatmentMasterPrice.value = Number(target.default_price || 0).toFixed(2);
  if (elements.treatmentMasterSubmit) elements.treatmentMasterSubmit.textContent = "Save Changes";
  if (elements.treatmentMasterCategory) elements.treatmentMasterCategory.focus();
};

window.deleteTreatmentMaster = function(id) {
  const target = treatmentMasters.find((item) => item.id === id);
  if (!target) return;
  if (!confirm(`Hide ${target.treatment_name}? It will no longer appear in treatment selection.`)) {
    return;
  }
  target.is_active = false;
  saveData(STORAGE_KEYS.treatmentMaster, treatmentMasters);
  if (editingTreatmentMasterId === id) {
    resetTreatmentMasterForm();
  }
  renderTreatmentMasterTable();
  refreshTreatmentMasterOptions();
  showToast("Treatment removed from active list.");
};

window.toggleTreatmentMasterStatus = function(id, isActive) {
  const target = treatmentMasters.find((item) => item.id === id);
  if (!target) return;
  target.is_active = Boolean(isActive);
  saveData(STORAGE_KEYS.treatmentMaster, treatmentMasters);
  renderTreatmentMasterTable();
  refreshTreatmentMasterOptions();
  showToast(`${target.treatment_name} marked as ${target.is_active ? "Active" : "Inactive"}.`);
};

function renderTreatments() {
  if (!treatments.length) {
    elements.treatmentTableBody.innerHTML = `
      <tr><td colspan="7" class="empty-state">No treatments recorded yet.</td></tr>
    `;
    elements.treatmentStats.textContent = "";
    if (elements.treatmentPagination) elements.treatmentPagination.innerHTML = "";
    return;
  }

  // Sort by date based on current sort state
  const sortedTreatments = [...treatments].sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    if (dateB.getTime() !== dateA.getTime()) {
      // Sort by date: recent first (descending) or oldest first (ascending)
      return treatmentDateSort === 'recent' ? dateB - dateA : dateA - dateB;
    }
    // If dates are same, sort by ID
    return treatmentDateSort === 'recent' 
      ? b.id.localeCompare(a.id) 
      : a.id.localeCompare(b.id);
  });
  
  // Update sort icon
  updateTreatmentSortIcon();

  // Pagination
  const totalPages = Math.ceil(sortedTreatments.length / treatmentRecordsPerPage);
  const startIndex = (currentTreatmentPage - 1) * treatmentRecordsPerPage;
  const endIndex = startIndex + treatmentRecordsPerPage;
  const paginatedTreatments = sortedTreatments.slice(startIndex, endIndex);

  elements.treatmentTableBody.innerHTML = paginatedTreatments
    .map((treatment) => {
      const patientName = getPatientName(treatment.patientId);
      return `
        <tr>
          <td>${patientName}</td>
          <td>${treatment.description}</td>
          <td>${treatment.date}</td>
          <td>${formatCost(treatment.cost)}</td>
          <td>${treatment.dentist}</td>
          <td>${treatment.status}</td>
          <td class="actions">
            <button onclick="editTreatment('${treatment.id}')">Edit</button>
            <button class="danger" onclick="deleteTreatment('${treatment.id}')">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");

  elements.treatmentStats.textContent = `${treatments.length} treatments`;
  
  // Render pagination
  if (elements.treatmentPagination) {
    renderPagination(elements.treatmentPagination, currentTreatmentPage, totalPages, "treatment", treatmentRecordsPerPage);
  }
}

// Toggle treatment date sort between recent and oldest
window.toggleTreatmentDateSort = function() {
  treatmentDateSort = treatmentDateSort === 'recent' ? 'oldest' : 'recent';
  currentTreatmentPage = 1; // Reset to first page when sorting changes
  renderTreatments();
};

// Update sort icon to reflect current sort state
function updateTreatmentSortIcon() {
  const sortIcon = document.getElementById('treatmentDateSortIcon');
  if (sortIcon) {
    sortIcon.textContent = treatmentDateSort === 'recent' ? '↓' : '↑';
    sortIcon.title = treatmentDateSort === 'recent' 
      ? 'Sorted: Recent first (click to sort oldest first)' 
      : 'Sorted: Oldest first (click to sort recent first)';
  }
}

window.editTreatment = function (treatmentId) {
  const treatment = treatments.find((t) => t.id === treatmentId);
  if (!treatment) return;
  editingTreatmentId = treatmentId;
  const patient = patients.find((p) => p.id === treatment.patientId);
  if (patient) {
    elements.treatmentPatient.value = `${patient.name} (${patient.id})`;
    if (elements.treatmentPatientId) {
      elements.treatmentPatientId.value = treatment.patientId;
    }
  }
  document.getElementById("treatmentDescription").value = treatment.description;
  document.getElementById("treatmentDate").value = treatment.date;
  document.getElementById("treatmentCost").value = treatment.cost && treatment.cost > 0 ? treatment.cost : "";
  if (elements.treatmentCategory) {
    const matchingMaster = getActiveTreatmentMasters().find(
      (item) => normalizeTreatmentName(item.treatment_name) === normalizeTreatmentName(treatment.description)
    );
    if (matchingMaster) {
      elements.treatmentCategory.value = matchingMaster.category;
      currentTreatmentCategory = matchingMaster.category;
    }
  }
  refreshTreatmentMasterOptions();
  if (elements.treatmentCost) {
    elements.treatmentCost.dataset.auto = "false";
  }
  document.getElementById("treatmentDentist").value = treatment.dentist;
  document.getElementById("treatmentStatus").value = treatment.status;
  document.getElementById("treatmentNextVisit").value = treatment.nextVisit;
  updateNextVisitRequirement(treatment.status);
  showToast(`Editing treatment for ${getPatientName(treatment.patientId)}`);
};

window.deleteTreatment = function (treatmentId) {
  if (!confirm("Delete this treatment?")) return;
  const index = treatments.findIndex((t) => t.id === treatmentId);
  if (index >= 0) {
    treatments.splice(index, 1);
    saveData(STORAGE_KEYS.treatments, treatments);
    renderTreatments();
    updateBillingSummary();
    updateDashboardStats();
    showToast("Treatment removed.");
  }
};

function resetTreatmentForm() {
  editingTreatmentId = null;
  elements.treatmentForm.reset();
  if (elements.treatmentCost) {
    delete elements.treatmentCost.dataset.auto;
  }
  currentTreatmentCategory = "";
  refreshTreatmentMasterOptions();
  updateNextVisitRequirement();
}

function handleBillingSubmit(event) {
  event.preventDefault();
  const patientId = elements.billingPatientId ? elements.billingPatientId.value : elements.billingPatient.value;
  const amount = parseInt(document.getElementById("billingPayment").value) || 0;
  const redeem = elements.redeemCheckbox.checked;
  const paymentMethod = elements.paymentMethod ? elements.paymentMethod.value : 'cash';
  const paymentType = elements.paymentType ? elements.paymentType.value : 'full';

  if (!patientId) {
    return showToast("Select a patient to process billing.");
  }
  if (isNaN(amount) || amount <= 0) {
    return showToast("Enter a valid payment amount.");
  }
  if (!paymentMethod) {
    return showToast("Select a payment method.");
  }

  const outstandingBefore = calculateOutstanding(patientId);
  if (outstandingBefore <= 0) {
    return showToast("This patient has no outstanding balance.");
  }

  // Validate full payment amount - must match calculated full payment
  if (paymentType === "full") {
    const points = Number(rewardPoints[patientId] || 0);
    const { rupeesToApply } = calculateRedeemFromPoints(points, outstandingBefore);
    const redeemValue = redeem ? rupeesToApply : 0;
    const expectedFullAmount = Math.round(Math.max(0, outstandingBefore - redeemValue));
    
    // Check if entered amount matches expected full payment
    if (Math.abs(amount - expectedFullAmount) > 0) {
      return showToast("Full payment amount cannot be changed. Please use the calculated amount.");
    }
  }

  // For partial payments, allow any amount up to outstanding balance
  if (amount > Math.round(outstandingBefore)) {
    return showToast("Payment exceeds outstanding balance.");
  }

  const availablePoints = rewardPoints[patientId] || 0;
  const outstandingAfterCash = Math.max(outstandingBefore - amount, 0);
  const { pointsToRedeem, rupeesToApply } = calculateRedeemFromPoints(
    availablePoints,
    outstandingAfterCash
  );
  const pointsRedeemed = redeem ? pointsToRedeem : 0;
  const rewardValueApplied = redeem ? rupeesToApply : 0;
  const earnedPoints = calculateEarnedPoints(amount);

  rewardPoints[patientId] = Math.max(
    0,
    availablePoints - pointsRedeemed + earnedPoints
  );

  const paymentDate = new Date().toISOString().split("T")[0];
  const totalApplied = amount + rewardValueApplied;
  const outstandingAfter = Math.max(0, outstandingBefore - totalApplied);
  const entry = {
    id: crypto.randomUUID(),
    patientId,
    amount,
    paymentMethod,
    pointsEarned: earnedPoints,
    pointsRedeemed,
    rewardValue: rewardValueApplied,
    totalApplied,
    date: paymentDate,
    outstandingBefore,
    outstandingAfter,
    createdAt: new Date().toISOString(), // Add timestamp for sorting
  };

  billingHistory.push(entry);
  latestInvoiceEntryId = entry.id;
  if (elements.generateInvoiceBtn) {
    elements.generateInvoiceBtn.classList.remove("hidden");
  }

  saveData(STORAGE_KEYS.billing, billingHistory);
  saveData(STORAGE_KEYS.rewards, rewardPoints);
  
  // Invalidate cache when data changes
  dashboardStatsCache = null;
  
  // Reload reward points to reflect changes
  loadData(STORAGE_KEYS.rewards).then(data => {
    Object.assign(rewardPoints, data || {});
  });
  renderBilling();
  
  // Store current patient ID before reset
  const currentPatientId = patientId;
  
  // Reset form first
  originalPaymentAmount = null; // Reset original payment amount
  elements.billingForm.reset();
  if (elements.paymentType) {
    elements.paymentType.value = "full";
  }
  if (elements.paymentMethod) {
    elements.paymentMethod.value = "cash";
  }
  elements.redeemCheckbox.checked = false;
  
  // Restore patient selection and update summary
  if (elements.billingPatient) {
    elements.billingPatient.value = currentPatientId;
  }
  
  // Then update summary and payment amount with updated points
  updateBillingSummary();
  updatePaymentAmount();
  showToast("Payment processed.");
  updateDashboardStats();
}

function calculateOutstanding(patientId) {
  const totalTreatments = treatments
    .filter((t) => t.patientId === patientId)
    .reduce((sum, t) => sum + Number(t.cost || 0), 0);
  const payments = billingHistory
    .filter((b) => b.patientId === patientId)
    .reduce((sum, b) => {
      const applied =
        typeof b.totalApplied === "number"
          ? b.totalApplied
          : Number(b.amount || 0) + Number(b.rewardValue || 0);
      return sum + applied;
    }, 0);
  return Math.max(0, totalTreatments - payments);
}

function updateBillingSummary() {
  const patientId = elements.billingPatientId ? elements.billingPatientId.value : elements.billingPatient.value;
  if (!patientId) {
    elements.billingTotal.textContent = formatINR(0);
    elements.billingPoints.textContent = "0 pts";
    elements.billingRewardValue.textContent = formatINR(0);
    elements.redeemCheckbox.disabled = true;
    elements.redeemCheckbox.checked = false;
    if (elements.billingPayment) {
      elements.billingPayment.value = "";
    }
    return;
  }
  const outstanding = calculateOutstanding(patientId);
  // Always reload reward points from storage to get latest value
  const updatedRewardPoints = loadData(STORAGE_KEYS.rewards) || {};
  // Update global rewardPoints object to keep it in sync
  Object.assign(rewardPoints, updatedRewardPoints);
  // Get points for this patient - prioritize storage value, ensure it's a number
  const points = Number(updatedRewardPoints[patientId] !== undefined ? updatedRewardPoints[patientId] : (rewardPoints[patientId] || 0));
  const { rupeesToApply } = calculateRedeemFromPoints(points, outstanding);
  const redeemValue = rupeesToApply;
  elements.billingTotal.textContent = formatINR(outstanding);
  elements.billingPoints.textContent = `${points} pts`;
  elements.billingRewardValue.textContent = formatINR(redeemValue);
  const canRedeem = redeemablePoints > 0;
  elements.redeemCheckbox.disabled = !canRedeem;
  if (!canRedeem) {
    elements.redeemCheckbox.checked = false;
  }
}

function updatePaymentAmount() {
  const patientId = elements.billingPatientId ? elements.billingPatientId.value : elements.billingPatient.value;
  if (!patientId || !elements.billingPayment || !elements.paymentType) {
    return;
  }
  const outstanding = calculateOutstanding(patientId);
  const paymentType = elements.paymentType.value;
  const redeem = elements.redeemCheckbox.checked;
  
  if (paymentType === "full") {
    const updatedRewardPoints = loadData(STORAGE_KEYS.rewards) || {};
    Object.assign(rewardPoints, updatedRewardPoints); // Sync global object
    const points = Number(updatedRewardPoints[patientId] !== undefined ? updatedRewardPoints[patientId] : (rewardPoints[patientId] || 0));
    const { rupeesToApply } = calculateRedeemFromPoints(points, outstanding);
    const redeemValue = redeem ? rupeesToApply : 0;
    const paymentAmount = Math.round(Math.max(0, outstanding - redeemValue));
    elements.billingPayment.value = paymentAmount > 0 ? paymentAmount : "0";
    originalPaymentAmount = null; // Reset for full payment
  } else if (paymentType === "partial") {
    // Store original amount if not already stored and user has entered a value
    const currentValue = elements.billingPayment.value;
    if (currentValue && currentValue !== "0") {
      if (originalPaymentAmount === null && !redeem) {
        originalPaymentAmount = parseInt(currentValue) || 0;
      }
    } else {
      originalPaymentAmount = null;
    }
  }
}

function handleManualRewardPointsAdd() {
  const patientId = elements.billingPatientId ? elements.billingPatientId.value : elements.billingPatient.value;
  if (!patientId) {
    showToast("Select a patient before adding reward points.");
    return;
  }
  const raw = elements.manualRewardPointsInput.value;
  const value = parseInt(raw, 10);
  if (!raw || isNaN(value) || value <= 0) {
    showToast("Enter a valid number of points to add.");
    return;
  }
  const current = Number(rewardPoints[patientId] || 0);
  const newTotal = current + Math.floor(value);
  rewardPoints[patientId] = newTotal;
  saveData(STORAGE_KEYS.rewards, rewardPoints);
  elements.manualRewardPointsInput.value = "";
  updateBillingSummary();
  showToast("Reward points added.");
}

async function updatePaymentAmountOnRedeemChange() {
  const patientId = elements.billingPatientId ? elements.billingPatientId.value : elements.billingPatient.value;
  if (!patientId || !elements.billingPayment || !elements.paymentType) {
    return;
  }
  
  const outstanding = calculateOutstanding(patientId);
  const paymentType = elements.paymentType.value;
  const redeem = elements.redeemCheckbox.checked;
  
  // Get reward points from storage (always get latest) - properly await
  const updatedRewardPoints = await loadData(STORAGE_KEYS.rewards) || {};
  Object.assign(rewardPoints, updatedRewardPoints); // Sync global object
  const points = Number(updatedRewardPoints[patientId] !== undefined ? updatedRewardPoints[patientId] : (rewardPoints[patientId] || 0));
  const { rupeesToApply } = calculateRedeemFromPoints(points, outstanding);
  const redeemValue = rupeesToApply;
  
  if (paymentType === "full") {
    // For full payment, always calculate from outstanding
    const paymentAmount = Math.round(Math.max(0, outstanding - (redeem ? redeemValue : 0)));
    elements.billingPayment.value = paymentAmount > 0 ? paymentAmount : "0";
    originalPaymentAmount = null; // Not needed for full payment
  } else if (paymentType === "partial") {
    // For partial payment, adjust based on current value
    const currentPayment = parseInt(elements.billingPayment.value) || 0;
    
    if (redeem) {
      // When checking: subtract redeemable value from current payment
      if (originalPaymentAmount === null || originalPaymentAmount === 0) {
        // Store original if not stored - use current payment or outstanding as base
        originalPaymentAmount = currentPayment > 0 ? currentPayment : Math.round(outstanding);
      }
      const adjustedAmount = Math.round(Math.max(0, originalPaymentAmount - redeemValue));
      elements.billingPayment.value = adjustedAmount > 0 ? adjustedAmount : "0";
    } else {
      // When unchecking: restore original payment amount
      if (originalPaymentAmount !== null && originalPaymentAmount > 0) {
        elements.billingPayment.value = originalPaymentAmount;
      } else if (currentPayment > 0) {
        // If no original stored, add back the redeem value to current payment
        const restoredAmount = Math.round(currentPayment + redeemValue);
        elements.billingPayment.value = restoredAmount > 0 ? restoredAmount : "";
      }
    }
  }
}

function renderBilling() {
  if (!billingHistory.length) {
    elements.billingTableBody.innerHTML = `
      <tr><td colspan="7" class="empty-state">No billing history yet.</td></tr>
    `;
    if (elements.billingPagination) elements.billingPagination.innerHTML = "";
    if (elements.billingStats) elements.billingStats.textContent = "";
    return;
  }

  // Filter by patient name or ID if search is active
  let filteredBilling = billingHistory;
  if (currentBillingFilter) {
    const filterLower = currentBillingFilter.toLowerCase();
    filteredBilling = billingHistory.filter((entry) => {
      // Use optimized lookup instead of find()
      const patient = getPatientById(entry.patientId);
      if (!patient) return false;
      const patientName = patient.name.toLowerCase();
      const patientId = patient.id.toLowerCase();
      return patientName.includes(filterLower) || patientId.includes(filterLower);
    });
  }

  // Pagination - show most recent first (by createdAt if available, else by date)
  const sortedBilling = [...filteredBilling].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return new Date(b.date) - new Date(a.date);
  });
  
  // Update stats
  if (elements.billingStats) {
    elements.billingStats.textContent = currentBillingFilter 
      ? `${sortedBilling.length} of ${billingHistory.length} records`
      : `${sortedBilling.length} records`;
  }
  
  const totalPages = Math.ceil(sortedBilling.length / billingRecordsPerPage);
  // Reset to page 1 if current page exceeds total pages
  if (currentBillingPage > totalPages && totalPages > 0) {
    currentBillingPage = 1;
  }
  const startIndex = (currentBillingPage - 1) * billingRecordsPerPage;
  const endIndex = startIndex + billingRecordsPerPage;
  const paginatedBilling = sortedBilling.slice(startIndex, endIndex);

  const formatPaymentMethod = (method) => {
    if (!method) return 'Cash';
    const methods = {
      'cash': 'Cash',
      'card': 'Card',
      'upi': 'UPI',
      'other': 'Other'
    };
    return methods[method.toLowerCase()] || method.charAt(0).toUpperCase() + method.slice(1);
  };

  elements.billingTableBody.innerHTML = paginatedBilling
    .map((entry) => {
      // Use optimized lookup
      const patient = getPatientById(entry.patientId);
      const patientName = patient ? patient.name : "Unknown";
      const amountPaid = Number(entry.amount || 0);
      const rewardValue = Number(entry.rewardValue || 0);
      const paymentMethod = formatPaymentMethod(entry.paymentMethod || 'cash');
      return `
        <tr>
          <td>${entry.date}</td>
          <td>${patientName}</td>
          <td>${formatINR(amountPaid)}</td>
          <td>${paymentMethod}</td>
          <td>${entry.pointsEarned || 0}</td>
          <td>${entry.pointsRedeemed || 0}</td>
          <td>${formatINR(rewardValue)}</td>
        </tr>
      `;
    })
    .join("");
  
  // Render pagination
  if (elements.billingPagination) {
    renderPagination(elements.billingPagination, currentBillingPage, totalPages, "billing", billingRecordsPerPage);
  }
}

function handleGenerateInvoiceClick() {
  try {
    if (!latestInvoiceEntryId) {
      showToast("Generate a bill before creating an invoice.");
      return;
    }
    const entry = billingHistory.find((item) => item.id === latestInvoiceEntryId);
    if (!entry) {
      showToast("Invoice data is missing.");
      return;
    }
    const patient = patients.find((p) => p.id === entry.patientId);
    if (!patient) {
      showToast("Patient data is missing.");
      return;
    }

    const invoiceNumber = `INV-${entry.id.slice(0, 8).toUpperCase()}`;
    const treatmentsForInvoice = treatments.filter(
      (t) => t.patientId === entry.patientId && t.date === entry.date
    );

    generate_invoice_pdf({
      invoiceNumber,
      invoiceDate: entry.date,
      patient,
      treatments: treatmentsForInvoice,
      subtotal: Number(entry.amount || 0),
      pointsEarned: Number(entry.pointsEarned || 0),
      pointsRedeemed: Number(entry.pointsRedeemed || 0),
      finalPayable: Number(entry.amount || 0)
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    showToast("Unable to generate invoice. Please try again.");
  }
}

function generate_invoice_pdf(billingData) {
  try {
    // Lightweight, text-only PDF using jsPDF.
    if (!billingData || !billingData.patient || !billingData.invoiceNumber) {
      showToast("Invoice data is missing.");
      return;
    }

    const jspdf = window.jspdf;
    if (!jspdf || !jspdf.jsPDF) {
      showToast("PDF library not loaded.");
      return;
    }

    const doc = new jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const formatINRPlain = (value) => `INR ${Number(value || 0).toFixed(2)}`;
    const marginX = 14;
    let cursorY = 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("AARMA Dental Clinic", marginX, cursorY);

    doc.setFontSize(12);
    doc.text("INVOICE", 150, cursorY);
    cursorY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${billingData.invoiceNumber}`, marginX, cursorY);
    doc.text(`Invoice Date: ${billingData.invoiceDate}`, 150, cursorY);
    cursorY += 8;

    doc.line(marginX, cursorY, 200 - marginX, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Patient Details", marginX, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "normal");
    doc.text(`Patient Name: ${billingData.patient.name}`, marginX, cursorY);
    doc.text(`Patient ID: ${billingData.patient.id}`, 120, cursorY);
    cursorY += 6;

    doc.text(`Date: ${billingData.invoiceDate}`, marginX, cursorY);
    doc.text(`Contact: ${billingData.patient.contact || "N/A"}`, 120, cursorY);
    cursorY += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Treatment Details", marginX, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "normal");
    const startY = cursorY;
    const descX = marginX;
    const dateX = 125;
    const amountX = 190;
    doc.text("Description", descX, cursorY);
    doc.text("Date", dateX, cursorY);
    doc.text("Amount (INR)", amountX, cursorY, { align: "right" });
    cursorY += 4;
    doc.line(marginX, cursorY, 200 - marginX, cursorY);
    cursorY += 6;

    const treatments = billingData.treatments.length
      ? billingData.treatments
      : [{ description: "Treatment services", date: billingData.invoiceDate, cost: billingData.finalPayable }];

    treatments.forEach((treatment) => {
      const descriptionLines = doc.splitTextToSize(
        treatment.description || "Treatment",
        90
      );
      doc.text(descriptionLines, descX, cursorY);
      doc.text(treatment.date || billingData.invoiceDate, dateX, cursorY);
      doc.text(formatINRPlain(Number(treatment.cost || 0)), amountX, cursorY, { align: "right" });
      cursorY += 6 + (descriptionLines.length - 1) * 4;
    });

    cursorY += 4;
    doc.line(marginX, cursorY, 200 - marginX, cursorY);
    cursorY += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Summary", marginX, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "normal");
    doc.text(`Subtotal: ${formatINRPlain(billingData.subtotal)}`, marginX, cursorY);
    cursorY += 5;
    doc.text(`Reward Points Earned: ${billingData.pointsEarned}`, marginX, cursorY);
    cursorY += 5;
    doc.text(`Reward Points Redeemed: ${billingData.pointsRedeemed}`, marginX, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "bold");
    doc.text(`Final Payable Amount (INR): ${formatINRPlain(billingData.finalPayable)}`, marginX, cursorY);
    cursorY += 10;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("This invoice is generated electronically.", marginX, cursorY);

    const filename = `Invoice_${billingData.invoiceNumber}_${billingData.patient.id}.pdf`;
    doc.save(filename);
    showToast("Invoice generated.");
  } catch (error) {
    console.error("PDF generation error:", error);
    showToast("Unable to generate invoice. Please try again.");
  }
}

function renderFormsLibrary() {
  if (!elements.formsList) return;
  const catalog = getCombinedFormsCatalog();
  elements.formsList.innerHTML = catalog.map((form) => {
    const stored = formsLibrary[form.id];
    const hasFile = Boolean(stored && stored.dataUrl);
    const statusLabel = hasFile ? "Ready" : "Missing";
    const statusClass = hasFile ? "ready" : "";
    const fileName = stored?.fileName ? escapeHtml(stored.fileName) : "No file uploaded";
    const fileSize = stored?.size ? formatFileSize(stored.size) : "";
    const uploadedAt = stored?.uploadedAt
      ? new Date(stored.uploadedAt).toLocaleDateString()
      : "—";

    return `
      <div class="form-library-item" data-form-id="${form.id}">
        <div class="form-library-info">
          <h3>${form.name}</h3>
          <p>${form.description}</p>
          <div class="form-library-meta">
            <span class="form-status ${statusClass}">${statusLabel}</span>
            <span>${fileName}${fileSize ? ` • ${fileSize}` : ""}</span>
            <span>Last updated: ${uploadedAt}</span>
          </div>
        </div>
        <div class="form-library-actions">
          <input
            type="file"
            class="form-upload-input"
            id="formUpload-${form.id}"
            data-form-id="${form.id}"
            accept="application/pdf,image/*"
          />
          ${form.isCustom ? `
            <button type="button" class="danger pill" data-action="remove" data-form-id="${form.id}">
              Remove
            </button>
          ` : ""}
          <button type="button" class="secondary pill" data-action="upload" data-form-id="${form.id}">
            Upload
          </button>
          <button type="button" class="primary pill" data-action="print" data-form-id="${form.id}" ${hasFile ? "" : "disabled"}>
            Print
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function openAddFormTypeModal() {
  if (!elements.addFormTypeModal) return;
  elements.addFormTypeModal.classList.remove("hidden");
  if (elements.formTypeName) {
    elements.formTypeName.focus();
  }
}

function closeAddFormTypeModal() {
  if (!elements.addFormTypeModal) return;
  elements.addFormTypeModal.classList.add("hidden");
  if (elements.addFormTypeForm) {
    elements.addFormTypeForm.reset();
  }
}

function handleAddFormTypeSubmit(event) {
  event.preventDefault();
  const name = elements.formTypeName?.value.trim();
  if (!name) {
    showToast("Please enter a form name.");
    return;
  }
  const description = elements.formTypeDescription?.value.trim() || "Custom form template.";
  const slugBase = slugifyFormName(name);
  const id = `${slugBase || "custom-form"}-${Date.now()}`;

  formsCatalog = Array.isArray(formsCatalog) ? formsCatalog : [];
  formsCatalog.push({ id, name, description, isCustom: true });
  saveData(STORAGE_KEYS.formsCatalog, formsCatalog);
  renderFormsLibrary();
  closeAddFormTypeModal();
  showToast(`${name} added to Forms Library.`);
}

function removeCustomForm(formId) {
  if (!Array.isArray(formsCatalog)) return;
  const formMeta = formsCatalog.find((form) => form.id === formId);
  if (!formMeta) return;
  const confirmed = confirm(`Remove "${formMeta.name}" from the Forms Library?`);
  if (!confirmed) return;

  formsCatalog = formsCatalog.filter((form) => form.id !== formId);
  delete formsLibrary[formId];
  saveData(STORAGE_KEYS.formsCatalog, formsCatalog);
  saveData(STORAGE_KEYS.forms, formsLibrary);
  renderFormsLibrary();
  showToast(`${formMeta.name} removed.`);
}

function handleFormsActionClick(event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  const formId = actionButton.dataset.formId;
  if (!formId) return;

  if (action === "remove") {
    removeCustomForm(formId);
    return;
  }

  if (action === "upload") {
    const input = document.getElementById(`formUpload-${formId}`);
    if (input) input.click();
    return;
  }

  if (action === "print") {
    printStoredForm(formId);
  }
}

function handleFormsFileChange(event) {
  const input = event.target;
  if (!input.classList.contains("form-upload-input")) return;
  const formId = input.dataset.formId;
  const file = input.files && input.files[0];
  if (!formId || !file) return;

  const reader = new FileReader();
  reader.onload = () => {
    formsLibrary[formId] = {
      fileName: file.name,
      type: file.type || "application/octet-stream",
      dataUrl: reader.result,
      uploadedAt: new Date().toISOString(),
      size: file.size
    };
    saveData(STORAGE_KEYS.forms, formsLibrary);
    renderFormsLibrary();
    const formMeta = getFormMeta(formId);
    showToast(`${formMeta ? formMeta.name : "Form"} uploaded.`);
  };
  reader.onerror = () => {
    showToast("Failed to read the selected file.");
  };
  reader.readAsDataURL(file);
  input.value = "";
}

function printStoredForm(formId) {
  const stored = formsLibrary[formId];
  if (!stored || !stored.dataUrl) {
    showToast("Please upload a file before printing.");
    return;
  }

  const isPdf = stored.type === "application/pdf";
  const isImage = stored.type && stored.type.startsWith("image/");
  const formMeta = getFormMeta(formId);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Popup blocked. Please allow popups to print.");
    return;
  }

  const safeTitle = escapeHtml(formMeta?.name || "Form");
  const fileName = escapeHtml(stored.fileName || "document");
  const bodyContent = isPdf
    ? `<iframe src="${stored.dataUrl}" style="width:100%; height:100%; border:none;"></iframe>`
    : isImage
      ? `<img src="${stored.dataUrl}" style="max-width:100%; height:auto; display:block; margin:0 auto;" />`
      : `<div style="padding:24px; font-family:Arial, sans-serif;">
           <h2>${safeTitle}</h2>
           <p>This file type cannot be printed inline. Download to view or print.</p>
           <a href="${stored.dataUrl}" download="${fileName}">Download ${fileName}</a>
         </div>`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${safeTitle}</title>
        <style>
          html, body { margin: 0; padding: 0; height: 100%; }
          body { background: #fff; }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `);
  printWindow.document.close();
}

function updateDashboardStats() {
  if (
    !elements.dashboardRange ||
    !elements.statPatients ||
    !elements.statPayments ||
    !elements.statTopTreatment
  ) {
    return;
  }
  const range = elements.dashboardRange.value || currentDashboardRange;
  
  // Check cache - only recalculate if range changed or data changed
  if (dashboardStatsCache && dashboardStatsCache.range === range && 
      dashboardStatsCache.patientsLength === patients.length &&
      dashboardStatsCache.treatmentsLength === treatments.length &&
      dashboardStatsCache.billingLength === billingHistory.length) {
    // Use cached results
    elements.statPatients.textContent = dashboardStatsCache.patientsCount;
    elements.statPayments.textContent = dashboardStatsCache.totalPayments;
    elements.statTopTreatment.textContent = dashboardStatsCache.topTreatment;
    if (elements.statCash) elements.statCash.textContent = dashboardStatsCache.paymentsByMethod.cash;
    if (elements.statCard) elements.statCard.textContent = dashboardStatsCache.paymentsByMethod.card;
    if (elements.statUPI) elements.statUPI.textContent = dashboardStatsCache.paymentsByMethod.upi;
    if (elements.statOther) elements.statOther.textContent = dashboardStatsCache.paymentsByMethod.other;
    updateDentistStats(dashboardStatsCache.dentistStats);
    updateTreatmentStatus(dashboardStatsCache.start, dashboardStatsCache.end);
    return;
  }
  
  currentDashboardRange = range;
  const { start, end } = getRangeWindow(range);
  
  let totalPayments = 0;
  const treatmentCounts = {};
  const dentistStats = {};

  // Build patient lookup map once for O(1) lookups
  if (!patientLookupMap || patientLookupMap.size !== patients.length) {
    buildPatientLookupMap();
  }

  // Count patients created/saved within the selected time period
  let patientsCount = 0;
  patients.forEach((patient) => {
    if (patient.createdAt) {
      if (isDateWithinRange(patient.createdAt, start, end)) {
        patientsCount++;
      }
    }
  });

  // Track payments by method
  const paymentsByMethod = {
    cash: 0,
    card: 0,
    upi: 0,
    other: 0
  };

  billingHistory.forEach((entry) => {
    if (isDateWithinRange(entry.date, start, end)) {
      const amount = Number(entry.amount || 0);
      totalPayments += amount;
      const method = (entry.paymentMethod || 'cash').toLowerCase();
      if (paymentsByMethod.hasOwnProperty(method)) {
        paymentsByMethod[method] += amount;
      } else {
        paymentsByMethod.other += amount;
      }
    }
  });

  treatments.forEach((treatment) => {
    if (isDateWithinRange(treatment.date, start, end)) {
      const key = treatment.description?.trim() || "Unnamed";
      treatmentCounts[key] = (treatmentCounts[key] || 0) + 1;
      
      // Count treatments per dentist (case-insensitive)
      const dentistName = treatment.dentist?.trim() || "Unassigned";
      const dentistKey = dentistName.toLowerCase();
      
      if (!dentistStats[dentistKey]) {
        dentistStats[dentistKey] = {
          displayName: dentistName,
          totalVisits: 0,
          uniquePatients: new Set(),
          newPatients: 0,
          totalRevenue: 0
        };
      }
      dentistStats[dentistKey].totalVisits++;
      dentistStats[dentistKey].uniquePatients.add(treatment.patientId);
      dentistStats[dentistKey].totalRevenue += Number(treatment.cost || 0);
      
      // Count new patients - use optimized lookup
      const patient = getPatientById(treatment.patientId);
      if (patient && patient.createdAt && isDateWithinRange(patient.createdAt, start, end)) {
        if (!dentistStats[dentistKey].newPatientIds) {
          dentistStats[dentistKey].newPatientIds = new Set();
        }
        if (!dentistStats[dentistKey].newPatientIds.has(treatment.patientId)) {
          dentistStats[dentistKey].newPatientIds.add(treatment.patientId);
          dentistStats[dentistKey].newPatients++;
        }
      }
    }
  });

  const topTreatmentEntry = Object.entries(treatmentCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  // Cache the results
  dashboardStatsCache = {
    range: range,
    patientsLength: patients.length,
    treatmentsLength: treatments.length,
    billingLength: billingHistory.length,
    patientsCount: patientsCount,
    totalPayments: formatINR(totalPayments),
    topTreatment: topTreatmentEntry
      ? `${topTreatmentEntry[0]} (${topTreatmentEntry[1]})`
      : "No data",
    paymentsByMethod: {
      cash: formatINR(paymentsByMethod.cash),
      card: formatINR(paymentsByMethod.card),
      upi: formatINR(paymentsByMethod.upi),
      other: formatINR(paymentsByMethod.other)
    },
    dentistStats: dentistStats,
    start: start,
    end: end
  };

  elements.statPatients.textContent = patientsCount;
  elements.statPayments.textContent = formatINR(totalPayments);
  elements.statTopTreatment.textContent = topTreatmentEntry
    ? `${topTreatmentEntry[0]} (${topTreatmentEntry[1]})`
    : "No data";
  
  // Update payment method stats
  if (elements.statCash) elements.statCash.textContent = formatINR(paymentsByMethod.cash);
  if (elements.statCard) elements.statCard.textContent = formatINR(paymentsByMethod.card);
  if (elements.statUPI) elements.statUPI.textContent = formatINR(paymentsByMethod.upi);
  if (elements.statOther) elements.statOther.textContent = formatINR(paymentsByMethod.other);
  
  // Update dentist performance stats
  updateDentistStats(dentistStats);
  
  // Update treatment status overview
  updateTreatmentStatus(start, end);

  // Update follow-up panel (independent of date range)
  updateFollowUpPanel();
}

function updateDentistStats(dentistStats) {
  if (!elements.dentistStatsContainer) return;
  
  const dentistEntries = Object.entries(dentistStats);
  
  if (dentistEntries.length === 0) {
    elements.dentistStatsContainer.innerHTML = '<p class="empty-state">No treatment data available</p>';
    return;
  }
  
  // Sort by total visits (descending)
  dentistEntries.sort((a, b) => b[1].totalVisits - a[1].totalVisits);
  
  elements.dentistStatsContainer.innerHTML = dentistEntries
    .map(([dentistKey, stats]) => {
      // Use displayName for showing the original name with proper casing
      const displayName = stats.displayName || dentistKey;
      return `
        <div class="dentist-stat-card" onclick="showDentistDetails('${displayName.replace(/'/g, "\\'")}')" style="cursor: pointer;">
          <div class="dentist-name">Dr. ${displayName}</div>
          <div class="dentist-metrics">
            <div class="metric">
              <span class="metric-label">Total Visits</span>
              <span class="metric-value">${stats.totalVisits}</span>
            </div>
            <div class="metric">
              <span class="metric-label">New Patients</span>
              <span class="metric-value">${stats.newPatients || 0}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Revenue Generated</span>
              <span class="metric-value">${formatINR(stats.totalRevenue)}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

function getRangeWindow(range) {
  const end = new Date();
  const start = new Date();
  end.setHours(23, 59, 59, 999);
  
  if (range === 'overall') {
    // Overall - show all data (very early start date)
    start.setFullYear(2000, 0, 1);
    start.setHours(0, 0, 0, 0);
  } else if (range === 'today') {
    // Today only
    start.setHours(0, 0, 0, 0);
  } else if (range === 'lastMonth') {
    // Previous calendar month
    const today = new Date();
    start.setFullYear(today.getFullYear(), today.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(today.getFullYear(), today.getMonth(), 0);
    end.setHours(23, 59, 59, 999);
  } else {
    // Last N days (weekly: 7, monthly: 30)
    const days = DASHBOARD_WINDOWS[range] || DASHBOARD_WINDOWS.monthly;
    start.setHours(0, 0, 0, 0);
    start.setDate(end.getDate() - (days - 1));
  }
  
  return { start, end };
}

function isDateWithinRange(dateStr, start, end) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  // Compare dates - createdAt is ISO string, start/end are Date objects
  // Ensure we're comparing correctly by using getTime() for precise comparison
  const dateTime = date.getTime();
  const startTime = start.getTime();
  const endTime = end.getTime();
  return dateTime >= startTime && dateTime <= endTime;
}

function getPatientName(patientId) {
  return patients.find((p) => p.id === patientId)?.name || "Unknown";
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => elements.toast.classList.remove("show"),
    2800
  );
}

// ===================== AUTO-BACKUP FUNCTIONS =====================

// Setup auto-backup by selecting directory
async function setupAutoBackup() {
  try {
    // Check if File System Access API is supported
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support automatic file backup. Please use a modern browser like Chrome or Edge.');
      return;
    }

    // Request directory access
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'desktop'
    });

    // Store the directory handle
    backupDirectoryHandle = dirHandle;
    autoBackupEnabled = true;

    // Save settings
    try {
      // Note: We can't directly serialize the directory handle, but we can save the name
      localStorage.setItem('backupDirName', dirHandle.name);
      localStorage.setItem('autoBackupEnabled', 'true');
    } catch (e) {
      console.error('Error saving backup settings:', e);
    }

    updateBackupStatus('Auto-backup enabled', true);
    showToast('Auto-backup configured successfully!');

    // Perform immediate backup
    await performAutoBackup();

  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error setting up auto-backup:', error);
      showToast('Failed to setup auto-backup');
    }
  }
}

// Perform automatic backup
async function performAutoBackup() {
  if (!autoBackupEnabled || !backupDirectoryHandle) {
    return;
  }

  // Throttle backups - only backup once every 5 seconds
  const now = Date.now();
  if (lastBackupTime && (now - lastBackupTime) < 5000) {
    return;
  }

  try {
    // Verify we still have permission
    const permission = await backupDirectoryHandle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      const newPermission = await backupDirectoryHandle.requestPermission({ mode: 'readwrite' });
      if (newPermission !== 'granted') {
        autoBackupEnabled = false;
        updateBackupStatus('Permission denied', false);
        return;
      }
    }

    // Create backup data
    const backupData = {
      patients,
      treatments,
      billingHistory,
      rewardPoints,
      metadata: {
        backupDate: new Date().toISOString(),
        version: '1.0',
        clinicName: CLINIC_NAME
      }
    };

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `dental-app-backup-${timestamp}.json`;

    // Write to file
    const fileHandle = await backupDirectoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(backupData, null, 2));
    await writable.close();

    lastBackupTime = now;
    updateBackupStatus(`Last backup: ${new Date().toLocaleTimeString()}`, true);

  } catch (error) {
    console.error('Auto-backup failed:', error);
    if (error.name === 'NotAllowedError') {
      autoBackupEnabled = false;
      updateBackupStatus('Permission lost - click Setup to re-enable', false);
    }
  }
}

// Perform manual backup (download)
async function performManualBackup() {
  try {
    const backupData = {
      patients,
      treatments,
      billingHistory,
      rewardPoints,
      metadata: {
        backupDate: new Date().toISOString(),
        version: '1.0',
        clinicName: CLINIC_NAME
      }
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `dental-app-backup-${timestamp}.json`;

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Manual backup downloaded successfully!');
  } catch (error) {
    console.error('Manual backup failed:', error);
    showToast('Failed to create manual backup');
  }
}

// Load backup settings from localStorage
function loadBackupSettings() {
  try {
    const enabled = localStorage.getItem('autoBackupEnabled');
    const dirName = localStorage.getItem('backupDirName');
    
    if (enabled === 'true' && dirName) {
      // Note: We can't restore the directory handle automatically
      // User needs to setup again after browser restart
      updateBackupStatus('Click "Setup Auto-Backup" to enable', false);
      autoBackupEnabled = false;
    } else {
      updateBackupStatus('Not configured', false);
    }
  } catch (e) {
    console.error('Error loading backup settings:', e);
  }
}

// Update backup status display
function updateBackupStatus(message, isActive) {
  if (elements.backupStatus) {
    elements.backupStatus.textContent = message;
    elements.backupStatus.className = isActive ? 'backup-status active' : 'backup-status';
  }
}

// ===================== EXPORT/IMPORT FUNCTIONS =====================

// Export all data to JSON file
function exportAllData() {
  try {
    const exportData = {
      patients,
      treatments,
      billingHistory,
      rewardPoints,
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0',
        clinicName: CLINIC_NAME,
        recordCounts: {
          patients: patients.length,
          treatments: treatments.length,
          billingRecords: billingHistory.length
        }
      }
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `AARMA-Dental-Data-${timestamp}.json`;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Data exported successfully! Save it to: C:\\Users\\Hp\\Desktop\\Dental App\\Cursor\\Dental Application');
  } catch (error) {
    console.error('Export failed:', error);
    showToast('Failed to export data');
  }
}

// Import data from JSON file
async function importAllData(file) {
  if (!file) {
    showToast('No file selected');
    return;
  }

  try {
    const text = await file.text();
    const importData = JSON.parse(text);

    // Validate data structure
    if (!importData.patients || !importData.treatments || !importData.billingHistory) {
      showToast('Invalid data file format');
      return;
    }

    // Confirm before importing
    const recordCount = importData.patients.length + importData.treatments.length + importData.billingHistory.length;
    const confirmed = confirm(
      `Import ${importData.patients.length} patients, ${importData.treatments.length} treatments, and ${importData.billingHistory.length} billing records?\n\nThis will REPLACE all current data. Are you sure?`
    );

    if (!confirmed) {
      showToast('Import cancelled');
      return;
    }

    // Import the data
    patients = importData.patients || [];
    treatments = importData.treatments || [];
    billingHistory = importData.billingHistory || [];
    rewardPoints = importData.rewardPoints || {};

    // Save to IndexedDB
    await saveData(STORAGE_KEYS.patients, patients);
    await saveData(STORAGE_KEYS.treatments, treatments);
    await saveData(STORAGE_KEYS.billing, billingHistory);
    await saveData(STORAGE_KEYS.rewards, rewardPoints);

    // Refresh all displays
    renderPatients();
    renderTreatments();
    renderBilling();
    populatePatientSelects();
    updateBillingSummary();
    updateDashboardStats();

    showToast(`Successfully imported ${recordCount} records!`);
  } catch (error) {
    console.error('Import failed:', error);
    showToast('Failed to import data. Check file format.');
  }
}



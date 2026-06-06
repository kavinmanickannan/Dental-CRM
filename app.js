// Bootstrap module: wires together all feature modules, initializes
// persisted data, and attaches every DOM event handler.
//
// Note: app.js and auth.js import from each other (auth.js calls
// `initializeApp` once the version/password gate passes; app.js imports
// auth.js purely so the gate IIFE runs) -- this is a valid ES module
// circular import because both references are only used inside function
// bodies / at the bottom of the module, not at evaluation time of the
// imported binding itself.
import { calculateRedeemFromPoints } from './js/utils.js';
import { state } from './js/state.js';
// Importing auth.js runs its version/password gate IIFE, which calls back
// into `initializeApp` (exported below) once authorization succeeds.
import './js/auth.js';
import { STORAGE_KEYS, initDB, loadData, saveData } from './js/db.js';
import {
  elements,
  showToast,
  initTheme,
  toggleTheme,
  setupNavigation,
  changePage,
} from './js/ui.js';
import {
  buildPatientLookupMap,
  handleGlobalSearchInput,
  openFirstMatchedPatient,
  handlePatientSubmit,
  resetPatientForm,
  populatePatientSelects,
  handlePatientSearch,
  viewPatient,
  editPatient,
  deletePatient,
  hidePatientDetail,
  renderPatients,
} from './js/patients.js';
import {
  ensureTreatmentMasterSeed,
  prefillTreatmentDate,
  updateNextVisitRequirement,
  refreshTreatmentMasterOptions,
  openTreatmentMasterModal,
  closeTreatmentMasterModal,
  resetTreatmentMasterForm,
  renderTreatmentMasterTable,
  applyTreatmentMasterDefaults,
  handleTreatmentSubmit,
  handleTreatmentMasterSubmit,
  editTreatmentMaster,
  toggleTreatmentMasterStatus,
  renderTreatments,
  updateTreatmentSortIcon,
  editTreatment,
  deleteTreatment,
  resetTreatmentForm,
} from './js/treatments.js';
import {
  handleBillingSearchInput,
  handleBillingSubmit,
  calculateOutstanding,
  updateBillingSummary,
  updatePaymentAmount,
  handleManualRewardPointsAdd,
  updatePaymentAmountOnRedeemChange,
  renderBilling,
} from './js/billing.js';
import {
  showPatientsByStatus,
  showDentistDetails,
  hideStatusPatientsPanel,
  hideDentistDetailsPanel,
  updateFollowUpPanel,
  updateDashboardStats,
} from './js/dashboard.js';
import {
  renderFormsLibrary,
  openAddFormTypeModal,
  closeAddFormTypeModal,
  handleAddFormTypeSubmit,
  handleFormsActionClick,
  handleFormsFileChange,
} from './js/forms.js';
import { handleGenerateInvoiceClick } from './js/invoice.js';
import {
  setupAutoBackup,
  performManualBackup,
  loadBackupSettings,
  exportAllData,
  importAllData,
} from './js/backup.js';

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
export async function initializeApp() {
  try {
    // Initialize IndexedDB
    await initDB();
    // Ask browser to keep storage (helps prevent auto-deletion after 1–2 weeks)
    requestPersistentStorage();

    // Load all data
    state.patients = await loadData(STORAGE_KEYS.patients);
    state.treatments = await loadData(STORAGE_KEYS.treatments);
    state.billingHistory = await loadData(STORAGE_KEYS.billing);
    state.rewardPoints = await loadData(STORAGE_KEYS.rewards) || {};
    state.treatmentMasters = await loadData(STORAGE_KEYS.treatmentMaster);
    state.formsLibrary = await loadData(STORAGE_KEYS.forms) || {};
    state.formsCatalog = await loadData(STORAGE_KEYS.formsCatalog) || [];

    // Keep localStorage mirror in sync so data survives IndexedDB eviction
    try {
      localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(state.patients));
      localStorage.setItem(STORAGE_KEYS.treatments, JSON.stringify(state.treatments));
      localStorage.setItem(STORAGE_KEYS.billing, JSON.stringify(state.billingHistory));
      localStorage.setItem(STORAGE_KEYS.rewards, JSON.stringify(state.rewardPoints));
      localStorage.setItem(STORAGE_KEYS.treatmentMaster, JSON.stringify(state.treatmentMasters));
      localStorage.setItem(STORAGE_KEYS.forms, JSON.stringify(state.formsLibrary));
      localStorage.setItem(STORAGE_KEYS.formsCatalog, JSON.stringify(state.formsCatalog));
    } catch (e) {
      if (e.name === "QuotaExceededError") {
        console.warn("localStorage full; mirror skipped.");
      }
    }

    if (state.patients.length === 0 && state.treatments.length === 0 && state.billingHistory.length === 0) {
      const legacy = attemptLegacyRecovery();
      if (legacy.recovered) {
        if (legacy.data.patients.length) state.patients = legacy.data.patients;
        if (legacy.data.treatments.length) state.treatments = legacy.data.treatments;
        if (legacy.data.billing.length) state.billingHistory = legacy.data.billing;
        if (legacy.data.rewards) state.rewardPoints = legacy.data.rewards;
        saveData(STORAGE_KEYS.patients, state.patients);
        saveData(STORAGE_KEYS.treatments, state.treatments);
        saveData(STORAGE_KEYS.billing, state.billingHistory);
        saveData(STORAGE_KEYS.rewards, state.rewardPoints);
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
    state.patients = JSON.parse(localStorage.getItem(STORAGE_KEYS.patients) || '[]');
    state.treatments = JSON.parse(localStorage.getItem(STORAGE_KEYS.treatments) || '[]');
    state.billingHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.billing) || '[]');
    state.rewardPoints = JSON.parse(localStorage.getItem(STORAGE_KEYS.rewards) || '{}');
    state.treatmentMasters = JSON.parse(localStorage.getItem(STORAGE_KEYS.treatmentMaster) || '[]');
    state.formsLibrary = JSON.parse(localStorage.getItem(STORAGE_KEYS.forms) || '{}');
    state.formsCatalog = JSON.parse(localStorage.getItem(STORAGE_KEYS.formsCatalog) || '[]');

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
      state.currentTreatmentCategory = event.target.value || "";
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
      state.treatmentMasterSearch = event.target.value;
      state.currentTreatmentMasterPage = 1;
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
      state.originalPaymentAmount = null; // Reset when patient changes
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

  // Delegated handler for table/card action buttons rendered into innerHTML.
  // Using data-* attributes + delegation (rather than inline onclick="fn('${value}')")
  // avoids breaking out of the attribute -- and the resulting injection -- when a
  // user-entered value (patient name, dentist name, etc.) contains quotes or HTML.
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const { action, id, status, dentist, pageType, page } = target.dataset;
    switch (action) {
      case "view-patient":
        viewPatient(id);
        break;
      case "edit-patient":
        editPatient(id);
        break;
      case "delete-patient":
        deletePatient(id);
        break;
      case "edit-treatment":
        editTreatment(id);
        break;
      case "delete-treatment":
        deleteTreatment(id);
        break;
      case "edit-treatment-master":
        editTreatmentMaster(id);
        break;
      case "show-status":
        showPatientsByStatus(status);
        break;
      case "show-dentist":
        showDentistDetails(dentist);
        break;
      case "change-page":
        changePage(pageType, Number(page));
        break;
      default:
        break;
    }
  });

  document.addEventListener("change", (e) => {
    const target = e.target.closest("[data-action='toggle-treatment-master']");
    if (!target) return;
    toggleTreatmentMasterStatus(target.dataset.id, target.checked);
  });
  elements.redeemCheckbox.addEventListener("change", async () => {
    // Update payment amount first, then update summary
    await updatePaymentAmountOnRedeemChange();
    updateBillingSummary();
  });
  if (elements.paymentType) {
    elements.paymentType.addEventListener("change", () => {
      state.originalPaymentAmount = null; // Reset when payment type changes
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
          const points = Number(state.rewardPoints[patientId] || 0);
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
          state.originalPaymentAmount = currentValue;
        } else if (currentValue === 0 || !elements.billingPayment.value) {
          state.originalPaymentAmount = null;
        }
      }
    });
  }
  if (elements.addManualRewardPointsBtn && elements.manualRewardPointsInput) {
    elements.addManualRewardPointsBtn.addEventListener("click", handleManualRewardPointsAdd);
  }
  elements.closePatientDetail.addEventListener("click", hidePatientDetail);
  elements.patientDetailPanel.addEventListener("click", (event) => {
    if (event.target === elements.patientDetailPanel) {
      hidePatientDetail();
    }
  });
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
        state.currentFollowUpFilter = selectedFilter;
        state.currentFollowUpPage = 1;
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
      state.currentDashboardRange = event.target.value;
      updateDashboardStats();
      // If a status panel is open, automatically refresh it with new filter
      if (state.currentOpenStatus && elements.statusPatientsPanel && !elements.statusPatientsPanel.classList.contains("hidden")) {
        showPatientsByStatus(state.currentOpenStatus);
      }
      // If dentist details panel is open, refresh it too
      if (state.currentOpenDentist && elements.dentistDetailsPanel && !elements.dentistDetailsPanel.classList.contains("hidden")) {
        showDentistDetails(state.currentOpenDentist);
      }
    });
  }
}

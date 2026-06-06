// Shared UI chrome: DOM element cache, theme, navigation/tabs, toast,
// and the generic pagination renderer/handler used by every list view.
//
// ui.js and the feature modules (patients/treatments/billing/dashboard) import
// from each other -- e.g. renderPagination needs each feature's render*
// function to refresh after a page change, while those features need
// `elements`/`renderPagination`/`showToast` from here. This is a valid ES
// module circular import because every cross-reference is used only inside
// function bodies, never at module-evaluation time.
import { escapeHtml } from './utils.js';
import {
  state,
  THEME_STORAGE_KEY,
  recordsPerPage,
  treatmentRecordsPerPage,
  billingRecordsPerPage,
  followUpRecordsPerPage,
  treatmentMasterRecordsPerPage,
} from './state.js';
import { renderPatients } from './patients.js';
import { renderTreatments, renderTreatmentMasterTable, getFilteredTreatmentMasters } from './treatments.js';
import { renderBilling } from './billing.js';
import { updateFollowUpPanel, getFilteredFollowUpItems } from './dashboard.js';

export const elements = {
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

export function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => elements.toast.classList.remove("show"),
    2800
  );
}

// Theme Management
export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  applyTheme(savedTheme);
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  showToast(`Theme switched to ${newTheme === 'light' ? 'Light' : 'Dark'} mode`);
}

export function setupNavigation() {
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

// Pagination rendering function
export function renderPagination(container, currentPage, totalPages, type, perPage = recordsPerPage, totalRecordsOverride = null) {
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = "";
    return;
  }

  let html = "";

  const pageButton = (page, label = page, extraClass = "") =>
    `<button data-action="change-page" data-page-type="${escapeHtml(type)}" data-page="${page}" class="${extraClass}">${label}</button>`;

  // Previous button
  html += `<button data-action="change-page" data-page-type="${escapeHtml(type)}" data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>Previous</button>`;

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    html += pageButton(1);
    if (startPage > 2) {
      html += `<span class="pagination-info">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += pageButton(i, i, i === currentPage ? "active" : "");
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="pagination-info">...</span>`;
    }
    html += pageButton(totalPages);
  }

  // Next button
  html += `<button data-action="change-page" data-page-type="${escapeHtml(type)}" data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}>Next</button>`;

  // Page info
  let totalRecords = totalRecordsOverride;
  if (totalRecords === null || totalRecords === undefined) {
    if (type === "patient") {
      const filtered = state.patients.filter((patient) => {
        if (!state.currentFilter) return true;
        return (
          patient.name.toLowerCase().includes(state.currentFilter) ||
          patient.id.toLowerCase().includes(state.currentFilter)
        );
      });
      totalRecords = filtered.length;
    } else if (type === "treatment") {
      totalRecords = state.treatments.length;
    } else if (type === "billing") {
      totalRecords = state.billingHistory.length;
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
export function changePage(type, page) {
  if (type === "patient") {
    const filtered = state.patients.filter((patient) => {
      if (!state.currentFilter) return true;
      return (
        patient.name.toLowerCase().includes(state.currentFilter) ||
        patient.id.toLowerCase().includes(state.currentFilter)
      );
    });
    const totalPages = Math.ceil(filtered.length / recordsPerPage);
    if (page < 1 || page > totalPages) return;
    state.currentPatientPage = page;
    renderPatients();
  } else if (type === "treatment") {
    const totalPages = Math.ceil(state.treatments.length / treatmentRecordsPerPage);
    if (page < 1 || page > totalPages) return;
    state.currentTreatmentPage = page;
    renderTreatments();
  } else if (type === "billing") {
    const totalPages = Math.ceil(state.billingHistory.length / billingRecordsPerPage);
    if (page < 1 || page > totalPages) return;
    state.currentBillingPage = page;
    renderBilling();
  } else if (type === "followup") {
    const filteredItems = getFilteredFollowUpItems(state.currentFollowUpFilter);
    const totalPages = Math.ceil(filteredItems.length / followUpRecordsPerPage);
    if (page < 1 || page > totalPages) return;
    state.currentFollowUpPage = page;
    updateFollowUpPanel();
  } else if (type === "treatmentMaster") {
    const filteredItems = getFilteredTreatmentMasters();
    const totalPages = Math.ceil(filteredItems.length / treatmentMasterRecordsPerPage);
    if (page < 1 || page > totalPages) return;
    state.currentTreatmentMasterPage = page;
    renderTreatmentMasterTable();
  }
};

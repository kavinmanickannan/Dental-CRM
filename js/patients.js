// Patient CRUD handlers, rendering/search/filter, the optimized patient
// lookup map, and the patient detail panel (incl. consent section wiring).
import { escapeHtml, formatCost } from './utils.js';
import { state, recordsPerPage, detailPlaceholder } from './state.js';
import { STORAGE_KEYS, saveData } from './db.js';
import { elements, showToast, renderPagination } from './ui.js';
import { setupConsentSections } from './consent.js';
import { renderTreatments } from './treatments.js';
import { renderBilling, updateBillingSummary, updatePaymentAmount } from './billing.js';
import { updateDashboardStats, updateFollowUpPanel } from './dashboard.js';

export function handleGlobalSearchInput(event) {
  state.currentFilter = event.target.value.trim().toLowerCase();
  renderPatients();

  if (!state.currentFilter) {
    hidePatientDetail();
    return;
  }

  const exactMatch = state.patients.find(
    (patient) => patient.id.toLowerCase() === state.currentFilter
  );

  if (exactMatch) {
    viewPatient(exactMatch.id);
  }
}

export function openFirstMatchedPatient() {
  if (!state.currentFilter) return;
  const matchById = state.patients.find(
    (patient) => patient.id.toLowerCase() === state.currentFilter
  );
  const matchByName = state.patients.find((patient) =>
    patient.name.toLowerCase().includes(state.currentFilter)
  );
  const candidate = matchById || matchByName;
  if (candidate) {
    viewPatient(candidate.id);
  }
}

export function handlePatientSubmit(event) {
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

  if (state.editingPatientId) {
    const index = state.patients.findIndex((p) => p.id === state.editingPatientId);
    // Preserve createdAt when updating
    const existingCreatedAt = state.patients[index].createdAt;
    state.patients[index] = { ...state.patients[index], name, contact, dob, sex, address, notes, age };
    // Restore createdAt if it existed
    if (existingCreatedAt) {
      state.patients[index].createdAt = existingCreatedAt;
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
    state.patients.push(newPatient);
    showToast("Patient added.");
  }

  saveData(STORAGE_KEYS.patients, state.patients);
  // Invalidate cache when data changes
  state.dashboardStatsCache = null;
  state.patientLookupMap = null; // Rebuild on next use
  resetPatientForm();
  state.currentPatientPage = 1; // Reset to first page when adding new patient
  renderPatients();
  populatePatientSelects();
  updateFollowUpPanel();
}

export function generatePatientId() {
  const counter =
    Number(localStorage.getItem(STORAGE_KEYS.patientCounter) || "0") + 1;
  localStorage.setItem(STORAGE_KEYS.patientCounter, counter);
  return `PAT-${counter.toString().padStart(4, "0")}`;
}

export function calculateAge(dobStr) {
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
export function buildPatientLookupMap() {
  state.patientLookupMap = new Map();
  state.patients.forEach(patient => {
    state.patientLookupMap.set(patient.id, patient);
  });
}

// Get patient by ID with optimized lookup
export function getPatientById(patientId) {
  if (!state.patientLookupMap) {
    buildPatientLookupMap();
  }
  return state.patientLookupMap.get(patientId);
}

export function getPatientName(patientId) {
  return state.patients.find((p) => p.id === patientId)?.name || "Unknown";
}

export function renderPatients() {
  if (!state.patients.length) {
    elements.patientTableBody.innerHTML = `
      <tr><td colspan="8" class="empty-state">No patients yet.</td></tr>
    `;
    elements.patientStats.textContent = "";
    if (elements.patientPagination) elements.patientPagination.innerHTML = "";
    return;
  }

  const filtered = state.patients.filter((patient) => {
    if (!state.currentFilter) return true;
    return (
      patient.name.toLowerCase().includes(state.currentFilter) ||
      patient.id.toLowerCase().includes(state.currentFilter)
    );
  });

  elements.patientStats.textContent = `${filtered.length} of ${state.patients.length} patients`;

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
  const startIndex = (state.currentPatientPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedPatients = sortedPatients.slice(startIndex, endIndex);

  elements.patientTableBody.innerHTML = paginatedPatients.length
    ? paginatedPatients
    .map(
      (patient) => `
        <tr>
          <td>${escapeHtml(patient.id)}</td>
          <td>
            <button class="link-button" data-action="view-patient" data-id="${escapeHtml(patient.id)}">
              ${escapeHtml(patient.name)}
            </button>
          </td>
          <td>${escapeHtml(patient.contact)}</td>
          <td>${escapeHtml(patient.dob)}</td>
          <td>${escapeHtml(patient.age)}</td>
          <td>${patient.sex ? escapeHtml(patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1)) : '-'}</td>
          <td>${escapeHtml(patient.address)}</td>
          <td class="actions">
            <button data-action="edit-patient" data-id="${escapeHtml(patient.id)}">Edit</button>
            <button class="danger" data-action="delete-patient" data-id="${escapeHtml(patient.id)}">Delete</button>
          </td>
        </tr>
      `
    )
        .join("")
    : `<tr><td colspan="8" class="empty-state">No patients found.</td></tr>`;

  // Render pagination
  if (elements.patientPagination) {
    renderPagination(elements.patientPagination, state.currentPatientPage, totalPages, "patient");
  }
}

export function editPatient(patientId) {
  const patient = state.patients.find((p) => p.id === patientId);
  if (!patient) return;
  state.editingPatientId = patientId;
  document.getElementById("patientName").value = patient.name;
  document.getElementById("patientContact").value = patient.contact;
  document.getElementById("patientDOB").value = patient.dob;
  document.getElementById("patientSex").value = patient.sex || "";
  document.getElementById("patientAddress").value = patient.address;
  document.getElementById("patientNotes").value = patient.notes || "";
  showToast(`Editing ${patient.name}`);
};

export function deletePatient(patientId) {
  if (
    !confirm(
      "Delete this patient and all related treatments, billing, and rewards?"
    )
  ) {
    return;
  }
  const index = state.patients.findIndex((p) => p.id === patientId);
  if (index < 0) return;

  state.patients.splice(index, 1);

  for (let i = state.treatments.length - 1; i >= 0; i -= 1) {
    if (state.treatments[i].patientId === patientId) {
      state.treatments.splice(i, 1);
    }
  }

  for (let i = state.billingHistory.length - 1; i >= 0; i -= 1) {
    if (state.billingHistory[i].patientId === patientId) {
      state.billingHistory.splice(i, 1);
    }
  }

  delete state.rewardPoints[patientId];

  saveData(STORAGE_KEYS.patients, state.patients);
  saveData(STORAGE_KEYS.treatments, state.treatments);
  saveData(STORAGE_KEYS.billing, state.billingHistory);
  saveData(STORAGE_KEYS.rewards, state.rewardPoints);

  renderPatients();
  renderTreatments();
  renderBilling();
  populatePatientSelects();
  updateBillingSummary();
  updateDashboardStats();
  if (state.currentDetailPatientId === patientId) {
    hidePatientDetail();
  }
  showToast("Patient and related records removed.");
};

export function viewPatient(patientId) {
  const patient = state.patients.find((p) => p.id === patientId);
  if (!patient) {
    elements.patientDetailContent.classList.add("empty-state");
    elements.patientDetailContent.textContent = "Patient not found.";
    elements.patientDetailPanel.classList.remove("hidden");
    return;
  }
  state.currentDetailPatientId = patientId;

  const patientTreatments = state.treatments.filter((t) => t.patientId === patientId);
  const treatmentMarkup = patientTreatments.length
    ? `<div class="treatment-detail-list">
        ${patientTreatments
          .map(
            (treatment) => `
              <div class="treatment-detail-item">
                <h4>${escapeHtml(treatment.description)} • ${formatCost(treatment.cost)}</h4>
                <div class="detail-meta">
                  <span>Date: ${escapeHtml(treatment.date)}</span>
                  <span>Dentist: ${escapeHtml(treatment.dentist)}</span>
                  <span>Status: ${escapeHtml(treatment.status)}</span>
                  <span>Next: ${escapeHtml(treatment.nextVisit || "N/A")}</span>
                </div>
                <div class="consent-section" data-consent-section data-treatment-id="${escapeHtml(treatment.id)}">
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
  const notesDisplay = patient.notes
    ? `<div class="notes-section"><h3>Patient History</h3><p>${escapeHtml(patient.notes)}</p></div>`
    : "";

  elements.patientDetailContent.innerHTML = `
    <div class="detail-grid">
      <div><span>Patient ID</span><strong>${escapeHtml(patient.id)}</strong></div>
      <div><span>Name</span><strong>${escapeHtml(patient.name)}</strong></div>
      <div><span>Age</span><strong>${escapeHtml(patient.age)}</strong></div>
      <div><span>Sex</span><strong>${escapeHtml(sexDisplay)}</strong></div>
      <div><span>Contact</span><strong>${escapeHtml(patient.contact)}</strong></div>
      <div><span>DOB</span><strong>${escapeHtml(patient.dob)}</strong></div>
      <div><span>Address</span><strong>${escapeHtml(patient.address)}</strong></div>
    </div>
    ${notesDisplay}
    <div class="treatment-history-section">
      <h3>Treatment History</h3>
      ${treatmentMarkup}
    </div>
  `;

  setupConsentSections(patientTreatments, patientId);
  elements.patientDetailPanel.classList.remove("hidden");
}

export function hidePatientDetail() {
  state.currentDetailPatientId = null;
  elements.patientDetailPanel.classList.add("hidden");
  elements.patientDetailContent.classList.add("empty-state");
  elements.patientDetailContent.textContent = detailPlaceholder;
}

export function resetPatientForm() {
  state.editingPatientId = null;
  elements.patientForm.reset();
}

export function populatePatientSelects() {
  // No longer needed for dropdowns, but keep for compatibility
  updateBillingSummary();
}

// Patient search function
export function handlePatientSearch(event, formType) {
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
      state.originalPaymentAmount = null; // Reset when search is cleared
      updateBillingSummary();
      updatePaymentAmount();
    }
    return;
  }

  // Filter patients by name or ID
  const matches = state.patients.filter((patient) => {
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
        state.originalPaymentAmount = null; // Reset when patient is selected
  updateBillingSummary();
        updatePaymentAmount();
      }
    });
  });
}

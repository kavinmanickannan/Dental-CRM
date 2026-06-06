// Treatment records and the treatment-master catalog: handlers, rendering,
// search/sort, modal management, and seeding of default treatment masters.
import { escapeHtml, formatCost, formatINR, normalizeCategory } from './utils.js';
import {
  state,
  treatmentRecordsPerPage,
  treatmentMasterRecordsPerPage,
  DEFAULT_TREATMENT_SEED,
} from './state.js';
import { STORAGE_KEYS, saveData } from './db.js';
import { elements, showToast, renderPagination } from './ui.js';
import { getPatientName } from './patients.js';
import { updateBillingSummary } from './billing.js';
import { updateDashboardStats } from './dashboard.js';

export async function ensureTreatmentMasterSeed() {
  if (!Array.isArray(state.treatmentMasters)) {
    state.treatmentMasters = [];
  }
  const existingNames = new Set(
    state.treatmentMasters.map((item) => normalizeTreatmentName(item.treatment_name))
  );
  let added = false;
  DEFAULT_TREATMENT_SEED.forEach((item) => {
    const normalized = normalizeTreatmentName(item.treatment_name);
    if (!existingNames.has(normalized)) {
      state.treatmentMasters.push({
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
    await saveData(STORAGE_KEYS.treatmentMaster, state.treatmentMasters);
  }
}

export function prefillTreatmentDate() {
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

export function updateNextVisitRequirement(statusValue) {
  const status = statusValue || (elements.treatmentStatus ? elements.treatmentStatus.value : "");
  const requiresNextVisit = status === "In Progress";
  if (elements.treatmentNextVisit) {
    elements.treatmentNextVisit.required = requiresNextVisit;
  }
  if (elements.nextVisitRequired) {
    elements.nextVisitRequired.classList.toggle("hidden", !requiresNextVisit);
  }
}

export function getActiveTreatmentMasters() {
  return (state.treatmentMasters || []).filter((item) => item.is_active);
}

export function getAllTreatmentMasters() {
  return Array.isArray(state.treatmentMasters) ? state.treatmentMasters : [];
}

export function normalizeTreatmentName(name) {
  return String(name || "").trim().toLowerCase();
}

export function refreshTreatmentMasterOptions() {
  const activeMasters = getActiveTreatmentMasters();
  if (elements.treatmentMasterOptions) {
    const filtered = state.currentTreatmentCategory
      ? activeMasters.filter((item) => normalizeCategory(item.category) === normalizeCategory(state.currentTreatmentCategory))
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

export function openTreatmentMasterModal() {
  if (!elements.treatmentMasterModal) return;
  elements.treatmentMasterModal.classList.remove("hidden");
  state.currentTreatmentMasterPage = 1;
  renderTreatmentMasterTable();
}

export function closeTreatmentMasterModal() {
  if (!elements.treatmentMasterModal) return;
  elements.treatmentMasterModal.classList.add("hidden");
}

export function resetTreatmentMasterForm() {
  state.editingTreatmentMasterId = null;
  if (elements.treatmentMasterForm) elements.treatmentMasterForm.reset();
  if (elements.treatmentMasterSubmit) elements.treatmentMasterSubmit.textContent = "Save";
  state.currentTreatmentMasterPage = 1;
}

export function getFilteredTreatmentMasters() {
  const search = normalizeTreatmentName(state.treatmentMasterSearch);
  return getAllTreatmentMasters().filter((item) => {
    const matchesSearch = !search || normalizeTreatmentName(item.treatment_name).includes(search);
    return matchesSearch;
  });
}

export function renderTreatmentMasterTable() {
  if (!elements.treatmentMasterTableBody) return;
  refreshTreatmentMasterOptions();

  const filtered = getFilteredTreatmentMasters()
    .sort((a, b) => {
      const categoryCompare = normalizeCategory(a.category).localeCompare(normalizeCategory(b.category));
      if (categoryCompare !== 0) return categoryCompare;
      return a.treatment_name.localeCompare(b.treatment_name);
    });
  const totalPages = Math.ceil(filtered.length / treatmentMasterRecordsPerPage);
  if (state.currentTreatmentMasterPage > totalPages && totalPages > 0) {
    state.currentTreatmentMasterPage = 1;
  }
  if (!filtered.length) {
    elements.treatmentMasterTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">No active treatments found.</td>
      </tr>
    `;
    return;
  }

  const startIndex = (state.currentTreatmentMasterPage - 1) * treatmentMasterRecordsPerPage;
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
            <input type="checkbox" ${item.is_active ? "checked" : ""} data-action="toggle-treatment-master" data-id="${escapeHtml(item.id)}" />
            <span class="status-slider"></span>
            <span class="status-text">${item.is_active ? "Active" : "Inactive"}</span>
          </label>
        </td>
        <td class="actions">
          <button data-action="edit-treatment-master" data-id="${escapeHtml(item.id)}">Edit</button>
        </td>
      </tr>
    `)
    .join("");

  if (elements.treatmentMasterPagination) {
    renderPagination(
      elements.treatmentMasterPagination,
      state.currentTreatmentMasterPage,
      totalPages,
      "treatmentMaster",
      treatmentMasterRecordsPerPage,
      filtered.length
    );
  }
}

export function applyTreatmentMasterDefaults(inputValue) {
  const name = normalizeTreatmentName(inputValue);
  if (!name) return;
  const match = getActiveTreatmentMasters().find((item) => {
    const matchesName = normalizeTreatmentName(item.treatment_name) === name;
    const matchesCategory = !state.currentTreatmentCategory || item.category === state.currentTreatmentCategory;
    return matchesName && matchesCategory;
  });
  if (!match || !elements.treatmentCost) return;

  if (elements.treatmentCategory && match.category) {
    elements.treatmentCategory.value = match.category;
    state.currentTreatmentCategory = match.category;
    refreshTreatmentMasterOptions();
  }

  const shouldAutoFill = !elements.treatmentCost.value || elements.treatmentCost.dataset.auto === "true";
  if (shouldAutoFill) {
    elements.treatmentCost.value = Number(match.default_price || 0).toFixed(2);
    elements.treatmentCost.dataset.auto = "true";
  }
}

export function handleTreatmentSubmit(event) {
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

  const existingTreatment = state.editingTreatmentId
    ? state.treatments.find((t) => t.id === state.editingTreatmentId)
    : null;

  const payload = {
    id: state.editingTreatmentId || crypto.randomUUID(),
    patientId,
    description,
    date,
    cost,
    dentist,
    status,
    nextVisit,
    consent_file_path: existingTreatment?.consent_file_path || "",
    createdAt: state.editingTreatmentId ? undefined : new Date().toISOString(), // Add timestamp for new treatments
  };

  if (state.editingTreatmentId) {
    const index = state.treatments.findIndex((t) => t.id === state.editingTreatmentId);
    state.treatments[index] = payload;
    showToast("Treatment updated.");
  } else {
    state.treatments.push(payload);
    showToast("Treatment added.");
  }

  saveData(STORAGE_KEYS.treatments, state.treatments);
  // Invalidate cache when data changes
  state.dashboardStatsCache = null;
  renderTreatments();
  resetTreatmentForm();
  updateBillingSummary();
  prefillTreatmentDate();
  updateNextVisitRequirement();
  updateDashboardStats();
}

export function handleTreatmentMasterSubmit(event) {
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
  const duplicate = state.treatmentMasters.find((item) => {
    return normalizeTreatmentName(item.treatment_name) === normalizedName &&
      item.id !== state.editingTreatmentMasterId;
  });
  if (duplicate) {
    return showToast("Treatment name already exists.");
  }

  if (state.editingTreatmentMasterId) {
    const index = state.treatmentMasters.findIndex((item) => item.id === state.editingTreatmentMasterId);
    if (index >= 0) {
      state.treatmentMasters[index] = {
        ...state.treatmentMasters[index],
        category,
        treatment_name: name,
        default_price: Number(price.toFixed(2))
      };
      showToast("Treatment updated.");
    }
  } else {
    state.treatmentMasters.push({
      id: crypto.randomUUID(),
      category,
      treatment_name: name,
      default_price: Number(price.toFixed(2)),
      is_active: true,
      createdAt: new Date().toISOString()
    });
    showToast("Treatment added.");
  }

  saveData(STORAGE_KEYS.treatmentMaster, state.treatmentMasters);
  resetTreatmentMasterForm();
  renderTreatmentMasterTable();
  refreshTreatmentMasterOptions();
}

export function editTreatmentMaster(id) {
  const target = state.treatmentMasters.find((item) => item.id === id);
  if (!target) return;
  state.editingTreatmentMasterId = id;
  if (elements.treatmentMasterCategory) elements.treatmentMasterCategory.value = target.category || "";
  if (elements.treatmentMasterName) elements.treatmentMasterName.value = target.treatment_name || "";
  if (elements.treatmentMasterPrice) elements.treatmentMasterPrice.value = Number(target.default_price || 0).toFixed(2);
  if (elements.treatmentMasterSubmit) elements.treatmentMasterSubmit.textContent = "Save Changes";
  if (elements.treatmentMasterCategory) elements.treatmentMasterCategory.focus();
};

export function deleteTreatmentMaster(id) {
  const target = state.treatmentMasters.find((item) => item.id === id);
  if (!target) return;
  if (!confirm(`Hide ${target.treatment_name}? It will no longer appear in treatment selection.`)) {
    return;
  }
  target.is_active = false;
  saveData(STORAGE_KEYS.treatmentMaster, state.treatmentMasters);
  if (state.editingTreatmentMasterId === id) {
    resetTreatmentMasterForm();
  }
  renderTreatmentMasterTable();
  refreshTreatmentMasterOptions();
  showToast("Treatment removed from active list.");
};

export function toggleTreatmentMasterStatus(id, isActive) {
  const target = state.treatmentMasters.find((item) => item.id === id);
  if (!target) return;
  target.is_active = Boolean(isActive);
  saveData(STORAGE_KEYS.treatmentMaster, state.treatmentMasters);
  renderTreatmentMasterTable();
  refreshTreatmentMasterOptions();
  showToast(`${target.treatment_name} marked as ${target.is_active ? "Active" : "Inactive"}.`);
};

export function renderTreatments() {
  if (!state.treatments.length) {
    elements.treatmentTableBody.innerHTML = `
      <tr><td colspan="7" class="empty-state">No treatments recorded yet.</td></tr>
    `;
    elements.treatmentStats.textContent = "";
    if (elements.treatmentPagination) elements.treatmentPagination.innerHTML = "";
    return;
  }

  // Sort by date based on current sort state
  const sortedTreatments = [...state.treatments].sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    if (dateB.getTime() !== dateA.getTime()) {
      // Sort by date: recent first (descending) or oldest first (ascending)
      return state.treatmentDateSort === 'recent' ? dateB - dateA : dateA - dateB;
    }
    // If dates are same, sort by ID
    return state.treatmentDateSort === 'recent'
      ? b.id.localeCompare(a.id)
      : a.id.localeCompare(b.id);
  });

  // Update sort icon
  updateTreatmentSortIcon();

  // Pagination
  const totalPages = Math.ceil(sortedTreatments.length / treatmentRecordsPerPage);
  const startIndex = (state.currentTreatmentPage - 1) * treatmentRecordsPerPage;
  const endIndex = startIndex + treatmentRecordsPerPage;
  const paginatedTreatments = sortedTreatments.slice(startIndex, endIndex);

  elements.treatmentTableBody.innerHTML = paginatedTreatments
    .map((treatment) => {
      const patientName = getPatientName(treatment.patientId);
      return `
        <tr>
          <td>${escapeHtml(patientName)}</td>
          <td>${escapeHtml(treatment.description)}</td>
          <td>${escapeHtml(treatment.date)}</td>
          <td>${formatCost(treatment.cost)}</td>
          <td>${escapeHtml(treatment.dentist)}</td>
          <td>${escapeHtml(treatment.status)}</td>
          <td class="actions">
            <button data-action="edit-treatment" data-id="${escapeHtml(treatment.id)}">Edit</button>
            <button class="danger" data-action="delete-treatment" data-id="${escapeHtml(treatment.id)}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");

  elements.treatmentStats.textContent = `${state.treatments.length} treatments`;

  // Render pagination
  if (elements.treatmentPagination) {
    renderPagination(elements.treatmentPagination, state.currentTreatmentPage, totalPages, "treatment", treatmentRecordsPerPage);
  }
}

// Toggle treatment date sort between recent and oldest
export function toggleTreatmentDateSort() {
  state.treatmentDateSort = state.treatmentDateSort === 'recent' ? 'oldest' : 'recent';
  state.currentTreatmentPage = 1; // Reset to first page when sorting changes
  renderTreatments();
};

// Update sort icon to reflect current sort state
export function updateTreatmentSortIcon() {
  const sortIcon = document.getElementById('treatmentDateSortIcon');
  if (sortIcon) {
    sortIcon.textContent = state.treatmentDateSort === 'recent' ? '↓' : '↑';
    sortIcon.title = state.treatmentDateSort === 'recent'
      ? 'Sorted: Recent first (click to sort oldest first)'
      : 'Sorted: Oldest first (click to sort recent first)';
  }
}

export function editTreatment(treatmentId) {
  const treatment = state.treatments.find((t) => t.id === treatmentId);
  if (!treatment) return;
  state.editingTreatmentId = treatmentId;
  const patient = state.patients.find((p) => p.id === treatment.patientId);
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
      state.currentTreatmentCategory = matchingMaster.category;
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

export function deleteTreatment(treatmentId) {
  if (!confirm("Delete this treatment?")) return;
  const index = state.treatments.findIndex((t) => t.id === treatmentId);
  if (index >= 0) {
    state.treatments.splice(index, 1);
    saveData(STORAGE_KEYS.treatments, state.treatments);
    renderTreatments();
    updateBillingSummary();
    updateDashboardStats();
    showToast("Treatment removed.");
  }
};

export function resetTreatmentForm() {
  state.editingTreatmentId = null;
  elements.treatmentForm.reset();
  if (elements.treatmentCost) {
    delete elements.treatmentCost.dataset.auto;
  }
  state.currentTreatmentCategory = "";
  refreshTreatmentMasterOptions();
  updateNextVisitRequirement();
}

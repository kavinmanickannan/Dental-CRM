// Dashboard analytics: stats cards, dentist performance, treatment status
// breakdown, status/dentist detail panels, and the follow-up appointment panel.
import { escapeHtml, formatCost, formatINR } from './utils.js';
import { state, DASHBOARD_WINDOWS, MS_PER_DAY, followUpRecordsPerPage } from './state.js';
import { elements, showToast, renderPagination } from './ui.js';
import { getPatientById, buildPatientLookupMap } from './patients.js';

export function updateTreatmentStatus(start, end) {
  if (!elements.treatmentStatusContainer) return;

  // Count treatments by status
  const statusCounts = {
    "Scheduled": 0,
    "In Progress": 0,
    "Completed": 0,
    "Cancelled": 0
  };

  state.treatments.forEach((treatment) => {
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
        <div class="status-card" data-action="show-status" data-status="${escapeHtml(status)}" style="border-left-color: ${color}">
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

export function parseDateInput(dateStr) {
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

export function buildFollowUpItems() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return state.treatments.reduce((items, treatment) => {
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

export function getFilteredFollowUpItems(filter = "all") {
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

export function updateFollowUpPanel() {
  if (!elements.followUpList) return;

  const allItems = buildFollowUpItems();
  const overdueCount = allItems.filter(item => item.status === "overdue").length;
  const upcomingCount = allItems.filter(item => item.status === "upcoming" || item.status === "today").length;

  if (elements.followUpSummary) {
    elements.followUpSummary.textContent = `All ${allItems.length} • Overdue ${overdueCount} • Upcoming ${upcomingCount}`;
  }

  const filter = state.currentFollowUpFilter || "all";
  const filteredItems = getFilteredFollowUpItems(filter);
  const totalPages = Math.ceil(filteredItems.length / followUpRecordsPerPage);
  if (state.currentFollowUpPage > totalPages && totalPages > 0) {
    state.currentFollowUpPage = 1;
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

  const startIndex = (state.currentFollowUpPage - 1) * followUpRecordsPerPage;
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
      state.currentFollowUpPage,
      totalPages,
      "followup",
      followUpRecordsPerPage,
      filteredItems.length
    );
  }
}

export function showPatientsByStatus(status) {
  if (!elements.statusPatientsPanel || !elements.statusPatientsContent || !elements.statusPanelTitle) return;

  // Track the currently open status
  state.currentOpenStatus = status;

  // Get all treatments with this status
  const { start, end } = getRangeWindow(state.currentDashboardRange);
  const filteredTreatments = state.treatments.filter((treatment) => {
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
  if (!state.patientLookupMap || state.patientLookupMap.size !== state.patients.length) {
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
              <strong>${escapeHtml(patient.name)}</strong>
              <span class="patient-id">${escapeHtml(patient.id)}</span>
            </div>
            <div class="patient-contact-section">
              <a href="${escapeHtml(phoneLink)}" class="phone-link" ${phoneNumber === "N/A" ? 'onclick="return false;"' : ''}>
                ${escapeHtml(phoneNumber)}
              </a>
            </div>
          </div>
          <div class="patient-treatments-info">
            <div class="treatment-count">${patientTreatments.length} ${patientTreatments.length === 1 ? 'treatment' : 'treatments'}</div>
            <div class="treatment-details">
              ${patientTreatments.map(t => `
                <div class="treatment-item">
                  <span>${escapeHtml(t.description)}</span>
                  <span class="treatment-date">${escapeHtml(t.date)}</span>
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

export function copyPhoneNumber(phoneNumber) {
  if (!phoneNumber || phoneNumber === "N/A") return;

  navigator.clipboard.writeText(phoneNumber).then(() => {
    showToast(`Phone number copied: ${phoneNumber}`);
  }).catch(() => {
    showToast("Failed to copy phone number");
  });
}

export function showDentistDetails(dentistName) {
  if (!elements.dentistDetailsPanel || !elements.dentistDetailsContent || !elements.dentistDetailsTitle) return;

  // Track the currently open dentist
  state.currentOpenDentist = dentistName;

  // Get date range
  const { start, end } = getRangeWindow(state.currentDashboardRange);

  // Build patient lookup map if needed
  if (!state.patientLookupMap || state.patientLookupMap.size !== state.patients.length) {
    buildPatientLookupMap();
  }

  // Get all treatments by this dentist (case-insensitive)
  const filteredTreatments = state.treatments.filter((treatment) => {
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
              <strong>${escapeHtml(patient.name)}${newPatientBadge}</strong>
              <span class="patient-id">${escapeHtml(patient.id)}</span>
            </div>
            <div class="patient-contact-section">
              <a href="${escapeHtml(phoneLink)}" class="phone-link" ${phoneNumber === "N/A" ? 'onclick="return false;"' : ''}>
                ${escapeHtml(phoneNumber)}
              </a>
            </div>
          </div>
          <div class="patient-treatments-info">
            <div class="treatment-count">${patientTreatments.length} ${patientTreatments.length === 1 ? 'treatment' : 'treatments'}</div>
            <div class="treatment-details">
              ${patientTreatments.map(t => `
                <div class="treatment-item">
                  <span>${escapeHtml(t.description || 'N/A')}</span>
                  <span class="treatment-date">${escapeHtml(t.date)}</span>
                  <span style="margin-left: 0.5rem; color: var(--primary);">${formatCost(t.cost)}</span>
                  ${t.status ? `<span style="margin-left: 0.5rem; padding: 0.2rem 0.5rem; background: ${t.status === 'Completed' ? 'var(--accent)' : t.status === 'Cancelled' ? 'var(--danger)' : 'var(--primary)'}; color: white; border-radius: 4px; font-size: 0.75rem;">${escapeHtml(t.status)}</span>` : ''}
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

export function hideStatusPatientsPanel() {
  if (elements.statusPatientsPanel) {
    elements.statusPatientsPanel.classList.add("hidden");
    state.currentOpenStatus = null; // Clear the tracked status when panel is closed
  }
}

export function hideDentistDetailsPanel() {
  if (elements.dentistDetailsPanel) {
    elements.dentistDetailsPanel.classList.add("hidden");
    state.currentOpenDentist = null; // Clear the tracked dentist when panel is closed
  }
}

export function updateDashboardStats() {
  if (
    !elements.dashboardRange ||
    !elements.statPatients ||
    !elements.statPayments ||
    !elements.statTopTreatment
  ) {
    return;
  }
  const range = elements.dashboardRange.value || state.currentDashboardRange;

  // Check cache - only recalculate if range changed or data changed
  if (state.dashboardStatsCache && state.dashboardStatsCache.range === range &&
      state.dashboardStatsCache.patientsLength === state.patients.length &&
      state.dashboardStatsCache.treatmentsLength === state.treatments.length &&
      state.dashboardStatsCache.billingLength === state.billingHistory.length) {
    // Use cached results
    elements.statPatients.textContent = state.dashboardStatsCache.patientsCount;
    elements.statPayments.textContent = state.dashboardStatsCache.totalPayments;
    elements.statTopTreatment.textContent = state.dashboardStatsCache.topTreatment;
    if (elements.statCash) elements.statCash.textContent = state.dashboardStatsCache.paymentsByMethod.cash;
    if (elements.statCard) elements.statCard.textContent = state.dashboardStatsCache.paymentsByMethod.card;
    if (elements.statUPI) elements.statUPI.textContent = state.dashboardStatsCache.paymentsByMethod.upi;
    if (elements.statOther) elements.statOther.textContent = state.dashboardStatsCache.paymentsByMethod.other;
    updateDentistStats(state.dashboardStatsCache.dentistStats);
    updateTreatmentStatus(state.dashboardStatsCache.start, state.dashboardStatsCache.end);
    return;
  }

  state.currentDashboardRange = range;
  const { start, end } = getRangeWindow(range);

  let totalPayments = 0;
  const treatmentCounts = {};
  const dentistStats = {};

  // Build patient lookup map once for O(1) lookups
  if (!state.patientLookupMap || state.patientLookupMap.size !== state.patients.length) {
    buildPatientLookupMap();
  }

  // Count patients created/saved within the selected time period
  let patientsCount = 0;
  state.patients.forEach((patient) => {
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

  state.billingHistory.forEach((entry) => {
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

  state.treatments.forEach((treatment) => {
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
  state.dashboardStatsCache = {
    range: range,
    patientsLength: state.patients.length,
    treatmentsLength: state.treatments.length,
    billingLength: state.billingHistory.length,
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

export function updateDentistStats(dentistStats) {
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
        <div class="dentist-stat-card" data-action="show-dentist" data-dentist="${escapeHtml(displayName)}" style="cursor: pointer;">
          <div class="dentist-name">Dr. ${escapeHtml(displayName)}</div>
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

export function getRangeWindow(range) {
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

export function isDateWithinRange(dateStr, start, end) {
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

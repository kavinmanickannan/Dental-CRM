// Billing handlers, outstanding-balance math, reward-points redemption/award,
// and the billing history table renderer.
import { escapeHtml, formatINR, calculateEarnedPoints, calculateRedeemFromPoints } from './utils.js';
import { state, billingRecordsPerPage } from './state.js';
import { STORAGE_KEYS, saveData, loadData } from './db.js';
import { elements, showToast, renderPagination } from './ui.js';
import { getPatientById } from './patients.js';
import { updateDashboardStats } from './dashboard.js';

export function handleBillingSearchInput(event) {
  state.currentBillingFilter = event.target.value.trim();
  state.currentBillingPage = 1; // Reset to first page when search changes
  renderBilling();
}

export function handleBillingSubmit(event) {
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
    const points = Number(state.rewardPoints[patientId] || 0);
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

  const availablePoints = state.rewardPoints[patientId] || 0;
  const outstandingAfterCash = Math.max(outstandingBefore - amount, 0);
  const { pointsToRedeem, rupeesToApply } = calculateRedeemFromPoints(
    availablePoints,
    outstandingAfterCash
  );
  const pointsRedeemed = redeem ? pointsToRedeem : 0;
  const rewardValueApplied = redeem ? rupeesToApply : 0;
  const earnedPoints = calculateEarnedPoints(amount);

  state.rewardPoints[patientId] = Math.max(
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

  state.billingHistory.push(entry);
  state.latestInvoiceEntryId = entry.id;
  if (elements.generateInvoiceBtn) {
    elements.generateInvoiceBtn.classList.remove("hidden");
  }

  saveData(STORAGE_KEYS.billing, state.billingHistory);
  saveData(STORAGE_KEYS.rewards, state.rewardPoints);

  // Invalidate cache when data changes
  state.dashboardStatsCache = null;

  // Reload reward points to reflect changes
  loadData(STORAGE_KEYS.rewards).then(data => {
    Object.assign(state.rewardPoints, data || {});
  });
  renderBilling();

  // Store current patient ID before reset
  const currentPatientId = patientId;

  // Reset form first
  state.originalPaymentAmount = null; // Reset original payment amount
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

export function calculateOutstanding(patientId) {
  const totalTreatments = state.treatments
    .filter((t) => t.patientId === patientId)
    .reduce((sum, t) => sum + Number(t.cost || 0), 0);
  const payments = state.billingHistory
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

export function updateBillingSummary() {
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
  const points = Number(state.rewardPoints[patientId] || 0);
  const { rupeesToApply } = calculateRedeemFromPoints(points, outstanding);
  const redeemValue = rupeesToApply;
  elements.billingTotal.textContent = formatINR(outstanding);
  elements.billingPoints.textContent = `${points} pts`;
  elements.billingRewardValue.textContent = formatINR(redeemValue);
  const canRedeem = rupeesToApply > 0;
  elements.redeemCheckbox.disabled = !canRedeem;
  if (!canRedeem) {
    elements.redeemCheckbox.checked = false;
  }
}

export function updatePaymentAmount() {
  const patientId = elements.billingPatientId ? elements.billingPatientId.value : elements.billingPatient.value;
  if (!patientId || !elements.billingPayment || !elements.paymentType) {
    return;
  }
  const outstanding = calculateOutstanding(patientId);
  const paymentType = elements.paymentType.value;
  const redeem = elements.redeemCheckbox.checked;

  if (paymentType === "full") {
    const points = Number(state.rewardPoints[patientId] || 0);
    const { rupeesToApply } = calculateRedeemFromPoints(points, outstanding);
    const redeemValue = redeem ? rupeesToApply : 0;
    const paymentAmount = Math.round(Math.max(0, outstanding - redeemValue));
    elements.billingPayment.value = paymentAmount > 0 ? paymentAmount : "0";
    state.originalPaymentAmount = null; // Reset for full payment
  } else if (paymentType === "partial") {
    // Store original amount if not already stored and user has entered a value
    const currentValue = elements.billingPayment.value;
    if (currentValue && currentValue !== "0") {
      if (state.originalPaymentAmount === null && !redeem) {
        state.originalPaymentAmount = parseInt(currentValue) || 0;
      }
    } else {
      state.originalPaymentAmount = null;
    }
  }
}

export function handleManualRewardPointsAdd() {
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
  const current = Number(state.rewardPoints[patientId] || 0);
  const newTotal = current + Math.floor(value);
  state.rewardPoints[patientId] = newTotal;
  saveData(STORAGE_KEYS.rewards, state.rewardPoints);
  elements.manualRewardPointsInput.value = "";
  updateBillingSummary();
  showToast("Reward points added.");
}

export async function updatePaymentAmountOnRedeemChange() {
  const patientId = elements.billingPatientId ? elements.billingPatientId.value : elements.billingPatient.value;
  if (!patientId || !elements.billingPayment || !elements.paymentType) {
    return;
  }

  const outstanding = calculateOutstanding(patientId);
  const paymentType = elements.paymentType.value;
  const redeem = elements.redeemCheckbox.checked;

  // Get reward points from storage (always get latest) - properly await
  const updatedRewardPoints = await loadData(STORAGE_KEYS.rewards) || {};
  Object.assign(state.rewardPoints, updatedRewardPoints); // Sync global object
  const points = Number(updatedRewardPoints[patientId] !== undefined ? updatedRewardPoints[patientId] : (state.rewardPoints[patientId] || 0));
  const { rupeesToApply } = calculateRedeemFromPoints(points, outstanding);
  const redeemValue = rupeesToApply;

  if (paymentType === "full") {
    // For full payment, always calculate from outstanding
    const paymentAmount = Math.round(Math.max(0, outstanding - (redeem ? redeemValue : 0)));
    elements.billingPayment.value = paymentAmount > 0 ? paymentAmount : "0";
    state.originalPaymentAmount = null; // Not needed for full payment
  } else if (paymentType === "partial") {
    // For partial payment, adjust based on current value
    const currentPayment = parseInt(elements.billingPayment.value) || 0;

    if (redeem) {
      // When checking: subtract redeemable value from current payment
      if (state.originalPaymentAmount === null || state.originalPaymentAmount === 0) {
        // Store original if not stored - use current payment or outstanding as base
        state.originalPaymentAmount = currentPayment > 0 ? currentPayment : Math.round(outstanding);
      }
      const adjustedAmount = Math.round(Math.max(0, state.originalPaymentAmount - redeemValue));
      elements.billingPayment.value = adjustedAmount > 0 ? adjustedAmount : "0";
    } else {
      // When unchecking: restore original payment amount
      if (state.originalPaymentAmount !== null && state.originalPaymentAmount > 0) {
        elements.billingPayment.value = state.originalPaymentAmount;
      } else if (currentPayment > 0) {
        // If no original stored, add back the redeem value to current payment
        const restoredAmount = Math.round(currentPayment + redeemValue);
        elements.billingPayment.value = restoredAmount > 0 ? restoredAmount : "";
      }
    }
  }
}

export function renderBilling() {
  if (!state.billingHistory.length) {
    elements.billingTableBody.innerHTML = `
      <tr><td colspan="7" class="empty-state">No billing history yet.</td></tr>
    `;
    if (elements.billingPagination) elements.billingPagination.innerHTML = "";
    if (elements.billingStats) elements.billingStats.textContent = "";
    return;
  }

  // Filter by patient name or ID if search is active
  let filteredBilling = state.billingHistory;
  if (state.currentBillingFilter) {
    const filterLower = state.currentBillingFilter.toLowerCase();
    filteredBilling = state.billingHistory.filter((entry) => {
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
    elements.billingStats.textContent = state.currentBillingFilter
      ? `${sortedBilling.length} of ${state.billingHistory.length} records`
      : `${sortedBilling.length} records`;
  }

  const totalPages = Math.ceil(sortedBilling.length / billingRecordsPerPage);
  // Reset to page 1 if current page exceeds total pages
  if (state.currentBillingPage > totalPages && totalPages > 0) {
    state.currentBillingPage = 1;
  }
  const startIndex = (state.currentBillingPage - 1) * billingRecordsPerPage;
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
          <td>${escapeHtml(entry.date)}</td>
          <td>${escapeHtml(patientName)}</td>
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
    renderPagination(elements.billingPagination, state.currentBillingPage, totalPages, "billing", billingRecordsPerPage);
  }
}

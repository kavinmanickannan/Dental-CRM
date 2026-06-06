// Database configuration - must match app.js
const DB_NAME = "DentalClinicDB";
const DB_VERSION = 2;
const STORAGE_KEYS = {
  patients: "dental_patients",
  treatments: "dental_treatments",
  billing: "dental_billing",
  rewards: "dental_reward_points",
};

let db = null;
let patients = [];
let treatments = [];
let billingHistory = [];
let rewardPoints = {};
let currentTimeframe = 'allTime';

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
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(['data'], 'readonly');
        const store = transaction.objectStore('data');
        const request = store.get(key);
        
        request.onerror = () => {
          try {
            const localData = localStorage.getItem(key);
            resolve(localData ? JSON.parse(localData) : []);
          } catch {
            resolve([]);
          }
        };
        
        request.onsuccess = () => {
          const result = request.result;
          if (result === undefined) {
            try {
              const localData = localStorage.getItem(key);
              resolve(localData ? JSON.parse(localData) : []);
            } catch {
              resolve([]);
            }
          } else {
            resolve(result);
          }
        };
      } catch (error) {
        console.error('Transaction error:', error);
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
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(['data'], 'readwrite');
        const store = transaction.objectStore('data');
        const request = store.put(value, key);
        
        request.onerror = () => {
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch (e) {
            console.error('localStorage fallback failed:', e);
          }
          resolve();
        };
        
        request.onsuccess = () => resolve();
      } catch (error) {
        console.error('Transaction error:', error);
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
          console.error('localStorage fallback failed:', e);
        }
        resolve();
      }
    });
  } catch (error) {
    console.error('Error saving data:', error);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('localStorage fallback failed:', e);
    }
  }
}

// Load all data
async function loadAllData() {
  try {
    await initDB();
    patients = await loadData(STORAGE_KEYS.patients);
    treatments = await loadData(STORAGE_KEYS.treatments);
    billingHistory = await loadData(STORAGE_KEYS.billing);
    rewardPoints = await loadData(STORAGE_KEYS.rewards) || {};
    return true;
  } catch (error) {
    console.error('Error loading all data:', error);
    showToast('Error loading data');
    return false;
  }
}

// Get date range based on timeframe
function getRangeWindow(timeframe) {
  const end = new Date();
  const start = new Date();
  end.setHours(23, 59, 59, 999);
  
  if (timeframe === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (timeframe === 'last7Days') {
    start.setHours(0, 0, 0, 0);
    start.setDate(end.getDate() - 6);
  } else if (timeframe === 'last30Days') {
    start.setHours(0, 0, 0, 0);
    start.setDate(end.getDate() - 29);
  } else {
    // All time - set start to a very old date
    start.setFullYear(2000, 0, 1);
    start.setHours(0, 0, 0, 0);
  }
  
  return { start, end };
}

// Check if date is within range
function isDateWithinRange(dateStr, start, end) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const dateTime = date.getTime();
  const startTime = start.getTime();
  const endTime = end.getTime();
  return dateTime >= startTime && dateTime <= endTime;
}

// Update statistics display
function updateStatistics() {
  const { start, end } = getRangeWindow(currentTimeframe);
  
  // Filter data based on timeframe
  let filteredPatients = patients;
  let filteredTreatments = treatments;
  let filteredBilling = billingHistory;
  
  if (currentTimeframe !== 'allTime') {
    // Filter patients by createdAt date
    filteredPatients = patients.filter((patient) => {
      if (!patient.createdAt) return false;
      return isDateWithinRange(patient.createdAt, start, end);
    });
    
    // Filter treatments by date
    filteredTreatments = treatments.filter((treatment) => {
      return isDateWithinRange(treatment.date, start, end);
    });
    
    // Filter billing by date
    filteredBilling = billingHistory.filter((entry) => {
      return isDateWithinRange(entry.date, start, end);
    });
  }
  
  // Update counts
  document.getElementById('statPatientsCount').textContent = filteredPatients.length;
  document.getElementById('statTreatmentsCount').textContent = filteredTreatments.length;
  document.getElementById('statBillingCount').textContent = filteredBilling.length;
  
  // Calculate total revenue from billing records (using 'amount' field, not 'amountPaid')
  const totalRevenue = filteredBilling.reduce((sum, record) => {
    return sum + Number(record.amount || 0);
  }, 0);
  document.getElementById('statTotalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;
}

// Refresh statistics
async function refreshStatistics() {
  const loaded = await loadAllData();
  if (loaded) {
    updateStatistics();
    showToast('Statistics refreshed');
  }
}

// Export all data
async function exportData() {
  try {
    const loaded = await loadAllData();
    if (!loaded) {
      showToast('Failed to load data for export');
      return;
    }

    const exportData = {
      patients,
      treatments,
      billingHistory,
      rewardPoints,
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0',
        clinicName: 'Dental Clinic',
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

    showSuccessMessage('Data exported successfully!');
    showToast('Data exported successfully!');
  } catch (error) {
    console.error('Export failed:', error);
    showToast('Failed to export data');
  }
}

// Import data
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

    // Show preview
    showImportPreview(importData);

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

    // Update statistics
    updateStatistics();

    showSuccessMessage(`Successfully imported ${recordCount} records!`);
    showToast(`Successfully imported ${recordCount} records!`);
    
    // Hide preview
    document.getElementById('importPreview').style.display = 'none';
  } catch (error) {
    console.error('Import failed:', error);
    showToast('Failed to import data. Check file format.');
  }
}

// Show import preview
function showImportPreview(importData) {
  const previewDiv = document.getElementById('importPreview');
  const previewContent = document.getElementById('importPreviewContent');
  
  previewContent.innerHTML = `
    <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
      <li>Patients: ${importData.patients?.length || 0}</li>
      <li>Treatments: ${importData.treatments?.length || 0}</li>
      <li>Billing Records: ${importData.billingHistory?.length || 0}</li>
      ${importData.metadata?.exportDate ? `<li>Export Date: ${new Date(importData.metadata.exportDate).toLocaleString()}</li>` : ''}
    </ul>
  `;
  
  previewDiv.style.display = 'block';
}

// Clear all data
async function clearAllData() {
  const confirmed = confirm(
    '⚠️ WARNING: This will permanently delete ALL data including:\n\n' +
    '- All patients\n' +
    '- All treatments\n' +
    '- All billing records\n' +
    '- All reward points\n\n' +
    'This action CANNOT be undone!\n\n' +
    'Are you absolutely sure you want to proceed?'
  );

  if (!confirmed) {
    showToast('Operation cancelled');
    return;
  }

  // Double confirmation
  const doubleConfirmed = confirm(
    'FINAL CONFIRMATION:\n\n' +
    'You are about to permanently delete ALL data.\n\n' +
    'If you have not exported a backup, your data will be lost forever.\n\n' +
    'Type "DELETE" (without quotes) and confirm if you really want to proceed.'
  );

  if (!doubleConfirmed) {
    showToast('Operation cancelled');
    return;
  }

  try {
    // Clear all data
    patients = [];
    treatments = [];
    billingHistory = [];
    rewardPoints = {};

    // Save empty arrays to IndexedDB
    await saveData(STORAGE_KEYS.patients, patients);
    await saveData(STORAGE_KEYS.treatments, treatments);
    await saveData(STORAGE_KEYS.billing, billingHistory);
    await saveData(STORAGE_KEYS.rewards, rewardPoints);

    // Update statistics
    updateStatistics();

    showSuccessMessage('All data has been cleared successfully.');
    showToast('All data cleared');
  } catch (error) {
    console.error('Clear data failed:', error);
    showToast('Failed to clear data');
  }
}

// Validate data integrity
async function validateData() {
  try {
    const loaded = await loadAllData();
    if (!loaded) {
      showToast('Failed to load data for validation');
      return;
    }

    const issues = [];
    const warnings = [];

    // Validate patients
    patients.forEach((patient, index) => {
      if (!patient.id) issues.push(`Patient at index ${index} has no ID`);
      if (!patient.name) issues.push(`Patient ${patient.id || index} has no name`);
      if (!patient.contact) warnings.push(`Patient ${patient.id || index} (${patient.name}) has no contact`);
    });

    // Validate treatments
    treatments.forEach((treatment, index) => {
      if (!treatment.id) issues.push(`Treatment at index ${index} has no ID`);
      if (!treatment.patientId) issues.push(`Treatment ${treatment.id || index} has no patient ID`);
      if (!patients.find(p => p.id === treatment.patientId)) {
        warnings.push(`Treatment ${treatment.id || index} references non-existent patient ${treatment.patientId}`);
      }
    });

    // Validate billing history
    billingHistory.forEach((billing, index) => {
      if (!billing.id) issues.push(`Billing record at index ${index} has no ID`);
      if (!billing.patientId) issues.push(`Billing record ${billing.id || index} has no patient ID`);
      if (!patients.find(p => p.id === billing.patientId)) {
        warnings.push(`Billing record ${billing.id || index} references non-existent patient ${billing.patientId}`);
      }
    });

    // Check for duplicate patient IDs
    const patientIds = patients.map(p => p.id);
    const duplicatePatientIds = patientIds.filter((id, index) => patientIds.indexOf(id) !== index);
    if (duplicatePatientIds.length > 0) {
      issues.push(`Duplicate patient IDs found: ${[...new Set(duplicatePatientIds)].join(', ')}`);
    }

    // Display results
    const resultsDiv = document.getElementById('validationResults');
    const resultsContent = document.getElementById('validationResultsContent');
    
    if (issues.length === 0 && warnings.length === 0) {
      resultsContent.innerHTML = `
        <div class="success-message show" style="background: rgba(20, 184, 166, 0.1); border-color: var(--accent);">
          ✓ Data validation passed! No issues found.
        </div>
      `;
    } else {
      let html = '';
      if (issues.length > 0) {
        html += `
          <div class="warning-box">
            <strong>Critical Issues (${issues.length}):</strong>
            <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
              ${issues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      if (warnings.length > 0) {
        html += `
          <div class="info-box">
            <strong>Warnings (${warnings.length}):</strong>
            <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
              ${warnings.map(warning => `<li>${warning}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      resultsContent.innerHTML = html;
    }
    
    resultsDiv.style.display = 'block';
    showToast(`Validation complete: ${issues.length} issues, ${warnings.length} warnings`);
  } catch (error) {
    console.error('Validation failed:', error);
    showToast('Failed to validate data');
  }
}

// Show success message
function showSuccessMessage(message) {
  const successDiv = document.getElementById('successMessage');
  successDiv.textContent = message;
  successDiv.classList.add('show');
  setTimeout(() => {
    successDiv.classList.remove('show');
  }, 5000);
}

// Toast notification
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Initialize page
async function initializePage() {
  try {
    await loadAllData();
    updateStatistics();
    
    // Set up file input handler
    const fileInput = document.getElementById('importFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          importAllData(e.target.files[0]);
        }
      });
    }
    
    // Set up timeframe filter
    const timeframeFilter = document.getElementById('timeframeFilter');
    if (timeframeFilter) {
      timeframeFilter.addEventListener('change', (e) => {
        currentTimeframe = e.target.value;
        updateStatistics();
      });
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('Error initializing page');
  }
}

// Initialize when page loads
initializePage();


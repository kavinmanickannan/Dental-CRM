// Auto-backup (File System Access API), manual backup download, and
// full data export/import.
//
// Note: db.js and backup.js import from each other (saveData triggers
// performAutoBackup; importAllData calls saveData) -- this is a valid ES
// module circular import because both references are only used inside
// function bodies, not at module-evaluation time.
import { state, CLINIC_NAME } from './state.js';
import { STORAGE_KEYS, saveData } from './db.js';
import { elements, showToast } from './ui.js';
import { renderPatients, populatePatientSelects } from './patients.js';
import { renderTreatments } from './treatments.js';
import { renderBilling, updateBillingSummary } from './billing.js';
import { updateDashboardStats } from './dashboard.js';

// ===================== AUTO-BACKUP FUNCTIONS =====================

// Setup auto-backup by selecting directory
export async function setupAutoBackup() {
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
    state.backupDirectoryHandle = dirHandle;
    state.autoBackupEnabled = true;

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
export async function performAutoBackup() {
  if (!state.autoBackupEnabled || !state.backupDirectoryHandle) {
    return;
  }

  // Throttle backups - only backup once every 5 seconds
  const now = Date.now();
  if (state.lastBackupTime && (now - state.lastBackupTime) < 5000) {
    return;
  }

  try {
    // Verify we still have permission
    const permission = await state.backupDirectoryHandle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      const newPermission = await state.backupDirectoryHandle.requestPermission({ mode: 'readwrite' });
      if (newPermission !== 'granted') {
        state.autoBackupEnabled = false;
        updateBackupStatus('Permission denied', false);
        return;
      }
    }

    // Create backup data
    const backupData = {
      patients: state.patients,
      treatments: state.treatments,
      billingHistory: state.billingHistory,
      rewardPoints: state.rewardPoints,
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
    const fileHandle = await state.backupDirectoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(backupData, null, 2));
    await writable.close();

    state.lastBackupTime = now;
    updateBackupStatus(`Last backup: ${new Date().toLocaleTimeString()}`, true);

  } catch (error) {
    console.error('Auto-backup failed:', error);
    if (error.name === 'NotAllowedError') {
      state.autoBackupEnabled = false;
      updateBackupStatus('Permission lost - click Setup to re-enable', false);
    }
  }
}

// Perform manual backup (download)
export async function performManualBackup() {
  try {
    const backupData = {
      patients: state.patients,
      treatments: state.treatments,
      billingHistory: state.billingHistory,
      rewardPoints: state.rewardPoints,
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
export function loadBackupSettings() {
  try {
    const enabled = localStorage.getItem('autoBackupEnabled');
    const dirName = localStorage.getItem('backupDirName');

    if (enabled === 'true' && dirName) {
      // Note: We can't restore the directory handle automatically
      // User needs to setup again after browser restart
      updateBackupStatus('Click "Setup Auto-Backup" to enable', false);
      state.autoBackupEnabled = false;
    } else {
      updateBackupStatus('Not configured', false);
    }
  } catch (e) {
    console.error('Error loading backup settings:', e);
  }
}

// Update backup status display
export function updateBackupStatus(message, isActive) {
  if (elements.backupStatus) {
    elements.backupStatus.textContent = message;
    elements.backupStatus.className = isActive ? 'backup-status active' : 'backup-status';
  }
}

// ===================== EXPORT/IMPORT FUNCTIONS =====================

// Export all data to JSON file
export function exportAllData() {
  try {
    const exportData = {
      patients: state.patients,
      treatments: state.treatments,
      billingHistory: state.billingHistory,
      rewardPoints: state.rewardPoints,
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0',
        clinicName: CLINIC_NAME,
        recordCounts: {
          patients: state.patients.length,
          treatments: state.treatments.length,
          billingRecords: state.billingHistory.length
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
export async function importAllData(file) {
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
    state.patients = importData.patients || [];
    state.treatments = importData.treatments || [];
    state.billingHistory = importData.billingHistory || [];
    state.rewardPoints = importData.rewardPoints || {};

    // Save to IndexedDB
    await saveData(STORAGE_KEYS.patients, state.patients);
    await saveData(STORAGE_KEYS.treatments, state.treatments);
    await saveData(STORAGE_KEYS.billing, state.billingHistory);
    await saveData(STORAGE_KEYS.rewards, state.rewardPoints);

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

// IndexedDB lifecycle: open the database, load/save the app's persisted
// collections (mirrored to localStorage for resilience).
//
// Note: db.js and backup.js import from each other (saveData triggers
// performAutoBackup; importAllData calls saveData) -- this is a valid ES
// module circular import because both references are only used inside
// function bodies, not at module-evaluation time.
import { state } from './state.js';
import { performAutoBackup } from './backup.js';

export const STORAGE_KEYS = {
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
export const DB_NAME = "DentalClinicDB";
export const DB_VERSION = 2;
let db = null;

// Initialize IndexedDB
export function initDB() {
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
export async function loadData(key) {
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
export async function saveData(key, value) {
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
          if (state.autoBackupEnabled) {
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

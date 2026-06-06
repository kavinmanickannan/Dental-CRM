// Consent file upload/storage via the File System Access API: validation,
// directory-handle management, save/resolve/refresh, and the per-treatment
// consent UI wiring shown in the patient detail panel.
import { state, CONSENT_MAX_SIZE, CONSENT_ALLOWED_TYPES, CONSENT_ALLOWED_EXTENSIONS } from './state.js';
import { STORAGE_KEYS, saveData } from './db.js';
import { elements, showToast } from './ui.js';

export function sanitizeConsentId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function getConsentExtension(file) {
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

export function validateConsentFile(file) {
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

export function parseConsentPath(path) {
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

export async function ensureConsentDirectoryHandle(mode = "readwrite") {
  if (!("showDirectoryPicker" in window)) {
    alert("Your browser does not support local file storage. Use a modern browser like Chrome or Edge.");
    return null;
  }
  if (!state.consentDirectoryHandle) {
    try {
      state.consentDirectoryHandle = await window.showDirectoryPicker({
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
  const permission = await state.consentDirectoryHandle.queryPermission({ mode });
  if (permission !== "granted") {
    const newPermission = await state.consentDirectoryHandle.requestPermission({ mode });
    if (newPermission !== "granted") {
      showToast("Consent folder permission denied.");
      return null;
    }
  }
  return state.consentDirectoryHandle;
}

// Helper for saving consent files
export async function saveConsentFile({ patientId, treatmentId, file }) {
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

export async function resolveConsentFileHandle(consentPath, mode = "read") {
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

export async function refreshConsentSection(treatment, section, requestAccess = false) {
  const statusEl = section.querySelector("[data-consent-status]");
  const viewBtn = section.querySelector("[data-consent-view]");
  if (!statusEl || !viewBtn) return;

  if (!treatment.consent_file_path) {
    statusEl.textContent = "No consent uploaded";
    viewBtn.disabled = true;
    return;
  }

  if (requestAccess && !state.consentDirectoryHandle) {
    await ensureConsentDirectoryHandle("read");
  }

  if (!state.consentDirectoryHandle) {
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

export function setupConsentSections(patientTreatments, patientId) {
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
          saveData(STORAGE_KEYS.treatments, state.treatments);
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

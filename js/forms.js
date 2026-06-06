// Forms Library: catalog rendering, custom form-type management, file
// upload/storage, and print-to-window for stored form templates.
import { escapeHtml, formatFileSize, slugifyFormName } from './utils.js';
import { state, FORM_LIBRARY } from './state.js';
import { STORAGE_KEYS, saveData } from './db.js';
import { elements, showToast } from './ui.js';

export function getFormMeta(formId) {
  return getCombinedFormsCatalog().find((form) => form.id === formId);
}
export const getCombinedFormsCatalog = () => {
  const customForms = Array.isArray(state.formsCatalog) ? state.formsCatalog : [];
  return [...FORM_LIBRARY, ...customForms];
};

export function renderFormsLibrary() {
  if (!elements.formsList) return;
  const catalog = getCombinedFormsCatalog();
  elements.formsList.innerHTML = catalog.map((form) => {
    const stored = state.formsLibrary[form.id];
    const hasFile = Boolean(stored && stored.dataUrl);
    const statusLabel = hasFile ? "Ready" : "Missing";
    const statusClass = hasFile ? "ready" : "";
    const fileName = stored?.fileName ? escapeHtml(stored.fileName) : "No file uploaded";
    const fileSize = stored?.size ? formatFileSize(stored.size) : "";
    const uploadedAt = stored?.uploadedAt
      ? new Date(stored.uploadedAt).toLocaleDateString()
      : "—";

    return `
      <div class="form-library-item" data-form-id="${form.id}">
        <div class="form-library-info">
          <h3>${form.name}</h3>
          <p>${form.description}</p>
          <div class="form-library-meta">
            <span class="form-status ${statusClass}">${statusLabel}</span>
            <span>${fileName}${fileSize ? ` • ${fileSize}` : ""}</span>
            <span>Last updated: ${uploadedAt}</span>
          </div>
        </div>
        <div class="form-library-actions">
          <input
            type="file"
            class="form-upload-input"
            id="formUpload-${form.id}"
            data-form-id="${form.id}"
            accept="application/pdf,image/*"
          />
          ${form.isCustom ? `
            <button type="button" class="danger pill" data-action="remove" data-form-id="${form.id}">
              Remove
            </button>
          ` : ""}
          <button type="button" class="secondary pill" data-action="upload" data-form-id="${form.id}">
            Upload
          </button>
          <button type="button" class="primary pill" data-action="print" data-form-id="${form.id}" ${hasFile ? "" : "disabled"}>
            Print
          </button>
        </div>
      </div>
    `;
  }).join("");
}

export function openAddFormTypeModal() {
  if (!elements.addFormTypeModal) return;
  elements.addFormTypeModal.classList.remove("hidden");
  if (elements.formTypeName) {
    elements.formTypeName.focus();
  }
}

export function closeAddFormTypeModal() {
  if (!elements.addFormTypeModal) return;
  elements.addFormTypeModal.classList.add("hidden");
  if (elements.addFormTypeForm) {
    elements.addFormTypeForm.reset();
  }
}

export function handleAddFormTypeSubmit(event) {
  event.preventDefault();
  const name = elements.formTypeName?.value.trim();
  if (!name) {
    showToast("Please enter a form name.");
    return;
  }
  const description = elements.formTypeDescription?.value.trim() || "Custom form template.";
  const slugBase = slugifyFormName(name);
  const id = `${slugBase || "custom-form"}-${Date.now()}`;

  state.formsCatalog = Array.isArray(state.formsCatalog) ? state.formsCatalog : [];
  state.formsCatalog.push({ id, name, description, isCustom: true });
  saveData(STORAGE_KEYS.formsCatalog, state.formsCatalog);
  renderFormsLibrary();
  closeAddFormTypeModal();
  showToast(`${name} added to Forms Library.`);
}

export function removeCustomForm(formId) {
  if (!Array.isArray(state.formsCatalog)) return;
  const formMeta = state.formsCatalog.find((form) => form.id === formId);
  if (!formMeta) return;
  const confirmed = confirm(`Remove "${formMeta.name}" from the Forms Library?`);
  if (!confirmed) return;

  state.formsCatalog = state.formsCatalog.filter((form) => form.id !== formId);
  delete state.formsLibrary[formId];
  saveData(STORAGE_KEYS.formsCatalog, state.formsCatalog);
  saveData(STORAGE_KEYS.forms, state.formsLibrary);
  renderFormsLibrary();
  showToast(`${formMeta.name} removed.`);
}

export function handleFormsActionClick(event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  const formId = actionButton.dataset.formId;
  if (!formId) return;

  if (action === "remove") {
    removeCustomForm(formId);
    return;
  }

  if (action === "upload") {
    const input = document.getElementById(`formUpload-${formId}`);
    if (input) input.click();
    return;
  }

  if (action === "print") {
    printStoredForm(formId);
  }
}

export function handleFormsFileChange(event) {
  const input = event.target;
  if (!input.classList.contains("form-upload-input")) return;
  const formId = input.dataset.formId;
  const file = input.files && input.files[0];
  if (!formId || !file) return;

  const reader = new FileReader();
  reader.onload = () => {
    state.formsLibrary[formId] = {
      fileName: file.name,
      type: file.type || "application/octet-stream",
      dataUrl: reader.result,
      uploadedAt: new Date().toISOString(),
      size: file.size
    };
    saveData(STORAGE_KEYS.forms, state.formsLibrary);
    renderFormsLibrary();
    const formMeta = getFormMeta(formId);
    showToast(`${formMeta ? formMeta.name : "Form"} uploaded.`);
  };
  reader.onerror = () => {
    showToast("Failed to read the selected file.");
  };
  reader.readAsDataURL(file);
  input.value = "";
}

export function printStoredForm(formId) {
  const stored = state.formsLibrary[formId];
  if (!stored || !stored.dataUrl) {
    showToast("Please upload a file before printing.");
    return;
  }

  const isPdf = stored.type === "application/pdf";
  const isImage = stored.type && stored.type.startsWith("image/");
  const formMeta = getFormMeta(formId);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Popup blocked. Please allow popups to print.");
    return;
  }

  const safeTitle = escapeHtml(formMeta?.name || "Form");
  const fileName = escapeHtml(stored.fileName || "document");
  const bodyContent = isPdf
    ? `<iframe src="${stored.dataUrl}" style="width:100%; height:100%; border:none;"></iframe>`
    : isImage
      ? `<img src="${stored.dataUrl}" style="max-width:100%; height:auto; display:block; margin:0 auto;" />`
      : `<div style="padding:24px; font-family:Arial, sans-serif;">
           <h2>${safeTitle}</h2>
           <p>This file type cannot be printed inline. Download to view or print.</p>
           <a href="${stored.dataUrl}" download="${fileName}">Download ${fileName}</a>
         </div>`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${safeTitle}</title>
        <style>
          html, body { margin: 0; padding: 0; height: 100%; }
          body { background: #fff; }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `);
  printWindow.document.close();
}

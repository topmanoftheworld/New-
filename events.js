// Centralized user event handlers and actions
import { AppState, getInitialState, saveState } from './state.js';
import { render, refreshDocumentPages } from './dom.js';
import { NotesTemplates } from './config.js';
import { debounce, printDocument } from './utils.js';
import { paginateLetterheadContent, paginateNotesContent, paginatePaymentAdvice } from './pagination.js';

// Document actions
function generateDocumentNumber() {
  if (AppState.mode === 'letterhead') { AppState.document.number = ''; return; }
  AppState.document.number = AppState.mode === 'quote'
    ? `TC-${AppState.global.counters.quote}`
    : `INV-${AppState.global.counters.invoice}`;
}

function setMode(mode, isInitial = false) {
  AppState.mode = mode;
  if (!isInitial) { generateDocumentNumber(); render(); }
}

function newDocument() {
  if (!confirm('Start a new document? Unsaved changes will be lost.')) return;
  const globalData = JSON.parse(JSON.stringify(AppState.global));
  AppState = getInitialState();
  AppState.global = globalData;
  generateDocumentNumber();
  // Re-run initial UI setup
  render();
}

function saveDocument() {
  const docId = AppState.id || Date.now().toString();
  const existingIdx = AppState.global.savedDocuments.findIndex(d => d.id === docId);
  const snapshot = JSON.parse(JSON.stringify(AppState));
  delete snapshot.global; snapshot.id = docId;
  if (existingIdx === -1) {
    snapshot.meta = { createdAt: new Date().toISOString() };
    if (AppState.mode === 'quote') AppState.global.counters.quote++;
    else if (AppState.mode === 'invoice') AppState.global.counters.invoice++;
    AppState.global.savedDocuments.push(snapshot);
    AppState.id = docId;
  } else {
    AppState.global.savedDocuments[existingIdx] = snapshot;
  }
  saveState();
  render();
  alert(`Document ${snapshot.document.number} saved successfully!`);
}

function loadDocument(id) {
  const doc = AppState.global.savedDocuments.find(d => d.id === id);
  if (doc) {
    const loaded = JSON.parse(JSON.stringify(doc));
    Object.keys(loaded).forEach(k => { if (k !== 'global') AppState[k] = loaded[k]; });
    render();
    alert(`Loaded document ${doc.document.number}.`);
  }
}

function deleteDocument(id) {
  if (!confirm('Delete this saved document?')) return;
  AppState.global.savedDocuments = AppState.global.savedDocuments.filter(d => d.id !== id);
  saveState();
  render();
}

// Line items
function addLineItem(shouldRender = true) {
  AppState.lineItems.push({ description: '', quantity: 1, unitPrice: 0 });
  if (shouldRender) render();
}

function removeLineItem(index) { AppState.lineItems.splice(index, 1); render(); }

function updateLineItem(index, key, value) {
  if (!AppState.lineItems[index]) return;
  if (key === 'quantity' || key === 'unitPrice') {
    let v = parseFloat(value);
    if (isNaN(v) || v < 0) {
      v = 0;
    }
    AppState.lineItems[index][key] = v;
  } else {
    AppState.lineItems[index][key] = value;
  }
  render();
}

// Branch management
function updateSelectedBranch(index) { AppState.selectedBranchIndex = parseInt(index); render(); }

function toggleBranchModal(show) {
  const modal = document.getElementById('branch-modal');
  if (show) { renderModalBranchList(); clearBranchForm(); modal.classList.remove('hidden'); }
  else { modal.classList.add('hidden'); }
}

function renderModalBranchList() {
  const list = document.getElementById('modal-branch-list');
  list.innerHTML = '';
  AppState.branches.forEach(branch => {
    const item = document.createElement('div');
    item.className = 'flex justify-between items-center bg-white p-3 rounded border';
    item.innerHTML = `
      <p class="font-medium">${branch.name}</p>
      <div class="flex space-x-2">
        <button class="text-xs bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Edit</button>
        <button class="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200">Delete</button>`;
    const [editBtn, delBtn] = item.querySelectorAll('button');
    editBtn.addEventListener('click', () => editBranch(branch.id));
    delBtn.addEventListener('click', () => deleteBranch(branch.id));
    list.appendChild(item);
  });
}

function handleBranchFormSubmit(e) {
  e.preventDefault();
  const branchId = document.getElementById('branch-id').value;
  const data = {
    id: branchId ? parseInt(branchId) : Date.now(),
    name: document.getElementById('branch-name').value,
    address: document.getElementById('branch-address').value,
    email: document.getElementById('branch-email').value,
    phone: document.getElementById('branch-phone').value,
    website: document.getElementById('branch-website').value,
    gst: document.getElementById('branch-gst').value,
    logo: document.getElementById('branch-logo').value,
  };
  if (branchId) {
    const idx = AppState.branches.findIndex(b => b.id == branchId);
    if (idx > -1) AppState.branches[idx] = data;
  } else {
    AppState.branches.push(data);
  }
  clearBranchForm();
  renderModalBranchList();
  render();
}

function editBranch(id) {
  const b = AppState.branches.find(x => x.id == id);
  if (!b) return;
  document.getElementById('branch-form-title').innerText = 'Edit Branch';
  document.getElementById('branch-id').value = b.id;
  document.getElementById('branch-name').value = b.name;
  document.getElementById('branch-address').value = b.address;
  document.getElementById('branch-email').value = b.email;
  document.getElementById('branch-phone').value = b.phone;
  document.getElementById('branch-website').value = b.website;
  document.getElementById('branch-gst').value = b.gst;
  document.getElementById('branch-logo').value = b.logo;
}

function deleteBranch(id) {
  if (AppState.branches.length <= 1) { alert('You must have at least one branch.'); return; }
  if (!confirm('Delete this branch?')) return;
  AppState.branches = AppState.branches.filter(b => b.id != id);
  if (AppState.selectedBranchIndex >= AppState.branches.length) AppState.selectedBranchIndex = 0;
  renderModalBranchList();
  render();
}

function clearBranchForm() {
  document.getElementById('branch-form-title').innerText = 'Add New Branch';
  document.getElementById('branch-form').reset();
  document.getElementById('branch-id').value = '';
}

// RTE helpers
function bindRteToolbar(toolbarId) {
  const toolbar = document.getElementById(toolbarId);
  if (!toolbar) return;
  toolbar.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.rte-btn');
    if (!btn) return;
    const cmd = btn.getAttribute('data-cmd');
    const value = btn.getAttribute('data-value');
    const targetId = btn.getAttribute('data-target');
    const editor = targetId ? document.getElementById(targetId) : null;
    if (editor) { editor.focus(); }
    const isClear = btn.getAttribute('data-action') === 'clear' || cmd === 'clear';
    if (isClear && editor) {
      editor.innerHTML = '';
      if (targetId === 'notes-editor') {
        AppState.notes = '';
      } else if (targetId === 'letterhead-editor') {
        AppState.letterhead.content = '';
      }
      render();
      return;
    }
    try { document.execCommand(cmd, false, value || null); }
    catch (e) { console.warn('execCommand failed', e); }
  });
}

export function addEventListeners() {
  const on = (id, event, handler) => { const el = document.getElementById(id); if (el) el.addEventListener(event, handler); };
  const bindStateInput = (id, setter, event = 'input', transform = v => v) => {
    on(id, event, e => { setter(transform(e.target.value), e); render(); });
  };

  bindStateInput('client-name', v => { AppState.clientInfo.name = v; });
  bindStateInput('client-address', v => { AppState.clientInfo.address = v; });
  bindStateInput('client-email', v => { AppState.clientInfo.email = v; });
  bindStateInput('client-phone', v => { AppState.clientInfo.phone = v; });
  bindStateInput('doc-date', v => { AppState.document.date = v; }, 'change');
  bindStateInput('due-date', v => { AppState.document.dueDate = v; }, 'change');
  bindStateInput('gst-rate', v => {
    let n = parseFloat(v);
    if (isNaN(n) || n < 0) {
      n = 0;
    }
    AppState.totals.gstRate = n;
  });
  bindStateInput('discount-value', v => {
    const raw = String(v).trim();
    if (raw === '') { AppState.totals.discount = null; return; }
    const numeric = parseFloat(raw.replace(/[^0-9.\-]/g, ''));
    AppState.totals.discount = isNaN(numeric) || numeric <= 0 ? null : numeric;
  });

  // Debounced editors: now paginates directly for performance
  const notesEditor = document.getElementById('notes-editor');
  if (notesEditor) {
    const debouncedUpdate = debounce(() => {
      AppState.notes = notesEditor.innerHTML;
      const notesPreview = document.querySelector('[data-role="notes-render"]');
      if(notesPreview) notesPreview.innerHTML = AppState.notes;
    }, 200);
    notesEditor.addEventListener('input', debouncedUpdate);
    notesEditor.addEventListener('blur', () => render());
  }
  const advEd = document.getElementById('advice-editor');
  if (advEd) {
    const debouncedUpdate = debounce(() => {
      AppState.paymentAdvice.content = advEd.innerHTML;
      const advicePreview = document.getElementById('preview-advice-content');
      if(advicePreview) advicePreview.innerHTML = AppState.paymentAdvice.content;
    }, 200);
    advEd.addEventListener('input', debouncedUpdate);
    advEd.addEventListener('blur', () => render());
  }

  const lhContent = document.getElementById('letterhead-editor');
  if (lhContent) {
    const debouncedUpdate = debounce(() => {
      AppState.letterhead.content = lhContent.innerHTML;
      const letterheadPreview = document.getElementById('preview-letterhead-content');
      if(letterheadPreview) letterheadPreview.innerHTML = AppState.letterhead.content;
    }, 200);
    lhContent.addEventListener('input', debouncedUpdate);
    lhContent.addEventListener('blur', () => render());
  }
  bindRteToolbar('notes-toolbar');
  bindRteToolbar('letterhead-toolbar');
  bindRteToolbar('advice-toolbar');

  const notesTpl = document.getElementById('notes-template');
  if (notesTpl) notesTpl.addEventListener('change', e => {
    const key = e.target.value;
    if (!key) return;
    const html = (NotesTemplates[key] || '').trim();
    AppState.notes = html;
    const ed = document.getElementById('notes-editor');
    if (ed) ed.innerHTML = html;
    render();
  });

  bindStateInput('accept-name', v => { AppState.acceptance.name = v; });
  bindStateInput('accept-signature', v => { AppState.acceptance.signature = v; });

  // Bridge DOM custom events
  window.addEventListener('dom:updateLineItem', (e) => {
    const { index, key, value } = e.detail || {};
    updateLineItem(index, key, value);
  });
  window.addEventListener('dom:removeLineItem', (e) => {
    const { index } = e.detail || {};
    removeLineItem(index);
  });
  window.addEventListener('dom:loadDocument', (e) => {
    const { id } = e.detail || {};
    loadDocument(id);
  });
  window.addEventListener('dom:deleteDocument', (e) => {
    const { id } = e.detail || {};
    deleteDocument(id);
  });
  window.addEventListener('dom:updateSelectedBranch', (e) => {
    const { index } = e.detail || {};
    updateSelectedBranch(index);
  });

  // Wire up buttons that previously relied on global handlers
  const modeBindings = [
    { id: 'quote-mode-btn', mode: 'quote' },
    { id: 'invoice-mode-btn', mode: 'invoice' },
    { id: 'letterhead-mode-btn', mode: 'letterhead' },
  ];
  modeBindings.forEach(({ id, mode }) => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => setMode(mode)); });

  const addItemBtn = document.getElementById('add-item-btn');
  if (addItemBtn) addItemBtn.addEventListener('click', () => addLineItem());

  const printBtn = document.getElementById('print-btn');
  if (printBtn) printBtn.addEventListener('click', (e) => { e.preventDefault(); printDocument(); });

  const saveBtn = document.getElementById('save-doc-btn');
  if (saveBtn) saveBtn.addEventListener('click', (e) => { e.preventDefault(); saveDocument(); });

  const newBtn = document.getElementById('new-doc-btn');
  if (newBtn) newBtn.addEventListener('click', (e) => { e.preventDefault(); newDocument(); });

  const openBranchesBtn = document.getElementById('manage-branches-btn');
  if (openBranchesBtn) openBranchesBtn.addEventListener('click', (e) => { e.preventDefault(); toggleBranchModal(true); });

  const closeBranchesBtn = document.getElementById('close-branches-modal-btn');
  if (closeBranchesBtn) closeBranchesBtn.addEventListener('click', (e) => { e.preventDefault(); toggleBranchModal(false); });

  const clearBranchBtn = document.getElementById('branch-cancel-btn');
  if (clearBranchBtn) clearBranchBtn.addEventListener('click', (e) => { e.preventDefault(); clearBranchForm(); });
}

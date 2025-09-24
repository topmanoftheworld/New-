// Centralized user event handlers and actions
import { AppState, getInitialState, saveState } from './state.js';
import { render } from './dom.js';
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
  Object.assign(AppState, getInitialState(), { global: globalData });
  generateDocumentNumber();
  render();
}

function saveDocument() {
  const docId = AppState.id || Date.now().toString();
  const existingIdx = AppState.global.savedDocuments.findIndex(d => d.id === docId);
  const snapshot = JSON.parse(JSON.stringify(AppState));
  delete snapshot.global; 
  snapshot.id = docId;
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
function addLineItem() {
  AppState.lineItems.push({ description: '', quantity: 1, unitPrice: 0 });
  render();
}

function removeLineItem(index) {
  AppState.lineItems.splice(index, 1);
  render();
}

function updateLineItem(index, key, value) {
  if (!AppState.lineItems[index]) return;
  if (key === 'quantity' || key === 'unitPrice') {
    let v = parseFloat(value);
    if (isNaN(v) || v < 0) v = 0;
    AppState.lineItems[index][key] = v;
  } else {
    AppState.lineItems[index][key] = value;
  }
  render();
}

// Branch management
function updateSelectedBranch(index) {
  AppState.selectedBranchIndex = parseInt(index);
  render();
}

function toggleBranchModal(show) {
  const modal = document.getElementById('branch-modal');
  if (show) {
    renderModalBranchList();
    clearBranchForm();
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
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
    if (btn.getAttribute('data-action') === 'clear' && editor) {
      editor.innerHTML = '';
      if (targetId === 'notes-editor') AppState.notes = '';
      else if (targetId === 'letterhead-editor') AppState.letterhead.content = '';
      render();
      return;
    }
    try { document.execCommand(cmd, false, value || null); }
    catch (e) { console.warn('execCommand failed', e); }
  });
}

export function addEventListeners() {
  const on = (id, event, handler) => { const el = document.getElementById(id); if (el) el.addEventListener(event, handler); };
  const bindStateInput = (id, setter) => {
    on(id, 'input', e => { setter(e.target.value); render(); });
  };

  bindStateInput('client-name', v => AppState.clientInfo.name = v);
  bindStateInput('client-address', v => AppState.clientInfo.address = v);
  bindStateInput('client-email', v => AppState.clientInfo.email = v);
  bindStateInput('client-phone', v => AppState.clientInfo.phone = v);
  on('doc-date', 'change', e => { AppState.document.date = e.target.value; render(); });
  on('due-date', 'change', e => { AppState.document.dueDate = e.target.value; render(); });
  on('gst-rate', 'input', e => {
    let n = parseFloat(e.target.value);
    AppState.totals.gstRate = (isNaN(n) || n < 0) ? 0 : n;
    render();
  });
  on('discount-value', 'input', e => {
    let n = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
    AppState.totals.discount = (isNaN(n) || n <= 0) ? null : n;
    render();
  });

  // Editors
  const setupEditor = (editorId, stateKey, paginationFunc) => {
    const editor = document.getElementById(editorId);
    if (editor) {
      const updateState = () => AppState[stateKey] = editor.innerHTML;
      editor.addEventListener('input', debounce(() => {
        updateState();
        paginationFunc();
      }, 200));
      editor.addEventListener('blur', () => {
        updateState();
        render();
      });
    }
  };
  setupEditor('notes-editor', 'notes', paginateNotesContent);
  setupEditor('letterhead-editor', 'letterhead', paginateLetterheadContent);
  setupEditor('advice-editor', 'paymentAdvice', paginatePaymentAdvice);

  bindRteToolbar('notes-toolbar');
  bindRteToolbar('letterhead-toolbar');
  bindRteToolbar('advice-toolbar');

  on('notes-template', 'change', e => {
    const html = (NotesTemplates[e.target.value] || '').trim();
    AppState.notes = html;
    document.getElementById('notes-editor').innerHTML = html;
    render();
  });

  bindStateInput('accept-name', v => AppState.acceptance.name = v);
  bindStateInput('accept-signature', v => AppState.acceptance.signature = v);

  // Global events
  window.addEventListener('dom:updateLineItem', e => updateLineItem(e.detail.index, e.detail.key, e.detail.value));
  window.addEventListener('dom:removeLineItem', e => removeLineItem(e.detail.index));
  window.addEventListener('dom:loadDocument', e => loadDocument(e.detail.id));
  window.addEventListener('dom:deleteDocument', e => deleteDocument(e.detail.id));
  window.addEventListener('dom:updateSelectedBranch', e => updateSelectedBranch(e.detail.index));

  // Buttons
  on('quote-mode-btn', 'click', () => setMode('quote'));
  on('invoice-mode-btn', 'click', () => setMode('invoice'));
  on('letterhead-mode-btn', 'click', () => setMode('letterhead'));
  on('add-item-btn', 'click', addLineItem);
  on('print-btn', 'click', e => { e.preventDefault(); printDocument(); });
  on('save-doc-btn', 'click', e => { e.preventDefault(); saveDocument(); });
  on('new-doc-btn', 'click', e => { e.preventDefault(); newDocument(); });
  on('manage-branches-btn', 'click', e => { e.preventDefault(); toggleBranchModal(true); });
  on('close-branches-modal-btn', 'click', e => { e.preventDefault(); toggleBranchModal(false); });
  on('branch-cancel-btn', 'click', e => { e.preventDefault(); clearBranchForm(); });
}

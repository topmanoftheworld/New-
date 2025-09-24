// DOM rendering and UI update helpers
import { AppState, getInitialState } from './state.js';
import { ThemeSources } from './config.js';
import { formatCurrency, formatDate, capitalize, toCssUrl, isFiniteNumber, DefaultLogoPath, EmbeddedAssets } from './utils.js';
import { paginateLetterheadContent, paginateNotesContent, paginatePaymentAdvice, cleanup } from './pagination.js';

export function applyBackgroundsAndNumbering() {
  const pagesAll = document.querySelectorAll('#document-preview .document-page');
  const bg = AppState?.theme?.background || '';
  const newBgStyle = bg ? toCssUrl(bg) : 'none';

  pagesAll.forEach(p => {
    if (p.style.backgroundImage !== newBgStyle) {
      p.style.backgroundImage = newBgStyle;
      p.style.backgroundSize = 'cover';
      p.style.backgroundRepeat = 'no-repeat';
      p.style.backgroundPosition = 'center';
    }
  });
  updatePageNumbers(pagesAll);
  updatePageHeaders();
}

// Small DOM helpers
function el(id) { return document.getElementById(id); }
function setText(id, value) { const e = el(id); if (e) e.innerText = value ?? ''; }
function setHTML(id, value) { const e = el(id); if (e) e.innerHTML = value ?? ''; }
function setDisplay(target, show = true) {
  const e = typeof target === 'string' ? el(target) : target;
  if (e) e.style.display = show ? '' : 'none';
}
function setValue(id, value) { const e = el(id); if (e) e.value = value ?? ''; }

export function updatePageNumbers(pagesNodeList) {
  const nodes = Array.from(pagesNodeList || document.querySelectorAll('#document-preview .document-page'));
  const pages = nodes.filter(p => window.getComputedStyle(p).display !== 'none');
  const count = pages.length;
  pages.forEach((page, idx) => {
    const numEl = page.querySelector('.page-number');
    const countEl = page.querySelector('.page-count');
    if (numEl) numEl.textContent = `${idx + 1}`;
    if (countEl) countEl.textContent = `${count}`;
  });
}

export function updatePageHeaders() {
  const selectedBranch = AppState.branches[AppState.selectedBranchIndex] || {};
  const leftText = selectedBranch.name || 'Tomar Contracting';
  const rightText = `${AppState.document.number || ''} • ${formatDate(AppState.document.date || '')}`;
  document.querySelectorAll('#document-preview .document-page .page-header').forEach(h => {
    const left = h.querySelector(':scope > div:first-child');
    const right = h.querySelector(':scope > div:last-child');
    if (left) left.textContent = leftText;
    if (right) right.textContent = rightText;
  });
}

export function updateModeUI() {
  const isLetter = AppState.mode === 'letterhead';
  const isInvoice = AppState.mode === 'invoice';
  const isQuote = AppState.mode === 'quote';
  setDisplay('items-block', !isLetter);
  setDisplay('totals-settings', !isLetter);
  setDisplay('acceptance-controls', isQuote);
  el('letterhead-content-controls')?.classList.toggle('hidden', !isLetter);
  setDisplay('notes-controls', isQuote);
  el('advice-controls')?.classList.toggle('hidden', !isInvoice);
  setDisplay('due-date-wrap', !isLetter);
}

export function buildThemesGrid() {
  const grid = document.getElementById('themes-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const sources = (EmbeddedAssets.backgrounds && EmbeddedAssets.backgrounds.length > 0)
    ? EmbeddedAssets.backgrounds
    : ThemeSources;
  sources.forEach((src, index) => {
    const wrap = document.createElement('button');
    wrap.type = 'button';
    wrap.className = 'relative border rounded overflow-hidden aspect-square group focus:outline-none focus:ring-2 focus:ring-blue-500';
    wrap.title = `Theme ${index + 1}`;
    wrap.addEventListener('click', () => { AppState.theme = { background: src }; render(); });
    wrap.innerHTML = `<img src="${src}" alt="Theme ${index + 1}" class="w-full h-full object-cover" /><span class="absolute inset-0 ring-2 ring-transparent group-hover:ring-blue-400"></span>`;
    grid.appendChild(wrap);
  });
  el('clear-theme-btn').onclick = () => { AppState.theme = { background: '' }; render(); };
}

export function renderBranchDropdown() {
  const select = document.getElementById('branch-select');
  if (!select) return;
  select.innerHTML = '';
  AppState.branches.forEach((b, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = b.name;
    if (i === AppState.selectedBranchIndex) opt.selected = true;
    select.appendChild(opt);
  });
}

export function renderLineItems() {
  const container = document.getElementById('line-items-container');
  container.innerHTML = '';
  AppState.lineItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 gap-2 items-center py-1';
    row.innerHTML = `
      <div class="col-span-12 md:col-span-6">
        <textarea class="w-full p-2 border border-gray-300 rounded-md text-sm" rows="2" placeholder="Description">${item.description || ''}</textarea>
      </div>
      <div class="col-span-4 md:col-span-2">
        <input type="number" placeholder="Qty" value="${item.quantity ?? 0}" class="w-full p-2 border border-gray-300 rounded-md text-sm">
      </div>
      <div class="col-span-4 md:col-span-3">
        <input type="number" placeholder="Price" value="${item.unitPrice ?? 0}" class="w-full p-2 border border-gray-300 rounded-md text-sm">
      </div>
      <div class="col-span-4 md:col-span-1 flex justify-end">
        <button class="text-gray-400 hover:text-red-500 p-1 rounded-full transition duration-200 opacity-20 delete-row-btn" aria-label="Delete row">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>`;
    const inputs = row.querySelectorAll('textarea, input');
    inputs[0].addEventListener('input', e => window.dispatchEvent(new CustomEvent('dom:updateLineItem', { detail: { index, key: 'description', value: e.target.value } })));
    inputs[1].addEventListener('input', e => window.dispatchEvent(new CustomEvent('dom:updateLineItem', { detail: { index, key: 'quantity', value: parseFloat(e.target.value) } })));
    inputs[2].addEventListener('input', e => window.dispatchEvent(new CustomEvent('dom:updateLineItem', { detail: { index, key: 'unitPrice', value: parseFloat(e.target.value) } })));
    row.querySelector('button').addEventListener('click', () => window.dispatchEvent(new CustomEvent('dom:removeLineItem', { detail: { index } })));
    container.appendChild(row);
  });
}

export function renderSavedDocuments() {
  const listContainer = document.getElementById('saved-documents-list');
  listContainer.innerHTML = '';
  if (AppState.global.savedDocuments.length === 0) {
    listContainer.innerHTML = `<p class="text-sm text-gray-500 text-center p-2">No saved documents.</p>`;
    return;
  }
  const sorted = [...AppState.global.savedDocuments].sort((a, b) => new Date(b.meta?.createdAt || b.document.date) - new Date(a.meta?.createdAt || a.document.date));
  sorted.forEach(doc => {
    const item = document.createElement('div');
    item.className = 'flex justify-between items-center bg-white p-2 rounded border mb-2';
    item.innerHTML = `
      <div>
        <p class="font-medium text-sm">${doc.document.number}</p>
        <p class="text-xs text-gray-500">${formatDate(doc.meta?.createdAt || doc.document.date)} • ${capitalize(doc.mode || 'quote')}</p>
      </div>
      <div class="flex space-x-1">
        <button class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">Load</button>
        <button class="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Del</button>`;
    const [loadBtn, delBtn] = item.querySelectorAll('button');
    loadBtn.addEventListener('click', () => window.dispatchEvent(new CustomEvent('dom:loadDocument', { detail: { id: doc.id } })));
    delBtn.addEventListener('click', () => window.dispatchEvent(new CustomEvent('dom:deleteDocument', { detail: { id: doc.id } })));
    listContainer.appendChild(item);
  });
}

export function updateModeButtons() {
  ['quote', 'invoice', 'letterhead'].forEach(mode => {
    const btn = document.getElementById(`${mode}-mode-btn`);
    if (btn) {
      const isActive = AppState.mode === mode;
      btn.classList.toggle('bg-blue-600', isActive);
      btn.classList.toggle('text-white', isActive);
      btn.classList.toggle('bg-gray-200', !isActive);
      btn.classList.toggle('text-gray-700', !isActive);
    }
  });
}

export function render() {
  cleanup();

  // Inputs
  setValue('client-name', AppState.clientInfo.name);
  setValue('client-address', AppState.clientInfo.address);
  setValue('client-email', AppState.clientInfo.email);
  setValue('client-phone', AppState.clientInfo.phone);
  setValue('doc-date', AppState.document.date);
  setValue('due-date', AppState.document.dueDate);

  const discount = AppState.totals.discount > 0 ? AppState.totals.discount : '';
  setValue('discount-value', discount);
  setValue('gst-rate', AppState.totals.gstRate);

  // Editors
  setHTML('notes-editor', AppState.notes || '');
  setHTML('letterhead-editor', AppState.letterhead?.content || '');
  setHTML('advice-editor', AppState.paymentAdvice?.content || '');
  setValue('accept-name', AppState.acceptance?.name || '');
  setValue('accept-signature', AppState.acceptance?.signature || '');

  // Lists
  renderBranchDropdown();
  renderLineItems();
  renderSavedDocuments();

  // UI
  updateModeUI();
  updateModeButtons();

  // Preview
  const isLetter = AppState.mode === 'letterhead';
  const toLabel = AppState.mode === 'quote' ? 'Quote To' : (AppState.mode === 'invoice' ? 'Bill To' : '');
  setText('bill-to-heading', toLabel || 'Letterhead');
  setText('preview-to-heading', toLabel ? toLabel.toUpperCase() : '');

  const selectedBranch = AppState.branches[AppState.selectedBranchIndex] || {};
  const logoEl = el('preview-logo');
  const logoSrc = selectedBranch.logo || EmbeddedAssets.logo || DefaultLogoPath;
  if (logoSrc) { logoEl.src = logoSrc; logoEl.style.display = 'block'; } else { logoEl.style.display = 'none'; }
  
  setText('preview-branch-name', selectedBranch.name || '');
  setText('preview-branch-address', selectedBranch.address || '');
  setText('preview-branch-phone', selectedBranch.phone ? `P: ${selectedBranch.phone}` : '');
  setText('preview-branch-email', selectedBranch.email ? `E: ${selectedBranch.email}` : '');
  setText('preview-branch-website', selectedBranch.website ? `W: ${selectedBranch.website}` : '');
  setText('preview-branch-gst', selectedBranch.gst ? `GST: ${selectedBranch.gst}` : '');

  setText('preview-doc-title', isLetter ? 'Letterhead' : capitalize(AppState.mode));
  setText('preview-doc-number', AppState.document.number);
  setText('preview-client-name', AppState.clientInfo.name);
  setText('preview-client-address', AppState.clientInfo.address);
  setText('preview-client-email', AppState.clientInfo.email);
  setText('preview-client-phone', AppState.clientInfo.phone);
  setText('preview-doc-date', formatDate(AppState.document.date));
  setText('preview-due-date', formatDate(AppState.document.dueDate));

  setText('due-date-label', (AppState.mode === 'quote') ? 'Validity Date' : 'Due Date');
  setText('preview-due-date-label', (AppState.mode === 'quote') ? 'Validity Date:' : 'Due Date:');

  setDisplay('preview-to', !isLetter);
  setDisplay('items-table', !isLetter);
  setDisplay('totals-preview', !isLetter);
  setDisplay('acceptance-preview', AppState.mode === 'quote');
  setDisplay('payment-advice-preview', AppState.mode === 'invoice');
  setDisplay('preview-dates-right', !isLetter);

  // Letterhead specific
  const titleDate = el('preview-doc-date-title');
  if (titleDate) titleDate.classList.toggle('hidden', !isLetter);
  if (isLetter) titleDate.textContent = formatDate(AppState.document.date);
  const lhTo = el('preview-letter-to');
  if (lhTo) {
    lhTo.classList.toggle('hidden', !isLetter);
    if (isLetter) {
      setText('lh-client-name', AppState.clientInfo.name || '');
      setText('lh-client-address', AppState.clientInfo.address || '');
    }
  }

  // Totals
  const subtotal = AppState.lineItems.reduce((acc, item) => acc + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const discountAmount = AppState.totals.discount || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const gstAmount = taxableAmount * (AppState.totals.gstRate / 100);
  const grandTotal = taxableAmount + gstAmount;
  
  setText('preview-subtotal', formatCurrency(subtotal));
  setDisplay('preview-discount-row', discountAmount > 0);
  setText('preview-discount', formatCurrency(discountAmount));
  setText('preview-gst-rate', AppState.totals.gstRate);
  setText('preview-gst-amount', formatCurrency(gstAmount));
  setText('preview-grand-total', formatCurrency(grandTotal));

  // Items table
  const tbody = document.getElementById('preview-line-items');
  if (tbody) {
    tbody.innerHTML = AppState.lineItems.map(item => `
      <tr class="border-b border-gray-200">
        <td class="py-2 pr-2 whitespace-pre-line">${item.description || ''}</td>
        <td class="text-right py-2 px-2">${item.quantity || ''}</td>
        <td class="text-right py-2 px-2">${formatCurrency(item.unitPrice)}</td>
        <td class="text-right py-2 pl-2 font-medium">${formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}</td>
      </tr>`).join('');
  }

  // Paginate all content
  paginateLetterheadContent();
  paginateNotesContent();
  paginatePaymentAdvice();
  
  refreshDocumentPages();
}


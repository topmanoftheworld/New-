// DOM rendering and UI update helpers
import { AppState, getInitialState } from './state.js';
import { ThemeSources } from './config.js';
import { formatCurrency, formatDate, capitalize, toCssUrl, fitsInSection, insertBeforeFooter, getAvailableHeight, ASSET_RESOLVER, EmbeddedAssets, DefaultLogoPath, isFiniteNumber } from './utils.js';
import { paginateLetterheadContent, paginateNotesContent, paginatePaymentAdvice, cleanupQuoteContinuationPages, paginateQuoteOverflow } from './pagination.js';

export function applyBackgroundsAndNumbering() {
  const pagesAll = document.querySelectorAll('#document-preview .document-page');
  const bg2 = AppState.theme && AppState.theme.background ? AppState.theme.background : '';
  const resolved = bg2 ? new URL(bg2, document.baseURI).href : '';
  pagesAll.forEach(p => { p.style.backgroundImage = resolved ? toCssUrl(resolved) : 'none'; });
  updatePageNumbers(pagesAll);
  updatePageHeaders();
}

// Small DOM helpers to reduce repetition and guard nulls
function el(id) { return document.getElementById(id); }
function setText(id, value) { const e = el(id); if (e) e.innerText = value ?? ''; }
function setHTML(id, value) { const e = el(id); if (e) e.innerHTML = value ?? ''; }
function setDisplay(target, show = true) {
  const e = typeof target === 'string' ? el(target) : target;
  if (e) e.style.display = show ? '' : 'none';
}

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
  const itemsBlock = document.getElementById('items-block');
  const totalsBlock = document.getElementById('totals-settings');
  const acceptBlock = document.getElementById('acceptance-controls');
  const lhControls = document.getElementById('letterhead-content-controls');
  const notesControls = document.getElementById('notes-controls');
  const adviceControls = document.getElementById('advice-controls');
  const dueDateWrap = document.getElementById('due-date-wrap');
  if (itemsBlock) itemsBlock.style.display = isLetter ? 'none' : '';
  if (totalsBlock) totalsBlock.style.display = isLetter ? 'none' : '';
  if (acceptBlock) acceptBlock.style.display = isQuote ? '' : 'none';
  if (lhControls) lhControls.classList.toggle('hidden', !isLetter);
  if (notesControls) notesControls.style.display = isQuote ? '' : 'none';
  if (adviceControls) adviceControls.classList.toggle('hidden', !isInvoice);
  if (dueDateWrap) dueDateWrap.style.display = isLetter ? 'none' : '';
}

export function buildItemRowHTML(item) {
  const qty = isFiniteNumber(item.quantity) ? item.quantity : 0;
  const price = isFiniteNumber(item.unitPrice) ? item.unitPrice : 0;
  const total = qty * price;
  return `
    <tr class="border-b border-gray-200">
      <td class="py-2 pr-2 whitespace-pre-line">${item.description || ''}</td>
      <td class="text-right py-2 px-2">${qty || ''}</td>
      <td class="text-right py-2 px-2">${formatCurrency(price)}</td>
      <td class="text-right py-2 pl-2 font-medium">${formatCurrency(total)}</td>
    </tr>`;
}

export function getAllThemeSources() {
  const base = (EmbeddedAssets.backgrounds && EmbeddedAssets.backgrounds.length > 0)
    ? EmbeddedAssets.backgrounds
    : ThemeSources;
  return base.map(ASSET_RESOLVER).map(p => {
    try { return new URL(p, document.baseURI).href; } catch { return p; }
  });
}

export function buildThemesGrid() {
  const grid = document.getElementById('themes-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const sources = getAllThemeSources();
  sources.forEach((src, index) => {
    const wrap = document.createElement('button');
    wrap.type = 'button';
    wrap.className = 'relative border rounded overflow-hidden aspect-square group focus:outline-none focus:ring-2 focus:ring-blue-500';
    wrap.title = `Theme ${index + 1}`;
    wrap.addEventListener('click', () => selectTheme(src));
    wrap.innerHTML = `
      <img src="${src}" alt="Theme ${index + 1}" class="w-full h-full object-cover" />
      <span class="absolute inset-0 ring-2 ring-transparent group-hover:ring-blue-400"></span>`;
    grid.appendChild(wrap);
  });

  const clearBtn = document.getElementById('clear-theme-btn');
  if (clearBtn) clearBtn.onclick = () => { AppState.theme = { background: '' }; render(); };
}

export function selectTheme(src) {
  try { AppState.theme = { background: new URL(src, document.baseURI).href }; }
  catch { AppState.theme = { background: src }; }
  render();
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
  select.onchange = (e) => {
    const index = parseInt(e.target.value);
    window.dispatchEvent(new CustomEvent('dom:updateSelectedBranch', { detail: { index } }));
  };
}

export function renderLineItems() {
  const container = document.getElementById('line-items');
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

export function renderPreviewLineItems() {
  const tbody = document.getElementById('preview-line-items');
  tbody.innerHTML = '';
  AppState.lineItems.forEach(item => {
    const qty = isFiniteNumber(item.quantity) ? item.quantity : 0;
    const price = isFiniteNumber(item.unitPrice) ? item.unitPrice : 0;
    const total = qty * price;
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-200';
    row.innerHTML = `
      <td class="py-2 pr-2 whitespace-pre-line">${item.description || ''}</td>
      <td class="text-right py-2 px-2">${qty || ''}</td>
      <td class="text-right py-2 px-2">${formatCurrency(price)}</td>
      <td class="text-right py-2 pl-2 font-medium">${formatCurrency(total)}</td>`;
    tbody.appendChild(row);
  });
}

export function getValidDiscount() {
  const raw = AppState && AppState.totals ? AppState.totals.discount : null;
  const numeric = typeof raw === 'number' ? raw : parseFloat(raw);
  if (!isFiniteNumber(numeric) || numeric <= 0) return 0;
  return numeric;
}

export function calculateAndRenderTotals() {
  const subtotal = AppState.lineItems.reduce((acc, item) => {
    const q = isFiniteNumber(item.quantity) ? item.quantity : 0;
    const p = isFiniteNumber(item.unitPrice) ? item.unitPrice : 0;
    return acc + q * p;
  }, 0);
  const discount = getValidDiscount();
  const gstRate = isFiniteNumber(AppState.totals.gstRate) ? AppState.totals.gstRate : 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const gstAmount = taxableAmount * (gstRate / 100);
  const grandTotal = taxableAmount + gstAmount;
  const discountRow = document.getElementById('preview-discount-row');
  const discountValueEl = document.getElementById('preview-discount');
  if (discountRow && discountValueEl) {
    if (discount > 0) {
      discountRow.classList.remove('hidden');
      discountValueEl.innerText = formatCurrency(discount);
    } else {
      discountRow.classList.add('hidden');
      discountValueEl.innerText = '';
    }
  }
  const gstRateDisplay = isFiniteNumber(gstRate) ? gstRate.toFixed(2).replace(/\.?0+$/, '') : '0';
  const gstRateEl = document.getElementById('preview-gst-rate');
  const gstAmountEl = document.getElementById('preview-gst-amount');
  if (gstRateEl) gstRateEl.innerText = gstRateDisplay;
  if (gstAmountEl) gstAmountEl.innerText = formatCurrency(gstAmount);
  const subtotalEl = document.getElementById('preview-subtotal');
  const totalEl = document.getElementById('preview-grand-total');
  if (subtotalEl) subtotalEl.innerText = formatCurrency(subtotal);
  if (totalEl) totalEl.innerText = formatCurrency(grandTotal);
}

export function renderSavedDocuments() {
  const listContainer = document.getElementById('saved-documents-list');
  listContainer.innerHTML = '';
  if (AppState.global.savedDocuments.length === 0) {
    listContainer.innerHTML = `<p class="text-sm text-gray-500 text-center p-2">No saved documents.</p>`;
    return;
  }
  const sorted = [...AppState.global.savedDocuments].sort((a, b) => {
    const ad = a.meta?.createdAt || a.document?.date || '';
    const bd = b.meta?.createdAt || b.document?.date || '';
    return new Date(bd) - new Date(ad);
  });
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
  const quoteBtn = document.getElementById('quote-mode-btn');
  const invoiceBtn = document.getElementById('invoice-mode-btn');
  const letterBtn = document.getElementById('letterhead-mode-btn');
  if (AppState.mode === 'quote') {
    quoteBtn.classList.add('bg-blue-600', 'text-white');
    quoteBtn.classList.remove('bg-gray-200', 'text-gray-700');
    invoiceBtn.classList.add('bg-gray-200', 'text-gray-700');
    invoiceBtn.classList.remove('bg-blue-600', 'text-white');
    if (letterBtn) { letterBtn.classList.add('bg-gray-200', 'text-gray-700'); letterBtn.classList.remove('bg-blue-600', 'text-white'); }
  } else {
    if (AppState.mode === 'invoice') {
      invoiceBtn.classList.add('bg-blue-600', 'text-white');
      invoiceBtn.classList.remove('bg-gray-200', 'text-gray-700');
      quoteBtn.classList.add('bg-gray-200', 'text-gray-700');
      quoteBtn.classList.remove('bg-blue-600', 'text-white');
      if (letterBtn) { letterBtn.classList.add('bg-gray-200', 'text-gray-700'); letterBtn.classList.remove('bg-blue-600', 'text-white'); }
    } else if (AppState.mode === 'letterhead') {
      if (letterBtn) { letterBtn.classList.add('bg-blue-600', 'text-white'); letterBtn.classList.remove('bg-gray-200', 'text-gray-700'); }
      invoiceBtn.classList.add('bg-gray-200', 'text-gray-700');
      invoiceBtn.classList.remove('bg-blue-600', 'text-white');
      quoteBtn.classList.add('bg-gray-200', 'text-gray-700');
      quoteBtn.classList.remove('bg-blue-600', 'text-white');
    }
  }
}

export function ensureAcceptancePositioning() {
  const signature = document.getElementById('acceptance-preview');
  if (!signature) return;
  const section = signature.closest('.document-page');
  if (!section) return;
  const itemsTable = section.querySelector('table');
  if (itemsTable) {
    const available = getAvailableHeight(section, itemsTable);
    if (available < 40) {
      // Move signature to next page to avoid overlap
      const next = section.nextElementSibling || null;
      if (next && next.classList.contains('document-page')) {
        next.insertBefore(signature, next.querySelector('.page-footer'));
      }
    }
  }
}

export function refreshDocumentPages() { applyBackgroundsAndNumbering(); }

function createContinuationPage(generatedType, contentRole, extraClass = '') {
  const sec = document.createElement('section');
  sec.className = `document-page p-12 aspect-[1/1.414] ${extraClass}`.trim();
  sec.setAttribute('data-generated', generatedType);
  sec.innerHTML = `
    <div class="page-header"><div></div><div></div></div>
    <div class="text-sm" data-role="${contentRole}"></div>
    <div class="page-footer"><span class="page-number"></span> / <span class="page-count"></span></div>`;
  return sec;
}

function getVisiblePages() {
  const nodes = Array.from(document.querySelectorAll('#document-preview .document-page'));
  return nodes.filter(p => window.getComputedStyle(p).display !== 'none');
}

export function renderItemsAndPaginate() {
  const tbody = document.getElementById('preview-line-items');
  if (!tbody) return;
  const rows = AppState.lineItems.map(item => buildItemRowHTML(item));
  const ROWS_PER_PAGE_FIRST = 12;
  tbody.innerHTML = rows.slice(0, ROWS_PER_PAGE_FIRST).join('');

  (function safeRemoveOldItemPages() {
    const acceptEl = document.getElementById('acceptance-preview');
    document.querySelectorAll('#document-preview [data-generated="items-page"]').forEach(el => {
      if (acceptEl && el.contains(acceptEl)) return; // preserve signature page
      el.remove();
    });
  })();

  const container = document.getElementById('document-preview');
  const table = document.querySelector('#document-preview table');
  if (!container || !table) return;
  const footer = container.querySelector('.document-page .page-footer');
  if (!footer) return;

  const ROWS_PER_PAGE_CONT = 22;
  const MAX_PAGES = 10;

  let currentSection = container.querySelector('.document-page');
  let currentContainer = table.parentElement;

  for (let i = ROWS_PER_PAGE_FIRST; i < rows.length; i += ROWS_PER_PAGE_CONT) {
    if (getVisiblePages().length >= MAX_PAGES) break;
    const slice = rows.slice(i, i + ROWS_PER_PAGE_CONT).join('');
    const sec = createContinuationPage('items-page', 'items-content');
    const role = sec.querySelector('[data-role="items-content"]');
    role.innerHTML = `
      <table class="w-full mb-8 text-sm">
        <thead class="border-b-2 border-gray-800">
          <tr>
            <th class="text-left font-bold text-gray-600 uppercase py-2">Description</th>
            <th class="text-right font-bold text-gray-600 uppercase py-2 w-24">Quantity</th>
            <th class="text-right font-bold text-gray-600 uppercase py-2 w-28">Unit Price</th>
            <th class="text-right font-bold text-gray-600 uppercase py-2 w-32">Total</th>
          </tr>
        </thead>
        <tbody>${slice}</tbody>
      </table>`;
    container.appendChild(sec);
    currentSection = sec;
    currentContainer = role;
  }
}

export function render() {
  el('client-name').value = AppState.clientInfo.name;
  el('client-address').value = AppState.clientInfo.address;
  el('client-email').value = AppState.clientInfo.email;
  el('client-phone').value = AppState.clientInfo.phone;
  el('doc-date').value = AppState.document.date;
  el('due-date').value = AppState.document.dueDate;
  const discountForInput = getValidDiscount();
  const discountInputEl = el('discount-value');
  discountInputEl.value = discountForInput > 0 ? discountForInput : '';
  if (discountForInput > 0 && typeof AppState.totals.discount !== 'number') AppState.totals.discount = discountForInput;
  if (discountForInput === 0 && AppState.totals.discount !== null) AppState.totals.discount = null;
  const gstRateValue = isFiniteNumber(AppState.totals.gstRate) ? AppState.totals.gstRate : 0;
  AppState.totals.gstRate = gstRateValue;
  el('gst-rate').value = gstRateValue;
  if (el('notes-editor')) {
    const nv = AppState.notes || '';
    const nvHtml = /</.test(nv) ? nv : nv.replace(/\n/g, '<br>');
    setHTML('notes-editor', nvHtml);
  }
  if (el('letterhead-editor')) setHTML('letterhead-editor', (AppState.letterhead?.content || ''));
  if (el('accept-name')) el('accept-name').value = AppState.acceptance?.name || '';
  if (el('accept-signature')) el('accept-signature').value = AppState.acceptance?.signature || '';

  renderBranchDropdown();
  renderLineItems();
  renderSavedDocuments();

  updateModeUI();
  const isLetter = AppState.mode === 'letterhead';

  const toLabel = AppState.mode === 'quote' ? 'Quote To' : (AppState.mode === 'invoice' ? 'Bill To' : '');
  document.getElementById('bill-to-heading').innerText = toLabel || 'Letterhead';
  document.getElementById('preview-to-heading').innerText = toLabel ? toLabel.toUpperCase() : '';

  const previewPanel = el('document-preview');
  if (previewPanel) {
    previewPanel.classList.toggle('invoice-background', AppState.mode === 'invoice');
    previewPanel.classList.toggle('quote-background', AppState.mode === 'quote');
    const bg = AppState.theme && AppState.theme.background ? AppState.theme.background : '';
    const pages = previewPanel.querySelectorAll('.document-page');
    pages.forEach(p => { p.style.backgroundImage = bg ? toCssUrl(bg) : 'none'; });
    updatePageNumbers(pages);
  }

  // preview top info
  const selectedBranch = AppState.branches[AppState.selectedBranchIndex] || {};
  const logoEl = el('preview-logo');
  const fallbackLogo = EmbeddedAssets.logo || DefaultLogoPath;
  const logoSrc = selectedBranch.logo || fallbackLogo;
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

  const dueLabel = (AppState.mode === 'quote') ? 'Validity Date:' : 'Due Date:';
  setText('due-date-label', (AppState.mode === 'quote') ? 'Validity Date' : 'Due Date');
  setText('preview-due-date-label', dueLabel);

  const previewTo = el('preview-to');
  const itemsTable = el('items-table');
  const totalsPreview = el('totals-preview');
  const datesRight = el('preview-dates-right');
  const acceptPreview = el('acceptance-preview');
  const payAdvice = el('payment-advice-preview');
  const lhPreview = el('preview-letterhead-content');
  setDisplay(previewTo, !isLetter);
  const notesPage = document.getElementById('notes-page');
  const hasNotes = (() => {
    const nv = AppState.notes || '';
    const text = nv.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return text.length > 0;
  })();
  setDisplay(notesPage, false);
  setDisplay(itemsTable, !isLetter);
  setDisplay(totalsPreview, !isLetter);
  setDisplay(acceptPreview, (AppState.mode === 'quote'));
  setDisplay(payAdvice, (AppState.mode === 'invoice'));
  setDisplay(datesRight, !isLetter);
  const titleDate = el('preview-doc-date-title');
  if (titleDate) {
    if (isLetter) { titleDate.classList.remove('hidden'); titleDate.textContent = formatDate(AppState.document.date); }
    else { titleDate.classList.add('hidden'); titleDate.textContent = ''; }
  }
  const lhTo = document.getElementById('preview-letter-to');
  if (lhTo) {
    if (isLetter) {
      lhTo.classList.remove('hidden');
      document.getElementById('lh-client-name').innerText = AppState.clientInfo.name || '';
      document.getElementById('lh-client-address').innerText = AppState.clientInfo.address || '';
      document.getElementById('lh-client-email').innerText = AppState.clientInfo.email || '';
      document.getElementById('lh-client-phone').innerText = AppState.clientInfo.phone || '';
    } else {
      lhTo.classList.add('hidden');
    }
  }
  if (lhPreview) {
    lhPreview.classList.toggle('hidden', !isLetter);
    lhPreview.innerHTML = AppState.letterhead?.content || '';
  }

  if (!isLetter) {
    renderItemsAndPaginate();
    calculateAndRenderTotals();
  } else {
    document.querySelectorAll('#document-preview [data-generated="items-page"]').forEach(el => el.remove());
  }

  ensureAcceptancePositioning();

  const notesPreview = document.getElementById('preview-notes');
  if (notesPreview) {
    const nv = AppState.notes || '';
    notesPreview.innerHTML = /</.test(nv) ? nv : nv.replace(/\n/g, '<br>');
  }

  // Pagination across pages
  paginateLetterheadContent();
  paginateNotesContent();
  paginatePaymentAdvice();
  cleanupQuoteContinuationPages();
  paginateQuoteOverflow();
  refreshDocumentPages();
  updateModeButtons();
}

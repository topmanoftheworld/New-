// Pagination helpers extracted from script.js
import { AppState } from './state.js';
import { formatDate } from './utils.js';
import { refreshDocumentPages } from './dom.js';
import { fitsInSection, insertBeforeFooter } from './utils.js';

const MAX_PAGES = 10;

function getVisiblePages() {
  const nodes = Array.from(document.querySelectorAll('#document-preview .document-page'));
  return nodes.filter(p => window.getComputedStyle(p).display !== 'none');
}

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

export function paginateLetterheadContent() {
  if (AppState.mode !== 'letterhead') return;
  const container = document.getElementById('document-preview');
  if (!container) return;
  container.querySelectorAll('[data-generated="letterhead-page"]').forEach(el => el.remove());

  const firstSection = container.querySelector('.document-page');
  const firstContent = document.getElementById('preview-letterhead-content');
  if (!firstSection || !firstContent) return;
  const footer = firstSection.querySelector('.page-footer');
  if (!footer) return;

  const nodes = Array.from(firstContent.childNodes);
  if (nodes.length === 0) return;
  firstContent.innerHTML = '';

  let currentSection = firstSection;
  let currentContainer = firstContent;
  function fitsCurrentSection() { return fitsInSection(currentSection, currentContainer, 4); }

  nodes.forEach(node => {
    currentContainer.appendChild(node);
    if (!fitsCurrentSection()) {
      currentContainer.removeChild(node);
      if (getVisiblePages().length >= MAX_PAGES) return;
      const sec = createContinuationPage('letterhead-page', 'letterhead-content');
      container.appendChild(sec);
      currentSection = sec;
      currentContainer = sec.querySelector('[data-role="letterhead-content"]');
      currentContainer.appendChild(node);
    }
  });

  refreshDocumentPages();

  const hasFirstContent = firstContent.textContent.trim().length > 0 || firstContent.children.length > 0;
  const generatedPages = container.querySelectorAll('[data-generated="letterhead-page"]').length;
  firstSection.style.display = (!hasFirstContent && generatedPages > 0) ? 'none' : '';
}

export function paginateNotesContent() {
  if (AppState.mode === 'letterhead') return; // notes not paginated in letterhead

  const container = document.getElementById('document-preview');
  const accept = document.getElementById('acceptance-preview');
  const scrollContainer = document.querySelector('.preview-column') || container;
  const savedTop = scrollContainer ? scrollContainer.scrollTop : 0;
  if (!container || !accept) return;

  // Cleanup previous render and continuation pages
  container.querySelectorAll('[data-role="notes-render"], [data-generated="notes-page-cont"]').forEach(el => el.remove());

  const editor = document.getElementById('notes-editor');
  const html = editor ? editor.innerHTML : '';
  const plain = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const hasNotes = plain.length > 0;
  if (!hasNotes) return;

  const targetSection = accept.closest('.document-page');
  const footer = targetSection?.querySelector('.page-footer');
  if (!targetSection || !footer) return;

  const render = document.createElement('div');
  render.setAttribute('data-role', 'notes-render');
  render.className = 'text-sm text-gray-700';
  render.innerHTML = html;
  insertBeforeFooter(targetSection, render);

  requestAnimationFrame(() => {
    const footerRect = footer.getBoundingClientRect();
    const renderRect = render.getBoundingClientRect();
    const fitsOnSamePage = (footerRect.top - renderRect.top) >= renderRect.height;
    if (fitsOnSamePage) {
      if (scrollContainer) requestAnimationFrame(() => { scrollContainer.scrollTop = savedTop; });
      return;
    }

    const temp = document.createElement('div');
    temp.innerHTML = html;
    const nodes = Array.from(temp.childNodes);

    render.innerHTML = '';
    let currentSection = targetSection;
    let currentContainer = render;

    function createNotesPageAfter(section) {
      const sec = createContinuationPage('notes-page-cont', 'notes-content');
      const role = sec.querySelector('[data-role="notes-content"]');
      if (role) role.classList.add('text-gray-700');
      if (section.nextSibling) container.insertBefore(sec, section.nextSibling);
      else container.appendChild(sec);
      return sec;
    }

    function currentAvailableVsBlock() {
      const footerEl = currentSection.querySelector('.page-footer');
      const availableHeight = footerEl.getBoundingClientRect().top - currentContainer.getBoundingClientRect().top;
      const blockHeight = currentContainer.getBoundingClientRect().height;
      return { availableHeight, blockHeight };
    }

    for (const node of nodes) {
      if (getVisiblePages().length >= MAX_PAGES) break;
      const clone = node.cloneNode(true);
      currentContainer.appendChild(clone);
      const { availableHeight, blockHeight } = currentAvailableVsBlock();
      if (availableHeight < blockHeight) {
        currentContainer.removeChild(clone);
        currentSection = createNotesPageAfter(currentSection);
        currentContainer = currentSection.querySelector('[data-role="notes-content"]');
        currentContainer.appendChild(clone);
        const check2 = currentAvailableVsBlock();
        if (check2.availableHeight < check2.blockHeight) {
          // extremely tall node; leave as-is
        }
      }
    }

    refreshDocumentPages();
    if (scrollContainer) requestAnimationFrame(() => { scrollContainer.scrollTop = savedTop; });
  });
}

export function paginatePaymentAdvice() {
  if (AppState.mode !== 'invoice') return;
  const container = document.getElementById('document-preview');
  const scrollContainer = document.querySelector('.preview-column') || container;
  const savedTop = scrollContainer ? scrollContainer.scrollTop : 0;
  if (!container) return;

  const due = AppState?.document?.dueDate ? formatDate(AppState.document.dueDate) : '';
  const html = due
    ? `<p><strong>Payment Advice:</strong> This invoice is due on <strong>${due}</strong>.<br/>Please make payment to <strong>Tomar Contracting Limited</strong>, Account No: <strong>38-9024-0318399-00</strong>.</p>`
    : '';

  const signatureEl = document.getElementById('acceptance-preview');
  container.querySelectorAll('[data-role="advice-render"], [data-generated="advice-page-cont"]').forEach(el => {
    if (signatureEl && el.contains(signatureEl)) return;
    el.remove();
  });

  let anchorSection = null;
  const notesConts = container.querySelectorAll('[data-generated="notes-page-cont"]');
  if (notesConts.length > 0) {
    anchorSection = notesConts[notesConts.length - 1];
  } else {
    const notesInline = container.querySelector('[data-role="notes-render"]');
    if (notesInline) anchorSection = notesInline.closest('.document-page');
  }
  if (!anchorSection) {
    const sig = document.getElementById('acceptance-preview');
    anchorSection = sig ? sig.closest('.document-page') : null;
  }
  if (!anchorSection) return;

  const footer = anchorSection.querySelector('.page-footer');
  if (!footer) return;

  const render = document.createElement('div');
  render.setAttribute('data-role', 'advice-render');
  render.className = 'text-sm text-gray-700';
  render.innerHTML = html;
  insertBeforeFooter(anchorSection, render);

  requestAnimationFrame(() => {
    const footerRect = footer.getBoundingClientRect();
    const renderRect = render.getBoundingClientRect();
    const fitsOnSamePage = (footerRect.top - renderRect.top) >= renderRect.height;
    if (fitsOnSamePage) {
      if (scrollContainer) requestAnimationFrame(() => { scrollContainer.scrollTop = savedTop; });
      return;
    }

    if (getVisiblePages().length >= MAX_PAGES) return;
    const sec = createContinuationPage('advice-page-cont', 'advice-content');
    const role = sec.querySelector('[data-role="advice-content"]');
    role.innerHTML = `<div class="text-sm text-gray-700">${html}</div>`;
    if (anchorSection.nextSibling) container.insertBefore(sec, anchorSection.nextSibling);
    else container.appendChild(sec);

    refreshDocumentPages();
    if (scrollContainer) requestAnimationFrame(() => { scrollContainer.scrollTop = savedTop; });
  });
}

export function cleanupQuoteContinuationPages() {
  if (AppState.mode !== 'quote') return;
  document.querySelectorAll('#document-preview [data-generated="items-page"], #document-preview [data-generated="signature-page"]').forEach(el => el.remove());
}

export function paginateQuoteOverflow() {
  if (AppState.mode !== 'quote') return;
  // This function can be expanded to ensure quote pages don't overlap footers
  // Currently a no-op placeholder as main pagination is handled elsewhere
}


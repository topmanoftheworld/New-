// Pagination helpers extracted from script.js
import { AppState } from './state.js';
import { formatDate } from './utils.js';
import { refreshDocumentPages } from './dom.js';
import { insertBeforeFooter } from './utils.js';

// Hard cap for total visible pages
const MAX_PAGES = 10;

// --- Small helpers to keep code DRY ----------------------------------------

function getPreviewContainer() {
  return document.getElementById('document-preview');
}

function getScrollContainer(fallback) {
  return document.querySelector('.preview-column') || fallback;
}

function restoreScroll(scrollContainer, top) {
  if (!scrollContainer) return;
  requestAnimationFrame(() => { scrollContainer.scrollTop = top; });
}

// Unified overflow check used across pagination flows
function contentFits(sectionEl, blockEl, buffer = 4) {
  if (!sectionEl || !blockEl) return true;
  const footerEl = sectionEl.querySelector('.page-footer');
  if (!footerEl) return true;
  const footerRect = footerEl.getBoundingClientRect();
  const blockRect = blockEl.getBoundingClientRect();
  return (footerRect.top - blockRect.top) >= (blockRect.height + buffer);
}

function insertAfter(container, newNode, afterNode) {
  if (afterNode && afterNode.nextSibling) container.insertBefore(newNode, afterNode.nextSibling);
  else container.appendChild(newNode);
}

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
  const container = getPreviewContainer();
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
  function fitsCurrentSection() { return contentFits(currentSection, currentContainer, 4); }

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

  const container = getPreviewContainer();
  const accept = document.getElementById('acceptance-preview');
  const scrollContainer = getScrollContainer(container);
  const savedTop = scrollContainer ? scrollContainer.scrollTop : 0;
  if (!container || !accept) return;

  const html = AppState.notes || '';
  const plain = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const hasNotes = plain.length > 0;

  let render = container.querySelector('[data-role="notes-render"]');
  container.querySelectorAll('[data-generated="notes-page-cont"]').forEach(el => el.remove());

  if (!hasNotes) {
    if (render) render.remove();
    return;
  }

  const targetSection = accept.closest('.document-page');
  if (!render) {
    if (!targetSection) return;
    render = document.createElement('div');
    render.setAttribute('data-role', 'notes-render');
    render.className = 'text-sm text-gray-700';
    insertBeforeFooter(targetSection, render);
  } else {
    // Ensure the render element is on the correct page
    if (targetSection && render.parentElement !== targetSection) {
        insertBeforeFooter(targetSection, render);
    }
  }

  render.innerHTML = html;

  requestAnimationFrame(() => {
    if (contentFits(render.closest('.document-page'), render, 0)) { restoreScroll(scrollContainer, savedTop); return; }

    const temp = document.createElement('div');
    temp.innerHTML = html;
    const nodes = Array.from(temp.childNodes);

    render.innerHTML = '';
    let currentSection = render.closest('.document-page');
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
    restoreScroll(scrollContainer, savedTop);
  });
}

export function paginatePaymentAdvice() {
  const container = getPreviewContainer();
  if (!container) return;

  const adviceEls = container.querySelectorAll('[data-role="advice-render"], [data-generated="advice-page-cont"]');
  if (AppState.mode !== 'invoice') {
    adviceEls.forEach(el => el.remove());
    return;
  }

  const scrollContainer = getScrollContainer(container);
  const savedTop = scrollContainer ? scrollContainer.scrollTop : 0;

  const html = AppState.paymentAdvice?.content || '';
  const plain = html.replace(/<[^>]*>/g, '').trim();
  if (!plain) {
      container.querySelectorAll('[data-role="advice-render"], [data-generated="advice-page-cont"]').forEach(el => el.remove());
      return;
  }

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
    if (contentFits(anchorSection, render)) { restoreScroll(scrollContainer, savedTop); return; }

    if (getVisiblePages().length >= MAX_PAGES) return;
    const sec = createContinuationPage('advice-page-cont', 'advice-content');
    const role = sec.querySelector('[data-role="advice-content"]');
    role.innerHTML = `<div class="text-sm text-gray-700">${html}</div>`;
    insertAfter(container, sec, anchorSection);

    refreshDocumentPages();
    restoreScroll(scrollContainer, savedTop);
  });
}

export function cleanupQuoteContinuationPages() {
  if (AppState.mode !== 'quote') return;
  document.querySelectorAll('#document-preview [data-generated="items-page"], #document-preview [data-generated="signature-page"]').forEach(el => el.remove());
}

// Removed unused paginateQuoteOverflow; logic consolidated in other paginators

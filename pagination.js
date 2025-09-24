// pagination.js
import { AppState } from './state.js';
import { refreshDocumentPages } from './dom.js';

function getPreviewContainer() {
  return document.getElementById('document-preview');
}

function createContinuationPage(type) {
  const page = document.createElement('section');
  page.className = 'document-page p-12 aspect-[1/1.414]';
  page.dataset.generated = type;
  page.innerHTML = `
    <div class="page-header"><div></div><div></div></div>
    <div class="page-footer"><span class="page-number"></span> / <span class="page-count"></span></div>
  `;
  return page;
}

function contentFits(contentElement) {
    const page = contentElement.closest('.document-page');
    if (!page) return true;
    const footer = page.querySelector('.page-footer');
    if (!footer) return true;
    return contentElement.getBoundingClientRect().bottom < footer.getBoundingClientRect().top;
}

function paginate(contentElement, sourceHTML) {
    const container = getPreviewContainer();
    contentElement.innerHTML = sourceHTML;

    let currentPage = contentElement.closest('.document-page');
    let currentContent = contentElement;

    while (!contentFits(currentContent)) {
        let nextPage = currentPage.nextElementSibling;
        if (!nextPage || !nextPage.classList.contains('document-page')) {
            nextPage = createContinuationPage('content-overflow');
            container.appendChild(nextPage);
        }

        const nextPageContent = document.createElement('div');
        nextPageContent.className = currentContent.className;
        nextPage.insertBefore(nextPageContent, nextPage.querySelector('.page-footer'));

        while (!contentFits(currentContent) && currentContent.lastChild) {
            nextPageContent.insertBefore(currentContent.lastChild, nextPageContent.firstChild);
        }
        currentPage = nextPage;
        currentContent = nextPageContent;
    }
}

export function paginateLetterheadContent() {
    const contentElement = document.getElementById('preview-letterhead-content');
    if (contentElement) {
        paginate(contentElement, AppState.letterhead?.content || '');
    }
}

export function paginateNotesContent() {
    const contentElement = document.getElementById('preview-notes');
    if (contentElement) {
        paginate(contentElement, AppState.notes || '');
    }
}

export function paginatePaymentAdvice() {
    const contentElement = document.getElementById('preview-advice-content');
    if (contentElement) {
        paginate(contentElement, AppState.paymentAdvice?.content || '');
    }
}

export function cleanup() {
    const container = getPreviewContainer();
    container.querySelectorAll('[data-generated]').forEach(el => el.remove());
    document.getElementById('preview-letterhead-content').innerHTML = '';
    document.getElementById('preview-notes').innerHTML = '';
    document.getElementById('preview-advice-content').innerHTML = '';
}

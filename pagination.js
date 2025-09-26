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

function paginate(contentElement, sourceHTML, continuationType) {
    const container = getPreviewContainer();
    const containerScrollTop = container ? container.scrollTop : null;
    const contentScrollTop = contentElement ? contentElement.scrollTop : null;
    const pageScrollY = (typeof window !== 'undefined' && typeof window.scrollY === 'number') ? window.scrollY : null;
    contentElement.innerHTML = sourceHTML;

    let currentPage = contentElement.closest('.document-page');
    let currentContent = contentElement;

    // Clear old continuation pages
    container.querySelectorAll(`[data-generated="${continuationType}"]`).forEach(el => el.remove());

    while (!contentFits(currentContent)) {
        let nextPage = currentPage.nextElementSibling;
        if (!nextPage || nextPage.dataset.generated !== continuationType) {
            nextPage = createContinuationPage(continuationType);
            currentPage.after(nextPage);
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

    refreshDocumentPages();

    const restoreScroll = () => {
        if (contentElement && typeof contentScrollTop === 'number') {
            contentElement.scrollTop = contentScrollTop;
        }
        if (container && typeof containerScrollTop === 'number') {
            container.scrollTop = containerScrollTop;
        }
        if (typeof window !== 'undefined' && typeof pageScrollY === 'number') {
            window.scrollTo({ left: window.scrollX || 0, top: pageScrollY });
        }
    };

    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
            restoreScroll();
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(restoreScroll);
            }
        });
    } else {
        restoreScroll();
    }
}

export function paginateLetterheadContent() {
    const contentElement = document.getElementById('preview-letterhead-content');
    if (contentElement && AppState.mode === 'letterhead') {
        paginate(contentElement, AppState.letterhead?.content || '', 'letterhead-page');
    } else if (contentElement) {
        contentElement.innerHTML = '';
    }
}

export function paginateNotesContent() {
    const contentElement = document.getElementById('preview-notes');
    if (contentElement && AppState.mode === 'quote') {
        paginate(contentElement, AppState.notes || '', 'notes-page-cont');
    } else if (contentElement) {
        contentElement.innerHTML = '';
    }
}

export function paginatePaymentAdvice() {
    const contentElement = document.getElementById('preview-advice-content');
    if (contentElement && AppState.mode === 'invoice') {
        paginate(contentElement, AppState.paymentAdvice?.content || '', 'advice-page-cont');
    } else if (contentElement) {
        contentElement.innerHTML = '';
    }
}

export function cleanup() {
    const container = getPreviewContainer();
    container.querySelectorAll('[data-generated]').forEach(el => el.remove());
    const letterhead = document.getElementById('preview-letterhead-content');
    if(letterhead) letterhead.innerHTML = '';
    const notes = document.getElementById('preview-notes');
    if(notes) notes.innerHTML = '';
    const advice = document.getElementById('preview-advice-content');
    if(advice) advice.innerHTML = '';
}

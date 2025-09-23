   import { ThemeSources, NotesTemplates } from './config.js';
   import { debounce, formatCurrency, formatDate, toLocalYMD, todayLocalYMD, dateFromYMD, printDocument, capitalize, toCssUrl, schedule, getAvailableHeight, fitsInSection, insertBeforeFooter, ASSET_RESOLVER, EmbeddedAssets, DefaultLogoPath } from './utils.js';
   import { render, buildThemesGrid } from './dom.js';
   import { AppState, loadState, getInitialState, saveState } from './state.js';
   // APP STATE is now managed in state.js
    // File-based themes will be replaced by embedded data URIs later

    // Asset helpers moved to utils.js

    // Page helpers moved into dom.js

    // getAvailableHeight moved to utils.js

    // fitsInSection moved to utils.js

    // schedule moved to utils.js
    function repaginateAndRefresh(paginateFn) { schedule(() => { paginateFn(); refreshDocumentPages(); }); }
    // Debounce helper moved to utils.js

    // Insert a node before a section's footer (or append if missing)
    // insertBeforeFooter moved to utils.js

    // Build a continuation page for items with a table body injected
    function createItemsContinuationPage(rowsHtml) {
      const sec = createContinuationPage('items-page', 'items-content');
      const container = sec.querySelector('[data-role="items-content"]');
      container.innerHTML = `
        <table class="w-full mb-8 text-sm">
          <thead class="border-b-2 border-gray-800">
            <tr>
              <th class="text-left font-bold text-gray-600 uppercase py-2">Description</th>
              <th class="text-right font-bold text-gray-600 uppercase py-2 w-24">Quantity</th>
              <th class="text-right font-bold text-gray-600 uppercase py-2 w-28">Unit Price</th>
              <th class="text-right font-bold text-gray-600 uppercase py-2 w-32">Total</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>`;
      return sec;
    }

    document.addEventListener('DOMContentLoaded', () => {
      try {
        const appEl = document.getElementById('app-container');
        if (appEl) appEl.style.display = 'none';
        loadState();
        // After loading state, ensure a document number exists
        generateDocumentNumber();
        initApp();
        if (appEl) appEl.style.display = 'flex';
      } catch (error) {
        console.error('Failed to initialize Tomar Admin:', error);
        const esc = (s) => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
        const msg = (error && (error.stack || error.message || String(error))) || 'Unknown error';
        document.body.innerHTML = `
          <div class="h-screen w-screen flex items-center justify-center bg-red-100 text-red-800">
            <div class="text-center max-w-2xl p-6">
              <h1 class="text-2xl font-bold">Application Error</h1>
              <p class="mt-2">Could not start the application. The saved data might be corrupted.</p>
              <pre class="text-xs text-left bg-white text-red-700 p-3 mt-3 rounded overflow-auto max-h-64 border">${esc(msg)}</pre>
              <p class="mt-4"><button onclick="localStorage.removeItem('tomarAdminState'); location.reload();" class="bg-red-500 text-white px-4 py-2 rounded">Reset and Reload</button></p>
            </div>
          </div>`;
      }
    });

    function initApp() {
      setMode(AppState.mode, true);
      if (!AppState.document.date) {
        AppState.document.date = todayLocalYMD();
      }
      if (!AppState.document.dueDate) {
        const d = dateFromYMD(AppState.document.date);
        d.setDate(d.getDate() + 14); // sensible default due date
        AppState.document.dueDate = toLocalYMD(d);
      }
      // No default acceptance date; date field removed
      if (AppState.lineItems.length === 0) addLineItem(false);
      addEventListeners();
      buildThemesGrid();
      render();
    }

    // Rich Text helpers
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
        if (editor) {
          editor.focus();
        }
        // Custom clear action: wipe content and update AppState
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
        try {
          document.execCommand(cmd, false, value || null);
        } catch (e) { console.warn('execCommand failed', e); }
      });
    }



    // STATE MANAGEMENT moved to state.js

    // EVENT LISTENERS
    function addEventListeners() {
      document.getElementById('client-name').addEventListener('input', e => { AppState.clientInfo.name = e.target.value; render(); });
      document.getElementById('client-address').addEventListener('input', e => { AppState.clientInfo.address = e.target.value; render(); });
      document.getElementById('client-email').addEventListener('input', e => { AppState.clientInfo.email = e.target.value; render(); });
      document.getElementById('client-phone').addEventListener('input', e => { AppState.clientInfo.phone = e.target.value; render(); });
      document.getElementById('doc-date').addEventListener('change', e => { AppState.document.date = e.target.value; render(); });
      document.getElementById('due-date').addEventListener('change', e => { AppState.document.dueDate = e.target.value; render(); });
      document.getElementById('discount-value').addEventListener('input', e => {
        const raw = e.target.value.trim();
        if (raw === '') {
          AppState.totals.discount = null;
        } else {
          const numeric = parseFloat(raw.replace(/[^0-9.\-]/g, ''));
          AppState.totals.discount = isNaN(numeric) || numeric <= 0 ? null : numeric;
        }
        render();
      });
      document.getElementById('gst-rate').addEventListener('input', e => {
        const v = parseFloat(e.target.value);
        AppState.totals.gstRate = isNaN(v) ? 0 : v;
        render();
      });
      // Notes RTE input (debounced)
      // This creates a debounced version of your pagination function
      const debouncedNotesUpdate = debounce(paginateNotesContent, 100);
      const notesEditor = document.getElementById('notes-editor');
      if (notesEditor) {
        // The listener now calls the smoother, debounced function
        notesEditor.addEventListener('input', debouncedNotesUpdate);
      }
      document.getElementById('branch-form').addEventListener('submit', handleBranchFormSubmit);
      // Payment Advice editor input (debounced)
      const advEd = document.getElementById('advice-editor');
      if (advEd) {
        const debouncedAdviceUpdate = debounce(() => { paginatePaymentAdvice(); refreshDocumentPages(); }, 200);
        advEd.addEventListener('input', debouncedAdviceUpdate);
      }
      // Letterhead RTE input
      const lhContent = document.getElementById('letterhead-editor');
      if (lhContent) lhContent.addEventListener('input', e => { AppState.letterhead.content = e.target.innerHTML; render(); });
      // RTE toolbars
      bindRteToolbar('notes-toolbar');
      bindRteToolbar('letterhead-toolbar');
      bindRteToolbar('advice-toolbar');
      // Notes templates (quote mode only)
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
      const accName = document.getElementById('accept-name');
      const accSig = document.getElementById('accept-signature');
      if (accName) accName.addEventListener('input', e => { AppState.acceptance.name = e.target.value; render(); });
      if (accSig) accSig.addEventListener('input', e => { AppState.acceptance.signature = e.target.value; render(); });
    }

    // Bridge DOM module events to internal handlers
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

    // RENDERING moved to dom.js

    // render moved to dom.js

    // updatePageNumbers moved to dom.js

    // updatePageHeaders moved to dom.js

    // Centralize mode-based UI visibility toggles
    // updateModeUI moved to dom.js

    // Pagination: split items across multiple pages
    const ROWS_PER_PAGE_FIRST = 12;
    const ROWS_PER_PAGE_CONT = 22;
    const MAX_PAGES = 10; // hard cap for total visible pages

    function getVisiblePages() {
      const nodes = Array.from(document.querySelectorAll('#document-preview .document-page'));
      return nodes.filter(p => window.getComputedStyle(p).display !== 'none');
    }

    function renderItemsAndPaginate() {
      // Page 1 rows
      const tbody = document.getElementById('preview-line-items');
      if (!tbody) return;
      const rows = AppState.lineItems.map(item => buildItemRowHTML(item));
      tbody.innerHTML = rows.slice(0, ROWS_PER_PAGE_FIRST).join('');

      // Remove previously generated item pages, but never remove a page containing the signature block
      (function safeRemoveOldItemPages() {
        const acceptEl = document.getElementById('acceptance-preview');
        document.querySelectorAll('#document-preview [data-generated="items-page"]').forEach(el => {
          if (acceptEl && el.contains(acceptEl)) return; // preserve signature page
          el.remove();
        });
      })();
      // Remove any previously generated acceptance-only pages (will be re-evaluated later)
      // (No special acceptance pages to clean)

      const notesPage = document.getElementById('notes-page');
      const container = document.getElementById('document-preview');
      if (!container) return;

      let start = ROWS_PER_PAGE_FIRST;
      let pageIndex = 1;
      // Respect the global page cap: base page is 1, so allow up to MAX_PAGES - 1 continuation pages here
      const maxContinuationPages = Math.max(0, MAX_PAGES - 1);
      while (start < rows.length && pageIndex <= maxContinuationPages) {
        const chunk = rows.slice(start, start + ROWS_PER_PAGE_CONT).join('');
        const section = createItemsContinuationPage(chunk);
        if (notesPage && notesPage.parentElement === container) {
          container.insertBefore(section, notesPage);
        } else {
          container.appendChild(section);
        }
        start += ROWS_PER_PAGE_CONT;
        pageIndex++;
      }
      // Refresh after adding items continuation pages
      refreshDocumentPages();
    }

    // Ensure acceptance block sits 96px below the last item row, after the final items page.
    function ensureAcceptancePositioning() {
      if (AppState.mode !== 'quote') return;
      const container = document.getElementById('document-preview');
      const accept = document.getElementById('acceptance-preview');
      if (!container || !accept) return;
      // Identify the target section: the last generated items page or first page
      const generated = document.querySelectorAll('#document-preview [data-generated="items-page"]');
      const targetSection = generated.length > 0
        ? generated[generated.length - 1]
        : document.querySelector('#document-preview .document-page');
      if (!targetSection) return;

      // Insert acceptance into targetSection just before its footer
      const footer = targetSection.querySelector('.page-footer');
      if (accept.parentElement !== targetSection || (footer && accept.nextElementSibling !== footer)) {
        insertBeforeFooter(targetSection, accept);
      }

      // Enforce 1 inch spacing from prior content
      accept.style.marginTop = '96px';

      // Double rAF to ensure layout is fully stable before measuring
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const footerRect = footer ? footer.getBoundingClientRect() : null;
          const acceptRect = accept.getBoundingClientRect();
          let needsNewPage = false;
          if (footerRect) {
            const currentYPosition = acceptRect.top;
            const availableHeight = footerRect.top - currentYPosition;
            const blockHeight = acceptRect.height + 96; // include 1-inch margin
            needsNewPage = availableHeight < blockHeight;
          }
          if (!needsNewPage) return;
          const visibleCount = getVisiblePages().length;
          if (visibleCount >= MAX_PAGES) { accept.style.marginTop = '24px'; return; }
          const acceptPage = createContinuationPage('signature-page', 'signature-content');
          if (targetSection && targetSection.parentNode) {
            if (targetSection.nextSibling) targetSection.parentNode.insertBefore(acceptPage, targetSection.nextSibling);
            else targetSection.parentNode.appendChild(acceptPage);
          } else { container.appendChild(acceptPage); }
          const acceptFooter = acceptPage.querySelector('.page-footer');
          accept.style.marginTop = '96px';
          insertBeforeFooter(acceptPage, accept);
          // Refresh after adding a signature page
          refreshDocumentPages();
        });
      });
    }

    function buildItemRowHTML(item) {
      const qty = isFinite(item.quantity) ? item.quantity : 0;
      const price = isFinite(item.unitPrice) ? item.unitPrice : 0;
      const total = qty * price;
      return `
        <tr class="border-b border-gray-200">
          <td class="py-2 pr-2 whitespace-pre-line">${item.description || ''}</td>
          <td class="text-right py-2 px-2">${qty || ''}</td>
          <td class="text-right py-2 px-2">${formatCurrency(price)}</td>
          <td class="text-right py-2 pl-2 font-medium">${formatCurrency(total)}</td>
        </tr>`;
    }

      // THEMES
    function getAllThemeSources() {
      // Prefer embedded data URIs if available, otherwise fall back to resolved file paths
      const base = (EmbeddedAssets.backgrounds && EmbeddedAssets.backgrounds.length > 0)
        ? EmbeddedAssets.backgrounds
        : ThemeSources;
      return base.map(ASSET_RESOLVER);
    }

    function buildThemesGrid() {
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

    function selectTheme(src) {
      AppState.theme = { background: src };
      render();
    }

    // Paginate letterhead content into additional pages if it overflows.
    // moved to pagination.js: paginateLetterheadContent
      if (AppState.mode !== 'letterhead') return;
      const container = document.getElementById('document-preview');
      if (!container) return;
      // Remove previously generated letterhead pages
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
          // Move node to a new letterhead page
          currentContainer.removeChild(node);
          // Enforce page cap
          if (getVisiblePages().length >= MAX_PAGES) {
            return; // stop adding more pages/content
          }
          const sec = createContinuationPage('letterhead-page', 'letterhead-content');
          container.appendChild(sec);
          currentSection = sec;
          currentContainer = sec.querySelector('[data-role="letterhead-content"]');
          currentContainer.appendChild(node);
        }
      });

      // Refresh after adding continuation pages
      refreshDocumentPages();

      // If first page ended up with no letterhead content but we created continuation pages, hide it
      const hasFirstContent = firstContent.textContent.trim().length > 0 || firstContent.children.length > 0;
      const generatedPages = container.querySelectorAll('[data-generated="letterhead-page"]').length;
      if (!hasFirstContent && generatedPages > 0) {
        firstSection.style.display = 'none';
      } else {
        firstSection.style.display = '';
      }
    }

    // Paginate Notes content across pages using cloned content; editor remains intact and editable.
    // moved to pagination.js: paginateNotesContent
      if (AppState.mode !== 'quote') return;

      const container = document.getElementById('document-preview');
      const scrollContainer = document.querySelector('.preview-column') || container; // actual scrollable pane
      const savedTop = scrollContainer ? scrollContainer.scrollTop : 0;
      const accept = document.getElementById('acceptance-preview');
      const notesEditor = document.getElementById('notes-editor'); // the editable input
      if (!container || !accept || !notesEditor) return;

      // Snapshot current editor HTML; never move or clear the editor
      const html = notesEditor.innerHTML || '';
      const hasNotes = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;

      // Remove prior Notes render containers and continuation pages (never touch signature pages)
      container.querySelectorAll('[data-role="notes-render"], [data-generated="notes-page-cont"]').forEach(el => {
        const signatureEl = document.getElementById('acceptance-preview');
        if (signatureEl && el.contains(signatureEl)) return;
        el.remove();
      });

      if (!hasNotes) return; // nothing to render (editor stays visible and editable)

      // Insert fresh render container after signature, before footer
      const targetSection = accept.closest('.document-page');
      const footer = targetSection?.querySelector('.page-footer');
      if (!targetSection || !footer) return;

      const render = document.createElement('div');
      render.setAttribute('data-role', 'notes-render');
      render.className = 'text-sm text-gray-700';
      render.innerHTML = html;
      insertBeforeFooter(targetSection, render);

      // Pagination: clone nodes into continuation pages if overflow
      requestAnimationFrame(() => {
        const footerRect = footer.getBoundingClientRect();
        const renderRect = render.getBoundingClientRect();
        const fitsOnSamePage = (footerRect.top - renderRect.top) >= renderRect.height;
        if (fitsOnSamePage) {
          // Restore scroll if no pagination work needed
          if (scrollContainer) requestAnimationFrame(() => { scrollContainer.scrollTop = savedTop; });
          return;
        }

        const temp = document.createElement('div');
        temp.innerHTML = html;
        const nodes = Array.from(temp.childNodes);

        // Clear inline render and paginate content into continuation pages
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
          if (typeof MAX_PAGES === 'number' && getVisiblePages && getVisiblePages().length >= MAX_PAGES) break;
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
              // Extremely tall node; leave as-is to avoid infinite loops
            }
          }
        }

        // Refresh after adding continuation pages and restore scroll
        refreshDocumentPages();
        if (scrollContainer) requestAnimationFrame(() => { scrollContainer.scrollTop = savedTop; });
      });
      // Final restore removed to avoid double-setting scroll in same frame (debounced input smooths updates)
    }

    // Payment Advice (Invoice mode only) – hardcoded, clone-not-move, continuation pages
    // moved to pagination.js: paginatePaymentAdvice
      if (AppState.mode !== 'invoice') return;

      const container = document.getElementById('document-preview');
      const scrollContainer = document.querySelector('.preview-column') || container; // actual scrollable pane
      const savedTop = scrollContainer ? scrollContainer.scrollTop : 0;
      if (!container) return;

      // Dynamic hardcoded advice content with selected due date and account details
      const due = AppState?.document?.dueDate ? formatDate(AppState.document.dueDate) : '';
      const html = due
        ? `<p><strong>Payment Advice:</strong> This invoice is due on <strong>${due}</strong>.<br/>Please make payment to <strong>Tomar Contracting Limited</strong>, Account No: <strong>38-9024-0318399-00</strong>.</p>`
        : '';

      // Cleanup previous advice render/continuation pages (never touch signature pages)
      const signatureEl = document.getElementById('acceptance-preview');
      container.querySelectorAll('[data-role="advice-render"], [data-generated="advice-page-cont"]').forEach(el => {
        if (signatureEl && el.contains(signatureEl)) return;
        el.remove();
      });

      // Determine placement: after notes if present; otherwise after signature
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

      // Insert inline render container before footer on the anchor page
      const render = document.createElement('div');
      render.setAttribute('data-role', 'advice-render');
      render.className = 'text-sm text-gray-700';
      render.innerHTML = html;
      insertBeforeFooter(anchorSection, render);

      // Paginate if overflow (clone‑not‑move)
      requestAnimationFrame(() => {
        const footerRect = footer.getBoundingClientRect();
        const renderRect = render.getBoundingClientRect();
        const fitsOnSamePage = (footerRect.top - renderRect.top) >= renderRect.height;

        if (fitsOnSamePage) { 
          refreshDocumentPages(); 
          if (scrollContainer) requestAnimationFrame(() => { scrollContainer.scrollTop = savedTop; });
          return; 
        }

        const temp = document.createElement('div'); temp.innerHTML = html; const nodes = Array.from(temp.childNodes);
        render.innerHTML = '';
        let currentSection = anchorSection; let currentContainer = render;

        function createAdvicePageAfter(section) {
          const sec = createContinuationPage('advice-page-cont', 'advice-content');
          const role = sec.querySelector('[data-role="advice-content"]');
          if (role) role.classList.add('text-gray-700');
          if (section.nextSibling) container.insertBefore(sec, section.nextSibling); else container.appendChild(sec);
          return sec;
        }

        function currentAvail() {
          const footerEl = currentSection.querySelector('.page-footer');
          const availableHeight = footerEl.getBoundingClientRect().top - currentContainer.getBoundingClientRect().top;
          const blockHeight = currentContainer.getBoundingClientRect().height;
          return { availableHeight, blockHeight };
        }

        for (const node of nodes) {
          if (typeof MAX_PAGES === 'number' && getVisiblePages && getVisiblePages().length >= MAX_PAGES) break;
          const clone = node.cloneNode(true);
          currentContainer.appendChild(clone);
          const { availableHeight, blockHeight } = currentAvail();
          if (availableHeight < blockHeight) {
            currentContainer.removeChild(clone);
            currentSection = createAdvicePageAfter(currentSection);
            currentContainer = currentSection.querySelector('[data-role="advice-content"]');
            currentContainer.appendChild(clone);
            const check2 = currentAvail(); if (check2.availableHeight < check2.blockHeight) { /* leave as-is */ }
          }
        }

        refreshDocumentPages();
        if (scrollContainer) requestAnimationFrame(() => { scrollContainer.scrollTop = savedTop; });
      });
      // Safety restore in case of any missed path
      if (scrollContainer) { scrollContainer.scrollTop = savedTop; }
    }

    // QUOTE: Clean and prevent footer overlap by moving overflow to continuation pages
    // moved to pagination.js: cleanupQuoteContinuationPages
      const container = document.getElementById('document-preview');
      if (!container) return;
      container.querySelectorAll('[data-generated="quote-page-cont"]').forEach(el => el.remove());
    }

    // moved to pagination.js: paginateQuoteOverflow
      if (AppState.mode !== 'quote') return;
      const container = document.getElementById('document-preview');
      if (!container) return;
      // Work on the last visible page only
      const pages = getVisiblePages();
      if (pages.length === 0) return;
      const section = pages[pages.length - 1];
      const footer = section.querySelector('.page-footer');
      if (!footer) return;

      requestAnimationFrame(() => {
        const footerTop = footer.getBoundingClientRect().top;
        // Collect content children between header and footer
        const elements = Array.from(section.children).filter(el => !el.classList.contains('page-header') && !el.classList.contains('page-footer'));
        if (elements.length === 0) return;
        const lastEl = elements[elements.length - 1];
        // Do not interfere with acceptance or notes (they have their own pagination/placement)
        if (lastEl.id === 'acceptance-preview' || lastEl.getAttribute('data-role') === 'notes-render') return;
        const lastBottom = lastEl.getBoundingClientRect().bottom;
        if (lastBottom <= footerTop - 2) return; // fits, nothing to do

        // Create a quote continuation page and move the overflowing block
        const cont = createContinuationPage('quote-page-cont', 'quote-content');
        if (section.nextSibling) container.insertBefore(cont, section.nextSibling); else container.appendChild(cont);
        insertBeforeFooter(cont, lastEl);

        // Apply backgrounds and numbering after adjusting pages
        refreshDocumentPages();
      });
    }

    function renderBranchDropdown() {
      const select = document.getElementById('branch-select');
      select.innerHTML = '';
      AppState.branches.forEach((branch, index) => {
        const option = document.createElement('option');
        option.value = index; option.textContent = branch.name; if (index === AppState.selectedBranchIndex) option.selected = true; select.appendChild(option);
      });
    }

    function renderLineItems() {
      const container = document.getElementById('line-items-container');
      container.innerHTML = '';
      AppState.lineItems.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-12 gap-2 items-center line-item-row';
        row.innerHTML = `
          <div class="col-span-12 md:col-span-6">
            <textarea placeholder="Description" rows="2" class="w-full p-2 border border-gray-300 rounded-md text-sm">${item.description || ''}</textarea>
          </div>
          <div class="col-span-4 md:col-span-2">
            <input type="number" placeholder="Qty" value="${item.quantity ?? 1}" class="w-full p-2 border border-gray-300 rounded-md text-sm">
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
        inputs[0].addEventListener('input', e => updateLineItem(index, 'description', e.target.value));
        inputs[1].addEventListener('input', e => updateLineItem(index, 'quantity', parseFloat(e.target.value)));
        inputs[2].addEventListener('input', e => updateLineItem(index, 'unitPrice', parseFloat(e.target.value)));
        row.querySelector('button').addEventListener('click', () => removeLineItem(index));
        container.appendChild(row);
      });
    }

    // moved to dom.js: renderPreviewLineItems
      const tbody = document.getElementById('preview-line-items');
      tbody.innerHTML = '';
      AppState.lineItems.forEach(item => {
        const qty = isFinite(item.quantity) ? item.quantity : 0;
        const price = isFinite(item.unitPrice) ? item.unitPrice : 0;
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

    // moved to dom.js: calculateAndRenderTotals
      const subtotal = AppState.lineItems.reduce((acc, item) => {
        const q = isFinite(item.quantity) ? item.quantity : 0;
        const p = isFinite(item.unitPrice) ? item.unitPrice : 0;
        return acc + q * p;
      }, 0);
      const discount = getValidDiscount();
      const gstRate = isFinite(AppState.totals.gstRate) ? AppState.totals.gstRate : 0;
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
      const gstRateDisplay = isFinite(gstRate) ? gstRate.toFixed(2).replace(/\.?0+$/, '') : '0';
      const gstRateEl = document.getElementById('preview-gst-rate');
      const gstAmountEl = document.getElementById('preview-gst-amount');
      if (gstRateEl) gstRateEl.innerText = gstRateDisplay;
      if (gstAmountEl) gstAmountEl.innerText = formatCurrency(gstAmount);
      const subtotalEl = document.getElementById('preview-subtotal');
      const totalEl = document.getElementById('preview-grand-total');
      if (subtotalEl) subtotalEl.innerText = formatCurrency(subtotal);
      if (totalEl) totalEl.innerText = formatCurrency(grandTotal);
    }

    function renderSavedDocuments() {
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
        loadBtn.addEventListener('click', () => loadDocument(doc.id));
        delBtn.addEventListener('click', () => deleteDocument(doc.id));
        listContainer.appendChild(item);
      });
    }

    // DOCUMENT ACTIONS
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
      initApp();
    }

    function generateDocumentNumber() {
      if (AppState.mode === 'letterhead') {
        AppState.document.number = '';
        return;
      }
      AppState.document.number = AppState.mode === 'quote' ? `TC-${AppState.global.counters.quote}` : `INV-${AppState.global.counters.invoice}`;
    }

    function saveDocument() {
      const docId = AppState.id || Date.now().toString();
      const existingIdx = AppState.global.savedDocuments.findIndex(d => d.id === docId);
      const snapshot = JSON.parse(JSON.stringify(AppState));
      delete snapshot.global; snapshot.id = docId;
      if (existingIdx === -1) {
        // First time save: stamp creation time and advance sequence counters
        snapshot.meta = { createdAt: new Date().toISOString() };
        if (AppState.mode === 'quote') AppState.global.counters.quote++; else AppState.global.counters.invoice++;
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

    // LINE ITEMS
    function addLineItem(shouldRender = true) {
      AppState.lineItems.push({ description: '', quantity: 1, unitPrice: 0 });
      if (shouldRender) render();
    }

    function removeLineItem(index) { AppState.lineItems.splice(index, 1); render(); }

    function updateLineItem(index, key, value) {
      if (!AppState.lineItems[index]) return;
      if (key === 'quantity' || key === 'unitPrice') {
        const v = parseFloat(value);
        AppState.lineItems[index][key] = isNaN(v) ? 0 : v;
      } else {
        // description or other string fields
        AppState.lineItems[index][key] = value;
      }
      // Avoid full re-render while the user is typing in the line item controls.
      // Just refresh the preview and totals so typing is smooth and doesn't lose the caret.
      softUpdateAfterLineEdit();
    }

    function softUpdateAfterLineEdit() {
      try {
        render();
      } catch (e) {
        render();
      }
    }

    // BRANCH MANAGEMENT
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

    // Expose selected actions for inline HTML handlers
    Object.assign(window, {
      setMode,
      newDocument,
      saveDocument,
      toggleBranchModal,
      addLineItem,
      clearBranchForm,
      printDocument,
    });

    // UTILITIES
    function updateModeButtons() {
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

    function getValidDiscount() {
      const raw = AppState && AppState.totals ? AppState.totals.discount : null;
      const numeric = typeof raw === 'number' ? raw : parseFloat(raw);
      if (!isFinite(numeric) || numeric <= 0) return 0;
      return numeric;
    }

    // Utility functions moved to utils.js

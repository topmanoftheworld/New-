    // APP STATE
    let AppState = {};
    // File-based themes will be replaced by embedded data URIs later
    const ThemeSources = [
      'Assets/Image 1 .png',
      'Assets/2.png',
      'Assets/3.png',
      'Assets/4.png',
      'Assets/5.png',
      'Assets/6.png',
      'Assets/7.png',
      'Assets/8.png',
      'Assets/9.png'
    ];
    // Placeholder for inlined assets (populated in a later step)
    const EmbeddedAssets = { backgrounds: [], logo: null };
    const DefaultLogoPath = 'Logo.png';

    document.addEventListener('DOMContentLoaded', () => {
      try {
        document.getElementById('app-container').style.display = 'none';
        loadState();
        initApp();
        document.getElementById('app-container').style.display = 'flex';
      } catch (error) {
        console.error('Failed to initialize Tomar Admin:', error);
        document.body.innerHTML = `
          <div class="h-screen w-screen flex items-center justify-center bg-red-100 text-red-800">
            <div class="text-center">
              <h1 class="text-2xl font-bold">Application Error</h1>
              <p>Could not start the application. The saved data might be corrupted.</p>
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

    // Notes/Terms templates (HTML)
    const NotesTemplates = {
      exterior: `
        <h3>Agreement & Acceptance</h3>
        <p><strong>Binding Agreement:</strong> This quotation is valid for acceptance for 90 days from the date of issue. Acceptance must be confirmed in writing (e.g., via email or by signing and returning this document). In the absence of written confirmation, a verbal or written instruction for work to commence will constitute your full acceptance of this quotation and all terms and conditions contained herein.</p>
        <p><strong>Consumer Guarantees Act 1993 (CGA):</strong> For residential projects, this agreement is subject to the guarantees outlined in the CGA, which ensure that our services are provided with reasonable care and skill, are fit for purpose, and are completed within a reasonable timeframe.</p>
        <p><strong>Construction Contracts Act 2002 (CCA):</strong> All painting work is defined as "construction work" under the CCA. All invoices issued by Tomar Contracting Limited will be in the form of a "Payment Claim" under the Act.</p>
        <h3>Project Execution & Site Management</h3>
        <p><strong>Weather Contingency:</strong> Exterior painting is strictly weather-dependent. Work cannot proceed during rain, in high winds, when humidity is above 85%, or when temperatures are below the paint manufacturer's minimum specification (typically 10°C). The agreed-upon project timeline will be extended to account for any days lost due to adverse weather, and Tomar Contracting Limited shall not be held liable for such delays. We will maintain proactive communication regarding any weather-related schedule changes.</p>
        <p><strong>Site Access & Client Responsibilities:</strong> The client agrees to provide clear, safe, and unimpeded access to all work areas for the duration of the project. Prior to our arrival, we request that you:</p>
        <ul>
          <li>Remove all vehicles from driveways and nearby parking spaces.</li>
          <li>Relocate all outdoor furniture, pot plants, BBQs, and decorative items away from the house.</li>
          <li>Trim back any trees, shrubs, or vines that are touching or within 60cm of the surfaces to be painted.</li>
          <li>Ensure pets and children are kept clear of the work area at all times for their safety.</li>
        </ul>
        <p><strong>Health & Safety:</strong> All work will be conducted in strict accordance with the Health and Safety at Work Act 2015. Our team is SiteSafe certified and will operate under a site-specific safety plan. The client has a duty to inform us of any known hazards on the property, such as asbestos, unstable structures, or faulty wiring, prior to work commencing.</p>
        <h3>Scope, Variations & Unforeseen Conditions</h3>
        <p><strong>Variations:</strong> Any work requested by the client that falls outside the scope of work will be treated as a variation. All variations will be quoted in writing, detailing the additional cost and any impact on the project timeline. Work on a variation will only commence after we receive your written approval.</p>
        <p><strong>Pre-Existing Conditions (Repaint Work):</strong> This quotation is based on the assumption that all existing substrates and underlying paint layers are sound. Tomar Contracting Limited is not responsible for the failure of previous coatings. If the new paint system fails due to an underlying layer losing adhesion, this is expressly excluded from our workmanship guarantee.</p>
        <p><strong>Unforeseen Issues:</strong> Any significant defects discovered only after work has commenced (e.g., extensive timber rot, structural damage, or moisture ingress hidden beneath existing paint) are excluded from this fixed-price quote. Upon discovery, work in the affected area will cease, we will notify you immediately with a clear explanation and photographic evidence, and we will provide a priced variation for the necessary remedial work. Work will not resume in that area until the variation is approved.</p>
        <p><strong>Lead-Based Paint Discovery:</strong> For properties built before the 1980s, we assume the absence of lead-based paint unless advised otherwise. If lead-based paint is suspected or discovered during preparation, all work in the affected area will cease immediately. We will notify you and provide a priced variation for the specialised containment, removal, and disposal procedures required to comply with WorkSafe New Zealand guidelines.</p>
        <p><strong>Exclusions:</strong> Unless explicitly included in the Scope of Work, this quote excludes: major carpentry or plastering repairs, painting of interior window surfaces, gutter interiors, and any areas not listed in the quote.</p>
        <h3>Warranties, Liability & Dispute Resolution</h3>
        <p><strong>Workmanship Guarantee:</strong> We provide a comprehensive workmanship guarantee on the application of the specified paint system against peeling, flaking, or blistering resulting from defective application. We also provide a one-month follow-up inspection to address any necessary touch-ups. This guarantee is separate from the paint manufacturer's product warranty and does not cover damage caused by moisture ingress, substrate movement, accidental damage by others, or normal wear and tear.</p>
        <p><strong>Limitation of Liability:</strong> Our maximum aggregate liability for any claim is limited to the total contract price. While all care is taken, older glass can become brittle and may crack during the vibrations of sanding and preparation; we are not liable for such breakages unless caused by direct negligence.</p>
        <p><strong>Dispute Resolution:</strong> In the unlikely event of a dispute, both parties agree to first attempt resolution through direct, good-faith negotiation. If unresolved, the matter may be referred to mediation or adjudication under the CCA.</p>
      `,
      interior: `
        <h3>Agreement & Acceptance</h3>
        <p><strong>Binding Agreement:</strong> This quotation is valid for acceptance for 90 days from the date of issue. Acceptance must be confirmed in writing (e.g., via email or by signing and returning this document). In the absence of written confirmation, your instruction for work to commence will constitute your full acceptance of this quotation and all terms and conditions contained herein.</p>
        <p><strong>Consumer Guarantees Act 1993 (CGA):</strong> As this is a residential project, this agreement is subject to the guarantees outlined in the CGA. This Act ensures that our services are provided with reasonable care and skill, are fit for their intended purpose, and are completed within a reasonable time.</p>
        <p><strong>Construction Contracts Act 2002 (CCA):</strong> All painting and decorating work is defined as "construction work" under the CCA. All invoices issued by Tomar Contracting Limited will be in the form of a "Payment Claim" under the Act.</p>
        <h3>Project Execution & Site Management</h3>
        <p><strong>Client Responsibilities (Pre-Commencement):</strong> To ensure a safe and efficient workflow, and to protect your belongings, we require the following to be completed by you prior to our team's arrival:</p>
        <ul>
          <li>Clear Work Areas: Please remove all furniture, pictures, mirrors, wall hangings, fragile items, electronics, and personal effects from the rooms scheduled for painting. On request our team is able to help moving items upon request.</li>
          <li>Fixtures: Please remove all curtains, blinds, and associated hardware (our team can assist if needed). Our team will remove and reinstate standard switch plates and outlet covers.</li>
          <li>Safety: Ensure children and pets are kept clear of the work area and away from our tools, equipment, and materials for the entire duration of the project.</li>
          <li>Access & Ventilation: Provide clear access to work areas, including power and water. Allow windows and doors to be opened as required for ventilation and curing.</li>
        </ul>
        <h3>Scope, Variations & Unforeseen Conditions</h3>
        <p><strong>Variations:</strong> Any work requested by the client that falls outside the scope will be treated as a variation. All variations must be requested in writing and will be separately quoted for cost and time impact. Work on a variation will commence after written approval.</p>
        <p><strong>Pre-Existing Conditions (Repaint Work):</strong> This quotation assumes existing substrates and underlying paint layers are sound and stable. Failure of previous coatings is excluded from our workmanship guarantee.</p>
        <p><strong>Unforeseen Issues:</strong> Significant defects discovered only after work has commenced (e.g., water damage, significant plaster cracking, or active mould growth hidden behind existing surfaces) are excluded from this fixed-price quote. We will notify you with explanation and photos and provide a priced variation for remedial work.</p>
        <p><strong>Exclusions:</strong> Unless explicitly included in the Scope of Work, this quote excludes: the interior of wardrobes/cupboards/closets; major plastering repairs (beyond minor hole/crack filling); removal or relocation of specialised or excessively heavy furniture.</p>
        <h3>Warranties, Liability & Dispute Resolution</h3>
        <p><strong>Workmanship Guarantee:</strong> We guarantee against defects such as peeling, flaking, or blistering resulting from faulty application, and provide a one-month follow-up for touch-ups. This guarantee is separate from the manufacturer’s warranty and excludes damage due to structural movement, moisture ingress, damage by others, or normal wear and tear.</p>
        <p><strong>Limitation of Liability:</strong> To the maximum extent permitted by law, liability is limited to the total contract price.</p>
        <p><strong>Dispute Resolution:</strong> Parties agree to first attempt resolution through good-faith negotiation; otherwise, mediation or adjudication under the CCA may be used.</p>
      `,
      roof: `
        <h3>Agreement & Acceptance</h3>
        <p><strong>Binding Agreement:</strong> This quotation is valid for acceptance for 90 days from its date of issue. Written confirmation is required; instructing us to commence work will constitute acceptance.</p>
        <p><strong>Consumer Guarantees Act 1993 (CGA):</strong> Applicable to residential work, ensuring services are carried out with reasonable care and skill, are fit for purpose, and completed within a reasonable timeframe.</p>
        <p><strong>Construction Contracts Act 2002 (CCA):</strong> All painting work, including roof painting, is defined as "construction work" under the CCA. All invoices will be in the form of a "Payment Claim".</p>
        <h3>Project Execution & Site Management</h3>
        <p><strong>Weather Contingency:</strong> Roof painting is highly weather-dependent. No work during rain, high winds, when surfaces are damp, humidity above 85%, or temperatures below manufacturer minimums (typically 10°C). Timelines will extend for weather days, without liability for delays.</p>
        <p><strong>Site Access & Client Responsibilities:</strong> Please move vehicles away from areas where overspray could drift, relocate outdoor items away from the perimeter, and ensure pets/children are kept clear of the work area.</p>
        <p><strong>Health & Safety:</strong> Work is carried out under the Health and Safety at Work Act 2015 and a site-specific safety plan. Please advise of any known hazards prior to commencement.</p>
        <h3>Scope, Variations & Unforeseen Conditions</h3>
        <p><strong>Variations:</strong> Out-of-scope work will be quoted in writing with costs and timeline impact and commenced upon written approval.</p>
        <p><strong>Pre-Existing Conditions:</strong> We assume the roof substrate and underlying coatings are fundamentally sound. Failure of previous coatings is excluded from our workmanship guarantee.</p>
        <p><strong>Unforeseen Issues:</strong> Significant issues discovered after start (e.g., corrosion, substrate failure) are excluded. We will notify you promptly with evidence and a priced variation for remedial work.</p>
        <p><strong>Exclusions:</strong> Unless included in scope, this quote excludes major structural repairs, fixing leaks not related to the new paint system, painting interior of gutters, aerials/satellite dishes/solar panels.</p>
        <h3>Warranties, Liability & Dispute Resolution</h3>
        <p><strong>Workmanship Guarantee:</strong> Covers specified paint system application against peeling, flaking, or blistering due to defective application, with a one-month follow-up inspection. Excludes horizontal surfaces or areas that collect moisture and damage beyond our control.</p>
        <p><strong>Limitation of Liability:</strong> Liability is limited to the total contract price.</p>
        <p><strong>Dispute Resolution:</strong> Disputes will first be addressed via good-faith negotiation, then mediation or adjudication under the CCA if required.</p>
      `
    };

    // STATE MANAGEMENT
    function getInitialState() {
      return {
        id: null,
        mode: 'quote',
        branches: [
          { id: 1, name: 'Tomar Contracting - Hamilton', address: '59 Boundary Road\nClaudelands, Hamilton 3214', email: 'info@tomarcontracting.co.nz', phone: '0800 TOMAR C (866272)', website: 'hamilton.tomarcontracting.co.nz', gst: '137-684-446', logo: 'Logo.png' },
          { id: 2, name: 'Tomar Contracting - Rotorua', address: '68 Alison Street\nMangakakahi, Rotorua 3015', email: 'info@tomarcontracting.co.nz', phone: '0800 TOMAR C (866272)', website: 'rotorua.tomarcontracting.co.nz', gst: '137-684-446', logo: 'Logo.png' }
      ],
        selectedBranchIndex: 0,
        clientInfo: { name: '', address: '', email: '', phone: '' },
        document: { number: '', date: '', dueDate: '' },
        lineItems: [],
        totals: { discount: null, gstRate: 15 },
        notes: '',
        acceptance: { name: '', date: '', signature: '' },
        paymentAdvice: { content: '<p><strong>Account details</strong> — Tomar Contracting Limited<br/>38-9024-0318399-00</p>' },
        theme: { background: '' },
        letterhead: { content: '' },
        global: { savedDocuments: [], counters: { quote: 1001, invoice: 1001 } }
      };
    }

    function saveState() {
      localStorage.setItem('tomarAdminState', JSON.stringify(AppState.global));
    }

    function loadState() {
      const initialState = getInitialState();
      AppState = initialState;
      const savedGlobalState = localStorage.getItem('tomarAdminState');
      if (savedGlobalState) {
        try {
          const parsedGlobal = JSON.parse(savedGlobalState);
          Object.assign(AppState.global, parsedGlobal);
        } catch (e) { console.error('Error parsing saved state:', e); }
      }
      generateDocumentNumber();
    }

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
      // Notes RTE input (live pagination without full render)
      const notesEditor = document.getElementById('notes-editor');
      if (notesEditor) notesEditor.addEventListener('input', () => {
        requestAnimationFrame(() => {
          paginateNotesContent();
          const pagesAll = document.querySelectorAll('#document-preview .document-page');
          // Reapply backgrounds and numbering/headers for any newly created pages
          const bg2 = AppState.theme && AppState.theme.background ? AppState.theme.background : '';
          pagesAll.forEach(p => { p.style.backgroundImage = bg2 ? `url("${bg2}")` : 'none'; });
          updatePageNumbers(pagesAll);
          updatePageHeaders();
        });
      });
      document.getElementById('branch-form').addEventListener('submit', handleBranchFormSubmit);
      // Payment Advice editor input (live paginate in invoice mode)
      const advEd = document.getElementById('advice-editor');
      if (advEd) advEd.addEventListener('input', () => {
        requestAnimationFrame(() => {
          paginatePaymentAdvice();
          const pagesAll = document.querySelectorAll('#document-preview .document-page');
          const bg2 = AppState.theme && AppState.theme.background ? AppState.theme.background : '';
          pagesAll.forEach(p => { p.style.backgroundImage = bg2 ? `url("${bg2}")` : 'none'; });
          updatePageNumbers(pagesAll);
          updatePageHeaders();
        });
      });
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

    // RENDERING
    function applyBackgroundsAndNumbering() {
      const pagesAll = document.querySelectorAll('#document-preview .document-page');
      const bg2 = AppState.theme && AppState.theme.background ? AppState.theme.background : '';
      pagesAll.forEach(p => { p.style.backgroundImage = bg2 ? `url("${bg2}")` : 'none'; });
      updatePageNumbers(pagesAll);
      updatePageHeaders();
    }

    function render() {
      // controls
      document.getElementById('client-name').value = AppState.clientInfo.name;
      document.getElementById('client-address').value = AppState.clientInfo.address;
      document.getElementById('client-email').value = AppState.clientInfo.email;
      document.getElementById('client-phone').value = AppState.clientInfo.phone;
      document.getElementById('doc-date').value = AppState.document.date;
      document.getElementById('due-date').value = AppState.document.dueDate;
      const discountForInput = getValidDiscount();
      const discountInputEl = document.getElementById('discount-value');
      discountInputEl.value = discountForInput > 0 ? discountForInput : '';
      if (discountForInput > 0 && typeof AppState.totals.discount !== 'number') AppState.totals.discount = discountForInput;
      if (discountForInput === 0 && AppState.totals.discount !== null) AppState.totals.discount = null;
      const gstRateValue = isFinite(AppState.totals.gstRate) ? AppState.totals.gstRate : 0;
      AppState.totals.gstRate = gstRateValue;
      document.getElementById('gst-rate').value = gstRateValue;
      if (document.getElementById('notes-editor')) {
        const nv = AppState.notes || '';
        const nvHtml = /</.test(nv) ? nv : nv.replace(/\n/g, '<br>');
        document.getElementById('notes-editor').innerHTML = nvHtml;
      }
      if (document.getElementById('letterhead-editor')) document.getElementById('letterhead-editor').innerHTML = (AppState.letterhead?.content || '');
      if (document.getElementById('accept-name')) document.getElementById('accept-name').value = AppState.acceptance?.name || '';
      if (document.getElementById('accept-signature')) document.getElementById('accept-signature').value = AppState.acceptance?.signature || '';

      renderBranchDropdown();
      renderLineItems();
      renderSavedDocuments();

      const isLetter = AppState.mode === 'letterhead';
      const isInvoice = AppState.mode === 'invoice';
      // Toggle controls blocks visibility for letterhead mode
      const itemsBlock = document.getElementById('items-block');
      const totalsBlock = document.getElementById('totals-settings');
      const acceptBlock = document.getElementById('acceptance-controls');
      const lhControls = document.getElementById('letterhead-content-controls');
      const notesControls = document.getElementById('notes-controls');
      const adviceControls = document.getElementById('advice-controls');
      const dueDateWrap = document.getElementById('due-date-wrap');
      if (itemsBlock) itemsBlock.style.display = isLetter ? 'none' : '';
      if (totalsBlock) totalsBlock.style.display = isLetter ? 'none' : '';
      if (acceptBlock) acceptBlock.style.display = (AppState.mode === 'quote') ? '' : 'none';
      if (lhControls) lhControls.classList.toggle('hidden', !isLetter);
      const hideNotesControls = AppState.mode !== 'quote';
      if (notesControls) notesControls.style.display = hideNotesControls ? 'none' : '';
      if (adviceControls) adviceControls.classList.toggle('hidden', !isInvoice);
      if (dueDateWrap) dueDateWrap.style.display = isLetter ? 'none' : '';

      const toLabel = AppState.mode === 'quote' ? 'Quote To' : (AppState.mode === 'invoice' ? 'Bill To' : '');
      document.getElementById('bill-to-heading').innerText = toLabel || 'Letterhead';
      document.getElementById('preview-to-heading').innerText = toLabel ? toLabel.toUpperCase() : '';

      const previewPanel = document.getElementById('document-preview');
      if (previewPanel) {
        previewPanel.classList.toggle('invoice-background', AppState.mode === 'invoice');
        previewPanel.classList.toggle('quote-background', AppState.mode === 'quote');
        const bg = AppState.theme && AppState.theme.background ? AppState.theme.background : '';
        const pages = previewPanel.querySelectorAll('.document-page');
        pages.forEach(p => { p.style.backgroundImage = bg ? `url("${bg}")` : 'none'; });
        updatePageNumbers(pages);
        
      }

      // preview
      const selectedBranch = AppState.branches[AppState.selectedBranchIndex] || {};
      const logoEl = document.getElementById('preview-logo');
      const fallbackLogo = EmbeddedAssets.logo || DefaultLogoPath;
      const logoSrc = selectedBranch.logo || fallbackLogo;
      if (logoSrc) { logoEl.src = logoSrc; logoEl.style.display = 'block'; } else { logoEl.style.display = 'none'; }
      document.getElementById('preview-branch-name').innerText = selectedBranch.name || '';
      document.getElementById('preview-branch-address').innerText = selectedBranch.address || '';
      document.getElementById('preview-branch-phone').innerText = selectedBranch.phone ? `P: ${selectedBranch.phone}` : '';
      document.getElementById('preview-branch-email').innerText = selectedBranch.email ? `E: ${selectedBranch.email}` : '';
      document.getElementById('preview-branch-website').innerText = selectedBranch.website ? `W: ${selectedBranch.website}` : '';
      document.getElementById('preview-branch-gst').innerText = selectedBranch.gst ? `GST: ${selectedBranch.gst}` : '';

      document.getElementById('preview-doc-title').innerText = isLetter ? 'Letterhead' : capitalize(AppState.mode);
      document.getElementById('preview-doc-number').innerText = AppState.document.number;

      document.getElementById('preview-client-name').innerText = AppState.clientInfo.name;
      document.getElementById('preview-client-address').innerText = AppState.clientInfo.address;
      document.getElementById('preview-client-email').innerText = AppState.clientInfo.email;
      document.getElementById('preview-client-phone').innerText = AppState.clientInfo.phone;

      document.getElementById('preview-doc-date').innerText = formatDate(AppState.document.date);
      document.getElementById('preview-due-date').innerText = formatDate(AppState.document.dueDate);
      // Dynamic label for Due/Validity Date
      const dueLabel = (AppState.mode === 'quote') ? 'Validity Date:' : 'Due Date:';
      const dueLabelEl = document.getElementById('due-date-label');
      if (dueLabelEl) dueLabelEl.innerText = (AppState.mode === 'quote') ? 'Validity Date' : 'Due Date';
      const prevDueLabelEl = document.getElementById('preview-due-date-label');
      if (prevDueLabelEl) prevDueLabelEl.innerText = dueLabel;

      // Letterhead preview toggles
      const previewTo = document.getElementById('preview-to');
      const itemsTable = document.getElementById('items-table');
      const totalsPreview = document.getElementById('totals-preview');
      const datesRight = document.getElementById('preview-dates-right');
      const acceptPreview = document.getElementById('acceptance-preview');
      const payAdvice = document.getElementById('payment-advice-preview');
      const lhPreview = document.getElementById('preview-letterhead-content');
      if (previewTo) previewTo.style.display = isLetter ? 'none' : '';
      const notesPage = document.getElementById('notes-page');
      const hasNotes = (() => {
        const nv = AppState.notes || '';
        const text = nv.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        return text.length > 0;
      })();
      // Do not show the dedicated notes page; notes will flow after acceptance instead
      if (notesPage) notesPage.style.display = 'none';
      if (itemsTable) itemsTable.style.display = isLetter ? 'none' : '';
      if (totalsPreview) totalsPreview.style.display = isLetter ? 'none' : '';
      if (acceptPreview) acceptPreview.style.display = (AppState.mode === 'quote') ? '' : 'none';
      if (payAdvice) payAdvice.style.display = (AppState.mode === 'invoice') ? '' : 'none';
      if (datesRight) datesRight.style.display = isLetter ? 'none' : '';
      const titleDate = document.getElementById('preview-doc-date-title');
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
        // Remove any generated item pages in letterhead mode
        document.querySelectorAll('#document-preview [data-generated="items-page"]').forEach(el => el.remove());
      }

      // Ensure acceptance is positioned with proper spacing relative to items/pages
      ensureAcceptancePositioning();

      // Update Notes HTML before pagination
      const notesPreview = document.getElementById('preview-notes');
      if (notesPreview) {
        const nv = AppState.notes || '';
        notesPreview.innerHTML = /</.test(nv) ? nv : nv.replace(/\n/g, '<br>');
      }

      // Paginate letterhead, notes, and payment advice (invoice) content
      paginateLetterheadContent();
      paginateNotesContent();
      paginatePaymentAdvice();
      // Quote-only safety pagination to prevent footer overlap
      cleanupQuoteContinuationPages();
      paginateQuoteOverflow();
      // Acceptance preview
      const acceptName = AppState.acceptance?.name || '';
      const acceptSig = AppState.acceptance?.signature || '';
      const sigImg = document.getElementById('preview-accept-signature');
      document.getElementById('preview-accept-name').innerText = acceptName;
      if (sigImg) {
        if (acceptSig) { sigImg.src = acceptSig; sigImg.style.display = 'block'; }
        else { sigImg.style.display = 'none'; }
      }
      // Refresh numbering/headers and backgrounds across all visible pages
      const allPages = document.querySelectorAll('#document-preview .document-page');
      updatePageNumbers(allPages);
      updatePageHeaders();
      applyBackgroundsAndNumbering();
      updateModeButtons();
    }

    function updatePageNumbers(pagesNodeList) {
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

    function updatePageHeaders() {
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
        const section = document.createElement('section');
        section.className = 'document-page p-12 aspect-[1/1.414]';
        section.setAttribute('data-generated', 'items-page');
        section.innerHTML = `
          <div class="page-header"><div></div><div></div></div>
          <table class="w-full mb-8 text-sm">
            <thead class="border-b-2 border-gray-800">
              <tr>
                <th class="text-left font-bold text-gray-600 uppercase py-2">Description</th>
                <th class="text-right font-bold text-gray-600 uppercase py-2 w-24">Quantity</th>
                <th class="text-right font-bold text-gray-600 uppercase py-2 w-28">Unit Price</th>
                <th class="text-right font-bold text-gray-600 uppercase py-2 w-32">Total</th>
              </tr>
            </thead>
            <tbody>${chunk}</tbody>
          </table>
          <div class="page-footer"><span class="page-number"></span> / <span class="page-count"></span></div>`;
        if (notesPage && notesPage.parentElement === container) {
          container.insertBefore(section, notesPage);
        } else {
          container.appendChild(section);
        }
        start += ROWS_PER_PAGE_CONT;
        pageIndex++;
      }
      // Apply backgrounds and numbering after adding items continuation pages
      const pagesAll = document.querySelectorAll('#document-preview .document-page');
      const bg2 = AppState.theme && AppState.theme.background ? AppState.theme.background : '';
      pagesAll.forEach(p => { p.style.backgroundImage = bg2 ? `url("${bg2}")` : 'none'; });
      updatePageNumbers(pagesAll);
      updatePageHeaders();
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
      if (footer) {
        if (accept.parentElement !== targetSection || accept.nextElementSibling !== footer) {
          targetSection.insertBefore(accept, footer);
        }
      } else if (accept.parentElement !== targetSection) {
        targetSection.appendChild(accept);
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
          const acceptPage = document.createElement('section');
          acceptPage.className = 'document-page p-12 aspect-[1/1.414]';
          acceptPage.setAttribute('data-generated', 'signature-page');
          acceptPage.innerHTML = `
            <div class="page-header"><div></div><div></div></div>
            <div class="page-footer"><span class="page-number"></span> / <span class="page-count"></span></div>`;
          if (targetSection && targetSection.parentNode) {
            if (targetSection.nextSibling) targetSection.parentNode.insertBefore(acceptPage, targetSection.nextSibling);
            else targetSection.parentNode.appendChild(acceptPage);
          } else { container.appendChild(acceptPage); }
          const acceptFooter = acceptPage.querySelector('.page-footer');
          accept.style.marginTop = '96px';
          if (acceptFooter) acceptPage.insertBefore(accept, acceptFooter); else acceptPage.appendChild(accept);
          // Apply backgrounds and numbering after adding a signature page
          const pagesAll = document.querySelectorAll('#document-preview .document-page');
          const bg2 = AppState.theme && AppState.theme.background ? AppState.theme.background : '';
          pagesAll.forEach(p => { p.style.backgroundImage = bg2 ? `url("${bg2}")` : 'none'; });
          updatePageNumbers(pagesAll);
          updatePageHeaders();
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
      // Prefer embedded data URIs if available, otherwise fall back to file paths
      return (EmbeddedAssets.backgrounds && EmbeddedAssets.backgrounds.length > 0)
        ? EmbeddedAssets.backgrounds
        : ThemeSources;
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
    function paginateLetterheadContent() {
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

      function fitsCurrentSection() {
        const footerRect = currentSection.querySelector('.page-footer').getBoundingClientRect();
        const contentRect = currentContainer.getBoundingClientRect();
        return contentRect.bottom <= footerRect.top - 4; // small buffer
      }

      nodes.forEach(node => {
        currentContainer.appendChild(node);
        if (!fitsCurrentSection()) {
          // Move node to a new letterhead page
          currentContainer.removeChild(node);
          // Enforce page cap
          if (getVisiblePages().length >= MAX_PAGES) {
            return; // stop adding more pages/content
          }
          const sec = document.createElement('section');
          sec.className = 'document-page p-12 aspect-[1/1.414]';
          sec.setAttribute('data-generated', 'letterhead-page');
          sec.innerHTML = `
            <div class="page-header"><div></div><div></div></div>
            <div class="text-sm" data-role="letterhead-content"></div>
            <div class="page-footer"><span class="page-number"></span> / <span class="page-count"></span></div>`;
          container.appendChild(sec);
          currentSection = sec;
          currentContainer = sec.querySelector('[data-role="letterhead-content"]');
          currentContainer.appendChild(node);
        }
      });

      // Apply backgrounds and numbering after adding letterhead continuation pages
      const pagesAll = document.querySelectorAll('#document-preview .document-page');
      const bg2 = AppState.theme && AppState.theme.background ? AppState.theme.background : '';
      pagesAll.forEach(p => { p.style.backgroundImage = bg2 ? `url("${bg2}")` : 'none'; });
      updatePageNumbers(pagesAll);
      updatePageHeaders();

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
    function paginateNotesContent() {
      if (AppState.mode !== 'quote') return;

      const container = document.getElementById('document-preview');
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
      targetSection.insertBefore(render, footer);

      // Pagination: clone nodes into continuation pages if overflow
      requestAnimationFrame(() => {
        const footerRect = footer.getBoundingClientRect();
        const renderRect = render.getBoundingClientRect();
        const fitsOnSamePage = (footerRect.top - renderRect.top) >= renderRect.height;
        if (fitsOnSamePage) return;

        const temp = document.createElement('div');
        temp.innerHTML = html;
        const nodes = Array.from(temp.childNodes);

        // Clear inline render and paginate content into continuation pages
        render.innerHTML = '';

        let currentSection = targetSection;
        let currentContainer = render;

        function createNotesPageAfter(section) {
          const sec = document.createElement('section');
          sec.className = 'document-page p-12 aspect-[1/1.414]';
          sec.setAttribute('data-generated', 'notes-page-cont');
          sec.innerHTML = `
            <div class="page-header"><div></div><div></div></div>
            <div class="text-sm text-gray-700" data-role="notes-content"></div>
            <div class="page-footer"><span class="page-number"></span> / <span class="page-count"></span></div>`;
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

        // Apply backgrounds and numbering after adding notes continuation pages
        const pagesAll = document.querySelectorAll('#document-preview .document-page');
        const bg2 = AppState.theme && AppState.theme.background ? AppState.theme.background : '';
        pagesAll.forEach(p => { p.style.backgroundImage = bg2 ? `url("${bg2}")` : 'none'; });
        updatePageNumbers(pagesAll);
        updatePageHeaders();
      });
    }

    // Payment Advice (Invoice mode only) – hardcoded, clone-not-move, continuation pages
    function paginatePaymentAdvice() {
      if (AppState.mode !== 'invoice') return;

      const container = document.getElementById('document-preview');
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
      anchorSection.insertBefore(render, footer);

      // Paginate if overflow (clone‑not‑move)
      requestAnimationFrame(() => {
        const footerRect = footer.getBoundingClientRect();
        const renderRect = render.getBoundingClientRect();
        const fitsOnSamePage = (footerRect.top - renderRect.top) >= renderRect.height;

        if (fitsOnSamePage) { applyBackgroundsAndNumbering(); return; }

        const temp = document.createElement('div'); temp.innerHTML = html; const nodes = Array.from(temp.childNodes);
        render.innerHTML = '';
        let currentSection = anchorSection; let currentContainer = render;

        function createAdvicePageAfter(section) {
          const sec = document.createElement('section');
          sec.className = 'document-page p-12 aspect-[1/1.414]';
          sec.setAttribute('data-generated', 'advice-page-cont');
          sec.innerHTML = `
            <div class="page-header"><div></div><div></div></div>
            <div class="text-sm text-gray-700" data-role="advice-content"></div>
            <div class="page-footer"><span class="page-number"></span> / <span class="page-count"></span></div>`;
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

        applyBackgroundsAndNumbering();
      });
    }

    // QUOTE: Clean and prevent footer overlap by moving overflow to continuation pages
    function cleanupQuoteContinuationPages(){
      const container = document.getElementById('document-preview');
      if (!container) return;
      container.querySelectorAll('[data-generated="quote-page-cont"]').forEach(el => el.remove());
    }

    function paginateQuoteOverflow(){
      if (AppState.mode !== 'quote') return;
      const container = document.getElementById('document-preview');
      if (!container) return;
      // Work on the last visible page only
      const pages = Array.from(container.querySelectorAll('.document-page')).filter(p => getComputedStyle(p).display !== 'none');
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
        const cont = document.createElement('section');
        cont.className = 'document-page p-12 aspect-[1/1.414]';
        cont.setAttribute('data-generated','quote-page-cont');
        cont.innerHTML = `
          <div class="page-header"><div></div><div></div></div>
          <div class="page-footer"><span class="page-number"></span> / <span class="page-count"></span></div>`;
        if (section.nextSibling) container.insertBefore(cont, section.nextSibling); else container.appendChild(cont);
        const contFooter = cont.querySelector('.page-footer');
        cont.insertBefore(lastEl, contFooter);

        // Apply backgrounds and numbering after adjusting pages
        applyBackgroundsAndNumbering();
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

    function renderPreviewLineItems() {
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

    function calculateAndRenderTotals() {
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
      renderSavedDocuments();
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
        renderPreviewLineItems();
        calculateAndRenderTotals();
        // Keep the mode buttons in the right visual state just in case
        updateModeButtons();
      } catch (e) {
        // Fallback to full render if anything goes wrong
        console.error('Soft update failed, doing full render', e);
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

    function formatCurrency(n) { return (typeof n === 'number' && isFinite(n)) ? n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' }) : '$0.00'; }
    function formatDate(s) {
      if (!s) return '';
      // Prefer parsing YYYY-MM-DD as local calendar date to avoid timezone shifts
      const m = /^\d{4}-\d{2}-\d{2}$/.exec(s);
      const d = m ? dateFromYMD(s) : new Date(s);
      return d.toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    function toLocalYMD(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    function todayLocalYMD() { return toLocalYMD(new Date()); }
    function dateFromYMD(s) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    function printDocument() { window.print(); }
    function capitalize(str) { return (str || '').charAt(0).toUpperCase() + (str || '').slice(1); }
  </script>
</body>
</html>

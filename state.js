// Centralized application state and persistence helpers

export let AppState = {};

export function getInitialState() {
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

export function saveState() {
  localStorage.setItem('tomarAdminState', JSON.stringify(AppState.global));
}

// Migration: normalize any stale/invalid asset paths in current/saved state
export function migrateAssetPath(p) {
  if (!p) return p;
  // Deduplicate accidental double-prefix
  p = p.replace(/^Assets\/Assets\//, 'Assets/');
  // Rename old file with spaces to normalized one
  if (p === 'Assets/Image 1 .png') return 'Assets/1.png';
  return p;
}

export function migrateAssetPaths() {
  // Fix current in-memory theme path
  if (AppState.theme && AppState.theme.background) {
    AppState.theme.background = migrateAssetPath(AppState.theme.background);
  }
  // Fix saved documents’ theme paths
  const saved = (AppState.global && Array.isArray(AppState.global.savedDocuments))
    ? AppState.global.savedDocuments
    : [];
  saved.forEach(doc => {
    if (doc && doc.theme && doc.theme.background) {
      doc.theme.background = migrateAssetPath(doc.theme.background);
    }
  });
}

export function loadState() {
  const initialState = getInitialState();
  AppState = initialState;
  const savedGlobalState = localStorage.getItem('tomarAdminState');
  if (savedGlobalState) {
    try {
      const parsedGlobal = JSON.parse(savedGlobalState);
      Object.assign(AppState.global, parsedGlobal);
    } catch (e) { console.error('Error parsing saved state:', e); }
  }
  // Ensure any stale asset paths are corrected before using them
  migrateAssetPaths();
  // Note: generateDocumentNumber is called by the bootstrapper after loadState
}


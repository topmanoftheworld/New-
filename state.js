// Centralized application state and persistence helpers
// This module owns the single source of truth for app data.

// Storage key for persisted global-only data
const STORAGE_KEY = 'tomarAdminState';

// Public, live state object. Other modules import this binding.
export let AppState = {};

// --- Utilities --------------------------------------------------------------

// Safely get an item from localStorage (guard for environments without it)
function lsGet(key) {
  try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; }
  catch { return null; }
}

// Safely set an item in localStorage
function lsSet(key, value) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); }
  catch { /* ignore quota/availability errors */ }
}

// Safe JSON parse that returns null on error
function safeParseJSON(s) {
  try { return JSON.parse(s); } catch { return null; }
}

export function getInitialState() {
  return {
    id: null,
    mode: 'invoice',
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
    letterhead: { content: '', images: [] },
    global: { savedDocuments: [], counters: { quote: 1001, invoice: 1001 } }
  };
}

export function saveState() {
  // Persist only the lightweight, global slice (counters, savedDocuments list, etc.)
  lsSet(STORAGE_KEY, JSON.stringify(AppState.global));
}

// Migration: normalize any stale/invalid asset paths in current/saved state
export function migrateAssetPath(p) {
  if (!p) return p;
  // Deduplicate accidental double-prefix
  p = p.replace(/^Assets\/Assets\//, 'Assets/');
  // Collapse multiple consecutive slashes
  p = p.replace(/\x2F+/g, '/');
  // Trim stray spaces around filename
  p = p.replace(/\s+\.png$/i, '.png').trim();
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
  const saved = Array.isArray(AppState?.global?.savedDocuments)
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
  const savedRaw = lsGet(STORAGE_KEY);
  if (savedRaw) {
    const parsedGlobal = safeParseJSON(savedRaw);
    if (parsedGlobal && typeof parsedGlobal === 'object') {
      // Merge only known keys to avoid pulling in unexpected shapes
      if (Array.isArray(parsedGlobal.savedDocuments)) AppState.global.savedDocuments = parsedGlobal.savedDocuments;
      if (parsedGlobal.counters && typeof parsedGlobal.counters === 'object') {
        AppState.global.counters.quote = Number(parsedGlobal.counters.quote) || AppState.global.counters.quote;
        AppState.global.counters.invoice = Number(parsedGlobal.counters.invoice) || AppState.global.counters.invoice;
      }
    }
  }
  if (!AppState.letterhead || typeof AppState.letterhead !== 'object') {
    AppState.letterhead = { content: '', images: [] };
  }
  if (!Array.isArray(AppState.letterhead.images)) {
    AppState.letterhead.images = [];
  }
  // Ensure any stale asset paths are corrected before using them
  migrateAssetPaths();
  // Note: generateDocumentNumber is called by the bootstrapper after loadState
}

// Optional helper to fully reset in-memory state while preserving global slice
export function resetStatePreserveGlobal() {
  const globalSnapshot = JSON.parse(JSON.stringify(AppState.global));
  AppState = getInitialState();
  AppState.global = globalSnapshot;
}

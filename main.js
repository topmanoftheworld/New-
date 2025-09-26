import { todayLocalYMD, dateFromYMD, toLocalYMD } from './utils.js';
import { render, buildThemesGrid } from './dom.js';
import { AppState, loadState } from './state.js';
import { addEventListeners } from './events.js';
import { initAIAssistant, updateAIAssistantOnRender } from './aiAssistant.js';

function initApp() {
  if (!AppState.document.date) {
    AppState.document.date = todayLocalYMD();
  }
  if (!AppState.document.dueDate) {
    const d = dateFromYMD(AppState.document.date);
    d.setDate(d.getDate() + 14);
    AppState.document.dueDate = toLocalYMD(d);
  }
  if (!AppState.document.number) {
    if (AppState.mode === 'letterhead') {
      AppState.document.number = '';
    } else if (AppState.mode === 'quote') {
      AppState.document.number = `TC-${AppState.global.counters.quote}`;
    } else {
      AppState.document.number = `INV-${AppState.global.counters.invoice}`;
    }
  }
  if (AppState.mode !== 'letterhead' && AppState.lineItems.length === 0) {
    AppState.lineItems.push({ description: '', quantity: 1, unitPrice: 0 });
  }
  addEventListeners();
  buildThemesGrid();
  render();
  initAIAssistant();
  updateAIAssistantOnRender();
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    loadState();
    initApp();
  } catch (error) {
    console.error('Failed to initialize Tomar Admin:', error);
    const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
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

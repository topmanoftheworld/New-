// Utility helpers extracted from script.js

export function debounce(fn, delay = 200) {
  let t; let lastArgs; let lastThis;
  function invoke() { t = undefined; fn.apply(lastThis, lastArgs); }
  function debounced(...args) {
    lastArgs = args; lastThis = this; if (t) clearTimeout(t); t = setTimeout(invoke, delay);
  }
  debounced.cancel = () => { if (t) { clearTimeout(t); t = undefined; } };
  debounced.flush = () => { if (t) { clearTimeout(t); invoke(); } };
  return debounced;
}

export function isFiniteNumber(n) { return typeof n === 'number' && Number.isFinite(n); }

export function formatCurrency(n) {
  return isFiniteNumber(n)
    ? n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' })
    : '$0.00';
}

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function formatDate(s) {
  if (!s) return '';
  const d = YMD_REGEX.test(String(s)) ? dateFromYMD(String(s)) : new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function toLocalYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLocalYMD() {
  return toLocalYMD(new Date());
}

export function dateFromYMD(s) {
  if (!YMD_REGEX.test(String(s))) return new Date(NaN);
  const [yStr, mStr, dStr] = String(s).split('-');
  const y = Number(yStr), m = Number(mStr), d = Number(dStr);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== (m - 1) || dt.getDate() !== d) return new Date(NaN);
  return dt;
}

export function printDocument() {
  try { window.print(); } catch { /* ignore non-browser */ }
}

export function capitalize(str) {
  return (str || '').charAt(0).toUpperCase() + (str || '').slice(1);
}

// DOM/layout helpers
export function toCssUrl(src) {
  return `url("${src}")`;
}

export function schedule(fn) {
  return requestAnimationFrame(fn);
}

function _footer(sectionEl) { return sectionEl && sectionEl.querySelector ? sectionEl.querySelector('.page-footer') : null; }
function _rect(el) { return el && el.getBoundingClientRect ? el.getBoundingClientRect() : null; }

export function getAvailableHeight(sectionEl, containerEl) {
  const footerRect = _rect(_footer(sectionEl));
  const containerRect = _rect(containerEl);
  if (!footerRect || !containerRect) return 0;
  return footerRect.top - containerRect.top;
}

export function fitsInSection(sectionEl, containerEl, buffer = 4) {
  const footerRect = _rect(_footer(sectionEl));
  const contentRect = _rect(containerEl);
  if (!footerRect || !contentRect) return false;
  return contentRect.bottom <= (footerRect.top - buffer);
}

export function insertBeforeFooter(sectionEl, node) {
  if (!sectionEl || !node) return;
  const footer = sectionEl.querySelector && sectionEl.querySelector('.page-footer');
  if (!footer) { sectionEl.appendChild(node); return; }
  sectionEl.insertBefore(node, footer);
}

// Asset resolving and placeholders used by DOM rendering
export const ASSET_RESOLVER = (() => {
  const ABSOLUTE_PROTO = /^(?:[a-z]+:)?\/\//i; // http://, https://, //host
  return (p) => {
    if (!p) return p;
    const s = String(p);
    // Leave absolute URLs and data/blob URIs untouched
    if (ABSOLUTE_PROTO.test(s) || s.startsWith('data:') || s.startsWith('blob:') || s.startsWith('file:')) {
      return s;
    }
    // Normalize simple assets path and safely encode segments
    const normalized = s.replace(/^\.\//, '').replace(/^\//, '');
    const path = `../${normalized}`;
    return path.split('/').map(encodeURIComponent).join('/');
  };
})();

export const EmbeddedAssets = { backgrounds: [], logo: null };
// Resolve default logo relative to this module for reliable URL resolution
export const DefaultLogoPath = (() => {
  try { return new URL('../Assets/Logo.png', import.meta.url).href; } catch { return 'Assets/Logo.png'; }
})();

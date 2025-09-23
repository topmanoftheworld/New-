// Utility helpers extracted from script.js

export function debounce(fn, delay = 200) {
  let t;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function formatCurrency(n) {
  return (typeof n === 'number' && isFinite(n))
    ? n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' })
    : '$0.00';
}

export function formatDate(s) {
  if (!s) return '';
  // Prefer parsing YYYY-MM-DD as local calendar date to avoid timezone shifts
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(s);
  const d = m ? dateFromYMD(s) : new Date(s);
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
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function printDocument() {
  window.print();
}

export function capitalize(str) {
  return (str || '').charAt(0).toUpperCase() + (str || '').slice(1);
}

// DOM/layout helpers
export function toCssUrl(src) {
  return `url("${src}")`;
}

export function schedule(fn) {
  requestAnimationFrame(fn);
}

export function getAvailableHeight(sectionEl, containerEl) {
  const footerEl = sectionEl.querySelector('.page-footer');
  return footerEl.getBoundingClientRect().top - containerEl.getBoundingClientRect().top;
}

export function fitsInSection(sectionEl, containerEl, buffer = 4) {
  const footerEl = sectionEl.querySelector('.page-footer');
  const contentRect = containerEl.getBoundingClientRect();
  return contentRect.bottom <= (footerEl.getBoundingClientRect().top - buffer);
}

export function insertBeforeFooter(sectionEl, node) {
  if (!sectionEl || !node) return;
  const footer = sectionEl.querySelector && sectionEl.querySelector('.page-footer');
  if (!footer) { sectionEl.appendChild(node); return; }
  sectionEl.insertBefore(node, footer);
}

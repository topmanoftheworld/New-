import { AppState } from './state.js';

const API_ENDPOINT = '/api/ai-assistant';
const DEFAULT_ERROR = 'Something went wrong while contacting the AI service. Please try again.';

const CONTEXTS = {
  notes: {
    key: 'notes',
    label: 'Quote Notes',
    elementId: 'notes-editor',
    modes: ['quote'],
    description: 'Works with the Notes/Terms editor while preparing a quote.',
  },
  letterhead: {
    key: 'letterhead',
    label: 'Letterhead Body',
    elementId: 'letterhead-editor',
    modes: ['letterhead'],
    description: 'Applies to the letterhead content editor.',
  },
  advice: {
    key: 'advice',
    label: 'Payment Advice',
    elementId: 'advice-editor',
    modes: ['invoice'],
    description: 'Targets the payment advice editor for invoices.',
  },
};

const ACTION_GROUPS = [
  {
    label: 'Drafting',
    items: [
      {
        label: 'Draft Quote Cover Letter',
        action: 'draft_quote_cover_letter',
        contexts: ['notes'],
        modes: ['quote'],
      },
      {
        label: 'Write Thank You Note',
        action: 'write_thank_you_note',
        contexts: ['notes', 'letterhead'],
        modes: ['quote', 'letterhead', 'invoice'],
      },
    ],
  },
  {
    label: 'Editing',
    items: [
      {
        label: 'Improve Writing',
        action: 'improve_writing',
      },
      {
        label: 'Check Spelling & Grammar',
        action: 'check_spelling_grammar',
      },
      {
        label: 'Simplify Language',
        action: 'simplify_language',
      },
    ],
  },
  {
    label: 'Tone',
    items: [
      {
        label: 'Make it more Formal',
        action: 'make_formal',
      },
      {
        label: 'Make it more Friendly',
        action: 'make_friendly',
      },
    ],
  },
];

const state = {
  initialised: false,
  currentContext: null,
  dropdownOpen: false,
  isLoading: false,
};

const ui = {
  container: null,
  contextSelect: null,
  apiKeyInput: null,
  promptForm: null,
  promptInput: null,
  promptSubmit: null,
  quickTrigger: null,
  quickMenu: null,
  status: null,
  error: null,
  contextHint: null,
};

const boundContextKeys = new Set();

function getModeLabel() {
  const mode = AppState.mode || '';
  if (mode === 'quote') return 'Quote';
  if (mode === 'invoice') return 'Invoice';
  if (mode === 'letterhead') return 'Letterhead';
  return mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : '';
}

function getAvailableContexts() {
  return Object.values(CONTEXTS).filter((cfg) => {
    if (!cfg.modes || cfg.modes.length === 0) return true;
    return cfg.modes.includes(AppState.mode);
  });
}

function getContextConfig(key) {
  return CONTEXTS[key] || null;
}

function getContextElement(key) {
  const cfg = getContextConfig(key);
  if (!cfg) return null;
  return document.getElementById(cfg.elementId);
}

function setDropdownOpen(open) {
  state.dropdownOpen = open;
  if (!ui.quickMenu || !ui.quickTrigger) return;
  if (open) {
    ui.quickMenu.classList.remove('hidden');
  } else {
    ui.quickMenu.classList.add('hidden');
  }
  ui.quickTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function setStatusMessage(message) {
  if (!ui.status) return;
  if (message) {
    ui.status.textContent = message;
    ui.status.classList.remove('hidden');
  } else {
    ui.status.textContent = '';
    ui.status.classList.add('hidden');
  }
}

function setErrorMessage(message) {
  if (!ui.error) return;
  if (message) {
    ui.error.textContent = message;
    ui.error.classList.remove('hidden');
  } else {
    ui.error.textContent = '';
    ui.error.classList.add('hidden');
  }
}

function setLoading(loading) {
  state.isLoading = loading;
  if (ui.promptInput) ui.promptInput.disabled = loading;
  if (ui.promptSubmit) ui.promptSubmit.disabled = loading;
  if (ui.contextSelect) ui.contextSelect.disabled = loading;
  if (ui.quickTrigger) ui.quickTrigger.disabled = loading || ui.quickTrigger.dataset.hasActions === 'false';

  if (loading) {
    setStatusMessage('Contacting AI…');
  } else if (!ui.error?.textContent) {
    setStatusMessage('');
  }
}

function selectionWithinElement(element) {
  if (!element) return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  const { commonAncestorContainer } = range;
  return element.contains(commonAncestorContainer);
}

function getSelectedTextWithin(element) {
  if (!selectionWithinElement(element)) return '';
  const selection = window.getSelection();
  return selection ? selection.toString() : '';
}

function focusContextElement(element) {
  if (!element) return;
  if (document.activeElement !== element) {
    element.focus({ preventScroll: false });
  }
}

function applyGeneratedText(element, generatedText) {
  if (!element || !generatedText) return;

  focusContextElement(element);
  const selection = window.getSelection();
  if (!selection) return;

  if (!selectionWithinElement(element)) {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  let success = false;
  try {
    success = document.execCommand('insertHTML', false, generatedText);
  } catch (err) {
    success = false;
  }

  if (!success && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(generatedText));
    selection.collapseToEnd();
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

async function postToAssistant(payload) {
  const apiKey = window.localStorage.getItem('ai_api_key') || '';

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const message = (data && (data.error || data.message)) || text || DEFAULT_ERROR;
    throw new Error(message);
  }

  if (!data || typeof data.generatedText !== 'string') {
    throw new Error('The AI service returned an unexpected response.');
  }

  return data.generatedText;
}

async function runAction(actionKey, promptText) {
  if (!state.currentContext) {
    setErrorMessage('Choose a content area before asking the AI.');
    return false;
  }

  const contextElement = getContextElement(state.currentContext);
  if (!contextElement) {
    setErrorMessage('The selected content area is not available right now.');
    return false;
  }

  const selectedText = getSelectedTextWithin(contextElement) || '';

  setLoading(true);
  setErrorMessage('');

  try {
    const generatedText = await postToAssistant({
      action: actionKey,
      prompt: promptText || '',
      context: selectedText,
    });

    applyGeneratedText(contextElement, generatedText);

    const contextLabel = getContextConfig(state.currentContext)?.label || 'document';
    setStatusMessage(`AI response applied to ${contextLabel}.`);
    return true;
  } catch (error) {
    console.error('[AI Assistant] request failed:', error);
    setErrorMessage(error.message || DEFAULT_ERROR);
    setStatusMessage('');
    return false;
  } finally {
    setLoading(false);
  }
}

function updatePromptPlaceholder() {
  if (!ui.promptInput) return;
  const contextLabel = getContextConfig(state.currentContext)?.label || 'your document';
  ui.promptInput.placeholder = `Ask the AI about ${contextLabel.toLowerCase()}…`;
}

function updateContextHint() {
  if (!ui.contextHint) return;
  const config = getContextConfig(state.currentContext);
  if (!config) {
    ui.contextHint.textContent = '';
    ui.contextHint.classList.add('hidden');
    return;
  }

  const modeLabel = getModeLabel();
  ui.contextHint.textContent = `${config.label} • ${config.description} ${modeLabel ? `(${modeLabel} mode).` : ''} Highlight text to replace it or leave the cursor where you want new content inserted.`;
  ui.contextHint.classList.remove('hidden');
}

function renderQuickActionsMenu() {
  if (!ui.quickMenu || !ui.quickTrigger) return;

  ui.quickMenu.innerHTML = '';

  const contextKey = state.currentContext;
  if (!contextKey) {
    ui.quickTrigger.disabled = true;
    ui.quickTrigger.dataset.hasActions = 'false';
    ui.quickTrigger.textContent = 'AI Actions ✨';
    return;
  }

  const mode = AppState.mode;
  let totalActions = 0;

  ACTION_GROUPS.forEach((group, groupIndex) => {
    const availableItems = group.items.filter((item) => {
      const contextOk = !item.contexts || item.contexts.includes(contextKey);
      const modeOk = !item.modes || item.modes.includes(mode);
      return contextOk && modeOk;
    });

    if (availableItems.length === 0) {
      return;
    }

    const groupContainer = document.createElement('div');
    groupContainer.className = groupIndex === 0 ? '' : 'border-t border-gray-100 mt-2 pt-2';

    const label = document.createElement('div');
    label.className = 'px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500';
    label.textContent = group.label;
    groupContainer.appendChild(label);

    availableItems.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 focus:outline-none';
      button.textContent = item.label;
      button.addEventListener('click', () => {
        setDropdownOpen(false);
        runAction(item.action, '');
      });
      groupContainer.appendChild(button);
    });

    ui.quickMenu.appendChild(groupContainer);
    totalActions += availableItems.length;
  });

  if (totalActions === 0) {
    const empty = document.createElement('div');
    empty.className = 'px-4 py-3 text-sm text-gray-500';
    empty.textContent = 'No quick actions available for this context.';
    ui.quickMenu.appendChild(empty);
    ui.quickTrigger.dataset.hasActions = 'false';
    ui.quickTrigger.disabled = true;
  } else {
    ui.quickTrigger.dataset.hasActions = 'true';
    ui.quickTrigger.disabled = state.isLoading;
  }

  ui.quickTrigger.textContent = 'AI Actions ✨';
  setDropdownOpen(false);
}

function renderContextOptions(availableContexts) {
  if (!ui.contextSelect) return;

  const previousValue = state.currentContext;
  ui.contextSelect.innerHTML = '';

  availableContexts.forEach((context) => {
    const option = document.createElement('option');
    option.value = context.key;
    option.textContent = context.label;
    ui.contextSelect.appendChild(option);
  });

  let nextValue = previousValue && availableContexts.some((ctx) => ctx.key === previousValue)
    ? previousValue
    : availableContexts[0]?.key || null;

  if (!nextValue) {
    state.currentContext = null;
    ui.contextSelect.value = '';
    renderQuickActionsMenu();
    updatePromptPlaceholder();
    updateContextHint();
    return;
  }

  state.currentContext = nextValue;
  ui.contextSelect.value = nextValue;
  updatePromptPlaceholder();
  updateContextHint();
  renderQuickActionsMenu();
}

function bindContextFocusHandlers(key) {
  if (boundContextKeys.has(key)) return;
  const element = getContextElement(key);
  if (!element) return;

  const handler = () => {
    if (state.currentContext !== key) {
      state.currentContext = key;
      if (ui.contextSelect) {
        ui.contextSelect.value = key;
      }
      updatePromptPlaceholder();
      updateContextHint();
      renderQuickActionsMenu();
    }
  };

  element.addEventListener('focus', handler, true);
  element.addEventListener('pointerdown', handler, true);
  boundContextKeys.add(key);
}

function handleApiKeyChange(event) {
  const value = event.target.value.trim();
  window.localStorage.setItem('ai_api_key', value);
}

function handlePromptSubmit() {
  if (!ui.promptInput) return;
  const promptValue = ui.promptInput.value.trim();
  if (!promptValue) {
    setErrorMessage('Enter a prompt for the AI to work with.');
    return;
  }

  runAction('custom_prompt', promptValue).then((success) => {
    if (success) {
      ui.promptInput.value = '';
    }
  });
}

function handleQuickTriggerClick() {
  if (ui.quickTrigger?.disabled) return;
  setDropdownOpen(!state.dropdownOpen);
}

function handleGlobalClick(event) {
  if (!state.dropdownOpen) return;
  if (!ui.quickMenu || !ui.quickTrigger) return;
  if (ui.quickMenu.contains(event.target) || ui.quickTrigger.contains(event.target)) return;
  setDropdownOpen(false);
}

function handleGlobalKeydown(event) {
  if (event.key === 'Escape' && state.dropdownOpen) {
    setDropdownOpen(false);
  }
}

export function initAIAssistant() {
  if (state.initialised) return;
  ui.container = document.getElementById('ai-assistant');
  if (!ui.container) return;

  ui.contextSelect = ui.container.querySelector('[data-ai="context-select"]');
  ui.apiKeyInput = ui.container.querySelector('[data-ai="api-key"]');
  ui.promptForm = ui.container.querySelector('[data-ai="prompt-form"]');
  ui.promptInput = ui.container.querySelector('[data-ai="prompt-input"]');
  ui.promptSubmit = ui.container.querySelector('[data-ai="prompt-submit"]');
  ui.quickTrigger = ui.container.querySelector('[data-ai="quick-trigger"]');
  ui.quickMenu = ui.container.querySelector('[data-ai="quick-menu"]');
  ui.status = ui.container.querySelector('[data-ai="status"]');
  ui.error = ui.container.querySelector('[data-ai="error"]');
  ui.contextHint = ui.container.querySelector('[data-ai="context-hint"]');

  if (!ui.contextSelect || !ui.promptForm || !ui.promptInput || !ui.quickTrigger || !ui.quickMenu) {
    return;
  }

  ui.promptForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handlePromptSubmit();
  });

  ui.quickTrigger.addEventListener('click', handleQuickTriggerClick);
  ui.contextSelect.addEventListener('change', () => {
    const { value } = ui.contextSelect;
    if (value) {
      state.currentContext = value;
      updatePromptPlaceholder();
      updateContextHint();
      renderQuickActionsMenu();
    }
  });

  if (ui.apiKeyInput) {
    const savedKey = window.localStorage.getItem('ai_api_key') || '';
    if (!ui.apiKeyInput.value) {
      ui.apiKeyInput.value = savedKey;
    }
    ui.apiKeyInput.addEventListener('change', handleApiKeyChange);
    ui.apiKeyInput.addEventListener('blur', handleApiKeyChange);
  }

  document.addEventListener('click', handleGlobalClick, true);
  document.addEventListener('keydown', handleGlobalKeydown, true);

  state.initialised = true;
}

export function updateAIAssistantOnRender() {
  if (!state.initialised) {
    initAIAssistant();
  }
  if (!ui.container) return;

  const availableContexts = getAvailableContexts();
  if (availableContexts.length === 0) {
    ui.container.classList.add('hidden');
    state.currentContext = null;
    setDropdownOpen(false);
    return;
  }

  ui.container.classList.remove('hidden');

  availableContexts.forEach((context) => {
    bindContextFocusHandlers(context.key);
  });

  renderContextOptions(availableContexts);
}

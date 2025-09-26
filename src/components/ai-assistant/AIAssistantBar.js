import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import PromptInput from './PromptInput';
import QuickActionsDropdown from './QuickActionsDropdown';
import styles from './AIAssistantBar.module.css';

const DEFAULT_ENDPOINT = '/api/ai-assistant';
const LOCAL_SERVER_ENDPOINT = 'http://localhost:3001/api/ai-assistant';

function resolveEndpoint() {
  if (window.AI_ASSISTANT_ENDPOINT) return window.AI_ASSISTANT_ENDPOINT;
  const origin = window.location?.origin ?? '';
  if (!origin || origin === 'null' || origin.startsWith('file:')) {
    return LOCAL_SERVER_ENDPOINT;
  }
  return DEFAULT_ENDPOINT;
}

const API_ENDPOINT = resolveEndpoint();
const DEFAULT_ERROR = 'Something went wrong while contacting the AI service. Please try again.';

function getSelectedText(editor) {
  if (!editor) return '';
  return editor.selection ? editor.selection.getContent({ format: 'text' }) : '';
}

function insertOrReplace(editor, generatedText) {
  if (!editor || !generatedText) return;
  const selection = editor.selection;
  const hasSelection = selection && selection.getContent({ format: 'text' }).trim().length > 0;

  if (hasSelection) {
    selection.setContent(generatedText);
  } else {
    editor.execCommand('mceInsertContent', false, generatedText);
  }
}

async function postToAiAssistant(payload) {
  const apiKey = window.localStorage.getItem('ai_api_key') || '';

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => null);
    throw new Error(message || DEFAULT_ERROR);
  }

  const data = await response.json();
  if (!data || typeof data.generatedText !== 'string') {
    throw new Error('The AI service returned an unexpected response.');
  }
  return data.generatedText;
}

const AIAssistantBar = ({ editorRef }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState('');

  const runAction = useCallback(
    async ({ action, prompt }) => {
      const editor = editorRef?.current;
      if (!editor) {
        setLastError('Editor is not ready yet.');
        return;
      }

      setIsLoading(true);
      setLastError('');
      const context = getSelectedText(editor);

      try {
        const generatedText = await postToAiAssistant({ action, prompt, context });
        insertOrReplace(editor, generatedText);
      } catch (error) {
        console.error('[AIAssistantBar] AI request failed:', error);
        setLastError(error.message || DEFAULT_ERROR);
      } finally {
        setIsLoading(false);
      }
    },
    [editorRef]
  );

  const handleCustomPrompt = useCallback(
    async (promptText) => {
      if (!promptText.trim()) return;
      await runAction({ action: 'custom_prompt', prompt: promptText });
    },
    [runAction]
  );

  const handleQuickAction = useCallback(
    async (actionKey) => {
      await runAction({ action: actionKey, prompt: '' });
    },
    [runAction]
  );

  return (
    <div className={styles.wrapper} aria-live="polite">
      <PromptInput onSubmit={handleCustomPrompt} disabled={isLoading} />
      <QuickActionsDropdown onSelect={handleQuickAction} disabled={isLoading} />

      <label htmlFor="ai-api-key" className={styles.apiKeyLabel}>
        API Key
      </label>
      <input
        id="ai-api-key"
        className={styles.apiKeyInput}
        type="text"
        placeholder="Paste Gemini or ChatGPT API key (stored locally)"
        onChange={(event) => {
          window.localStorage.setItem('ai_api_key', event.target.value.trim());
        }}
        defaultValue={window.localStorage.getItem('ai_api_key') || ''}
      />

      {isLoading && <span className={styles.status}>Contacting AI…</span>}
      {lastError && <span className={styles.error}>{lastError}</span>}
    </div>
  );
};

AIAssistantBar.propTypes = {
  editorRef: PropTypes.shape({
    current: PropTypes.shape({
      selection: PropTypes.object,
      execCommand: PropTypes.func,
    }),
  }).isRequired,
};

export default AIAssistantBar;

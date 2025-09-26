import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from './AIAssistantBar.module.css';

const PromptInput = ({ onSubmit, disabled }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(prompt);
    setPrompt('');
  };

  return (
    <form className={styles.promptForm} onSubmit={handleSubmit}>
      <input
        type="text"
        className={styles.promptInput}
        placeholder='Ask the AI (e.g. "Write a thank you note")'
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        disabled={disabled}
        aria-label="Ask the AI"
      />
      <button type="submit" className={styles.generateButton} disabled={disabled}>
        Generate
      </button>
    </form>
  );
};

PromptInput.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

PromptInput.defaultProps = {
  disabled: false,
};

export default PromptInput;

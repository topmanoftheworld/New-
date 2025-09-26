import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from './AIAssistantBar.module.css';

const ACTION_GROUPS = [
  {
    label: 'Drafting',
    actions: [
      { label: 'Draft Quote Cover Letter', value: 'draft_quote_cover_letter' },
      { label: 'Write Thank You Note', value: 'write_thank_you_note' },
    ],
  },
  {
    label: 'Editing',
    actions: [
      { label: 'Improve Writing', value: 'improve_writing' },
      { label: 'Check Spelling & Grammar', value: 'check_spelling_grammar' },
      { label: 'Simplify Language', value: 'simplify_language' },
    ],
  },
  {
    label: 'Tone',
    actions: [
      { label: 'Make it more Formal', value: 'make_formal' },
      { label: 'Make it more Friendly', value: 'make_friendly' },
    ],
  },
];

const QuickActionsDropdown = ({ onSelect, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleActionClick = (actionValue) => {
    setIsOpen(false);
    onSelect(actionValue);
  };

  return (
    <div className={styles.dropdown}>
      <button
        type="button"
        className={styles.dropdownTrigger}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        AI Actions ✨
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu} role="menu">
          {ACTION_GROUPS.map((group) => (
            <div key={group.label} className={styles.dropdownGroup}>
              <div className={styles.dropdownGroupLabel}>{group.label}</div>
              {group.actions.map((action) => (
                <button
                  key={action.value}
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleActionClick(action.value)}
                  role="menuitem"
                >
                  {action.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

QuickActionsDropdown.propTypes = {
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

QuickActionsDropdown.defaultProps = {
  disabled: false,
};

export default QuickActionsDropdown;

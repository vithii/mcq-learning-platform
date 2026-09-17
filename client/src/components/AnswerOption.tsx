import React from 'react';
import { Check, X } from 'lucide-react';

interface AnswerOptionProps {
  optionKey: string;
  optionText: string;
  isSelected: boolean;
  isCorrect?: boolean | null;
  isRevealed?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export const AnswerOption: React.FC<AnswerOptionProps> = ({
  optionKey,
  optionText,
  isSelected,
  isCorrect,
  isRevealed,
  disabled,
  onSelect
}) => {
  let stateClass = '';
  if (isRevealed) {
    if (isCorrect === true) {
      stateClass = 'correct';
    } else if (isSelected && isCorrect === false) {
      stateClass = 'incorrect';
    }
  } else if (isSelected) {
    stateClass = 'selected';
  }

  return (
    <button
      type="button"
      className={`option-btn ${stateClass}`}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={isSelected}
    >
      <div className="option-key">
        {optionKey}
      </div>

      <div className="option-text">
        {optionText}
      </div>

      {isRevealed && isCorrect === true && (
        <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
          <Check size={20} strokeWidth={3} />
        </div>
      )}

      {isRevealed && isSelected && isCorrect === false && (
        <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
          <X size={20} strokeWidth={3} />
        </div>
      )}
    </button>
  );
};

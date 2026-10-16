import { useEffect, useId, useRef, useState } from 'react';

function ChevronIcon() {
  return (
    <svg className="custom-select-chevron" viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5.5 7.5 4.5 5 4.5-5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="custom-select-check" viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4.5 10 3.4 3.4 7.6-7.6" />
    </svg>
  );
}

export default function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    function closeOnOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  function focusOption(index) {
    const menu = rootRef.current?.querySelector('.custom-select-menu');
    const optionButtons = rootRef.current?.querySelectorAll('[role="option"]');
    const option = optionButtons?.[index];
    if (!menu || !option) return;

    option.focus({ preventScroll: true });
    const centeredOffset = option.offsetTop - ((menu.clientHeight - option.offsetHeight) / 2);
    menu.scrollTop = Math.max(0, centeredOffset);
  }

  function openAndFocusOption(index) {
    setIsOpen(true);
    window.requestAnimationFrame(() => focusOption(Math.max(0, index)));
  }

  function handleTriggerKeyDown(event) {
    if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
    openAndFocusOption(event.key === 'ArrowUp' ? options.length - 1 : selectedIndex);
  }

  function handleTriggerClick() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
    openAndFocusOption(selectedIndex);
  }

  function handleOptionKeyDown(event, index) {
    const optionButtons = rootRef.current?.querySelectorAll('[role="option"]');
    if (!optionButtons?.length) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      focusOption((index + direction + optionButtons.length) % optionButtons.length);
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusOption(event.key === 'Home' ? 0 : optionButtons.length - 1);
    }
  }

  function choose(option) {
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div ref={rootRef} className={`custom-select ${isOpen ? 'open' : ''} ${className}`}>
      <button
        ref={triggerRef}
        className="custom-select-trigger"
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selectedOption?.label || 'Не выбрано'}</span>
        <ChevronIcon />
      </button>

      {isOpen && (
        <div className="custom-select-menu" id={listboxId} role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <button
                className={selected ? 'selected' : ''}
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(option)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
              >
                <span>{option.label}</span>
                {selected && <CheckIcon />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

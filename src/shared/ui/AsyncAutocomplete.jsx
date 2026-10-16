import { useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 20;
const SEARCH_DELAY = 320;

export default function AsyncAutocomplete({
  value,
  selectedLabel = '',
  loadOptions,
  onChange,
  placeholder = 'Начните вводить',
  ariaLabel,
}) {
  const [inputValue, setInputValue] = useState(selectedLabel);
  const [options, setOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef(null);
  const requestRef = useRef(null);
  const debounceRef = useRef(null);
  const queryRef = useRef('');

  useEffect(() => {
    setInputValue(selectedLabel);
  }, [selectedLabel, value]);

  useEffect(() => () => {
    window.clearTimeout(debounceRef.current);
    requestRef.current?.abort();
  }, []);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
        setInputValue(selectedLabel);
      }
    }
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [selectedLabel]);

  async function requestOptions(query, offset, append = false) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);
    setError('');
    queryRef.current = query;

    try {
      const result = await loadOptions({ query, offset, limit: PAGE_SIZE, signal: controller.signal });
      if (controller.signal.aborted) return;
      setOptions((current) => append ? [...current, ...result.items] : result.items);
      setHasMore(result.hasMore);
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') setError('Не удалось загрузить список');
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  }

  function openList() {
    window.clearTimeout(debounceRef.current);
    setIsOpen(true);
    requestOptions('', 0);
  }

  function updateQuery(event) {
    const query = event.target.value;
    setInputValue(query);
    setIsOpen(true);
    window.clearTimeout(debounceRef.current);
    requestRef.current?.abort();
    debounceRef.current = window.setTimeout(() => requestOptions(query, 0), SEARCH_DELAY);
  }

  function selectOption(option) {
    setInputValue(option.label);
    setIsOpen(false);
    onChange(option);
  }

  function clearSelection() {
    setInputValue('');
    onChange(null);
    setIsOpen(true);
    requestOptions('', 0);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setIsOpen(false);
      setInputValue(selectedLabel);
    }
  }

  function handleMenuScroll(event) {
    const menu = event.currentTarget;
    const reachedBottom = menu.scrollTop + menu.clientHeight >= menu.scrollHeight - 24;
    if (reachedBottom && hasMore && !isLoading) requestOptions(queryRef.current, options.length, true);
  }

  return (
    <div className={`async-autocomplete ${isOpen ? 'open' : ''}`} ref={rootRef}>
      <div className="async-autocomplete-control">
        <input
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          value={inputValue}
          onChange={updateQuery}
          onFocus={openList}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        {value && (
          <button type="button" aria-label="Очистить выбор" onClick={clearSelection}>×</button>
        )}
      </div>

      {isOpen && (
        <div className="async-autocomplete-menu" role="listbox" onScroll={handleMenuScroll}>
          {options.map((option) => (
            <button
              className={option.value === value ? 'selected' : ''}
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
            >
              {option.label}
            </button>
          ))}
          {!isLoading && !error && options.length === 0 && <span className="async-autocomplete-empty">Ничего не найдено</span>}
          {error && <span className="async-autocomplete-error">{error}</span>}
          {isLoading && <span className="async-autocomplete-loader"><i />Загрузка…</span>}
        </div>
      )}
    </div>
  );
}

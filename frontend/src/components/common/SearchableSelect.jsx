import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Search, Loader2 } from 'lucide-react';

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  onSearch, // Optional: Async search function
  placeholder = 'Select...',
  getOptionLabel = (option) => option.label || option.name || String(option),
  getOptionValue = (option) => option.value || option.id || option,
  searchFields = ['label', 'name', 'value'],
  className = '',
  required = false,
  disabled = false,
  debounceMs = 500
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [asyncOptions, setAsyncOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Determine which options to use
  const isAsync = typeof onSearch === 'function';
  const displayOptions = isAsync ? asyncOptions : options;

  // Find selected option object (handle both sync and async scenarios)
  // For async, we might not have the selected option in the current list if it was cleared
  // So we accept that we might just show the label if we have it, or we rely on the parent to pass the full object if needed
  // BUT: The simplest way is to check both props options and asyncOptions
  const selectedOption = useMemo(() => {
    const allKnownOptions = [...options, ...asyncOptions];
    return allKnownOptions.find(opt => getOptionValue(opt) === value);
  }, [options, asyncOptions, value, getOptionValue]);

  // Sync Search Logic
  const filteredOptions = useMemo(() => {
    if (isAsync) return asyncOptions; // Async handles filtering server-side

    return options.filter(option => {
      if (!searchTerm.trim()) return true;
      const search = searchTerm.toLowerCase();
      return searchFields.some(field => {
        const fieldValue = option[field];
        return fieldValue && String(fieldValue).toLowerCase().includes(search);
      }) || getOptionLabel(option).toLowerCase().includes(search);
    });
  }, [options, asyncOptions, searchTerm, isAsync, searchFields, getOptionLabel]);

  // Async Search Handler with Debounce
  useEffect(() => {
    if (!isAsync) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!isOpen) return; // Don't search if closed

    setIsLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await onSearch(searchTerm);
        setAsyncOptions(results || []);
      } catch (error) {
        console.error("Search failed", error);
        setAsyncOptions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm, isOpen, isAsync, debounceMs, onSearch]);

  // Initialize async options on open if empty (optional: to load initial list)
  useEffect(() => {
    if (isAsync && isOpen && asyncOptions.length === 0 && !isLoading) {
      // Trigger initial search
      setSearchTerm('');
    }
  }, [isOpen, isAsync]);


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        const option = filteredOptions[highlightedIndex];
        if (option) {
          handleSelect(option);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (option) => {
    onChange(getOptionValue(option));
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={handleToggle}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-lg 
          focus:outline-none focus:ring-2 focus:ring-primary-500
          cursor-pointer flex items-center justify-between
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${isOpen ? 'ring-2 ring-primary-500 border-primary-500' : ''}
        `}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? getOptionLabel(selectedOption) : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary-500" />}
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(-1);
                }}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div
            ref={listRef}
            className="overflow-y-auto max-h-48"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {isLoading ? 'Loading...' : 'No options found'}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const optionValue = getOptionValue(option);
                const optionLabel = getOptionLabel(option);
                const isSelected = optionValue === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={optionValue}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      px-3 py-2 text-sm cursor-pointer
                      ${isSelected ? 'bg-primary-50 text-primary-900 font-medium' : 'text-gray-900'}
                      ${isHighlighted && !isSelected ? 'bg-gray-100' : ''}
                      hover:bg-gray-100
                    `}
                  >
                    {optionLabel}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {required && !value && (
        <input
          type="text"
          required
          className="absolute opacity-0 pointer-events-none"
          tabIndex={-1}
          value=""
          onChange={() => { }}
        />
      )}
    </div>
  );
};

export default SearchableSelect;





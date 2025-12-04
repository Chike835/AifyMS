import { useState, useRef, useEffect } from 'react';
import { Search, Printer, Columns, Download, X } from 'lucide-react';

/**
 * Reusable ListToolbar component for list pages
 * Provides: Show X dropdown, Column Visibility, Print, Export, Search
 * 
 * @param {Object} props
 * @param {number} props.limit - Current page limit
 * @param {function} props.onLimitChange - Callback when limit changes
 * @param {Object} props.visibleColumns - Object of column visibility { columnKey: boolean }
 * @param {function} props.onColumnVisibilityChange - Callback when column visibility changes
 * @param {function} props.onPrint - Callback for print action
 * @param {function} props.onExport - Callback for export action (opens modal)
 * @param {string} props.searchTerm - Current search term
 * @param {function} props.onSearchChange - Callback when search changes
 * @param {string} props.searchPlaceholder - Placeholder for search input
 * @param {boolean} props.showColumnVisibility - Whether to show column visibility toggle (default: true)
 * @param {boolean} props.showPrint - Whether to show print button (default: true)
 * @param {boolean} props.showExport - Whether to show export button (default: true)
 * @param {boolean} props.showSearch - Whether to show search input (default: true)
 * @param {boolean} props.showPagination - Whether to show pagination dropdown (default: true)
 * @param {React.ReactNode} props.children - Additional elements to render in toolbar
 */
const ListToolbar = ({
  limit = 25,
  onLimitChange,
  visibleColumns = {},
  onColumnVisibilityChange,
  onPrint,
  onExport,
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  showColumnVisibility = true,
  showPrint = true,
  showExport = true,
  showSearch = true,
  showPagination = true,
  children
}) => {
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnMenuRef = useRef(null);

  // Close column menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const paginationOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 500, label: '500' },
    { value: 1000, label: '1000' },
    { value: -1, label: 'All' }
  ];

  const formatColumnLabel = (key) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {/* Left side: Show dropdown and additional children */}
      <div className="flex flex-wrap items-center gap-3">
        {showPagination && onLimitChange && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Show</label>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {paginationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {children}
      </div>

      {/* Right side: Actions and Search */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Column Visibility */}
        {showColumnVisibility && Object.keys(visibleColumns).length > 0 && (
          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Columns className="h-4 w-4" />
              <span className="hidden sm:inline">Column Visibility</span>
            </button>
            {showColumnMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <div className="border-b border-gray-100 px-3 py-2">
                  <span className="text-xs font-semibold uppercase text-gray-500">Toggle Columns</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {Object.entries(visibleColumns).map(([key, visible]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={(e) =>
                          onColumnVisibilityChange?.({ ...visibleColumns, [key]: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-gray-700">{formatColumnLabel(key)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Print Button */}
        {showPrint && (
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
        )}

        {/* Export Button */}
        {showExport && onExport && (
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        )}

        {/* Search Input */}
        {showSearch && onSearchChange && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:w-56"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListToolbar;










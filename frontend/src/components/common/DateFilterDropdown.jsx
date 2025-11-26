import { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { getDateRange, DATE_FILTER_PRESETS, formatDateRangeDisplay } from '../../utils/dateFilters';

const DateFilterDropdown = ({ 
  onDateChange, 
  initialPreset = 'this-month',
  showTimeRange = false,
  fiscalYearStartMonth = 1 
}) => {
  const [selectedPreset, setSelectedPreset] = useState(initialPreset);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customStartTime, setCustomStartTime] = useState('00:00');
  const [customEndTime, setCustomEndTime] = useState('23:59');
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);

  useEffect(() => {
    if (selectedPreset !== 'custom') {
      const range = getDateRange(selectedPreset, fiscalYearStartMonth);
      if (range && onDateChange) {
        onDateChange({
          startDate: range.startDateISO,
          endDate: range.endDateISO,
          startDateTime: range.startDateTime,
          endDateTime: range.endDateTime
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset, fiscalYearStartMonth]);

  const handlePresetChange = (preset) => {
    setSelectedPreset(preset);
    setIsCustomMode(preset === 'custom');
    if (preset !== 'custom') {
      setIsOpen(false);
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate && onDateChange) {
      const startDateTime = `${customStartDate}T${customStartTime}:00`;
      const endDateTime = `${customEndDate}T${customEndTime}:59`;
      
      onDateChange({
        startDate: customStartDate,
        endDate: customEndDate,
        startDateTime,
        endDateTime
      });
      setIsOpen(false);
    }
  };

  const getCurrentRangeDisplay = () => {
    if (selectedPreset === 'custom') {
      if (customStartDate && customEndDate) {
        return formatDateRangeDisplay(customStartDate, customEndDate);
      }
      return 'Select Custom Range';
    }
    const range = getDateRange(selectedPreset, fiscalYearStartMonth);
    if (range) {
      return formatDateRangeDisplay(range.startDateISO, range.endDateISO);
    }
    return 'Select Date Range';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-700">{getCurrentRangeDisplay()}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 mb-2">Quick Presets</div>
              {DATE_FILTER_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetChange(preset.value)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedPreset === preset.value
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {isCustomMode && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                <div className="text-sm font-medium text-gray-700">Custom Range</div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {showTimeRange && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Time</label>
                      <input
                        type="time"
                        value={customEndTime}
                        onChange={(e) => setCustomEndTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </>
                )}

                <button
                  onClick={handleCustomDateApply}
                  disabled={!customStartDate || !customEndDate}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DateFilterDropdown;



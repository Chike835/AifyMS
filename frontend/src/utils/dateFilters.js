/**
 * Date Filter Utility
 * Provides preset date ranges and custom date/time range selection
 */

/**
 * Get date range for preset options
 */
export const getDateRange = (preset, fiscalYearStartMonth = 1) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date();
  const endDate = new Date();

  switch (preset) {
    case 'today':
      startDate.setTime(today.getTime());
      endDate.setTime(today.getTime());
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'yesterday':
      startDate.setTime(today.getTime());
      startDate.setDate(startDate.getDate() - 1);
      endDate.setTime(today.getTime());
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'this-week':
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      endDate.setTime(today.getTime());
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'last-week':
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 6);
      lastWeekStart.setHours(0, 0, 0, 0);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      lastWeekEnd.setHours(23, 59, 59, 999);
      startDate.setTime(lastWeekStart.getTime());
      endDate.setTime(lastWeekEnd.getTime());
      break;

    case 'this-month':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setTime(today.getTime());
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'last-month':
      startDate.setMonth(today.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(today.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'this-month-last-year':
      startDate.setFullYear(today.getFullYear() - 1, today.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setFullYear(today.getFullYear() - 1, today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'this-year':
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setTime(today.getTime());
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'last-year':
      startDate.setFullYear(today.getFullYear() - 1, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setFullYear(today.getFullYear() - 1, 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'current-financial-year':
      const currentFYStart = new Date(today.getFullYear(), fiscalYearStartMonth - 1, 1);
      if (today < currentFYStart) {
        // If we're before the fiscal year start, use previous year
        currentFYStart.setFullYear(today.getFullYear() - 1);
      }
      startDate.setTime(currentFYStart.getTime());
      startDate.setHours(0, 0, 0, 0);
      endDate.setTime(today.getTime());
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'last-financial-year':
      const lastFYStart = new Date(today.getFullYear() - 1, fiscalYearStartMonth - 1, 1);
      const lastFYEnd = new Date(today.getFullYear(), fiscalYearStartMonth - 1, 0);
      lastFYEnd.setHours(23, 59, 59, 999);
      startDate.setTime(lastFYStart.getTime());
      startDate.setHours(0, 0, 0, 0);
      endDate.setTime(lastFYEnd.getTime());
      break;

    case 'custom':
      // Return null to indicate custom range should be used
      return null;

    default:
      // Default to last 30 days
      startDate.setDate(today.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate.setTime(today.getTime());
      endDate.setHours(23, 59, 59, 999);
  }

  return {
    startDate,
    endDate,
    startDateISO: startDate.toISOString().split('T')[0],
    endDateISO: endDate.toISOString().split('T')[0],
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString()
  };
};

/**
 * Date filter presets configuration
 */
export const DATE_FILTER_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this-week', label: 'This Week' },
  { value: 'last-week', label: 'Last Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'this-month-last-year', label: 'This Month Last Year' },
  { value: 'this-year', label: 'This Year' },
  { value: 'last-year', label: 'Last Year' },
  { value: 'current-financial-year', label: 'Current Financial Year' },
  { value: 'last-financial-year', label: 'Last Financial Year' },
  { value: 'custom', label: 'Custom Range' }
];

/**
 * Format date for display
 */
export const formatDateDisplay = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date range for display
 */
export const formatDateRangeDisplay = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
};













/**
 * Export Utilities
 * Functions for printing, PDF export, and Excel export
 */

/**
 * Print the current page/report
 */
export const printReport = () => {
  window.print();
};

/**
 * Export to PDF using jsPDF and html2canvas
 */
export const exportToPDF = async (elementId, filename = 'report.pdf') => {
  try {
    // Check if libraries are loaded
    if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
      alert('PDF export libraries not loaded. Please refresh the page.');
      return;
    }

    const element = document.getElementById(elementId);
    if (!element) {
      alert('Report element not found.');
      return;
    }

    // Show loading indicator
    const loadingMsg = document.createElement('div');
    loadingMsg.textContent = 'Generating PDF...';
    loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999;';
    document.body.appendChild(loadingMsg);

    // Capture the element as canvas
    const canvas = await window.html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Create PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgScaledWidth = imgWidth * ratio;
    const imgScaledHeight = imgHeight * ratio;
    const xOffset = (pdfWidth - imgScaledWidth) / 2;
    const yOffset = 0;

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgScaledWidth, imgScaledHeight);

    // If content is taller than one page, add additional pages
    let heightLeft = imgScaledHeight;
    let position = yOffset;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', xOffset, position, imgScaledWidth, imgScaledHeight);
      heightLeft -= pdfHeight;
    }

    // Save PDF
    pdf.save(filename);
    
    // Remove loading indicator
    document.body.removeChild(loadingMsg);
  } catch (error) {
    console.error('PDF export error:', error);
    alert('Failed to export PDF. Please try again.');
  }
};

/**
 * Export data to Excel (CSV format)
 */
export const exportToExcel = (data, filename = 'report.csv') => {
  try {
    if (!data || data.length === 0) {
      alert('No data to export.');
      return;
    }

    // Convert data to CSV
    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add BOM for UTF-8 (Excel compatibility)
    csvRows.push('\ufeff');

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Excel export error:', error);
    alert('Failed to export Excel. Please try again.');
  }
};

/**
 * Convert table data to array format for Excel export
 */
export const tableToArray = (tableElement) => {
  if (!tableElement) return [];

  const rows = Array.from(tableElement.querySelectorAll('tr'));
  return rows.map(row => {
    const cells = Array.from(row.querySelectorAll('th, td'));
    return cells.map(cell => cell.textContent.trim());
  });
};

/**
 * Generate filename with date range
 */
export const generateFilename = (baseName, startDate, endDate, extension = 'pdf') => {
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const start = formatDate(startDate);
  const end = formatDate(endDate);
  const dateRange = start && end ? `_${start}_to_${end}` : '';
  
  return `${baseName}${dateRange}.${extension}`;
};




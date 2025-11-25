import puppeteer from 'puppeteer';

/**
 * PDF Service
 * 
 * Uses Puppeteer (headless Chrome) for HTML-to-PDF conversion
 */

let browserInstance = null;

/**
 * Get or create browser instance (singleton)
 */
const getBrowser = async () => {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
  }
  return browserInstance;
};

/**
 * Generate PDF from HTML content
 * @param {string} htmlContent - HTML content to convert to PDF
 * @param {object} options - PDF generation options
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generatePDFFromHTML = async (htmlContent, options = {}) => {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });
    
    // Generate PDF with options
    const pdfOptions = {
      format: options.format || 'A4',
      margin: options.margin || {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    };
    
    const pdfBuffer = await page.pdf(pdfOptions);
    await page.close();
    
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

/**
 * Generate invoice PDF
 * @param {object} orderData - Sales order data
 * @param {object} template - Template configuration
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateInvoicePDF = async (orderData, template = null) => {
  // Build HTML content from order data
  const htmlContent = buildInvoiceHTML(orderData, template);
  
  // Generate PDF
  return await generatePDFFromHTML(htmlContent, {
    format: 'A4',
    margin: { top: 20, right: 20, bottom: 20, left: 20 }
  });
};

/**
 * Generate delivery note PDF
 * @param {object} orderData - Sales order data
 * @param {string} templateContent - Template content
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateDeliveryNotePDF = async (orderData, templateContent) => {
  // Replace template variables
  let htmlContent = templateContent || getDefaultDeliveryNoteTemplate();
  
  htmlContent = htmlContent
    .replace(/\{\{invoice_number\}\}/g, orderData.invoice_number || 'N/A')
    .replace(/\{\{date\}\}/g, new Date(orderData.created_at).toLocaleDateString())
    .replace(/\{\{customer_name\}\}/g, orderData.customer?.name || 'Walk-in')
    .replace(/\{\{customer_address\}\}/g, orderData.customer?.address || 'N/A')
    .replace(/\{\{total_amount\}\}/g, formatCurrency(orderData.total_amount))
    .replace(/\{\{delivery_address\}\}/g, orderData.delivery_address || orderData.customer?.address || 'N/A')
    .replace(/\{\{notes\}\}/g, orderData.notes || '')
    .replace(/\{\{#items\}\}/g, '')
    .replace(/\{\{\/items\}\}/g, '');
  
  // Process items if present
  if (orderData.items && orderData.items.length > 0) {
    const itemsHTML = orderData.items.map(item => 
      `- ${item.product?.name || 'N/A'} x ${item.quantity} @ ${formatCurrency(item.unit_price)}`
    ).join('\n');
    htmlContent = htmlContent.replace(/\{\{product_name\}\}/g, itemsHTML.split('\n')[0]?.split(' x ')[0] || 'N/A');
    htmlContent = htmlContent.replace(/\{\{quantity\}\}/g, orderData.items[0]?.quantity || 'N/A');
    htmlContent = htmlContent.replace(/\{\{unit_price\}\}/g, formatCurrency(orderData.items[0]?.unit_price || 0));
  }
  
  // Wrap in basic HTML structure
  htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        pre { white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <pre>${htmlContent}</pre>
    </body>
    </html>
  `;
  
  return await generatePDFFromHTML(htmlContent);
};

/**
 * Build invoice HTML from order data
 */
export const buildInvoiceHTML = (orderData, template) => {
  const invoiceDate = new Date(orderData.created_at || new Date());
  const formattedDate = invoiceDate.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          padding: 40px;
          color: #333;
          background: #fff;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          background: #fff;
        }
        .header { 
          text-align: center; 
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #2563eb;
        }
        .header h1 { 
          font-size: 32px; 
          color: #2563eb;
          margin-bottom: 10px;
          font-weight: 700;
        }
        .invoice-number {
          font-size: 18px;
          color: #666;
          font-weight: 600;
        }
        .invoice-info { 
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        .info-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
        }
        .info-section h3 {
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 10px;
          letter-spacing: 1px;
        }
        .info-section p {
          font-size: 16px;
          color: #333;
          margin: 5px 0;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 30px 0;
          background: #fff;
        }
        th { 
          background-color: #2563eb;
          color: #fff;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
        }
        td { 
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        tbody tr:hover {
          background-color: #f8f9fa;
        }
        .total-row {
          background-color: #f8f9fa;
          font-weight: 700;
        }
        .total { 
          text-align: right; 
          font-weight: bold;
          font-size: 18px;
          color: #2563eb;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <h1>INVOICE</h1>
          <p class="invoice-number">${orderData.invoice_number || 'N/A'}</p>
        </div>
        <div class="invoice-info">
          <div class="info-section">
            <h3>Bill To</h3>
            <p><strong>${orderData.customer?.name || 'Walk-in Customer'}</strong></p>
            <p>${orderData.customer?.address || 'N/A'}</p>
            ${orderData.customer?.phone ? `<p>Phone: ${orderData.customer.phone}</p>` : ''}
          </div>
          <div class="info-section">
            <h3>Invoice Details</h3>
            <p><strong>Date:</strong> ${formattedDate}</p>
            ${orderData.branch?.name ? `<p><strong>Branch:</strong> ${orderData.branch.name}</p>` : ''}
            ${orderData.payment_status ? `<p><strong>Status:</strong> ${orderData.payment_status}</p>` : ''}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${orderData.items?.map(item => `
              <tr>
                <td>${item.product?.name || 'N/A'}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">${formatCurrency(item.unit_price)}</td>
                <td style="text-align: right;">${formatCurrency(item.subtotal)}</td>
              </tr>
            `).join('') || '<tr><td colspan="4" style="text-align: center; padding: 20px;">No items</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3" class="total">Total Amount:</td>
              <td class="total">${formatCurrency(orderData.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
        ${orderData.notes ? `
          <div class="info-section" style="margin-top: 20px;">
            <h3>Notes</h3>
            <p>${orderData.notes}</p>
          </div>
        ` : ''}
        <div class="footer">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Get default delivery note template
 */
const getDefaultDeliveryNoteTemplate = () => {
  return `DELIVERY NOTE

Order Number: {{invoice_number}}
Date: {{date}}
Customer: {{customer_name}}
Address: {{customer_address}}

Items:
{{#items}}
- {{product_name}} x {{quantity}} @ {{unit_price}}
{{/items}}

Total: {{total_amount}}
Delivery Address: {{delivery_address}}
Notes: {{notes}}

Thank you for your business!`;
};

/**
 * Build receipt HTML for thermal printers (58mm/80mm)
 */
export const buildReceiptHTML = (orderData, width = 58) => {
  const widthPx = width === 58 ? '174px' : '240px'; // 58mm ≈ 174px, 80mm ≈ 240px at 96dpi
  const fontSize = width === 58 ? '12px' : '14px';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Courier New', monospace;
          width: ${widthPx};
          margin: 0 auto;
          padding: 10px;
          font-size: ${fontSize};
          line-height: 1.4;
        }
        .header {
          text-align: center;
          margin-bottom: 10px;
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
        }
        .header h1 {
          font-size: ${width === 58 ? '16px' : '18px'};
          font-weight: bold;
          margin-bottom: 5px;
        }
        .info {
          margin: 8px 0;
          font-size: ${fontSize};
        }
        .info strong {
          font-weight: bold;
        }
        .items {
          margin: 10px 0;
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 10px 0;
        }
        .item {
          margin: 5px 0;
          display: flex;
          justify-content: space-between;
        }
        .item-name {
          flex: 1;
        }
        .item-qty {
          margin: 0 5px;
        }
        .item-price {
          text-align: right;
        }
        .total {
          text-align: right;
          font-weight: bold;
          font-size: ${width === 58 ? '14px' : '16px'};
          margin-top: 10px;
          border-top: 1px dashed #000;
          padding-top: 10px;
        }
        .footer {
          text-align: center;
          margin-top: 15px;
          font-size: ${width === 58 ? '10px' : '12px'};
          border-top: 1px dashed #000;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>RECEIPT</h1>
        <div class="info">${orderData.invoice_number || 'N/A'}</div>
      </div>
      <div class="info">
        <strong>Date:</strong> ${new Date(orderData.created_at || new Date()).toLocaleDateString('en-NG')}
      </div>
      <div class="info">
        <strong>Customer:</strong> ${orderData.customer?.name || 'Walk-in'}
      </div>
      ${orderData.branch?.name ? `<div class="info"><strong>Branch:</strong> ${orderData.branch.name}</div>` : ''}
      <div class="items">
        ${orderData.items?.map(item => `
          <div class="item">
            <span class="item-name">${item.product?.name || 'N/A'}</span>
            <span class="item-qty">x${item.quantity}</span>
            <span class="item-price">${formatCurrency(item.subtotal)}</span>
          </div>
        `).join('') || '<div class="item">No items</div>'}
      </div>
      <div class="total">
        TOTAL: ${formatCurrency(orderData.total_amount)}
      </div>
      <div class="footer">
        <p>Thank you for your business!</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Build label HTML for barcode printing (A4 sheets or single stickers)
 */
export const buildLabelHTML = (labels, options = {}) => {
  const {
    format = 'a4', // 'a4' or 'single'
    size = 'a4', // Label size
    columns = 3, // Number of columns for grid layout
    showBarcode = true
  } = options;
  
  const isA4 = format === 'a4';
  const labelWidth = isA4 ? `${100 / columns}%` : '100%';
  const labelPadding = isA4 ? '5px' : '10px';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          padding: ${isA4 ? '10px' : '0'};
        }
        .label-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .label {
          width: ${labelWidth};
          border: 1px solid #ddd;
          padding: ${labelPadding};
          ${isA4 ? 'min-height: 100px;' : ''}
          page-break-inside: avoid;
        }
        .label-header {
          font-weight: bold;
          font-size: ${isA4 ? '12px' : '14px'};
          margin-bottom: 5px;
          text-align: center;
        }
        .label-code {
          font-family: 'Courier New', monospace;
          font-size: ${isA4 ? '10px' : '12px'};
          text-align: center;
          margin: 5px 0;
          font-weight: bold;
        }
        .label-info {
          font-size: ${isA4 ? '9px' : '11px'};
          margin: 3px 0;
        }
        .label-barcode {
          text-align: center;
          margin: 5px 0;
          font-family: 'Courier New', monospace;
          font-size: ${isA4 ? '14px' : '16px'};
          letter-spacing: 2px;
        }
        .label-qty {
          text-align: center;
          font-size: ${isA4 ? '10px' : '12px'};
          color: #666;
          margin-top: 5px;
        }
        @media print {
          .label {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="label-grid">
        ${labels.map(label => `
          <div class="label">
            <div class="label-header">${label.product_name || 'N/A'}</div>
            <div class="label-code">${label.instance_code || 'N/A'}</div>
            ${label.product_sku ? `<div class="label-info">SKU: ${label.product_sku}</div>` : ''}
            ${showBarcode ? `<div class="label-barcode">${label.instance_code || ''}</div>` : ''}
            ${label.branch_name ? `<div class="label-info">Branch: ${label.branch_name}</div>` : ''}
            <div class="label-qty">Qty: ${label.remaining_quantity?.toFixed(2) || '0'}</div>
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;
};

/**
 * Format currency
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount || 0);
};



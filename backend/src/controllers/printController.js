import { SalesOrder, DeliveryNoteTemplate, Customer, SalesItem, Product } from '../models/index.js';
import * as pdfService from '../services/pdfService.js';

/**
 * GET /api/print/invoice/:orderId
 * Generate and return invoice PDF
 */
export const printInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await SalesOrder.findByPk(orderId, {
      include: [
        { model: Customer, as: 'customer' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Branch access check
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      if (order.branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'Unauthorized to print this invoice' });
      }
    }

    try {
      // Generate PDF
      const pdfBuffer = await pdfService.generateInvoicePDF(order);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.invoice_number}.pdf"`);
      
      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      // If PDF generation is not implemented, return HTML preview
      if (error.message.includes('not yet implemented')) {
        return res.status(501).json({ 
          error: 'PDF generation not yet implemented. Please install a PDF library.',
          html: buildInvoiceHTML(order)
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/print/delivery-note/:orderId
 * Generate and return delivery note PDF
 */
export const printDeliveryNote = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await SalesOrder.findByPk(orderId, {
      include: [
        { model: Customer, as: 'customer' },
        { 
          model: SalesItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Branch access check
    if (req.user?.role_name !== 'Super Admin' && req.user?.branch_id) {
      if (order.branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'Unauthorized to print this delivery note' });
      }
    }

    // Get delivery note template
    let templateContent = null;
    try {
      const template = await DeliveryNoteTemplate.findOne({
        where: {
          is_default: true,
          branch_id: req.user?.branch_id || null
        }
      });
      if (template) {
        templateContent = template.template_content;
      }
    } catch (err) {
      // Template not found, use default
    }

    try {
      // Generate PDF
      const pdfBuffer = await pdfService.generateDeliveryNotePDF(order, templateContent);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="delivery-note-${order.invoice_number}.pdf"`);
      
      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      // If PDF generation is not implemented, return HTML preview
      if (error.message.includes('not yet implemented')) {
        return res.status(501).json({ 
          error: 'PDF generation not yet implemented. Please install a PDF library.',
          html: buildDeliveryNoteHTML(order, templateContent)
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Build invoice HTML (fallback when PDF not available)
 */
const buildInvoiceHTML = (order) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${order.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .invoice-info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { text-align: right; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>INVOICE</h1>
        <p>${order.invoice_number || 'N/A'}</p>
      </div>
      <div class="invoice-info">
        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
        <p><strong>Customer:</strong> ${order.customer?.name || 'Walk-in'}</p>
        <p><strong>Address:</strong> ${order.customer?.address || 'N/A'}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${order.items?.map(item => `
            <tr>
              <td>${item.product?.name || 'N/A'}</td>
              <td>${item.quantity}</td>
              <td>₦${parseFloat(item.unit_price).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
              <td>₦${parseFloat(item.subtotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('') || ''}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="total">Total:</td>
            <td class="total">₦${parseFloat(order.total_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;
};

/**
 * Build delivery note HTML (fallback when PDF not available)
 */
const buildDeliveryNoteHTML = (order, templateContent) => {
  let content = templateContent || `DELIVERY NOTE

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

  // Replace template variables
  content = content
    .replace(/\{\{invoice_number\}\}/g, order.invoice_number || 'N/A')
    .replace(/\{\{date\}\}/g, new Date(order.created_at).toLocaleDateString())
    .replace(/\{\{customer_name\}\}/g, order.customer?.name || 'Walk-in')
    .replace(/\{\{customer_address\}\}/g, order.customer?.address || 'N/A')
    .replace(/\{\{total_amount\}\}/g, `₦${parseFloat(order.total_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`)
    .replace(/\{\{delivery_address\}\}/g, order.delivery_address || order.customer?.address || 'N/A')
    .replace(/\{\{notes\}\}/g, order.notes || '');

  // Process items
  if (order.items && order.items.length > 0) {
    const itemsText = order.items.map(item => 
      `- ${item.product?.name || 'N/A'} x ${item.quantity} @ ₦${parseFloat(item.unit_price).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
    ).join('\n');
    content = content.replace(/\{\{#items\}\}/g, '');
    content = content.replace(/\{\{\/items\}\}/g, itemsText);
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Delivery Note ${order.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
      </style>
    </head>
    <body>
      <pre>${content}</pre>
    </body>
    </html>
  `;
};


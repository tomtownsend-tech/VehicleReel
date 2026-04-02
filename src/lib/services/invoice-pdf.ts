import PDFDocument from 'pdfkit';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  // Production company (bill to)
  billToName: string;
  billToCompany: string;
  billToEmail: string;
  // Vehicle details
  vehicleDescription: string;
  shootDates: string;
  // Line items
  lineItems: InvoiceLineItem[];
  subtotalCents: number;
  platformFeeCents: number;
  totalCents: number;
  // Bank details (from env)
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
  swiftCode: string;
  companyReg: string;
}

function formatRands(cents: number): string {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100; // 50 margin each side

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('VEHICLEREEL', 50, 50);
    doc.fontSize(8).font('Helvetica').fillColor('#666666')
      .text(`${data.accountHolder} | Reg: ${data.companyReg}`, 50, 78);

    doc.fontSize(28).font('Helvetica-Bold').fillColor('#000000')
      .text('INVOICE', 50, 50, { align: 'right' });

    // Invoice details
    doc.moveDown(2);
    const detailsY = 120;
    doc.fontSize(9).font('Helvetica').fillColor('#666666');
    doc.text('Invoice Number:', 50, detailsY);
    doc.text('Invoice Date:', 50, detailsY + 16);
    doc.font('Helvetica-Bold').fillColor('#000000');
    doc.text(data.invoiceNumber, 150, detailsY);
    doc.text(data.invoiceDate, 150, detailsY + 16);

    // Bill To
    const billY = detailsY + 50;
    doc.fontSize(9).font('Helvetica').fillColor('#666666').text('BILL TO:', 50, billY);
    doc.font('Helvetica-Bold').fillColor('#000000').fontSize(10)
      .text(data.billToCompany || data.billToName, 50, billY + 16);
    doc.font('Helvetica').fontSize(9).fillColor('#333333')
      .text(data.billToName, 50, billY + 30)
      .text(data.billToEmail, 50, billY + 44);

    // Vehicle & Shoot info
    doc.font('Helvetica').fillColor('#666666').text('VEHICLE:', 300, billY);
    doc.font('Helvetica-Bold').fillColor('#000000')
      .text(data.vehicleDescription, 300, billY + 16);
    doc.font('Helvetica').fillColor('#666666').text('SHOOT DATES:', 300, billY + 36);
    doc.font('Helvetica').fillColor('#000000')
      .text(data.shootDates, 300, billY + 50);

    // Line items table
    const tableY = billY + 90;

    // Table header
    doc.rect(50, tableY, pageWidth, 24).fill('#1a1a1a');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Description', 58, tableY + 7);
    doc.text('Qty', 320, tableY + 7, { width: 40, align: 'center' });
    doc.text('Unit Price', 370, tableY + 7, { width: 80, align: 'right' });
    doc.text('Total', 460, tableY + 7, { width: 80, align: 'right' });

    // Table rows
    let rowY = tableY + 24;
    doc.fillColor('#000000').font('Helvetica').fontSize(9);
    for (const item of data.lineItems) {
      if (rowY % 2 === 0) {
        doc.rect(50, rowY, pageWidth, 22).fill('#f9f9f9');
      }
      doc.fillColor('#333333');
      doc.text(item.description, 58, rowY + 6);
      doc.text(String(item.quantity), 320, rowY + 6, { width: 40, align: 'center' });
      doc.text(formatRands(item.unitPriceCents), 370, rowY + 6, { width: 80, align: 'right' });
      doc.text(formatRands(item.totalCents), 460, rowY + 6, { width: 80, align: 'right' });
      rowY += 22;
    }

    // Divider
    rowY += 8;
    doc.moveTo(350, rowY).lineTo(50 + pageWidth, rowY).stroke('#cccccc');
    rowY += 12;

    // Subtotal
    doc.fontSize(9).font('Helvetica').fillColor('#666666');
    doc.text('Subtotal:', 370, rowY, { width: 80, align: 'right' });
    doc.font('Helvetica').fillColor('#000000');
    doc.text(formatRands(data.subtotalCents), 460, rowY, { width: 80, align: 'right' });
    rowY += 18;

    // Platform fee
    doc.fontSize(9).font('Helvetica').fillColor('#666666');
    doc.text('Platform Fee:', 370, rowY, { width: 80, align: 'right' });
    doc.font('Helvetica').fillColor('#000000');
    doc.text(formatRands(data.platformFeeCents), 460, rowY, { width: 80, align: 'right' });
    rowY += 18;

    // Total
    doc.rect(350, rowY - 4, pageWidth - 300, 26).fill('#1a1a1a');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('TOTAL DUE:', 370, rowY + 2, { width: 80, align: 'right' });
    doc.text(formatRands(data.totalCents), 460, rowY + 2, { width: 80, align: 'right' });

    // Banking details
    rowY += 50;
    doc.rect(50, rowY, pageWidth, 1).fill('#e5e5e5');
    rowY += 15;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('BANKING DETAILS', 50, rowY);
    rowY += 20;
    doc.fontSize(9).font('Helvetica').fillColor('#333333');

    const bankDetails = [
      ['Bank', data.bankName],
      ['Account Holder', data.accountHolder],
      ['Account Number', data.accountNumber],
      ['Branch Code', data.branchCode],
      ['Swift Code', data.swiftCode],
      ['Reference', data.invoiceNumber],
    ];

    for (const [label, value] of bankDetails) {
      doc.font('Helvetica').fillColor('#666666').text(`${label}:`, 50, rowY);
      doc.font('Helvetica-Bold').fillColor('#000000').text(value, 160, rowY);
      rowY += 16;
    }

    // Footer
    rowY += 20;
    doc.fontSize(8).font('Helvetica').fillColor('#999999')
      .text('Payment is due within 30 days of invoice date. Please use the invoice number as your payment reference.', 50, rowY, { width: pageWidth, align: 'center' });

    doc.end();
  });
}

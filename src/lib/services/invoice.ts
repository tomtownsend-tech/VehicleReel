import { prisma } from '@/lib/prisma';
import { getSupabase } from '@/lib/supabase';
import { generateInvoicePdf } from './invoice-pdf';
import { sendEmailWithAttachment, invoiceSentEmail } from './email';
import { safeNotify } from './notification';
import { format } from 'date-fns';

function formatRands(cents: number): string {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

async function getNextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VR-${year}-`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  const lastSeq = lastInvoice
    ? parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10)
    : 0;

  return `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;
}

export async function generateInvoice(bookingId: string): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    // Check if invoice already exists for this booking
    const existing = await prisma.invoice.findUnique({ where: { bookingId } });
    if (existing) return { success: true, invoiceId: existing.id };

    // Fetch booking with all needed relations
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        option: {
          include: {
            vehicle: { select: { make: true, model: true, year: true, type: true, customType: true } },
          },
        },
        productionUser: { select: { id: true, name: true, email: true, companyName: true } },
        dailyDetails: { orderBy: { date: 'asc' } },
      },
    });

    if (!booking) return { success: false, error: 'Booking not found' };

    const owner = await prisma.user.findUnique({
      where: { id: booking.ownerId },
      select: { id: true, name: true, email: true },
    });
    if (!owner) return { success: false, error: 'Owner not found' };

    // Calculate amounts
    const totalDays = booking.dailyDetails.length || 1;
    const subtotalCents = booking.rateType === 'PER_DAY'
      ? booking.rateCents * totalDays
      : booking.rateCents;

    // Platform fee is already included in rateCents (rateCents = ownerPayout * 1.3 approximately)
    // But we store them separately for the invoice
    const ownerPayoutCents = booking.rateType === 'PER_DAY'
      ? booking.ownerPayoutCents * totalDays
      : booking.ownerPayoutCents;
    const platformFeeCents = subtotalCents - ownerPayoutCents;
    const totalCents = subtotalCents;

    const invoiceNumber = await getNextInvoiceNumber();
    const vehicle = booking.option.vehicle;
    const vehicleDescription = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const shootDates = `${format(booking.startDate, 'd MMM yyyy')} — ${format(booking.endDate, 'd MMM yyyy')}`;

    // Build line items
    const lineItems = booking.rateType === 'PER_DAY'
      ? [{
          description: `Vehicle hire: ${vehicleDescription} (${totalDays} day${totalDays > 1 ? 's' : ''})`,
          quantity: totalDays,
          unitPriceCents: booking.rateCents,
          totalCents: subtotalCents,
        }]
      : [{
          description: `Vehicle hire: ${vehicleDescription} (Package)`,
          quantity: 1,
          unitPriceCents: booking.rateCents,
          totalCents: subtotalCents,
        }];

    // Get bank details from env
    const bankName = process.env.INVOICE_BANK_NAME || 'First National Bank';
    const accountHolder = process.env.INVOICE_ACCOUNT_HOLDER || 'VEHICLEREEL (PTY) LTD';
    const accountNumber = process.env.INVOICE_ACCOUNT_NUMBER || '';
    const branchCode = process.env.INVOICE_BRANCH_CODE || '';
    const swiftCode = process.env.INVOICE_SWIFT_CODE || 'FIRNZAJJ';
    const companyReg = process.env.INVOICE_COMPANY_REG || '';

    // Generate PDF
    const pdfBuffer = await generateInvoicePdf({
      invoiceNumber,
      invoiceDate: format(new Date(), 'd MMMM yyyy'),
      billToName: booking.productionUser.name,
      billToCompany: booking.productionUser.companyName || booking.productionUser.name,
      billToEmail: booking.productionUser.email,
      vehicleDescription,
      shootDates,
      lineItems,
      subtotalCents,
      platformFeeCents,
      totalCents,
      bankName,
      accountHolder,
      accountNumber,
      branchCode,
      swiftCode,
      companyReg,
    });

    // Upload PDF to Supabase
    const supabase = getSupabase();
    const pdfPath = `invoices/${invoiceNumber}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

    let pdfUrl: string | null = null;
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(pdfPath);
      pdfUrl = urlData.publicUrl;
    }

    // Create invoice record
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        bookingId,
        productionUserId: booking.productionUserId,
        ownerId: booking.ownerId,
        subtotalCents,
        platformFeeCents,
        totalCents,
        ownerPayoutCents,
        pdfUrl,
        status: 'SENT',
      },
    });

    // Send email with PDF to production company
    const totalFormatted = formatRands(totalCents);
    const emailContent = invoiceSentEmail(
      booking.productionUser.name,
      invoiceNumber,
      vehicleDescription,
      totalFormatted,
      shootDates,
    );

    await sendEmailWithAttachment({
      to: booking.productionUser.email,
      ...emailContent,
      attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer }],
    });

    // Send copy to admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const adminEmailContent = invoiceSentEmail(
        'Admin',
        invoiceNumber,
        vehicleDescription,
        totalFormatted,
        shootDates,
      );
      await sendEmailWithAttachment({
        to: adminEmail,
        ...adminEmailContent,
        attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer }],
      });
    }

    // Notify production user
    await safeNotify({
      userId: booking.productionUserId,
      type: 'INVOICE_SENT',
      title: 'Invoice Generated',
      message: `Invoice ${invoiceNumber} for ${vehicleDescription} has been sent. Total: ${totalFormatted}.`,
      data: { invoiceId: invoice.id, bookingId, invoiceNumber },
    });

    // Notify admin users
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    for (const admin of admins) {
      await safeNotify({
        userId: admin.id,
        type: 'INVOICE_SENT',
        title: 'Invoice Generated',
        message: `Invoice ${invoiceNumber} sent to ${booking.productionUser.companyName || booking.productionUser.name} for ${vehicleDescription}. Total: ${totalFormatted}.`,
        data: { invoiceId: invoice.id, bookingId, invoiceNumber },
      });
    }

    return { success: true, invoiceId: invoice.id };
  } catch (error) {
    console.error('Invoice generation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeNotify } from '@/lib/services/notification';
import { sendEmailWithAttachment, paymentReminderEmail } from '@/lib/services/email';
import { differenceInDays } from 'date-fns';

// Reminder schedule: Day 1, 7, 14, 21, 30
const REMINDER_DAYS = [1, 7, 14, 21, 30];

function formatRands(cents: number): string {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  let sent = 0;

  // Find all SENT (unpaid) invoices
  const invoices = await prisma.invoice.findMany({
    where: { status: 'SENT' },
    include: {
      productionUser: { select: { id: true, name: true, email: true, companyName: true } },
      booking: {
        include: {
          option: {
            include: {
              vehicle: { select: { make: true, model: true, year: true } },
            },
          },
        },
      },
    },
  });

  const adminEmail = process.env.ADMIN_EMAIL;

  for (const invoice of invoices) {
    const daysSinceSent = differenceInDays(now, invoice.sentAt);

    // Check if today matches a reminder day and we haven't sent this reminder yet
    const shouldRemind = REMINDER_DAYS.includes(daysSinceSent) &&
      invoice.reminderCount < REMINDER_DAYS.indexOf(daysSinceSent) + 1;

    if (!shouldRemind) continue;

    const vehicle = invoice.booking.option.vehicle;
    const vehicleDescription = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const totalFormatted = formatRands(invoice.totalCents);

    // Send reminder to production company
    const emailContent = paymentReminderEmail(
      invoice.productionUser.name,
      invoice.invoiceNumber,
      vehicleDescription,
      totalFormatted,
      daysSinceSent,
    );

    // Attach PDF if available
    const attachments: { filename: string; content: Buffer }[] = [];
    if (invoice.pdfUrl) {
      try {
        const pdfRes = await fetch(invoice.pdfUrl);
        if (pdfRes.ok) {
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
          attachments.push({ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer });
        }
      } catch {
        // Continue without attachment
      }
    }

    await sendEmailWithAttachment({
      to: invoice.productionUser.email,
      ...emailContent,
      attachments,
    });

    // Send reminder to admin
    if (adminEmail) {
      const adminContent = paymentReminderEmail(
        'Admin',
        invoice.invoiceNumber,
        vehicleDescription,
        totalFormatted,
        daysSinceSent,
      );
      await sendEmailWithAttachment({
        to: adminEmail,
        ...adminContent,
        attachments,
      });
    }

    // Notify production user
    await safeNotify({
      userId: invoice.productionUserId,
      type: 'PAYMENT_REMINDER',
      title: 'Payment Reminder',
      message: `Invoice ${invoice.invoiceNumber} is ${daysSinceSent} day${daysSinceSent === 1 ? '' : 's'} outstanding. Amount: ${totalFormatted}.`,
      data: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    });

    // Update reminder tracking
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        lastReminderAt: now,
        reminderCount: { increment: 1 },
        ...(daysSinceSent >= 30 ? { status: 'OVERDUE' } : {}),
      },
    });

    sent++;
  }

  return NextResponse.json({ success: true, reminders: sent, checked: invoices.length });
}

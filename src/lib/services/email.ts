import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    await resend.emails.send({
      from: `VehicleReel <${process.env.EMAIL_FROM || 'onboarding@resend.dev'}>`,
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

interface SendEmailWithAttachmentParams extends SendEmailParams {
  attachments: { filename: string; content: Buffer }[];
}

export async function sendEmailWithAttachment({ to, subject, html, attachments }: SendEmailWithAttachmentParams) {
  try {
    await resend.emails.send({
      from: `VehicleReel <${process.env.EMAIL_FROM || 'onboarding@resend.dev'}>`,
      to,
      subject,
      html,
      attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })),
    });
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export function optionPlacedEmail(ownerName: string, vehicleName: string, productionUser: string, rate: string, dates: string, deadline: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://vehiclereel.co.za';
  return {
    subject: `New option on your ${escapeHtml(vehicleName)}`,
    html: `
      <h2>New Option Placed</h2>
      <p>Hi ${escapeHtml(ownerName)},</p>
      <p><strong>${escapeHtml(productionUser)}</strong> has placed an option on your <strong>${escapeHtml(vehicleName)}</strong>.</p>
      <ul>
        <li><strong>Dates:</strong> ${escapeHtml(dates)}</li>
        <li><strong>Rate:</strong> ${escapeHtml(rate)}</li>
        <li><strong>Response deadline:</strong> ${escapeHtml(deadline)}</li>
      </ul>
      <p><a href="${baseUrl}/owner/options" style="display:inline-block;background-color:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Review Option</a></p>
      <p style="margin-top:8px;font-size:12px;color:#6b7280;">Or log in at ${baseUrl}</p>
    `,
  };
}

export function optionAcceptedEmail(productionName: string, vehicleName: string, confirmDeadline: string) {
  return {
    subject: `Option accepted: ${escapeHtml(vehicleName)}`,
    html: `
      <h2>Option Accepted</h2>
      <p>Hi ${escapeHtml(productionName)},</p>
      <p>The owner has accepted your option on <strong>${escapeHtml(vehicleName)}</strong>.</p>
      <p>You have until <strong>${escapeHtml(confirmDeadline)}</strong> to confirm the booking.</p>
      <p>Log in to VehicleReel to confirm.</p>
    `,
  };
}

export function optionDeclinedEmail(productionName: string, vehicleName: string) {
  return {
    subject: `Option declined: ${escapeHtml(vehicleName)}`,
    html: `
      <h2>Option Declined</h2>
      <p>Hi ${escapeHtml(productionName)},</p>
      <p>The owner has declined your option on <strong>${escapeHtml(vehicleName)}</strong>.</p>
      <p>You can search for other vehicles on VehicleReel.</p>
    `,
  };
}

export function optionExpiredEmail(userName: string, vehicleName: string, reason: string) {
  return {
    subject: `Option expired: ${escapeHtml(vehicleName)}`,
    html: `
      <h2>Option Expired</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>An option on <strong>${escapeHtml(vehicleName)}</strong> has expired. ${escapeHtml(reason)}</p>
    `,
  };
}

export function bookingConfirmedEmail(userName: string, vehicleName: string, dates: string, rate: string, logistics: string, contactName: string, contactEmail: string, contactPhone: string | null) {
  return {
    subject: `Booking confirmed: ${escapeHtml(vehicleName)}`,
    html: `
      <h2>Booking Confirmed!</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>Your booking for <strong>${escapeHtml(vehicleName)}</strong> has been confirmed.</p>
      <ul>
        <li><strong>Dates:</strong> ${escapeHtml(dates)}</li>
        <li><strong>Rate:</strong> ${escapeHtml(rate)}</li>
        <li><strong>Logistics:</strong> ${escapeHtml(logistics)}</li>
      </ul>
      <h3>Contact Details</h3>
      <ul>
        <li><strong>Name:</strong> ${escapeHtml(contactName)}</li>
        <li><strong>Email:</strong> ${escapeHtml(contactEmail)}</li>
        ${contactPhone ? `<li><strong>Phone:</strong> ${escapeHtml(contactPhone)}</li>` : ''}
      </ul>
      <p>A conversation thread has been opened. Log in to VehicleReel to message.</p>
    `,
  };
}

export function bookingConfirmedAdminEmail(
  vehicleName: string,
  dates: string,
  rate: string,
  logistics: string,
  ownerName: string,
  ownerEmail: string,
  productionName: string,
  productionEmail: string,
  companyName: string | null,
) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://vehiclereel.co.za';
  return {
    subject: `New booking confirmed: ${escapeHtml(vehicleName)}`,
    html: `
      <h2>Booking Confirmed</h2>
      <p>A new booking has been confirmed on VehicleReel.</p>
      <h3>Vehicle</h3>
      <ul>
        <li><strong>Vehicle:</strong> ${escapeHtml(vehicleName)}</li>
        <li><strong>Dates:</strong> ${escapeHtml(dates)}</li>
        <li><strong>Rate:</strong> ${escapeHtml(rate)}</li>
        <li><strong>Logistics:</strong> ${escapeHtml(logistics)}</li>
      </ul>
      <h3>Owner</h3>
      <ul>
        <li><strong>Name:</strong> ${escapeHtml(ownerName)}</li>
        <li><strong>Email:</strong> ${escapeHtml(ownerEmail)}</li>
      </ul>
      <h3>Production</h3>
      <ul>
        <li><strong>Name:</strong> ${escapeHtml(productionName)}</li>
        ${companyName ? `<li><strong>Company:</strong> ${escapeHtml(companyName)}</li>` : ''}
        <li><strong>Email:</strong> ${escapeHtml(productionEmail)}</li>
      </ul>
      <p><a href="${baseUrl}/admin/bookings" style="display:inline-block;background-color:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">View in Admin</a></p>
      <p style="margin-top:8px;font-size:12px;color:#6b7280;">VehicleReel Admin Notification</p>
    `,
  };
}

export function bookingCancelledEmail(
  userName: string,
  vehicleName: string,
  dates: string,
  cancelledByName: string,
  reason: string,
  feePct: number,
  rateCents: number,
  rateType: string,
) {
  const feeLabel = feePct === 0
    ? 'No cancellation fee applies.'
    : `A ${feePct}% cancellation fee (R${((rateCents * feePct) / 10000).toFixed(0)}${rateType === 'PER_DAY' ? '/day' : ''}) applies.`;

  return {
    subject: `Booking cancelled: ${escapeHtml(vehicleName)}`,
    html: `
      <h2>Booking Cancelled</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>The booking for <strong>${escapeHtml(vehicleName)}</strong> (${escapeHtml(dates)}) has been cancelled by ${escapeHtml(cancelledByName)}.</p>
      <ul>
        <li><strong>Reason:</strong> ${escapeHtml(reason)}</li>
        <li><strong>Fee:</strong> ${feeLabel}</li>
      </ul>
      <p>Log in to VehicleReel for more details.</p>
    `,
  };
}

export function documentStatusEmail(userName: string, docType: string, status: string) {
  const statusMessage = status === 'APPROVED'
    ? 'has been approved. Your listing is now active!'
    : 'has been flagged for review. Our team will review it shortly.';
  return {
    subject: `Document ${escapeHtml(status.toLowerCase())}: ${escapeHtml(docType)}`,
    html: `
      <h2>Document ${status === 'APPROVED' ? 'Approved' : 'Under Review'}</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>Your <strong>${escapeHtml(docType)}</strong> ${statusMessage}</p>
    `,
  };
}

export function documentFlaggedEmail(userName: string, docType: string, reason: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://vehiclereel.co.za';
  return {
    subject: `Document rejected: ${escapeHtml(docType)}`,
    html: `
      <h2>Document Rejected</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>Your <strong>${escapeHtml(docType)}</strong> upload was not accepted.</p>
      <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      <p>Please upload the correct document to continue.</p>
      <p><a href="${baseUrl}/owner/settings" style="display:inline-block;background-color:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Upload Document</a></p>
      <p style="margin-top:8px;font-size:12px;color:#6b7280;">Or log in at ${baseUrl}</p>
    `,
  };
}

export function documentExpiringEmail(userName: string, docType: string, expiryDate: string) {
  return {
    subject: `Document expiring soon: ${escapeHtml(docType)}`,
    html: `
      <h2>Document Expiring Soon</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>Your <strong>${escapeHtml(docType)}</strong> expires on <strong>${escapeHtml(expiryDate)}</strong>.</p>
      <p>Please upload a renewed document to keep your listings active.</p>
    `,
  };
}

export function insuranceReminderEmail(productionName: string, vehicleName: string, deadlineDate: string, bookingId: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://vehiclereel.co.za';
  return {
    subject: `Insurance required for ${escapeHtml(vehicleName)} booking`,
    html: `
      <h2>Vehicle Insurance Required</h2>
      <p>Hi ${escapeHtml(productionName)},</p>
      <p>Please upload the vehicle insurance certificate for your upcoming booking of <strong>${escapeHtml(vehicleName)}</strong>.</p>
      <p>The insurance must be uploaded by <strong>${escapeHtml(deadlineDate)}</strong> (24 hours before the shoot).</p>
      <p><a href="${baseUrl}/production/bookings/${escapeHtml(bookingId)}" style="display:inline-block;background-color:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Upload Insurance</a></p>
      <p style="margin-top:8px;font-size:12px;color:#6b7280;">Or log in at ${baseUrl}</p>
    `,
  };
}

export function insuranceOverdueEmail(productionName: string, vehicleName: string, bookingId: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://vehiclereel.co.za';
  return {
    subject: `URGENT: Insurance overdue for ${escapeHtml(vehicleName)} booking`,
    html: `
      <h2>Insurance Upload Overdue</h2>
      <p>Hi ${escapeHtml(productionName)},</p>
      <p>The deadline has passed to upload insurance for your booking of <strong>${escapeHtml(vehicleName)}</strong>.</p>
      <p>Please upload it as soon as possible so the owner can review it before the shoot.</p>
      <p><a href="${baseUrl}/production/bookings/${escapeHtml(bookingId)}" style="display:inline-block;background-color:#dc2626;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Upload Now</a></p>
      <p style="margin-top:8px;font-size:12px;color:#6b7280;">Or log in at ${baseUrl}</p>
    `,
  };
}

export function specialVehicleRequestEmail(
  productionName: string,
  productionEmail: string,
  productionPhone: string | null,
  companyName: string | null,
  vehicleDescription: string,
  shootDates: string,
  additionalNotes: string,
) {
  return {
    subject: `Special Vehicle Request from ${escapeHtml(productionName)}`,
    html: `
      <h2>Special Vehicle Request</h2>
      <p>A production user has requested a vehicle that may not be listed on VehicleReel.</p>
      <h3>Requester</h3>
      <ul>
        <li><strong>Name:</strong> ${escapeHtml(productionName)}</li>
        <li><strong>Email:</strong> ${escapeHtml(productionEmail)}</li>
        ${productionPhone ? `<li><strong>Phone:</strong> ${escapeHtml(productionPhone)}</li>` : ''}
        ${companyName ? `<li><strong>Company:</strong> ${escapeHtml(companyName)}</li>` : ''}
      </ul>
      <h3>Vehicle Details</h3>
      <ul>
        <li><strong>Description:</strong> ${escapeHtml(vehicleDescription)}</li>
        <li><strong>Shoot Dates:</strong> ${escapeHtml(shootDates)}</li>
      </ul>
      ${additionalNotes ? `<h3>Additional Notes</h3><p>${escapeHtml(additionalNotes)}</p>` : ''}
      <p style="margin-top:16px;font-size:12px;color:#6b7280;">This request was submitted via the VehicleReel search page.</p>
    `,
  };
}

export function pendingDocumentReminderEmail(userName: string, missingDocuments: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://vehiclereel.co.za';
  return {
    subject: 'Complete your VehicleReel verification',
    html: `
      <h2>Document Upload Reminder</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>Your VehicleReel account is almost ready! Please upload your <strong>${escapeHtml(missingDocuments)}</strong> to complete verification.</p>
      <p><a href="${baseUrl}/owner/settings" style="display:inline-block;background-color:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Upload Documents</a></p>
      <p style="margin-top:8px;font-size:12px;color:#6b7280;">Or log in at ${baseUrl}</p>
    `,
  };
}

export function setupReminderEmail(userName: string, actionItems: string[], role: string, reminderNumber?: number) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://vehiclereel.co.za';
  const dashboardUrl = role === 'PRODUCTION' ? `${baseUrl}/production/settings` : `${baseUrl}/owner/settings`;
  const itemsHtml = actionItems.map((item) => `<li style="margin-bottom:6px;">${escapeHtml(item)}</li>`).join('');

  const subjects: Record<number, string> = {
    1: 'Finish setting up your VehicleReel profile',
    2: 'Reminder: Your VehicleReel setup is incomplete',
    3: 'Your VehicleReel setup is still incomplete',
    4: 'We noticed you haven\'t completed your VehicleReel setup',
    5: 'Final reminder: Complete your setup or close your account',
  };
  const subject = (reminderNumber && subjects[reminderNumber]) || subjects[1];

  const urgencyNote = reminderNumber === 5
    ? '<p style="color:#dc2626;font-weight:600;">This is your final reminder. If you no longer wish to use VehicleReel, you can close your account below.</p>'
    : '';

  const changedMyMindLink = reminderNumber === 5
    ? `<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;"><a href="${dashboardUrl}#changed-my-mind" style="color:#6b7280;font-size:13px;">I changed my mind &mdash; close my account</a></p>`
    : '';

  return {
    subject,
    html: `
      <h2>Complete Your Setup</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      ${urgencyNote}
      <p>Your VehicleReel account still needs a few things before it&rsquo;s fully active. Here&rsquo;s what&rsquo;s outstanding:</p>
      <ul style="padding-left:20px;color:#374151;">${itemsHtml}</ul>
      <p><a href="${dashboardUrl}" style="display:inline-block;background-color:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Complete Setup</a></p>
      <p style="margin-top:8px;font-size:12px;color:#6b7280;">Or log in at ${baseUrl}</p>
      ${changedMyMindLink}
    `,
  };
}

export function emailVerificationEmail(userName: string, verifyUrl: string) {
  return {
    subject: 'Verify your VehicleReel email',
    html: `
      <h2>Verify Your Email</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>Welcome to VehicleReel! Please verify your email address by clicking the button below:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;background-color:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Verify Email</a></p>
      <p style="margin-top:8px;font-size:12px;color:#6b7280;">This link expires in 24 hours. If you didn&apos;t create this account, you can safely ignore this email.</p>
    `,
  };
}

export function passwordResetEmail(userName: string, resetUrl: string) {
  return {
    subject: 'Reset your VehicleReel password',
    html: `
      <h2>Password Reset</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>We received a request to reset your password. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}" style="display:inline-block;background-color:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a></p>
      <p style="margin-top:8px;font-size:12px;color:#6b7280;">This link expires in 1 hour. If you didn&apos;t request this, you can safely ignore this email.</p>
    `,
  };
}

export function welcomeSetupEmail(userName: string, role: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://vehiclereel.co.za';
  const settingsUrlMap: Record<string, string> = {
    PRODUCTION: `${baseUrl}/production/settings`,
    ART_DEPARTMENT: `${baseUrl}/art-department/settings`,
    OWNER: `${baseUrl}/owner/settings`,
  };
  const settingsUrl = settingsUrlMap[role] || `${baseUrl}/owner/settings`;
  const faqUrl = `${baseUrl}/faq`;
  const docsNeededMap: Record<string, string> = {
    PRODUCTION: 'SA ID / Passport and Company Registration',
    ART_DEPARTMENT: 'SA ID / Passport',
    OWNER: 'SA ID / Passport and Driver&rsquo;s License',
  };
  const docsNeeded = docsNeededMap[role] || 'SA ID / Passport';

  const faqSummaries = [
    { q: 'What documents do I need?', a: role === 'PRODUCTION' ? 'SA ID + Company Registration.' : role === 'ART_DEPARTMENT' ? 'SA ID or Passport.' : 'SA ID + Driver&rsquo;s License, plus a Vehicle License Disk for each vehicle.' },
    { q: 'How long does verification take?', a: 'Documents are reviewed automatically by AI, usually within minutes.' },
    { q: 'What vehicle types are supported?', a: 'Cars, Racing Cars, Bikes, Motorbikes, Scooters, Boats, Planes, and Jet Skis.' },
    { q: 'What is an &ldquo;option&rdquo;?', a: 'A hold request on a vehicle for specific dates &mdash; like &ldquo;first dibs,&rdquo; not yet a confirmed booking.' },
    { q: 'Can multiple companies option the same vehicle?', a: 'Yes. Options queue up first-come-first-served and auto-promote if one falls through.' },
    { q: 'Will I get email notifications?', a: 'Yes &mdash; for options, bookings, and documents. You can customise these in Settings.' },
    { q: 'How are my documents protected?', a: 'Encrypted, access-controlled cloud storage. Only you and authorised admins can view them.' },
    { q: 'Is VehicleReel POPIA compliant?', a: 'Yes. We only collect what&rsquo;s needed and you can request deletion at any time.' },
  ];

  const faqHtml = faqSummaries
    .map(({ q, a }) => `
      <tr>
        <td style="padding:8px 12px;vertical-align:top;font-weight:600;color:#1f2937;white-space:nowrap;">${q}</td>
        <td style="padding:8px 12px;color:#4b5563;">${a}</td>
      </tr>`)
    .join('');

  return {
    subject: 'Welcome to VehicleReel — Get started in minutes',
    html: `
      <h2>Welcome to VehicleReel!</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>Your email is verified. To complete your account setup and get verified, please upload the following documents:</p>
      <ul style="padding-left:20px;color:#374151;">
        <li style="margin-bottom:6px;">${docsNeeded}</li>
      </ul>
      <p><a href="${settingsUrl}" style="display:inline-block;background-color:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Upload Documents</a></p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

      <h3 style="margin-bottom:12px;color:#1f2937;">Quick answers to common questions</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${faqHtml}
      </table>
      <p style="margin-top:16px;"><a href="${faqUrl}" style="color:#2563eb;font-weight:600;text-decoration:none;">View all FAQs &rarr;</a></p>

      <p style="margin-top:8px;font-size:12px;color:#6b7280;">Or log in at ${baseUrl}</p>
    `,
  };
}

export function messageReceivedEmail(userName: string, senderName: string, vehicleName: string) {
  return {
    subject: `New message about ${escapeHtml(vehicleName)}`,
    html: `
      <h2>New Message</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p><strong>${escapeHtml(senderName)}</strong> sent you a message about <strong>${escapeHtml(vehicleName)}</strong>.</p>
      <p>Log in to VehicleReel to reply.</p>
    `,
  };
}

const baseUrl = process.env.NEXTAUTH_URL || 'https://vehiclereel.co.za';

export function invoiceSentEmail(
  recipientName: string,
  invoiceNumber: string,
  vehicleDescription: string,
  totalFormatted: string,
  shootDates: string,
) {
  return {
    subject: `Invoice ${invoiceNumber} — ${vehicleDescription}`,
    html: `
      <h2>Invoice ${escapeHtml(invoiceNumber)}</h2>
      <p>Hi ${escapeHtml(recipientName)},</p>
      <p>An invoice has been generated for the completed shoot:</p>
      <ul>
        <li><strong>Vehicle:</strong> ${escapeHtml(vehicleDescription)}</li>
        <li><strong>Shoot Dates:</strong> ${escapeHtml(shootDates)}</li>
        <li><strong>Total Due:</strong> ${escapeHtml(totalFormatted)}</li>
      </ul>
      <p>The invoice PDF is attached to this email. Please use <strong>${escapeHtml(invoiceNumber)}</strong> as your payment reference.</p>
      <p><a href="${baseUrl}/production/bookings" style="display:inline-block;background-color:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">View Booking</a></p>
      <p style="margin-top:8px;font-size:12px;color:#6b7280;">Payment is due within 30 days of invoice date.</p>
    `,
  };
}

export function paymentReminderEmail(
  recipientName: string,
  invoiceNumber: string,
  vehicleDescription: string,
  totalFormatted: string,
  daysSinceSent: number,
) {
  return {
    subject: `Payment Reminder: Invoice ${invoiceNumber} — ${daysSinceSent} days outstanding`,
    html: `
      <h2>Payment Reminder</h2>
      <p>Hi ${escapeHtml(recipientName)},</p>
      <p>This is a friendly reminder that invoice <strong>${escapeHtml(invoiceNumber)}</strong> is ${daysSinceSent} day${daysSinceSent === 1 ? '' : 's'} outstanding.</p>
      <ul>
        <li><strong>Vehicle:</strong> ${escapeHtml(vehicleDescription)}</li>
        <li><strong>Amount Due:</strong> ${escapeHtml(totalFormatted)}</li>
      </ul>
      <p>Please use <strong>${escapeHtml(invoiceNumber)}</strong> as your payment reference when making payment.</p>
      <p><a href="${baseUrl}/production/bookings" style="display:inline-block;background-color:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">View Booking</a></p>
      <p style="margin-top:8px;font-size:12px;color:#6b7280;">If you have already made payment, please disregard this reminder.</p>
    `,
  };
}

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

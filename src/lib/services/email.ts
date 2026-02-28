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
      from: process.env.EMAIL_FROM || 'VehicleReel <noreply@vehiclereel.co.za>',
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
      <p>Log in to VehicleReel to accept or decline.</p>
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

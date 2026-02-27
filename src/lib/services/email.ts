import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    subject: `New option on your ${vehicleName}`,
    html: `
      <h2>New Option Placed</h2>
      <p>Hi ${ownerName},</p>
      <p><strong>${productionUser}</strong> has placed an option on your <strong>${vehicleName}</strong>.</p>
      <ul>
        <li><strong>Dates:</strong> ${dates}</li>
        <li><strong>Rate:</strong> ${rate}</li>
        <li><strong>Response deadline:</strong> ${deadline}</li>
      </ul>
      <p>Log in to VehicleReel to accept or decline.</p>
    `,
  };
}

export function optionAcceptedEmail(productionName: string, vehicleName: string, confirmDeadline: string) {
  return {
    subject: `Option accepted: ${vehicleName}`,
    html: `
      <h2>Option Accepted</h2>
      <p>Hi ${productionName},</p>
      <p>The owner has accepted your option on <strong>${vehicleName}</strong>.</p>
      <p>You have until <strong>${confirmDeadline}</strong> to confirm the booking.</p>
      <p>Log in to VehicleReel to confirm.</p>
    `,
  };
}

export function optionDeclinedEmail(productionName: string, vehicleName: string) {
  return {
    subject: `Option declined: ${vehicleName}`,
    html: `
      <h2>Option Declined</h2>
      <p>Hi ${productionName},</p>
      <p>The owner has declined your option on <strong>${vehicleName}</strong>.</p>
      <p>You can search for other vehicles on VehicleReel.</p>
    `,
  };
}

export function optionExpiredEmail(userName: string, vehicleName: string, reason: string) {
  return {
    subject: `Option expired: ${vehicleName}`,
    html: `
      <h2>Option Expired</h2>
      <p>Hi ${userName},</p>
      <p>An option on <strong>${vehicleName}</strong> has expired. ${reason}</p>
    `,
  };
}

export function bookingConfirmedEmail(userName: string, vehicleName: string, dates: string, rate: string, logistics: string, contactName: string, contactEmail: string, contactPhone: string | null) {
  return {
    subject: `Booking confirmed: ${vehicleName}`,
    html: `
      <h2>Booking Confirmed!</h2>
      <p>Hi ${userName},</p>
      <p>Your booking for <strong>${vehicleName}</strong> has been confirmed.</p>
      <ul>
        <li><strong>Dates:</strong> ${dates}</li>
        <li><strong>Rate:</strong> ${rate}</li>
        <li><strong>Logistics:</strong> ${logistics}</li>
      </ul>
      <h3>Contact Details</h3>
      <ul>
        <li><strong>Name:</strong> ${contactName}</li>
        <li><strong>Email:</strong> ${contactEmail}</li>
        ${contactPhone ? `<li><strong>Phone:</strong> ${contactPhone}</li>` : ''}
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
    subject: `Document ${status.toLowerCase()}: ${docType}`,
    html: `
      <h2>Document ${status === 'APPROVED' ? 'Approved' : 'Under Review'}</h2>
      <p>Hi ${userName},</p>
      <p>Your <strong>${docType}</strong> ${statusMessage}</p>
    `,
  };
}

export function documentExpiringEmail(userName: string, docType: string, expiryDate: string) {
  return {
    subject: `Document expiring soon: ${docType}`,
    html: `
      <h2>Document Expiring Soon</h2>
      <p>Hi ${userName},</p>
      <p>Your <strong>${docType}</strong> expires on <strong>${expiryDate}</strong>.</p>
      <p>Please upload a renewed document to keep your listings active.</p>
    `,
  };
}

export function messageReceivedEmail(userName: string, senderName: string, vehicleName: string) {
  return {
    subject: `New message about ${vehicleName}`,
    html: `
      <h2>New Message</h2>
      <p>Hi ${userName},</p>
      <p><strong>${senderName}</strong> sent you a message about <strong>${vehicleName}</strong>.</p>
      <p>Log in to VehicleReel to reply.</p>
    `,
  };
}

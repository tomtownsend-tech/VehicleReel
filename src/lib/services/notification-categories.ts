import { NotificationType } from '@prisma/client';

export type EmailCategory =
  | 'emailOptionsBookings'
  | 'emailDocuments'
  | 'emailMessages'
  | 'emailShootLogistics'
  | 'emailListings';

export const NOTIFICATION_CATEGORY_MAP: Record<NotificationType, EmailCategory> = {
  OPTION_PLACED: 'emailOptionsBookings',
  OPTION_ACCEPTED: 'emailOptionsBookings',
  OPTION_DECLINED: 'emailOptionsBookings',
  OPTION_EXPIRED: 'emailOptionsBookings',
  OPTION_PROMOTED: 'emailOptionsBookings',
  BOOKING_CONFIRMED: 'emailOptionsBookings',
  BOOKING_COMPLETED: 'emailOptionsBookings',
  BOOKING_PAYMENT_READY: 'emailOptionsBookings',
  BOOKING_CANCELLED: 'emailOptionsBookings',

  DOCUMENT_APPROVED: 'emailDocuments',
  DOCUMENT_FLAGGED: 'emailDocuments',
  DOCUMENT_EXPIRING: 'emailDocuments',
  DOCUMENT_EXPIRED: 'emailDocuments',

  MESSAGE_RECEIVED: 'emailMessages',

  SHOOT_DETAILS_UPDATED: 'emailShootLogistics',
  VEHICLE_CHECKED_IN: 'emailShootLogistics',
  COORDINATOR_ASSIGNED: 'emailShootLogistics',
  DATES_BLOCKED: 'emailShootLogistics',

  LISTING_SUSPENDED: 'emailListings',
  LISTING_ACTIVATED: 'emailListings',
  INSURANCE_REMINDER: 'emailListings',
  INSURANCE_OVERDUE: 'emailListings',
  SPECIAL_REQUEST: 'emailListings',
  USER_BANNED: 'emailListings',
  INVOICE_SENT: 'emailOptionsBookings',
  PAYMENT_REMINDER: 'emailOptionsBookings',
  DUPLICATE_VEHICLE: 'emailListings',
};

export const EMAIL_CATEGORY_LABELS: Record<EmailCategory, { label: string; description: string }> = {
  emailOptionsBookings: {
    label: 'Options & Bookings',
    description: 'Option requests, acceptances, confirmations, and booking updates',
  },
  emailDocuments: {
    label: 'Documents',
    description: 'Document approvals, rejections, and expiry reminders',
  },
  emailMessages: {
    label: 'Messages',
    description: 'New messages from other parties on your bookings',
  },
  emailShootLogistics: {
    label: 'Shoot Logistics',
    description: 'Shoot details, check-ins, coordinator assignments, and date changes',
  },
  emailListings: {
    label: 'Listings',
    description: 'Listing status changes, insurance reminders, and special requests',
  },
};

export const ALL_EMAIL_CATEGORIES: EmailCategory[] = [
  'emailOptionsBookings',
  'emailDocuments',
  'emailMessages',
  'emailShootLogistics',
  'emailListings',
];

import { prisma } from '@/lib/prisma';
import { NotificationType, Prisma } from '@prisma/client';
import { sendEmail } from './email';
import { NOTIFICATION_CATEGORY_MAP } from './notification-categories';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  emailContent?: { subject: string; html: string };
}

export async function safeNotify(params: CreateNotificationParams) {
  try {
    await createNotification(params);
  } catch (e) {
    console.error('Notification failed:', e);
  }
}

async function createNotification({
  userId,
  type,
  title,
  message,
  data,
  emailContent,
}: CreateNotificationParams) {
  // Create in-app notification
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: (data || {}) as Prisma.InputJsonValue,
    },
  });

  // Always send email for non-admin users (use provided template or auto-generate)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      emailNotifications: true,
      emailOptionsBookings: true,
      emailDocuments: true,
      emailMessages: true,
      emailShootLogistics: true,
      emailListings: true,
      role: true,
      name: true,
    },
  });

  const categoryField = NOTIFICATION_CATEGORY_MAP[type];
  const categoryEnabled = categoryField ? user?.[categoryField] !== false : true;

  if (user?.emailNotifications && categoryEnabled && user.role !== 'ADMIN') {
    const email = emailContent || {
      subject: `VehicleReel: ${title}`,
      html: `
        <h2>${title}</h2>
        <p>Hi ${user.name || 'there'},</p>
        <p>${message}</p>
        <p style="margin-top:16px;font-size:12px;color:#6b7280;">Log in to <a href="${process.env.NEXTAUTH_URL || 'https://vehiclereel.co.za'}">VehicleReel</a> for more details.</p>
      `,
    };
    await sendEmail({
      to: user.email,
      subject: email.subject,
      html: email.html,
    });
  }

  return notification;
}

export async function markNotificationRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

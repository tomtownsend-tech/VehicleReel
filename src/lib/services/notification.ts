import { prisma } from '@/lib/prisma';
import { NotificationType, Prisma } from '@prisma/client';
import { sendEmail } from './email';

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

export async function createNotification({
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

  // Send email if user has email notifications enabled
  if (emailContent) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailNotifications: true },
    });

    if (user?.emailNotifications) {
      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    }
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

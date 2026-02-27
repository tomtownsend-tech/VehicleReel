import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  details,
}: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      details: (details || {}) as Prisma.InputJsonValue,
    },
  });
}

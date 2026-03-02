import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all SPECIAL_REQUEST notifications (deduplicated by grouping on data content)
  const notifications = await prisma.notification.findMany({
    where: { type: 'SPECIAL_REQUEST' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      message: true,
      data: true,
      read: true,
      createdAt: true,
    },
  });

  // Deduplicate: multiple admins get the same request, group by timestamp (within 5s window)
  const seen = new Set<string>();
  const requests = [];
  for (const n of notifications) {
    const data = n.data as Record<string, string> | null;
    if (!data?.productionUserId) continue;
    // Key by user + description + timestamp rounded to 10s
    const timeKey = Math.floor(new Date(n.createdAt).getTime() / 10000);
    const dedupeKey = `${data.productionUserId}-${timeKey}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    requests.push({
      id: n.id,
      productionUserName: data.productionUserName || 'Unknown',
      productionUserEmail: data.productionUserEmail || '',
      vehicleDescription: data.vehicleDescription || '',
      shootDates: data.shootDates || '',
      additionalNotes: data.additionalNotes || '',
      createdAt: n.createdAt,
    });
  }

  return NextResponse.json({ data: requests });
}

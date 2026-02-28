import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [
    totalUsers,
    totalVehicles,
    totalBookings,
    usersByRole,
    vehiclesByStatus,
    // Database-level aggregations instead of loading all bookings into memory
    makeStats,
    colorStats,
    modelStats,
    yearStats,
    totalDaysResult,
    monthlyStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.vehicle.count(),
    prisma.booking.count(),
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.vehicle.groupBy({ by: ['status'], _count: true }),
    // Top makes by booking count
    prisma.$queryRaw<{ make: string; count: bigint }[]>`
      SELECT v.make, COUNT(*)::bigint as count
      FROM bookings b
      JOIN options o ON b."optionId" = o.id
      JOIN vehicles v ON o."vehicleId" = v.id
      GROUP BY v.make ORDER BY count DESC LIMIT 10
    `,
    // Top colors
    prisma.$queryRaw<{ color: string; count: bigint }[]>`
      SELECT v.color, COUNT(*)::bigint as count
      FROM bookings b
      JOIN options o ON b."optionId" = o.id
      JOIN vehicles v ON o."vehicleId" = v.id
      GROUP BY v.color ORDER BY count DESC LIMIT 10
    `,
    // Top models
    prisma.$queryRaw<{ model: string; count: bigint }[]>`
      SELECT CONCAT(v.make, ' ', v.model) as model, COUNT(*)::bigint as count
      FROM bookings b
      JOIN options o ON b."optionId" = o.id
      JOIN vehicles v ON o."vehicleId" = v.id
      GROUP BY v.make, v.model ORDER BY count DESC LIMIT 10
    `,
    // Top years
    prisma.$queryRaw<{ year: number; count: bigint }[]>`
      SELECT v.year, COUNT(*)::bigint as count
      FROM bookings b
      JOIN options o ON b."optionId" = o.id
      JOIN vehicles v ON o."vehicleId" = v.id
      GROUP BY v.year ORDER BY count DESC LIMIT 10
    `,
    // Total days booked (computed in DB)
    prisma.$queryRaw<{ total_days: bigint }[]>`
      SELECT COALESCE(SUM(("endDate" - "startDate") + 1), 0)::bigint as total_days
      FROM bookings
    `,
    // Monthly trends
    prisma.$queryRaw<{ month: string; days: bigint }[]>`
      SELECT TO_CHAR("startDate", 'YYYY-MM') as month,
             SUM(("endDate" - "startDate") + 1)::bigint as days
      FROM bookings
      GROUP BY month ORDER BY month
    `,
  ]);

  const totalDaysBooked = Number(totalDaysResult[0]?.total_days ?? 0);

  return NextResponse.json({
    summary: {
      totalUsers,
      totalVehicles,
      totalBookings,
      totalDaysBooked,
    },
    usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count })),
    vehiclesByStatus: vehiclesByStatus.map((v) => ({ status: v.status, count: v._count })),
    preferences: {
      make: makeStats.map((r) => [r.make, Number(r.count)]),
      color: colorStats.map((r) => [r.color, Number(r.count)]),
      model: modelStats.map((r) => [r.model, Number(r.count)]),
      year: yearStats.map((r) => [r.year.toString(), Number(r.count)]),
    },
    monthlyTrends: monthlyStats.map((r) => ({
      month: r.month,
      days: Number(r.days),
    })),
  });
}

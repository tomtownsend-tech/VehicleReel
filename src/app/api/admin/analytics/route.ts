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
    bookings,
    usersByRole,
    vehiclesByStatus,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.vehicle.count(),
    prisma.booking.count(),
    prisma.booking.findMany({
      include: {
        option: {
          include: {
            vehicle: { select: { make: true, model: true, color: true, year: true } },
          },
        },
      },
    }),
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.vehicle.groupBy({ by: ['status'], _count: true }),
  ]);

  // Calculate analytics from bookings
  let totalDaysBooked = 0;
  const makeCount: Record<string, number> = {};
  const colorCount: Record<string, number> = {};
  const modelCount: Record<string, number> = {};
  const yearCount: Record<string, number> = {};
  const monthlyData: Record<string, { make: Record<string, number>; color: Record<string, number>; model: Record<string, number>; year: Record<string, number>; days: number }> = {};

  for (const booking of bookings) {
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    totalDaysBooked += days;

    const vehicle = booking.option.vehicle;
    makeCount[vehicle.make] = (makeCount[vehicle.make] || 0) + 1;
    colorCount[vehicle.color] = (colorCount[vehicle.color] || 0) + 1;
    modelCount[`${vehicle.make} ${vehicle.model}`] = (modelCount[`${vehicle.make} ${vehicle.model}`] || 0) + 1;
    yearCount[vehicle.year.toString()] = (yearCount[vehicle.year.toString()] || 0) + 1;

    // Monthly trends
    const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { make: {}, color: {}, model: {}, year: {}, days: 0 };
    }
    monthlyData[monthKey].days += days;
    monthlyData[monthKey].make[vehicle.make] = (monthlyData[monthKey].make[vehicle.make] || 0) + days;
    monthlyData[monthKey].color[vehicle.color] = (monthlyData[monthKey].color[vehicle.color] || 0) + days;
    monthlyData[monthKey].model[`${vehicle.make} ${vehicle.model}`] = (monthlyData[monthKey].model[`${vehicle.make} ${vehicle.model}`] || 0) + days;
    monthlyData[monthKey].year[vehicle.year.toString()] = (monthlyData[monthKey].year[vehicle.year.toString()] || 0) + days;
  }

  // Sort by count
  const sortByCount = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 10);

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
      make: sortByCount(makeCount),
      color: sortByCount(colorCount),
      model: sortByCount(modelCount),
      year: sortByCount(yearCount),
    },
    monthlyTrends: Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        days: data.days,
        topMake: Object.entries(data.make).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
        topColor: Object.entries(data.color).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
      })),
  });
}

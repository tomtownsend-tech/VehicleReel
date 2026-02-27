import { prisma } from '@/lib/prisma';

export async function blockDatesAndDeclineOptions(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
  reason?: string
) {
  // Create the availability block
  const block = await prisma.availabilityBlock.create({
    data: {
      vehicleId,
      startDate,
      endDate,
      reason,
    },
  });

  // Find and decline all pending/accepted options that overlap with blocked dates
  const overlappingOptions = await prisma.option.findMany({
    where: {
      vehicleId,
      status: { in: ['PENDING_RESPONSE', 'ACCEPTED'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    include: {
      productionUser: { select: { id: true, name: true, email: true } },
      vehicle: { select: { make: true, model: true, year: true } },
    },
  });

  const declinedOptions = [];
  for (const option of overlappingOptions) {
    await prisma.option.update({
      where: { id: option.id },
      data: { status: 'DECLINED_BLOCKED' },
    });
    declinedOptions.push(option);
  }

  return { block, declinedOptions };
}

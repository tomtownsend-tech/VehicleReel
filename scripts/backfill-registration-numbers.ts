/**
 * One-time script to retroactively extract registration numbers from
 * existing licence disc documents and tag each Vehicle record.
 * Reports any duplicates found.
 *
 * Usage: npx tsx scripts/backfill-registration-numbers.ts
 */
import { readFileSync } from 'fs';
import { Prisma, PrismaClient } from '@prisma/client';

// Load .env.local manually
const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
}

const prisma = new PrismaClient();

async function main() {
  // Find all VEHICLE_REGISTRATION documents that have extractedData
  const docs = await prisma.document.findMany({
    where: {
      type: 'VEHICLE_REGISTRATION',
      extractedData: { not: Prisma.JsonNull },
    },
    include: {
      vehicle: {
        select: { id: true, make: true, model: true, year: true, registrationNumber: true },
      },
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\nFound ${docs.length} licence disc document(s) with extracted data.\n`);

  // Track registration numbers -> vehicles for duplicate detection
  const regMap = new Map<string, { vehicleId: string; desc: string; owner: string }[]>();
  let updated = 0;
  let skippedNoReg = 0;
  let skippedNoVehicle = 0;
  let alreadyTagged = 0;

  for (const doc of docs) {
    const extracted = doc.extractedData as Record<string, unknown> | null;
    const regNumber = extracted?.registrationNumber as string | undefined;

    if (!doc.vehicle) {
      skippedNoVehicle++;
      console.log(`  SKIP (no vehicle linked): doc ${doc.id} — user ${doc.user.name}`);
      continue;
    }

    if (!regNumber) {
      skippedNoReg++;
      console.log(`  SKIP (no reg number extracted): doc ${doc.id} — ${doc.vehicle.year} ${doc.vehicle.make} ${doc.vehicle.model}`);
      continue;
    }

    const normalized = regNumber.trim().toUpperCase().replace(/\s+/g, ' ');
    const vehicleDesc = `${doc.vehicle.year} ${doc.vehicle.make} ${doc.vehicle.model}`;

    // Track for duplicates
    const existing = regMap.get(normalized) || [];
    // Only add if this vehicle isn't already in the list
    if (!existing.some((e) => e.vehicleId === doc.vehicle!.id)) {
      existing.push({ vehicleId: doc.vehicle.id, desc: vehicleDesc, owner: doc.user.name });
      regMap.set(normalized, existing);
    }

    // Update vehicle if not already tagged
    if (doc.vehicle.registrationNumber === normalized) {
      alreadyTagged++;
      console.log(`  ALREADY: ${vehicleDesc} — ${normalized}`);
      continue;
    }

    await prisma.vehicle.update({
      where: { id: doc.vehicle.id },
      data: { registrationNumber: normalized },
    });
    updated++;
    console.log(`  TAGGED: ${vehicleDesc} — ${normalized} (owner: ${doc.user.name})`);
  }

  // Report duplicates
  const duplicates = Array.from(regMap.entries()).filter(([, vehicles]) => vehicles.length > 1);

  console.log('\n' + '='.repeat(60));
  console.log(`SUMMARY`);
  console.log('='.repeat(60));
  console.log(`Total licence disc docs:     ${docs.length}`);
  console.log(`Vehicles tagged:             ${updated}`);
  console.log(`Already tagged:              ${alreadyTagged}`);
  console.log(`Skipped (no reg number):     ${skippedNoReg}`);
  console.log(`Skipped (no vehicle linked): ${skippedNoVehicle}`);
  console.log(`Duplicate registrations:     ${duplicates.length}`);

  if (duplicates.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('DUPLICATES FOUND:');
    console.log('-'.repeat(60));
    for (const [regNum, vehicles] of duplicates) {
      console.log(`\n  Registration: ${regNum}`);
      for (const v of vehicles) {
        console.log(`    - ${v.desc} (owner: ${v.owner}, vehicleId: ${v.vehicleId})`);
      }
    }
  } else {
    console.log('\nNo duplicate registrations found.');
  }

  // Also list all vehicles that still have no registration number
  const untagged = await prisma.vehicle.findMany({
    where: { registrationNumber: null },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (untagged.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log(`VEHICLES WITHOUT REGISTRATION NUMBER (${untagged.length}):`);
    console.log('-'.repeat(60));
    for (const v of untagged) {
      console.log(`  - ${v.year} ${v.make} ${v.model} (owner: ${v.owner.name}, status: ${v.status})`);
    }
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

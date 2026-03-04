import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function clearSupabaseBucket(supabase: any, bucketName: string) {
  const { data: files, error } = await supabase.storage.from(bucketName).list('', { limit: 1000 });
  if (error) {
    console.log(`  Warning: Could not list ${bucketName}: ${error.message}`);
    return 0;
  }
  if (!files || files.length === 0) {
    console.log(`  ${bucketName}: already empty`);
    return 0;
  }

  // Recursively list all files (including in folders)
  const allPaths: string[] = [];
  async function listRecursive(prefix: string) {
    const { data, error: listErr } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 });
    if (listErr || !data) return;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        allPaths.push(path);
      } else {
        await listRecursive(path);
      }
    }
  }

  await listRecursive('');
  if (allPaths.length > 0) {
    const { error: removeErr } = await supabase.storage.from(bucketName).remove(allPaths);
    if (removeErr) {
      console.log(`  Warning: Could not remove files from ${bucketName}: ${removeErr.message}`);
    }
  }
  console.log(`  ${bucketName}: removed ${allPaths.length} files`);
  return allPaths.length;
}

async function main() {
  console.log('=== VehicleReel Production Reset ===\n');

  // 1. Clear Supabase storage
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    console.log('Clearing Supabase storage...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    await clearSupabaseBucket(supabase, 'documents');
    await clearSupabaseBucket(supabase, 'vehicle-photos');
    console.log('');
  } else {
    console.log('Skipping Supabase storage (env vars not set)\n');
  }

  // 2. Delete all database records
  // Delete in dependency order to avoid FK issues
  console.log('Clearing database...');

  const docReviewQueue = await prisma.documentReviewQueue.deleteMany();
  console.log(`  DocumentReviewQueue: ${docReviewQueue.count} deleted`);

  const docReview = await prisma.documentReview.deleteMany();
  console.log(`  DocumentReview: ${docReview.count} deleted`);

  const documents = await prisma.document.deleteMany();
  console.log(`  Document: ${documents.count} deleted`);

  const checkIns = await prisma.bookingCheckIn.deleteMany();
  console.log(`  BookingCheckIn: ${checkIns.count} deleted`);

  const dailyDetails = await prisma.bookingDailyDetail.deleteMany();
  console.log(`  BookingDailyDetail: ${dailyDetails.count} deleted`);

  const messages = await prisma.message.deleteMany();
  console.log(`  Message: ${messages.count} deleted`);

  const bookings = await prisma.booking.deleteMany();
  console.log(`  Booking: ${bookings.count} deleted`);

  const projectOptions = await prisma.projectOption.deleteMany();
  console.log(`  ProjectOption: ${projectOptions.count} deleted`);

  const options = await prisma.option.deleteMany();
  console.log(`  Option: ${options.count} deleted`);

  const vehiclePhotos = await prisma.vehiclePhoto.deleteMany();
  console.log(`  VehiclePhoto: ${vehiclePhotos.count} deleted`);

  const availability = await prisma.availabilityBlock.deleteMany();
  console.log(`  AvailabilityBlock: ${availability.count} deleted`);

  const vehicles = await prisma.vehicle.deleteMany();
  console.log(`  Vehicle: ${vehicles.count} deleted`);

  const notifications = await prisma.notification.deleteMany();
  console.log(`  Notification: ${notifications.count} deleted`);

  const auditLogs = await prisma.auditLog.deleteMany();
  console.log(`  AuditLog: ${auditLogs.count} deleted`);

  const projects = await prisma.project.deleteMany();
  console.log(`  Project: ${projects.count} deleted`);

  const passwordTokens = await prisma.passwordResetToken.deleteMany();
  console.log(`  PasswordResetToken: ${passwordTokens.count} deleted`);

  const users = await prisma.user.deleteMany();
  console.log(`  User: ${users.count} deleted`);

  console.log('\n=== Reset complete ===');
  console.log('Run `npx prisma db seed` to create fresh test users.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

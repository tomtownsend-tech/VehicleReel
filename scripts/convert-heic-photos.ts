/**
 * One-time script to convert existing HEIC photos in Supabase to JPEG
 * and update the database URLs.
 *
 * Uses macOS `sips` for conversion (works without libheif).
 *
 * Usage: npx tsx scripts/convert-heic-photos.ts
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

// Load .env.local manually
const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const prisma = new PrismaClient();

async function convertWithSips(heicBuffer: Buffer): Promise<Buffer> {
  const tmpDir = mkdtempSync(join(tmpdir(), 'heic-'));
  const inputPath = join(tmpDir, 'input.heic');
  const outputPath = join(tmpDir, 'output.jpg');

  try {
    writeFileSync(inputPath, heicBuffer);
    execSync(`sips -s format jpeg -s formatOptions 90 "${inputPath}" --out "${outputPath}"`, {
      stdio: 'pipe',
    });
    return readFileSync(outputPath);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function convertPhoto(
  photo: { id: string; url: string; originalUrl: string | null },
  field: 'url' | 'originalUrl'
): Promise<boolean> {
  const sourceUrl = field === 'url' ? photo.url : photo.originalUrl;
  if (!sourceUrl) return false;

  const oldPath = sourceUrl.split('/vehicle-photos/')[1];
  if (!oldPath) {
    console.log(`  SKIP ${photo.id}: cannot extract path`);
    return false;
  }

  const newPath = oldPath.replace(/\.(heic|heif|tiff|tif)$/i, '.jpg');
  console.log(`Converting: ${oldPath}`);

  const { data: fileData, error: dlError } = await supabase.storage
    .from('vehicle-photos')
    .download(oldPath);

  if (dlError || !fileData) {
    console.log(`  FAIL download: ${dlError?.message}`);
    return false;
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  let jpegBuffer: Buffer;
  try {
    jpegBuffer = await convertWithSips(buffer);
  } catch (err) {
    console.log(`  FAIL conversion: ${err instanceof Error ? err.message : err}`);
    return false;
  }

  const { error: upError } = await supabase.storage
    .from('vehicle-photos')
    .upload(newPath, jpegBuffer, { contentType: 'image/jpeg', upsert: true });

  if (upError) {
    console.log(`  FAIL upload: ${upError.message}`);
    return false;
  }

  const { data: urlData } = supabase.storage
    .from('vehicle-photos')
    .getPublicUrl(newPath);

  await prisma.vehiclePhoto.update({
    where: { id: photo.id },
    data: { [field]: urlData.publicUrl },
  });

  await supabase.storage.from('vehicle-photos').remove([oldPath]);
  console.log(`  OK → ${newPath}`);
  return true;
}

async function main() {
  const heicPhotos = await prisma.vehiclePhoto.findMany({
    where: {
      OR: [
        { url: { endsWith: '.heic' } },
        { url: { endsWith: '.heif' } },
        { url: { endsWith: '.tiff' } },
        { url: { endsWith: '.tif' } },
      ],
    },
  });

  console.log(`Found ${heicPhotos.length} HEIC/TIFF photos to convert.\n`);

  let converted = 0;
  let failed = 0;

  for (const photo of heicPhotos) {
    const ok = await convertPhoto(photo, 'url');
    if (ok) converted++;
    else failed++;
  }

  // Also convert originalUrl fields
  const heicOriginals = await prisma.vehiclePhoto.findMany({
    where: {
      originalUrl: { not: null },
      OR: [
        { originalUrl: { endsWith: '.heic' } },
        { originalUrl: { endsWith: '.heif' } },
      ],
    },
  });

  for (const photo of heicOriginals) {
    const ok = await convertPhoto(photo, 'originalUrl');
    if (ok) converted++;
    else failed++;
  }

  console.log(`\nDone. Converted: ${converted}, Failed: ${failed}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

import sharp from 'sharp';

interface PlateRegion {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

interface PlateResult {
  results: { box: PlateRegion }[];
}

async function detectPlates(buffer: Buffer): Promise<PlateRegion[]> {
  const token = process.env.PLATE_RECOGNIZER_TOKEN;
  if (!token) return [];

  const formData = new FormData();
  formData.append('upload', new Blob([new Uint8Array(buffer)]));
  formData.append('regions', 'za');

  const res = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
    method: 'POST',
    headers: { Authorization: `Token ${token}` },
    body: formData,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    console.error('Plate Recognizer API error:', res.status, await res.text());
    return [];
  }

  const data: PlateResult = await res.json();
  return data.results.map((r) => r.box);
}

async function blurRegions(buffer: Buffer, regions: PlateRegion[]): Promise<Buffer> {
  if (regions.length === 0) return buffer;

  const image = sharp(buffer);
  const composites: sharp.OverlayOptions[] = [];

  for (const { xmin, ymin, xmax, ymax } of regions) {
    const width = xmax - xmin;
    const height = ymax - ymin;
    if (width <= 0 || height <= 0) continue;

    const extracted = await sharp(buffer)
      .extract({ left: xmin, top: ymin, width, height })
      .blur(30)
      .toBuffer();

    composites.push({ input: extracted, left: xmin, top: ymin });
  }

  if (composites.length === 0) return buffer;

  return image.composite(composites).jpeg({ quality: 85 }).toBuffer();
}

export async function detectAndBlurPlates(
  imageBuffer: Buffer
): Promise<{ processedBuffer: Buffer; hasPlates: boolean }> {
  try {
    const regions = await detectPlates(imageBuffer);
    if (regions.length === 0) {
      return { processedBuffer: imageBuffer, hasPlates: false };
    }
    const processedBuffer = await blurRegions(imageBuffer, regions);
    return { processedBuffer, hasPlates: true };
  } catch (err) {
    console.error('Plate blur error:', err);
    return { processedBuffer: imageBuffer, hasPlates: false };
  }
}

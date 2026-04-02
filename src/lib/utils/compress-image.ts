const HEIC_TYPES = ['image/heic', 'image/heif'];
const HEIC_EXTENSIONS = ['.heic', '.heif'];

function isHeic(file: File): boolean {
  if (HEIC_TYPES.includes(file.type)) return true;
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  return HEIC_EXTENSIONS.includes(ext);
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default;
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const result = Array.isArray(blob) ? blob[0] : blob;
  return new File([result], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

export async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  // Convert HEIC to JPEG first (most browsers can't render HEIC)
  const sourceFile = isHeic(file) ? await convertHeicToJpeg(file) : file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], sourceFile.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          } else {
            resolve(sourceFile);
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => resolve(sourceFile);
    img.src = URL.createObjectURL(sourceFile);
  });
}

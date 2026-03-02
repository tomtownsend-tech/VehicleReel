import JSZip from 'jszip';

interface ProjectVehicle {
  photoUrl: string;
  year: number;
  make: string;
  model: string;
}

export async function downloadProjectImages(
  projectName: string,
  vehicles: ProjectVehicle[],
  onProgress?: (current: number, total: number) => void,
) {
  const zip = new JSZip();
  const nameCounts: Record<string, number> = {};

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    onProgress?.(i + 1, vehicles.length);

    try {
      const res = await fetch(v.photoUrl);
      if (!res.ok) continue;
      const blob = await res.blob();

      let baseName = `${v.year}-${v.make}-${v.model}`.replace(/[^a-zA-Z0-9-]/g, '_');
      nameCounts[baseName] = (nameCounts[baseName] || 0) + 1;
      if (nameCounts[baseName] > 1) {
        baseName += `-${nameCounts[baseName]}`;
      }

      const ext = v.photoUrl.includes('.png') ? '.png' : '.jpg';
      zip.file(`${baseName}${ext}`, blob);
    } catch {
      // Skip failed downloads
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/[^a-zA-Z0-9-]/g, '_')}-images.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

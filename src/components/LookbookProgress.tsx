'use client';

interface LookbookProgressProps {
  total: number;
  current: number;
}

export function LookbookProgress({ total, current }: LookbookProgressProps) {
  const percent = total > 0 ? ((current + 1) / total) * 100 : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/10">
      <div
        className="h-full bg-white/60 transition-all duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
      <div className="absolute top-3 right-4 text-xs text-white/40 font-light tracking-wide">
        {current + 1} / {total}
      </div>
    </div>
  );
}

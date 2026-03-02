'use client';

import { useState, useEffect } from 'react';

export function useStaggeredEntry(count: number, interval = 80): boolean[] {
  const [visible, setVisible] = useState<boolean[]>(() => new Array(count).fill(false));

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    for (let i = 0; i < count; i++) {
      timers.push(
        setTimeout(() => {
          setVisible((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, i * interval)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [count, interval]);

  return visible;
}

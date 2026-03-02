'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Calendar } from 'lucide-react';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  unavailableRanges?: DateRange[];
  required?: boolean;
  id?: string;
}

/** Format Date to YYYY-MM-DD using local time */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Check if a YYYY-MM-DD string falls within any unavailable range */
function isUnavailable(dateStr: string, ranges: DateRange[]): boolean {
  return ranges.some((r) => {
    const start = r.startDate.slice(0, 10);
    const end = r.endDate.slice(0, 10);
    return dateStr >= start && dateStr <= end;
  });
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function DatePicker({ label, value, onChange, unavailableRanges = [], required, id }: DatePickerProps) {
  const today = new Date();
  const todayStr = toDateString(today);
  const initialDate = value ? new Date(value + 'T12:00:00') : today;
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function selectDate(dateStr: string) {
    onChange(dateStr);
    setOpen(false);
  }

  function goToToday() {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  let startOffset = firstDay.getDay() - 1; // Monday=0
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { dateStr: string; day: number; currentMonth: boolean }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({ dateStr: toDateString(new Date(viewYear, viewMonth - 1, d)), day: d, currentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateStr: toDateString(new Date(viewYear, viewMonth, d)), day: d, currentMonth: true });
  }

  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ dateStr: toDateString(new Date(viewYear, viewMonth + 1, d)), day: d, currentMonth: false });
    }
  }

  const displayValue = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('en-ZA')
    : '';

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-white/70">
          {label}
        </label>
      )}
      <button
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full rounded-lg border border-white/15 px-3 py-2 text-sm bg-gray-900 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40"
      >
        <span className={displayValue ? '' : 'text-white/40'}>
          {displayValue || 'yyyy/mm/dd'}
        </span>
        <Calendar className="h-4 w-4 text-white/40" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-gray-900 rounded-lg border border-white/10 shadow-lg p-3 w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white/70">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex gap-1">
              <button type="button" onClick={prevMonth} className="p-1 hover:bg-white/10 rounded">
                <ChevronUp className="h-4 w-4 text-white/50" />
              </button>
              <button type="button" onClick={nextMonth} className="p-1 hover:bg-white/10 rounded">
                <ChevronDown className="h-4 w-4 text-white/50" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map((d, i) => (
              <div key={i} className="text-center text-xs font-medium text-white/50 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const unavailable = cell.currentMonth && isUnavailable(cell.dateStr, unavailableRanges);
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === value;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !unavailable && selectDate(cell.dateStr)}
                  disabled={unavailable}
                  className={[
                    'h-8 w-full text-sm rounded transition-colors',
                    !cell.currentMonth ? 'text-white/30' : '',
                    cell.currentMonth && !unavailable && !isSelected ? 'text-white/70 hover:bg-white/5' : '',
                    unavailable ? 'text-red-400/50 cursor-not-allowed' : '',
                    isSelected ? 'bg-white text-gray-900 font-medium' : '',
                    isToday && !isSelected ? 'bg-white/10 font-medium' : '',
                  ].join(' ')}
                >
                  <span className={unavailable ? 'line-through decoration-red-400/50' : ''}>
                    {cell.day}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-2 pt-2 border-t border-white/5">
            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="text-xs text-white/70 hover:text-white">
              Clear
            </button>
            <button type="button" onClick={goToToday} className="text-xs text-white/70 hover:text-white">
              Today
            </button>
          </div>
        </div>
      )}

      {required && <input type="hidden" value={value} required />}
    </div>
  );
}

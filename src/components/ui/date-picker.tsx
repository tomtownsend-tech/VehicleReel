'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface UnavailableDate {
  start: Date;
  end: Date;
}

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  unavailableDates?: UnavailableDate[];
  required?: boolean;
  id?: string;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isDateUnavailable(date: Date, unavailableDates: UnavailableDate[]) {
  const d = startOfDay(date);
  return unavailableDates.some((range) => {
    const start = startOfDay(range.start);
    const end = startOfDay(range.end);
    return d >= start && d <= end;
  });
}

function formatYYYYMMDD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function DatePicker({ label, value, onChange, unavailableDates = [], required, id }: DatePickerProps) {
  const today = new Date();
  const initialDate = value ? new Date(value + 'T00:00:00') : today;
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

  function selectDate(date: Date) {
    onChange(formatYYYYMMDD(date));
    setOpen(false);
  }

  function clearDate() {
    onChange('');
  }

  function goToToday() {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  // Monday=0 offset
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { date: Date; currentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({ date: new Date(viewYear, viewMonth - 1, d), currentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), currentMonth: true });
  }

  // Next month leading days (fill to complete row)
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(viewYear, viewMonth + 1, d), currentMonth: false });
    }
  }

  const selectedDate = value ? startOfDay(new Date(value + 'T00:00:00')) : null;
  const todayStart = startOfDay(today);

  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-ZA')
    : '';

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <button
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {displayValue || <span className="text-gray-400">yyyy/mm/dd</span>}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg p-3 w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" className="text-sm font-medium text-gray-700">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </button>
            <div className="flex gap-1">
              <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronUp className="h-4 w-4 text-gray-500" />
              </button>
              <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map((d, i) => (
              <div key={i} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const unavailable = isDateUnavailable(cell.date, unavailableDates);
              const isToday = startOfDay(cell.date).getTime() === todayStart.getTime();
              const isSelected = selectedDate && startOfDay(cell.date).getTime() === selectedDate.getTime();

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !unavailable && selectDate(cell.date)}
                  disabled={unavailable}
                  className={[
                    'h-8 w-full text-sm rounded transition-colors relative',
                    !cell.currentMonth ? 'text-gray-300' : '',
                    cell.currentMonth && !unavailable && !isSelected ? 'text-gray-700 hover:bg-blue-50' : '',
                    cell.currentMonth && unavailable ? 'text-blue-500 cursor-not-allowed' : '',
                    isSelected ? 'bg-blue-600 text-white font-medium' : '',
                    isToday && !isSelected ? 'bg-blue-100 font-medium' : '',
                  ].join(' ')}
                >
                  <span className={unavailable && cell.currentMonth ? 'line-through' : ''}>
                    {cell.date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={clearDate} className="text-xs text-blue-600 hover:text-blue-800">
              Clear
            </button>
            <button type="button" onClick={goToToday} className="text-xs text-blue-600 hover:text-blue-800">
              Today
            </button>
          </div>
        </div>
      )}

      {/* Hidden input for form validation */}
      {required && <input type="hidden" value={value} required />}
    </div>
  );
}

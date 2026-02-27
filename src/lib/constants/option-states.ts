export const RESPONSE_DEADLINE_PRESETS = [
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
  { value: 72, label: '72 hours' },
] as const;

export const CONFIRMATION_WINDOW_PRESETS = [
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
] as const;

export const OPTION_STATUS_LABELS: Record<string, string> = {
  PENDING_RESPONSE: 'Pending Response',
  ACCEPTED: 'Accepted',
  CONFIRMED: 'Confirmed',
  DECLINED_BY_OWNER: 'Declined by Owner',
  EXPIRED_RESPONSE: 'Response Expired',
  EXPIRED_CONFIRMATION: 'Confirmation Expired',
  DECLINED_OVERLAP: 'Declined (Overlap)',
  DECLINED_BLOCKED: 'Declined (Dates Blocked)',
  DECLINED_ADMIN: 'Declined (Admin)',
};

export const ACTIVE_OPTION_STATUSES = ['PENDING_RESPONSE', 'ACCEPTED'] as const;
export const TERMINAL_OPTION_STATUSES = [
  'CONFIRMED', 'DECLINED_BY_OWNER', 'EXPIRED_RESPONSE',
  'EXPIRED_CONFIRMATION', 'DECLINED_OVERLAP', 'DECLINED_BLOCKED', 'DECLINED_ADMIN',
] as const;

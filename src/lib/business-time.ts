import type { TimeSlot } from '@/types';

export function slotStartLabel(slot: TimeSlot): string {
  // Keep the offset only when the API distinguishes repeated DST wall times.
  const offset = slot.displayLabel?.match(/\s\([^)]+\)$/)?.[0] ?? '';
  return slot.startTime + offset;
}

export function businessDateKey(instant: Date | string, timezone: string): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(instant)).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Calendar widgets use a browser-local Date as a carrier for civil Y/M/D only.
// This value must never be serialized as an appointment instant.
export function businessCalendarDate(instant: Date | string, timezone: string): Date {
  const [year, month, day] = businessDateKey(instant, timezone).split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function formatBusinessDate(instant: Date | string, timezone: string,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }): string {
  return new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: timezone }).format(new Date(instant));
}

export function slotInstant(slot: TimeSlot): string {
  if (!slot.scheduledStartAt || !/Z$/.test(slot.scheduledStartAt) || !Number.isFinite(Date.parse(slot.scheduledStartAt))) {
    throw new Error('Atualize os horários disponíveis antes de confirmar.');
  }
  return slot.scheduledStartAt;
}

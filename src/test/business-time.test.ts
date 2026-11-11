import { describe, expect, it } from 'vitest';
import { businessCalendarDate, businessDateKey, formatBusinessDate, slotInstant } from '@/lib/business-time';
import type { TimeSlot } from '@/types';

describe('Company timezone and server slot contract', () => {
  it('uses the company civil day across midnight and UTC+14', () => {
    expect(businessDateKey('2027-01-02T01:00:00Z', 'America/Sao_Paulo')).toBe('2027-01-01');
    expect(businessDateKey('2027-01-01T12:00:00Z', 'Pacific/Kiritimati')).toBe('2027-01-02');
    const calendar = businessCalendarDate('2027-01-02T01:00:00Z', 'America/Sao_Paulo');
    expect([calendar.getFullYear(), calendar.getMonth(), calendar.getDate()]).toEqual([2027, 0, 1]);
  });
  it('displays the business time instead of the browser time', () => {
    expect(formatBusinessDate('2027-01-01T07:30:00Z', 'America/Manaus')).toBe('03:30');
    expect(formatBusinessDate('2027-01-01T07:30:00Z', 'Asia/Kathmandu')).toBe('13:15');
  });
  it('submits distinct UTC instants for the same fall-back wall time', () => {
    const first = { startTime: '01:30', scheduledStartAt: '2027-11-07T05:30:00.000Z' } as TimeSlot;
    const second = { startTime: '01:30', scheduledStartAt: '2027-11-07T06:30:00.000Z' } as TimeSlot;
    expect(slotInstant(first)).toBe('2027-11-07T05:30:00.000Z');
    expect(slotInstant(second)).toBe('2027-11-07T06:30:00.000Z');
  });
  it('refuses to guess an offset if the server lacks the UTC contract', () => {
    expect(() => slotInstant({ startTime: '08:00' } as TimeSlot)).toThrow();
  });
});

import { isTimeOverlap } from '../src/utils/dateUtils';

describe('Timetable Conflict Engine Unit Tests', () => {
  it('should detect overlapping time slots correctly', () => {
    // Overlapping slots: 08:00-10:00 vs 09:00-11:00
    expect(isTimeOverlap('08:00', '10:00', '09:00', '11:00')).toBe(true);

    // Contiguous non-overlapping slots: 08:00-10:00 vs 10:00-12:00
    expect(isTimeOverlap('08:00', '10:00', '10:00', '12:00')).toBe(false);

    // Completely separate slots: 08:00-10:00 vs 14:00-16:00
    expect(isTimeOverlap('08:00', '10:00', '14:00', '16:00')).toBe(false);

    // Enclosed slots: 08:00-12:00 vs 09:00-11:00
    expect(isTimeOverlap('08:00', '12:00', '09:00', '11:00')).toBe(true);
  });
});

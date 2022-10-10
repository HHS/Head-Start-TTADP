import { lastDayOfMonth } from './cron';

describe('cron', () => {
  it('lastDayOfMonth returns true if it is the last day of the month', () => {
    const today = new Date('September 30, 2022 10:00:00');
    expect(lastDayOfMonth(today)).toBe(true);
  });
  it('lastDayOfMonth returns false if it is not the last day of the month', () => {
    const today = new Date('February 28, 2024 10:00:00');
    expect(lastDayOfMonth(today)).toBe(false);
  });
});

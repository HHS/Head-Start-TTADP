import regionIdFromEventId from './regionIdFromEventId';

describe('regionIdFromEventId', () => {
  it('parses the region from a well formed event id', () => {
    expect(regionIdFromEventId('R01-TR-1234')).toBe(1);
    expect(regionIdFromEventId('R12-TR-23-5019')).toBe(12);
    expect(regionIdFromEventId('r05-tr-5017')).toBe(5);
    expect(regionIdFromEventId('R01-PD-1234')).toBe(1);
    expect(regionIdFromEventId('R09-pd-23-1')).toBe(9);
  });

  it('returns null for ids that are not in the expected format', () => {
    expect(regionIdFromEventId(undefined)).toBeNull();
    expect(regionIdFromEventId(null)).toBeNull();
    expect(regionIdFromEventId('')).toBeNull();
    expect(regionIdFromEventId('1')).toBeNull();
    expect(regionIdFromEventId('R1-TR-1234')).toBeNull();
    expect(regionIdFromEventId('R00-TR-1234')).toBeNull();
    expect(regionIdFromEventId('R01-XX-1234')).toBeNull();
  });
});

import parseDate from './date'

describe('parseDate', () => {
  it('parses valid MM/DD/YYYY', () => {
    expect(parseDate('05/13/2025')).toEqual(new Date(2025, 4, 13)) // Month is 0-based
  })

  it('parses valid M/D/YY', () => {
    expect(parseDate('5/3/25')).toEqual(new Date(2025, 4, 3))
  })

  it('parses valid ISO-like YYYY-M-D', () => {
    expect(parseDate('2025-5-3')).toEqual(new Date(2025, 4, 3))
  })

  it('parses valid dot format M.D.YYYY', () => {
    expect(parseDate('5.13.2025')).toEqual(new Date(2025, 4, 13))
  })

  it('parses valid MM.DD.YY', () => {
    expect(parseDate('05.13.25')).toEqual(new Date(2025, 4, 13))
  })

  it('rejects completely invalid format', () => {
    expect(parseDate('not-a-date')).toBeNull()
  })

  it('returns null for null/undefined/empty', () => {
    expect(parseDate(null)).toBeNull()
    expect(parseDate(undefined)).toBeNull()
    expect(parseDate('')).toBeNull()
  })
})

import { parseCheckboxEvent, NOOP, arrayExistsAndHasLength, mustBeQuarterHalfOrWhole } from '../Constants'

describe('Constants', () => {
  describe('NOOP', () => {
    it('returns undefined', () => {
      expect(NOOP()).toBeUndefined()
    })
  })

  describe('mustBeQuarterHalfOrWhole', () => {
    it('works, happy path', () => {
      const x = mustBeQuarterHalfOrWhole(1)
      expect(x).toBe(true)
    })

    it('works, sad path', () => {
      const x = mustBeQuarterHalfOrWhole(1.1)
      expect(x).toBe('Duration must be rounded to the nearest quarter hour')
    })
  })

  describe('arrayExistsAndHasLength', () => {
    it('returns true if array exists and has length', () => {
      expect(arrayExistsAndHasLength([1])).toBeTruthy()
    })

    it('returns false if array does not exist', () => {
      expect(arrayExistsAndHasLength(null)).toBeFalsy()
    })

    it('returns false if array is not an array', () => {
      expect(arrayExistsAndHasLength('string')).toBeFalsy()
    })

    it('returns false if array has no length', () => {
      expect(arrayExistsAndHasLength([])).toBeFalsy()
    })
  })

  describe('parseCheckboxEvent', () => {
    it('returns checked and value from event', () => {
      const event = {
        target: {
          checked: true,
          value: 'shoes',
        },
      }
      expect(parseCheckboxEvent(event)).toEqual({
        checked: true,
        value: 'shoes',
      })
    })

    it('returns null checked and value from event', () => {
      const event = {}
      expect(parseCheckboxEvent(event)).toEqual({
        checked: null,
        value: null,
      })
    })
  })
})

import { isMatch, containsName, skipIf } from '../flowControl'

describe('flowControl', () => {
  describe('isMatch', () => {
    test('should return true if function name matches the value', () => {
      expect(isMatch('foo', 'foo')).toBe(true)
      expect(isMatch('foo', { name: 'foo' })).toBe(true)
      expect(isMatch('foo', { name: 'foo', prefix: false, suffix: false })).toBe(true)
    })

    test('should return false if function name does not match the value', () => {
      expect(isMatch('foo', 'bar')).toBe(false)
      expect(isMatch('foo', { name: 'bar' })).toBe(false)
      expect(isMatch('foo', { name: 'bar', prefix: false, suffix: false })).toBe(false)
    })

    test('should return true if function name starts with the value', () => {
      expect(isMatch('foobar', { name: 'foo', prefix: true })).toBe(true)
    })

    test('should return false if function name does not start with the value', () => {
      expect(isMatch('barfoo', { name: 'foo', prefix: true })).toBe(false)
    })

    test('should return true if function name ends with the value', () => {
      expect(isMatch('barfoo', { name: 'foo', suffix: true })).toBe(true)
    })

    test('should return false if function name does not end with the value', () => {
      expect(isMatch('foobar', { name: 'foo', suffix: true })).toBe(false)
    })
  })

  describe('containsName', () => {
    test('should return false if function name is empty or null', () => {
      expect(containsName('foo', '')).toBe(false)
      expect(containsName('foo', null)).toBe(false)
    })

    test('should return true if function name is found in the argument', () => {
      expect(containsName('foo', 'foo')).toBe(true)
      expect(containsName([{ name: 'foo' }], 'foo')).toBe(true)
    })

    test('should return false if function name is not found in the argument', () => {
      expect(containsName('foo', 'bar')).toBe(false)
      expect(containsName([{ name: 'bar' }], 'foo')).toBe(false)
    })
  })

  describe('skipIf', () => {
    test('should return false if options object does not have ignoreHooks property', () => {
      expect(skipIf({})).toBe(false)
    })

    test('should return true if functionName is present in the ignoreHooks array of options', () => {
      const options = { ignoreHooks: ['foo'] }
      const callingFunctionName = 'foo'
      expect(skipIf(options, callingFunctionName)).toBe(true)
    })

    test('should return false if functionName is not present in the ignoreHooks array of options', () => {
      const options = { ignoreHooks: ['bar'] }
      const callingFunctionName = 'foo'
      expect(skipIf(options, callingFunctionName)).toBe(false)
    })
  })
})

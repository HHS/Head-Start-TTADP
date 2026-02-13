import {
  isObject,
  removeUndefined,
  remapPrune,
  remap,
  areNumbersEqual,
  areDatesEqual,
  isDeepEqual,
  mergeDeep,
  collectChangedValues,
  simplifyObject,
  detectAndCast,
  lowercaseFirstLetterOfKeys,
  lowercaseKeys,
  createRanges,
} from './dataObjectUtils'

describe('dataObjectUtils', () => {
  describe('isObject', () => {
    it('should return true for a plain object', () => {
      const obj = { key: 'value' }
      expect(isObject(obj)).toBe(true)
    })

    it('should return false for an array', () => {
      const arr = [1, 2, 3]
      expect(isObject(arr)).toBe(false)
    })

    it('should return false for a Date object', () => {
      const date = new Date()
      expect(isObject(date)).toBe(false)
    })

    it('should return false for null', () => {
      const nullValue = null
      expect(isObject(nullValue)).toBe(false)
    })

    it('should return false for undefined', () => {
      const undefinedValue = undefined
      expect(isObject(undefinedValue)).toBe(false)
    })

    it('should return false for a string', () => {
      const str = 'TypeScript'
      expect(isObject(str)).toBe(false)
    })

    it('should return false for a number', () => {
      const num = 123
      expect(isObject(num)).toBe(false)
    })

    it('should return false for a boolean', () => {
      const bool = true
      expect(isObject(bool)).toBe(false)
    })

    it('should return false for a function', () => {
      const func = () => {}
      expect(isObject(func)).toBe(false)
    })

    it('should return false for a Symbol', () => {
      const sym = Symbol('symbol')
      expect(isObject(sym)).toBe(false)
    })
  })

  describe('removeUndefined', () => {
    it('should return the same value for non-object types', () => {
      expect(removeUndefined(1)).toBe(1)
      expect(removeUndefined('string')).toBe('string')
      expect(removeUndefined(true)).toBe(true)
      expect(removeUndefined(null)).toBe(null)
    })

    it('should remove undefined values from an object', () => {
      const obj = { a: 1, b: undefined, c: 'test' }
      const expected = { a: 1, c: 'test' }
      expect(removeUndefined(obj)).toEqual(expected)
    })

    it('should remove undefined values from a nested object', () => {
      const obj = { a: { b: undefined, c: 2 }, d: 3 }
      const expected = { a: { c: 2 }, d: 3 }
      expect(removeUndefined(obj)).toEqual(expected)
    })

    it('should remove undefined values from an array', () => {
      const arr = [1, undefined, 3]
      const expected = [1, 3]
      expect(removeUndefined(arr)).toEqual(expected)
    })

    it('should remove undefined values from nested arrays', () => {
      const arr = [1, [2, undefined], 3]
      const expected = [1, [2], 3]
      expect(removeUndefined(arr)).toEqual(expected)
    })

    it('should return undefined for an object with all undefined values', () => {
      const obj = { a: undefined, b: undefined }
      expect(removeUndefined(obj)).toBeUndefined()
    })

    it('should return undefined for a nested object with all undefined values', () => {
      const obj = { a: { b: undefined }, c: undefined }
      expect(removeUndefined(obj)).toBeUndefined()
    })

    it('should handle an empty object', () => {
      const obj = {}
      expect(removeUndefined(obj)).toBeUndefined()
    })

    it('should handle an empty array', () => {
      const arr = []
      expect(removeUndefined(arr)).toEqual([])
    })

    it('should handle complex nested structures', () => {
      const complexObj = {
        a: 1,
        b: [undefined, { c: undefined, d: 4 }],
        e: { f: undefined, g: [5, undefined] },
        h: undefined,
      }
      const expected = {
        a: 1,
        b: [{ d: 4 }],
        e: { g: [5] },
      }
      expect(removeUndefined(complexObj)).toEqual(expected)
    })
  })

  describe('remapPrune', () => {
    it('should remove a specified property from an object', () => {
      const data = { a: { b: { c: 1 } } }
      const result = remapPrune(data, 'a.b.c')
      expect(result).toEqual({})
    })

    it('should handle wildcards in the prune path', () => {
      const data = { a: { b: { c: 1, d: 2 } } }
      const result = remapPrune(data, 'a.b.*')
      expect(result).toEqual({})
    })

    it('should remove empty parent objects when deleteEmptyParents is true', () => {
      const data = { a: { b: { c: 1 } } }
      const result = remapPrune(data, 'a.b.c', { deleteEmptyParents: true })
      expect(result).toEqual({})
    })

    it('should not remove empty parent objects when deleteEmptyParents is false', () => {
      const data = { a: { b: { c: 1 } } }
      const result = remapPrune(data, 'a.b.c', { deleteEmptyParents: false })
      expect(result).toEqual({ a: { b: {} } })
    })

    it('should remove empty parent arrays when deleteEmptyParents is true', () => {
      const data = { a: [{ b: { c: 1 } }] }
      const result = remapPrune(data, 'a[0].b.c', { deleteEmptyParents: true })
      expect(result).toEqual({ a: [] })
    })

    it('should handle complex paths with arrays and wildcards', () => {
      const data = { a: [{ b: { c: 1 } }, { b: { d: 2 } }] }
      const result = remapPrune(data, 'a[*].b.c', { deleteEmptyParents: true })
      expect(result).toEqual({ a: [{ b: {} }, { b: { d: 2 } }] })
    })

    it('should return the original object if the prune path does not exist', () => {
      const data = { a: { b: { c: 1 } } }
      const result = remapPrune(data, 'a.x.y', { deleteEmptyParents: true })
      expect(result).toEqual(data)
    })

    it('should not modify the original data object', () => {
      const data = { a: { b: { c: 1 } } }
      const originalData = { ...data }
      remapPrune(data, 'a.b.c', { deleteEmptyParents: true })
      expect(data).toEqual(originalData)
    })
    it('should remove an empty array and its parent path', () => {
      // Arrange
      const data = {
        a: {
          b: {
            c: [1, 2, 3],
            d: [], // This is the target empty array
          },
        },
      }
      const prunePath = 'a.b.d'

      // Act
      const result = remapPrune(data, prunePath)

      // Assert
      // Check that the empty array and its parent path have been removed
      expect(result).toEqual({
        a: {
          b: {
            c: [1, 2, 3],
          },
        },
      })
    })
  })

  describe('remap function', () => {
    const mockData = {
      id: 1,
      name: 'John Doe',
      address: {
        street: '123 Main St',
        city: 'Anytown',
      },
    }

    const remappingDefinition = {
      id: 'userId',
      name: 'fullName',
      'address.street': 'location.streetName',
      'address.city': 'location.cityName',
    }

    it('some values keep the same name', () => {
      const data = {
        date: '1970-01-01',
        name: 'epoch',
        description: 'Milliseconds since (January 1, 1970 UTC).',
        junk: 12345,
      }

      const remapTest = {
        date: 'timestamp',
        name: 'name',
        description: 'definition',
      }

      const result = remap(data, remapTest, { keepUnmappedValues: false })
      expect(result).toEqual({
        mapped: {
          timestamp: '1970-01-01',
          name: 'epoch',
          definition: 'Milliseconds since (January 1, 1970 UTC).',
        },
        unmapped: { junk: 12345 },
      })
    })

    it('should correctly remap data based on the definition', () => {
      const result = remap(mockData, remappingDefinition)
      expect(result).toEqual({
        mapped: {
          userId: 1,
          fullName: 'John Doe',
          location: {
            streetName: '123 Main St',
            cityName: 'Anytown',
          },
        },
        unmapped: null,
      })
    })

    it('should handle reverse remapping', () => {
      const result = remap(
        {
          userId: 1,
          fullName: 'John Doe',
          location: {
            streetName: '123 Main St',
            cityName: 'Anytown',
          },
        },
        remappingDefinition,
        { reverse: true }
      )
      expect(result).toEqual({
        mapped: mockData,
        unmapped: null,
      })
    })

    it('should keep unmapped values if specified', () => {
      const result = remap({ ...mockData, age: 25 }, remappingDefinition, {
        keepUnmappedValues: true,
      })
      expect(result.mapped).toMatchObject({
        age: 25,
        userId: 1,
        fullName: 'John Doe',
        location: {
          streetName: '123 Main St',
          cityName: 'Anytown',
        },
      }) // Check that original data is still present
    })

    it('should delete mapped values from the original data if specified', () => {
      const result = remap(mockData, remappingDefinition, { deleteMappedValues: true })
      expect(result.unmapped).toEqual(null) // Check that all mapped values are removed
    })

    it('should delete empty parent structures if specified', () => {
      const result = remap(mockData, remappingDefinition, { deleteEmptyParents: true })
      // Check that all parents of mapped values are removed
      expect(result.unmapped).toEqual(null)
    })

    it('should apply target functions to the mapped values if provided', () => {
      const targetFunctions = {
        'location.cityName': (value) => ({ location: { cityName: value.toUpperCase() } }),
      }
      const result = remap(mockData, remappingDefinition, { targetFunctions })
      expect(result.mapped).toHaveProperty('location.cityName', 'ANYTOWN')
    })

    it('should return null for both mapped and unmapped data if input data is null', () => {
      const result = remap(null, remappingDefinition)
      expect(result).toEqual({ mapped: null, unmapped: null })
    })

    it('should return null for both mapped and unmapped data if input data is undefined', () => {
      const result = remap(undefined, remappingDefinition)
      expect(result).toEqual({ mapped: null, unmapped: null })
    })

    it('should not include keys with undefined values in the result', () => {
      const dataWithUndefined = {
        id: 1,
        name: undefined,
      }
      const result = remap(dataWithUndefined, remappingDefinition)
      expect(result.mapped).not.toHaveProperty('fullName')
    })

    it('should handle complex nested structures', () => {
      const complexData = {
        user: {
          id: 1,
          profile: {
            name: 'John Doe',
            contact: {
              email: 'john@example.com',
            },
          },
        },
      }
      const complexRemappingDefinition = {
        'user.id': 'userId',
        'user.profile.name': 'fullName',
        'user.profile.contact.email': 'emailAddress',
      }
      const result = remap(complexData, complexRemappingDefinition)
      expect(result.mapped).toEqual({
        userId: 1,
        fullName: 'John Doe',
        emailAddress: 'john@example.com',
      })
    })

    it('should correctly handle the keepUnmappedValues option', () => {
      const result = remap(mockData, remappingDefinition, { keepUnmappedValues: false })
      expect(result.unmapped).toEqual(null)
    })

    it('should correctly handle the deleteMappedValues option', () => {
      const result = remap(mockData, remappingDefinition, { deleteMappedValues: false })
      expect(result.mapped).toMatchObject(mockData)
    })

    it('should correctly prune empty parent structures', () => {
      const dataWithEmptyParents = {
        user: {
          id: 1,
          profile: {},
        },
      }
      const result = remap(dataWithEmptyParents, { 'user.id': 'userId' }, { deleteEmptyParents: true })
      expect(result.mapped).toEqual({ userId: 1 })
      expect(result.unmapped).toEqual(null)
    })

    it('should handle cases where the target path includes an array index', () => {
      const dataWithIndexedArray = {
        users: [
          { id: 1, name: 'John Doe' },
          { id: 2, name: 'Jane Smith' },
        ],
      }
      const indexedRemappingDefinition = {
        'users.0.id': 'firstUserId',
        'users.1.name': 'secondUserName',
      }
      const result = remap(dataWithIndexedArray, indexedRemappingDefinition, {
        keepUnmappedValues: false,
      })
      expect(result.mapped).toEqual({
        firstUserId: 1,
        secondUserName: 'Jane Smith',
      })
    })

    it('should throw an error if remappingDefinition is not an object', () => {
      expect(() => {
        remap(mockData, null)
      }).toThrow()
    })

    it('should handle null values in the data', () => {
      const dataWithNull = {
        id: null,
        name: 'John Doe',
      }
      const result = remap(dataWithNull, remappingDefinition, { keepUnmappedValues: false })
      expect(result.mapped).toEqual({
        userId: null,
        fullName: 'John Doe',
      })
    })

    it('should handle nested arrays in the data', () => {
      const nestedArrayData = {
        groups: [
          {
            id: 1,
            users: [
              { id: 1, name: 'John Doe' },
              { id: 2, name: 'Jane Smith' },
            ],
          },
        ],
      }
      const nestedArrayRemappingDefinition = {
        'groups.*.id': 'groupIds',
        'groups.*.users.*.id': 'userIds',
        'groups.*.users.*.name': 'userNames',
      }
      const result = remap(nestedArrayData, nestedArrayRemappingDefinition, {
        keepUnmappedValues: false,
      })
      expect(result.mapped).toEqual({
        groupIds: [1],
        userIds: [1, 2],
        userNames: ['John Doe', 'Jane Smith'],
      })
    })

    it('should handle empty arrays in the data', () => {
      const dataWithEmptyArray = {
        id: 1,
        name: 'John Doe',
        tags: [],
      }
      const result = remap(dataWithEmptyArray, remappingDefinition)
      expect(result.mapped).toEqual({
        userId: 1,
        fullName: 'John Doe',
        tags: [],
      })
      expect(result.unmapped).toEqual({ tags: [] })
    })

    it('should handle data with nested objects that are not part of the remapping definition', () => {
      const dataWithNestedObject = {
        id: 1,
        name: 'John Doe',
        preferences: {
          notifications: true,
        },
      }
      const result = remap(dataWithNestedObject, remappingDefinition)
      expect(result.mapped).toEqual({
        userId: 1,
        fullName: 'John Doe',
        preferences: {
          notifications: true,
        },
      })
      expect(result.unmapped).toEqual({ preferences: { notifications: true } })
    })

    it('should handle remapping definitions with wildcard paths', () => {
      const wildcardRemappingDefinition = {
        'items.*.id': 'itemIds',
        'items.*.value': 'itemValues',
      }
      const dataWithWildcardPaths = {
        items: [
          { id: 1, value: 'A' },
          { id: 2, value: 'B' },
        ],
      }
      const result = remap(dataWithWildcardPaths, wildcardRemappingDefinition, {
        keepUnmappedValues: false,
      })
      expect(result.mapped).toEqual({
        itemIds: [1, 2],
        itemValues: ['A', 'B'],
      })
    })

    it('should not throw an error if the remapping definition contains unmatched paths', () => {
      const invalidRemappingDefinition = {
        'unmatched.path': 'resultPath',
      }
      expect(() => {
        remap(mockData, invalidRemappingDefinition)
      }).not.toThrow()
    })

    // Test the behavior when targetFunctions are not provided correctly
    it('should handle invalid targetFunctions', () => {
      const invalidTargetFunctions = {
        'location.cityName': 'Invalid function', // Invalid function
      }
      expect(() => {
        remap(mockData, remappingDefinition, { targetFunctions: invalidTargetFunctions })
      }).toThrow()
    })

    // Test the behavior when options object has invalid properties
    it('should ignore invalid options properties', () => {
      const result = remap(mockData, remappingDefinition, { invalidOption: true })
      expect(result).toEqual({
        mapped: {
          userId: 1,
          fullName: 'John Doe',
          location: {
            streetName: '123 Main St',
            cityName: 'Anytown',
          },
        },
        unmapped: null,
      })
    })
  })

  describe('areNumbersEqual', () => {
    test('should return true when both values are not numbers', () => {
      expect(areNumbersEqual('a', 'b')).toBe(true)
      expect(areNumbersEqual(null, undefined)).toBe(true)
      expect(areNumbersEqual({}, [])).toBe(true)
    })

    test('should return true when both values are the same number', () => {
      expect(areNumbersEqual(1, 1)).toBe(true)
      expect(areNumbersEqual(0, 0)).toBe(true)
      expect(areNumbersEqual(-1, -1)).toBe(true)
      expect(areNumbersEqual(3.14, 3.14)).toBe(true)
    })

    test('should return false when numbers are different', () => {
      expect(areNumbersEqual(1, 2)).toBe(false)
      expect(areNumbersEqual(-1, 1)).toBe(false)
      expect(areNumbersEqual(0, 0.0001)).toBe(false)
    })

    test('should return true when numeric strings are equal to numbers', () => {
      expect(areNumbersEqual('1', 1)).toBe(true)
      expect(areNumbersEqual('0', 0)).toBe(true)
      expect(areNumbersEqual('-1', -1)).toBe(true)
    })

    test('should return false when numeric strings are not equal to numbers', () => {
      expect(areNumbersEqual('1', 2)).toBe(false)
      expect(areNumbersEqual('0', -1)).toBe(false)
      expect(areNumbersEqual('3.14', 3.15)).toBe(false)
    })

    test('should handle special number cases', () => {
      expect(areNumbersEqual(NaN, NaN)).toBe(true) // Special case, as NaN is not equal to NaN
      expect(areNumbersEqual(Infinity, Infinity)).toBe(true)
      expect(areNumbersEqual(-Infinity, -Infinity)).toBe(true)
      expect(areNumbersEqual(Infinity, -Infinity)).toBe(false)
      expect(areNumbersEqual(Infinity, 'Infinity')).toBe(true)
      expect(areNumbersEqual(-Infinity, '-Infinity')).toBe(true)
    })
  })

  describe('areDatesEqual', () => {
    it('should return true for equal date strings', () => {
      const dateStr1 = '2021-01-01'
      const dateStr2 = '2021-01-01'
      expect(areDatesEqual(dateStr1, dateStr2)).toBe(true)
    })

    it('should return true for equal date objects', () => {
      const dateObj1 = new Date('2021-01-01')
      const dateObj2 = new Date('2021-01-01')
      expect(areDatesEqual(dateObj1, dateObj2)).toBe(true)
    })

    it('should return true for a date string and a date object representing the same date', () => {
      const dateStr = '2021-01-01'
      const dateObj = new Date('2021-01-01')
      expect(areDatesEqual(dateStr, dateObj)).toBe(true)
    })

    it('should return false for non-equal date strings', () => {
      const dateStr1 = '2021-01-01'
      const dateStr2 = '2021-01-02'
      expect(areDatesEqual(dateStr1, dateStr2)).toBe(false)
    })

    it('should return false for non-equal date objects', () => {
      const dateObj1 = new Date('2021-01-01')
      const dateObj2 = new Date('2021-01-02')
      expect(areDatesEqual(dateObj1, dateObj2)).toBe(false)
    })

    it('should return false for invalid date strings', () => {
      const dateStr1 = 'not-a-date'
      const dateStr2 = '2021-01-01'
      expect(areDatesEqual(dateStr1, dateStr2)).toBe(false)
    })

    it('should return false for null and a valid date', () => {
      const dateObj = new Date('2021-01-01')
      expect(areDatesEqual(null, dateObj)).toBe(false)
    })

    it('should return false for undefined and a valid date', () => {
      const dateObj = new Date('2021-01-01')
      expect(areDatesEqual(undefined, dateObj)).toBe(false)
    })

    it('should return false for two invalid dates', () => {
      const dateStr1 = 'not-a-date'
      const dateStr2 = 'also-not-a-date'
      expect(areDatesEqual(dateStr1, dateStr2)).toBe(false)
    })

    it('should return false for a valid date and an object that is not a date', () => {
      const dateObj = new Date('2021-01-01')
      const nonDateObj = {}
      expect(areDatesEqual(dateObj, nonDateObj)).toBe(false)
    })

    it('should return false for two objects that are not dates', () => {
      const nonDateObj1 = {}
      const nonDateObj2 = {}
      expect(areDatesEqual(nonDateObj1, nonDateObj2)).toBe(false)
    })
  })

  describe('isDeepEqual', () => {
    test('should return true for two equal numbers', () => {
      expect(isDeepEqual(1, 1)).toBe(true)
    })

    test('should return false for two different numbers', () => {
      expect(isDeepEqual(1, 2)).toBe(false)
    })

    test('should return true for two equal strings', () => {
      expect(isDeepEqual('text', 'text')).toBe(true)
    })

    test('should return false for two different strings', () => {
      expect(isDeepEqual('text', 'another')).toBe(false)
    })

    test('should return true for two equal booleans', () => {
      expect(isDeepEqual(true, true)).toBe(true)
    })

    test('should return false for two different booleans', () => {
      expect(isDeepEqual(true, false)).toBe(false)
    })

    test('should return true for two equal arrays', () => {
      expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    })

    test('should return false for two different arrays', () => {
      expect(isDeepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
    })

    test('should return false for arrays of different lengths', () => {
      expect(isDeepEqual([1, 2, 3], [1, 2])).toBe(false)
    })

    test('should return true for two equal objects', () => {
      expect(isDeepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    })

    test('should return false for two different objects', () => {
      expect(isDeepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
    })

    test('should return false for objects with different keys', () => {
      expect(isDeepEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false)
    })

    test('should return true for nested equal objects', () => {
      const obj1 = { a: { b: 2 } }
      const obj2 = { a: { b: 2 } }
      expect(isDeepEqual(obj1, obj2)).toBe(true)
    })

    test('should return false for nested objects with different values', () => {
      const obj1 = { a: { b: 2 } }
      const obj2 = { a: { b: 3 } }
      expect(isDeepEqual(obj1, obj2)).toBe(false)
    })

    test('should return false for nested objects with different keys', () => {
      const obj1 = { a: { b: 2 } }
      const obj2 = { a: { c: 2 } }
      expect(isDeepEqual(obj1, obj2)).toBe(false)
    })

    test('should return true for deeply nested equal objects', () => {
      const obj1 = { a: { b: { c: 1 } } }
      const obj2 = { a: { b: { c: 1 } } }
      expect(isDeepEqual(obj1, obj2)).toBe(true)
    })

    test('should return false for deeply nested objects with different values', () => {
      const obj1 = { a: { b: { c: 1 } } }
      const obj2 = { a: { b: { c: 2 } } }
      expect(isDeepEqual(obj1, obj2)).toBe(false)
    })

    test('should return true for two equal functions', () => {
      const func = () => {}
      expect(isDeepEqual(func, func)).toBe(true)
    })

    test('should return false for two different functions', () => {
      const func1 = () => {}
      const func2 = () => {}
      expect(isDeepEqual(func1, func2)).toBe(false)
    })

    test('should return true for two equal Dates', () => {
      const date = new Date()
      expect(isDeepEqual(date, date)).toBe(true)
    })

    test('should return false for two different Dates', () => {
      const date1 = new Date('2020-01-01')
      const date2 = new Date('2021-01-01')
      expect(isDeepEqual(date1, date2)).toBe(false)
    })

    test('should return true for two null values', () => {
      expect(isDeepEqual(null, null)).toBe(true)
    })

    test('should return false for null and undefined', () => {
      expect(isDeepEqual(null, undefined)).toBe(false)
    })

    test('should return false for null and an object', () => {
      expect(isDeepEqual(null, {})).toBe(false)
    })

    test('should return true for two undefined values', () => {
      expect(isDeepEqual(undefined, undefined)).toBe(true)
    })

    test('should return false for undefined and an object', () => {
      expect(isDeepEqual(undefined, {})).toBe(false)
    })
  })

  describe('mergeDeep', () => {
    test('should merge two objects with different properties', () => {
      const obj1 = { a: 1 }
      const obj2 = { b: 2 }
      const result = mergeDeep(obj1, obj2)
      expect(result).toEqual({ a: 1, b: 2 })
    })

    test('should override properties in the target with those in the source', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { b: 3, c: 4 }
      const result = mergeDeep(obj1, obj2)
      expect(result).toEqual({ a: 1, b: 3, c: 4 })
    })

    test('should deeply merge nested objects', () => {
      const obj1 = { a: { b: 1 } }
      const obj2 = { a: { c: 2 }, d: 3 }
      const result = mergeDeep(obj1, obj2)
      expect(result).toEqual({ a: { b: 1, c: 2 }, d: 3 })
    })

    test('should handle multiple source objects', () => {
      const obj1 = { a: 1 }
      const obj2 = { b: 2 }
      const obj3 = { c: 3 }
      const result = mergeDeep(obj1, obj2, obj3)
      expect(result).toEqual({ a: 1, b: 2, c: 3 })
    })

    test('should return the first object if only one is provided', () => {
      const obj1 = { a: 1 }
      const result = mergeDeep(obj1)
      expect(result).toEqual(obj1)
    })

    test('should not modify the original objects', () => {
      const obj1 = { a: { b: 1 } }
      const obj2 = { a: { c: 2 }, d: 3 }
      const obj1Clone = JSON.parse(JSON.stringify(obj1))
      const obj2Clone = JSON.parse(JSON.stringify(obj2))

      const result = mergeDeep(obj1, obj2)

      expect(obj1).toEqual(obj1Clone)
      expect(obj2).toEqual(obj2Clone)
      expect(result).not.toBe(obj1)
      expect(result).not.toBe(obj2)
      expect(result).toEqual({ a: { b: 1, c: 2 }, d: 3 })
    })

    test('should handle non-object values gracefully', () => {
      const obj1 = { a: 1, b: { c: 2 } }
      const obj2 = { b: null }
      const result = mergeDeep(obj1, obj2)
      expect(result).toEqual({ a: 1, b: null })
    })

    test('should return an empty object if no arguments are provided', () => {
      const result = mergeDeep()
      expect(result).toEqual({})
    })

    test('should handle date objects correctly', () => {
      const date = new Date()
      const obj1 = { a: date }
      const obj2 = { b: 2 }
      const result = mergeDeep(obj1, obj2)
      expect(result).toEqual({ a: date, b: 2 })
      expect(result.a).toBeInstanceOf(Date)
      expect(result.a).toBe(date) // Ensure the date is the same instance
    })

    test('should handle arrays without merging their elements', () => {
      const obj1 = { a: [1, 2] }
      const obj2 = { a: [3, 4], b: 2 }
      const result = mergeDeep(obj1, obj2)
      expect(result).toEqual({ a: [3, 4], b: 2 })
    })
  })

  describe('collectChangedValues', () => {
    it('should return an object with changed values', () => {
      const incomingValues = { name: 'Alice', age: 25 }
      const currentValues = { name: 'Bob', age: 25 }
      const expected = { name: 'Alice' }
      expect(collectChangedValues(incomingValues, currentValues)).toEqual(expected)
    })

    it('should return an empty object if there are no changes', () => {
      const incomingValues = { name: 'Alice', age: 25 }
      const currentValues = { name: 'Alice', age: 25 }
      const expected = {}
      expect(collectChangedValues(incomingValues, currentValues)).toEqual(expected)
    })

    it('should throw an error if incomingValues is not an object', () => {
      const incomingValues = null
      const currentValues = { name: 'Alice', age: 25 }
      expect(() => collectChangedValues(incomingValues, currentValues)).toThrow('Both incomingValues and currentValues must be objects')
    })

    it('should throw an error if currentValues is not an object', () => {
      const incomingValues = { name: 'Alice', age: 25 }
      const currentValues = null
      expect(() => collectChangedValues(incomingValues, currentValues)).toThrow('Both incomingValues and currentValues must be objects')
    })

    it('should not include unchanged values', () => {
      const incomingValues = { name: 'Alice', age: 25, location: 'Wonderland' }
      const currentValues = { name: 'Alice', age: 30, location: 'Wonderland' }
      const expected = { age: 25 }
      expect(collectChangedValues(incomingValues, currentValues)).toEqual(expected)
    })

    it('should include changed values even if they are falsy', () => {
      const incomingValues = { name: 'Alice', active: false }
      const currentValues = { name: 'Alice', active: true }
      const expected = { active: false }
      expect(collectChangedValues(incomingValues, currentValues)).toEqual(expected)
    })

    it('should include "id" if it has changed', () => {
      const incomingValues = { id: 2, name: 'Alice' }
      const currentValues = { id: 1, name: 'Alice' }
      const expected = { id: 2 }
      expect(collectChangedValues(incomingValues, currentValues)).toEqual(expected)
    })

    it('should always include "id" even if it has not changed', () => {
      const incomingValues = { id: 1, name: 'Bob' }
      const currentValues = { id: 1, name: 'Alice' }
      const expected = { id: 1, name: 'Bob' }
      expect(collectChangedValues(incomingValues, currentValues)).toEqual(expected)
    })
  })

  describe('simplifyObject', () => {
    const childrenName = 'children'
    const valueName = 'text'

    it('should return an empty object when the input is an empty object', () => {
      expect(simplifyObject({}, childrenName, valueName)).toEqual({})
    })

    it('should return an empty object when the input has no children', () => {
      const obj = { name: 'root' }
      expect(simplifyObject(obj, childrenName, valueName)).toEqual({})
    })

    it('should simplify an object with direct children', () => {
      const obj = {
        name: 'root',
        children: [
          { name: 'child1', text: 'value1' },
          { name: 'child2', text: 'value2' },
        ],
      }
      const expected = {
        child1: 'value1',
        child2: 'value2',
      }
      expect(simplifyObject(obj, childrenName, valueName)).toEqual(expected)
    })

    it('should ignore children without the specified value name', () => {
      const obj = {
        name: 'root',
        children: [{ name: 'child1' }, { name: 'child2', text: 'value2' }],
      }
      const expected = {
        child2: 'value2',
      }
      expect(simplifyObject(obj, childrenName, valueName)).toEqual(expected)
    })

    it('should recursively simplify nested children objects', () => {
      const obj = {
        name: 'root',
        children: [
          {
            name: 'child1',
            text: 'value1',
            children: [{ name: 'grandchild1', text: 'value1-1' }],
          },
          { name: 'child2', text: 'value2' },
        ],
      }
      const expected = {
        child1: 'value1',
        grandchild1: 'value1-1',
        child2: 'value2',
      }
      expect(simplifyObject(obj, childrenName, valueName)).toEqual(expected)
    })

    it('should handle complex nested structures', () => {
      const obj = {
        name: 'root',
        children: [
          {
            name: 'child1',
            text: 'value1',
            children: [
              {
                name: 'grandchild1',
                text: 'value1-1',
                children: [{ name: 'greatGrandchild1', text: 'value1-1-1' }],
              },
            ],
          },
          {
            name: 'child2',
            text: 'value2',
            children: [{ name: 'grandchild2', text: 'value2-1' }],
          },
        ],
      }
      const expected = {
        child1: 'value1',
        grandchild1: 'value1-1',
        greatGrandchild1: 'value1-1-1',
        child2: 'value2',
        grandchild2: 'value2-1',
      }
      expect(simplifyObject(obj, childrenName, valueName)).toEqual(expected)
    })

    it('should not include children that are not objects', () => {
      const obj = {
        name: 'root',
        children: ['stringChild', null, undefined, 123, { name: 'child1', text: 'value1' }],
      }
      const expected = {
        child1: 'value1',
      }
      expect(simplifyObject(obj, childrenName, valueName)).toEqual(expected)
    })

    it('should not fail if children is not an array', () => {
      const obj = {
        name: 'root',
        children: { name: 'child1', text: 'value1' },
      }
      expect(simplifyObject(obj, childrenName, valueName)).toEqual({})
    })
  })

  describe('detectAndCast', () => {
    it('should detect and cast null', () => {
      expect(detectAndCast('null')).toEqual({ value: null, type: 'null' })
    })

    it('should detect and cast undefined', () => {
      expect(detectAndCast('undefined')).toEqual({ value: undefined, type: 'undefined' })
    })

    it('should detect and cast boolean true', () => {
      expect(detectAndCast('true')).toEqual({ value: true, type: 'boolean' })
    })

    it('should detect and cast boolean false', () => {
      expect(detectAndCast('false')).toEqual({ value: false, type: 'boolean' })
    })

    it('should detect and cast a number with alternate types for boolean equivalent', () => {
      expect(detectAndCast('42')).toEqual({
        value: 42,
        type: 'number',
      })
    })

    it('should detect and cast a negative number with alternate types', () => {
      expect(detectAndCast('-42')).toEqual({
        value: -42,
        type: 'number',
      })
    })

    it('should detect and cast a floating point number with alternate types', () => {
      expect(detectAndCast('3.14')).toEqual({
        value: 3.14,
        type: 'number',
      })
    })

    it('should include alternateTypes for a string with leading zeros considered as a number', () => {
      const stringNumber = '007'
      expect(detectAndCast(stringNumber)).toEqual({
        value: stringNumber,
        type: 'string',
      })
    })

    it('should detect and cast a zero with boolean equivalent', () => {
      expect(detectAndCast('0')).toEqual({
        value: 0,
        type: 'number',
      })
    })

    it('should detect and cast one with boolean equivalent', () => {
      expect(detectAndCast('1')).toEqual({
        value: 1,
        type: 'number',
      })
    })

    it('should detect and cast a Date with alternate type', () => {
      const dateString = '2023-01-01T08:00:00.000Z'
      const date = new Date(dateString)
      expect(detectAndCast(dateString)).toEqual({
        value: date,
        type: 'Date',
      })
    })

    it('should handle a valid date string with and without milliseconds and timezone', () => {
      const dateStringWithMilliseconds = '2023-01-01T08:00:00.123Z'
      const dateStringWithoutMilliseconds = '2023-01-01T08:00:00Z'
      const dateWithMilliseconds = new Date(dateStringWithMilliseconds)
      const dateWithoutMilliseconds = new Date(dateStringWithoutMilliseconds)
      expect(detectAndCast(dateStringWithMilliseconds)).toEqual({
        value: dateWithMilliseconds,
        type: 'Date',
      })
      expect(detectAndCast(dateStringWithoutMilliseconds)).toEqual({
        value: dateWithoutMilliseconds,
        type: 'Date',
      })
    })

    it('should detect and cast an array', () => {
      const arrayString = '[1, "two", true]'
      expect(detectAndCast(arrayString)).toEqual({ value: [1, 'two', true], type: 'array' })
    })

    it('should detect and cast an object', () => {
      const objectString = '{"key": "value"}'
      expect(detectAndCast(objectString)).toEqual({ value: { key: 'value' }, type: 'object' })
    })

    it('should return the original string if it does not match any type', () => {
      const string = 'just a string'
      expect(detectAndCast(string)).toEqual({ value: string, type: 'string' })
    })

    it('should catch and ignore invalid JSON strings', () => {
      const invalidJson = '{"key": "value}'
      expect(detectAndCast(invalidJson)).toEqual({ value: invalidJson, type: 'string' })
    })

    it('should not cast a string that looks like a number but starts with zeros', () => {
      const stringNumber = '007'
      expect(detectAndCast(stringNumber)).toEqual({
        value: stringNumber,
        type: 'string',
      })
    })

    it('should not cast a string that looks like a boolean', () => {
      const stringBoolean = 'trueish'
      expect(detectAndCast(stringBoolean)).toEqual({ value: stringBoolean, type: 'string' })
    })

    it('should not cast a string that looks like a date but is invalid', () => {
      const invalidDateString = '2023-02-30'
      expect(detectAndCast(invalidDateString)).toEqual({ value: invalidDateString, type: 'string' })
    })
  })

  describe('lowercaseFirstLetterOfKeys', () => {
    it('should lowercase the first letter of each key in the object', () => {
      const input = { FirstName: 'John', LastName: 'Doe' }
      const expectedOutput = { firstName: 'John', lastName: 'Doe' }
      expect(lowercaseFirstLetterOfKeys(input)).toEqual(expectedOutput)
    })

    it('should handle keys that are already lowercase', () => {
      const input = { firstName: 'John', lastName: 'Doe' }
      const expectedOutput = { firstName: 'John', lastName: 'Doe' }
      expect(lowercaseFirstLetterOfKeys(input)).toEqual(expectedOutput)
    })

    it('should not modify the values of the keys', () => {
      const input = { Age: 30, Country: 'USA' }
      const expectedOutput = { age: 30, country: 'USA' }
      expect(lowercaseFirstLetterOfKeys(input)).toEqual(expectedOutput)
    })

    it('should handle an empty object', () => {
      const input = {}
      const expectedOutput = {}
      expect(lowercaseFirstLetterOfKeys(input)).toEqual(expectedOutput)
    })

    it('should handle keys with special characters', () => {
      // eslint-disable-next-line quote-props
      const input = { 'First-Name': 'John', Last_Name: 'Doe' }
      // eslint-disable-next-line quote-props
      const expectedOutput = { 'first-Name': 'John', last_Name: 'Doe' }
      expect(lowercaseFirstLetterOfKeys(input)).toEqual(expectedOutput)
    })

    it('should handle keys with numbers', () => {
      const input = { '1stPlace': 'John', '2ndPlace': 'Jane' }
      const expectedOutput = { '1stPlace': 'John', '2ndPlace': 'Jane' }
      expect(lowercaseFirstLetterOfKeys(input)).toEqual(expectedOutput)
    })

    it('should handle nested objects', () => {
      const input = { User: { FirstName: 'John', LastName: 'Doe' } }
      const expectedOutput = { user: { FirstName: 'John', LastName: 'Doe' } }
      expect(lowercaseFirstLetterOfKeys(input)).toEqual(expectedOutput)
    })

    it('should handle null and undefined values', () => {
      const input = { Name: null, Address: undefined }
      const expectedOutput = { name: null, address: undefined }
      expect(lowercaseFirstLetterOfKeys(input)).toEqual(expectedOutput)
    })

    it('should throw an error if the input is not an object', () => {
      const input = 'not-an-object'
      expect(() => lowercaseFirstLetterOfKeys(input)).toThrow()
    })
  })

  describe('lowercaseKeys', () => {
    it('should return an empty object when the input is an empty object', () => {
      expect(lowercaseKeys({})).toEqual({})
    })

    it('should lowercase all keys in a simple object', () => {
      const input = { Name: 'Alice', AGE: 25, 'E-mAiL': 'alice@example.com' }
      const expected = { name: 'Alice', age: 25, 'e-mail': 'alice@example.com' }
      expect(lowercaseKeys(input)).toEqual(expected)
    })

    it('should not alter the values of the object', () => {
      const input = { Name: 'Alice', AGE: 25 }
      const result = lowercaseKeys(input)
      expect(result.name).toBe('Alice')
      expect(result.age).toBe(25)
    })

    it('should handle nested objects without altering the structure', () => {
      const input = { User: { Name: 'Alice', AGE: 25 } }
      const expected = { user: { Name: 'Alice', AGE: 25 } }
      expect(lowercaseKeys(input)).toEqual(expected)
    })

    it('should throw an error if the input is not an object', () => {
      const nonObjectInputs = [null, undefined, 42, 'string', true, []]
      nonObjectInputs.forEach((input) => {
        expect(() => lowercaseKeys(input)).toThrow('Input is not an object')
      })
    })

    it('should not alter the original object', () => {
      const input = { Name: 'Alice', AGE: 25 }
      const originalInput = { ...input }
      lowercaseKeys(input)
      expect(input).toEqual(originalInput)
    })

    it('should handle objects with keys that would conflict when lowercased', () => {
      const input = { name: 'Alice', NAME: 'Bob' }
      const result = lowercaseKeys(input)
      expect(Object.keys(result)).toHaveLength(1)
      expect(result.name).toBe('Bob') // The last key-value pair should overwrite the first
    })
  })

  describe('createRanges', () => {
    test('should return an empty array when input is empty', () => {
      expect(createRanges([])).toEqual([])
    })

    test('should handle a single number', () => {
      expect(createRanges([1])).toEqual([[1, 1]])
    })

    test('should handle multiple numbers with no consecutive sequences', () => {
      expect(createRanges([3, 1, 5])).toEqual([
        [1, 1],
        [3, 3],
        [5, 5],
      ])
    })

    test('should handle a sequence of consecutive numbers', () => {
      expect(createRanges([1, 2, 3])).toEqual([[1, 3]])
    })

    test('should handle multiple ranges of consecutive numbers', () => {
      expect(createRanges([1, 2, 4, 5, 7])).toEqual([
        [1, 2],
        [4, 5],
        [7, 7],
      ])
    })

    test('should handle unsorted numbers with consecutive sequences', () => {
      expect(createRanges([5, 1, 3, 2, 4])).toEqual([[1, 5]])
    })

    test('should handle negative numbers and zero', () => {
      expect(createRanges([-2, 0, -1, 1])).toEqual([[-2, 1]])
    })

    test('should handle non-consecutive negative numbers', () => {
      expect(createRanges([-5, -3, -1])).toEqual([
        [-5, -5],
        [-3, -3],
        [-1, -1],
      ])
    })

    test('should handle a mix of positive and negative numbers', () => {
      expect(createRanges([-1, 1, -2, 2])).toEqual([
        [-2, -1],
        [1, 2],
      ])
    })

    test('should handle duplicate numbers by treating them as part of the same range', () => {
      expect(createRanges([1, 1, 2, 3, 3])).toEqual([[1, 3]])
    })

    test('should handle large ranges', () => {
      const largeRange = Array.from({ length: 1000 }, (_, i) => i + 1)
      expect(createRanges(largeRange)).toEqual([[1, 1000]])
    })

    test('should handle large non-consecutive numbers', () => {
      const largeNonConsecutive = [1000, 2000, 3000]
      expect(createRanges(largeNonConsecutive)).toEqual([
        [1000, 1000],
        [2000, 2000],
        [3000, 3000],
      ])
    })
  })
})

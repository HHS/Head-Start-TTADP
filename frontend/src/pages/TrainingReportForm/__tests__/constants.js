import { pageComplete, pageTouched, LOCAL_STORAGE_ADDITIONAL_DATA_KEY, LOCAL_STORAGE_DATA_KEY, LOCAL_STORAGE_EDITABLE_KEY } from '../constants'

describe('localStorage keys', () => {
  const id = 'test'
  const LOCAL_STORAGE_CACHE_NUMBER = '0.1'

  it('should return the correct LOCAL_STORAGE_DATA_KEY', () => {
    const expected = `tr-form-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`
    const result = LOCAL_STORAGE_DATA_KEY(id)
    expect(result).toEqual(expected)
  })

  it('should return the correct LOCAL_STORAGE_ADDITIONAL_DATA_KEY', () => {
    const expected = `tr-additional-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`
    const result = LOCAL_STORAGE_ADDITIONAL_DATA_KEY(id)
    expect(result).toEqual(expected)
  })

  it('should return the correct LOCAL_STORAGE_EDITABLE_KEY', () => {
    const expected = `tr-can-edit-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`
    const result = LOCAL_STORAGE_EDITABLE_KEY(id)
    expect(result).toEqual(expected)
  })
})

describe('pageComplete', () => {
  test('should return true if all fields have a value', () => {
    const hookForm = {
      getValues: jest.fn(() => 'test'),
    }
    const fields = ['field1', 'field2']
    expect(pageComplete(hookForm, fields)).toBe(true)
    expect(hookForm.getValues).toHaveBeenCalledTimes(2)
  })

  test('should return false if any field is missing a value', () => {
    const hookForm = {
      getValues: jest.fn((field) => {
        if (field === 'field1') return 'test'
        return undefined
      }),
    }
    const fields = ['field1', 'field2']
    expect(pageComplete(hookForm, fields)).toBe(false)
    expect(hookForm.getValues).toHaveBeenCalledTimes(2)
  })
})

describe('pageTouched', () => {
  test('should return true if any of the fields are touched', () => {
    const touched = {
      field1: true,
      field2: false,
    }
    const fields = ['field1', 'field3']
    expect(pageTouched(touched, fields)).toBe(true)
  })

  test('should return false if none of the fields are touched', () => {
    const touched = {
      field1: false,
      field2: false,
    }
    const fields = ['field3', 'field4']
    expect(pageTouched(touched, fields)).toBe(false)
  })
})

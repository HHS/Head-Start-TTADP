import safeParse from '../safeParse'

describe('safeParse', () => {
  test('should parse instance.data if it exists and has a "val" property', () => {
    const instance = {
      data: {
        val: '{"key": "value"}',
      },
    }

    const result = safeParse(instance)

    expect(result).toEqual({ key: 'value' })
  })

  test('should return instance.dataValues.data if it exists', () => {
    const instance = {
      dataValues: {
        data: { key: 'value' },
      },
    }

    const result = safeParse(instance)

    expect(result).toEqual({ key: 'value' })
  })

  test('should return instance.data if it exists', () => {
    const instance = {
      data: { key: 'value' },
    }

    const result = safeParse(instance)

    expect(result).toEqual({ key: 'value' })
  })

  test('should return null if none of the conditions are met', () => {
    const instance = {}

    const result = safeParse(instance)

    expect(result).toBeNull()
  })
})

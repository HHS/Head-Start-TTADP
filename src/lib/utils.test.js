import ensureArray from './utils'

describe('ensureArray', () => {
  it('returns the same array when input is an array', () => {
    const input = ['a', 'b', 'c']
    const result = ensureArray(input)
    expect(result).toEqual(input)
  })

  it('returns an empty array when input is undefined', () => {
    const result = ensureArray(undefined)
    expect(result).toEqual([])
  })

  it('returns an empty array when input is null', () => {
    const result = ensureArray(null)
    expect(result).toEqual([])
  })

  it('returns an empty array when input is a string', () => {
    const input = 'not an array'
    const result = ensureArray(input)
    expect(result).toEqual([])
  })

  it('returns an empty array when input is a number', () => {
    const input = 123
    const result = ensureArray(input)
    expect(result).toEqual([])
  })

  it('returns an empty array when input is an object', () => {
    const input = { key: 'value' }
    const result = ensureArray(input)
    expect(result).toEqual([])
  })

  it('returns an empty array when input is a function', () => {
    const input = () => {}
    const result = ensureArray(input)
    expect(result).toEqual([])
  })

  it('returns an empty array when input is a boolean', () => {
    const input = true
    const result = ensureArray(input)
    expect(result).toEqual([])
  })

  it('returns an empty array when input is a symbol', () => {
    const input = Symbol('test')
    const result = ensureArray(input)
    expect(result).toEqual([])
  })

  it('returns the same array when input is an empty array', () => {
    const input = []
    const result = ensureArray(input)
    expect(result).toEqual(input)
  })
})

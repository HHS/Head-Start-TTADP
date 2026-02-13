import { fixQueryWhetherStringOrArray } from '../utils'

describe('fixQueryWhetherStringOrArray', () => {
  it('returns an string if the query is a string', () => {
    const query = 'query'
    const result = fixQueryWhetherStringOrArray(query)
    expect(result).toEqual(query)
  })

  it('returns a string if it is an array', () => {
    const query = ['query']
    const result = fixQueryWhetherStringOrArray(query)
    expect(result).toEqual('query')
  })
})

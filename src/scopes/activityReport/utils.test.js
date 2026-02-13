import { Op } from 'sequelize'
import { filterExactArray } from './utils'

jest.mock('../../models', () => {
  const literal = (value) => ({ val: value })
  const escape = (value) => `'${String(value).replace(/'/g, "''")}'`

  return {
    sequelize: {
      literal,
      escape,
    },
  }
})

describe('filterExactArray', () => {
  const column = '"ActivityReport"."reason"'

  it('returns empty object when search terms are missing or normalize to empty', () => {
    expect(filterExactArray(column, undefined, false)).toEqual({})
    expect(filterExactArray(column, [], false)).toEqual({})
    expect(filterExactArray(column, ['   ', null, undefined], false)).toEqual({})
  })

  it('creates include literals using normalized terms', () => {
    const result = filterExactArray(column, ['  apple ', 'banana  ', null, ''], false)

    expect(result[Op.or]).toHaveLength(2)
    expect(result[Op.or][0].val).toBe(`${column} @> ARRAY['apple']::varchar[]`)
    expect(result[Op.or][1].val).toBe(`${column} @> ARRAY['banana']::varchar[]`)
  })

  it('creates exclusion clauses with null fallback', () => {
    const result = filterExactArray(column, ['orange'], true)

    expect(result[Op.or][0][Op.and]).toHaveLength(1)
    expect(result[Op.or][0][Op.and][0].val).toBe(`NOT (${column} @> ARRAY['orange']::varchar[])`)
    expect(result[Op.or][1].val).toBe(`${column} IS NULL`)
  })

  it('respects custom operators and array type', () => {
    const includeOperator = Op.and
    const excludeOperator = Op.or
    const customColumn = '"ActivityReport"."topics"'
    const result = filterExactArray(customColumn, ['foo', 'bar'], false, includeOperator, excludeOperator, 'text[]')

    expect(result[includeOperator]).toHaveLength(2)
    expect(result[includeOperator][0].val).toBe(`${customColumn} @> ARRAY['foo']::text[]`)
    expect(result[includeOperator][1].val).toBe(`${customColumn} @> ARRAY['bar']::text[]`)
  })
})

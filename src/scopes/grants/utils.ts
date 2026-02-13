import { Op } from 'sequelize'
import { sequelize } from '../../models'
import { filterAssociation as filter } from '../utils'

export function grantInSubQuery(
  baseQuery: string,
  searchTerms: string[],
  operator: string,
  comparator: 'LIKE' | 'NOT LIKE' | '~*' | '!~*' | 'ILIKE' | 'NOT ILIKE' = 'LIKE'
) {
  return searchTerms.map((term) =>
    sequelize.literal(`"grants"."id" ${operator} (${baseQuery} ${comparator} ${sequelize.escape(`%${String(term).trim()}%`)})`)
  )
}

export function expandArrayContains(key: string, array: string[], exclude: boolean) {
  const comparator = exclude ? Op.notILike : Op.iLike
  const scopes = array.map((member) => {
    const normalizedMember = `%${member.trim()}%`
    return {
      [key]: {
        [comparator]: normalizedMember, // sequelize escapes this automatically :)
      },
    }
  })

  return {
    where: {
      [Op.or]: scopes,
    },
  }
}

/**
 * @param {*} baseQuery baseQuery should be a SQL statement up to and
 * including the end of a final where
 * @param {*} searchTerms an array of search terms from the query string
 * @param {*} exclude whether this should exclude or include goals
 * @param {*} comparator default ~*
 * what is used to compare the end of the baseQuery to the searchTerm
 * @returns an object in the style of a sequelize where clause
 */

export function filterAssociation(baseQuery: string, searchTerms: string[], exclude: boolean, comparator = 'LIKE') {
  return filter(baseQuery, searchTerms, exclude, grantInSubQuery, comparator)
}

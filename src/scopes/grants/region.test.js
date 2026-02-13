import { Op, filtersToScopes, Grant, sequelize, recipients, possibleIds, setupSharedTestData, tearDownSharedTestData } from './testHelpers'

describe('grants/region', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
    await sequelize.close()
  })

  it('filters by region', async () => {
    const filters = { 'region.in': [3] }
    const scope = await filtersToScopes(filters, 'grant')
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    })
    expect(found.length).toBe(2)
    expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([recipients[2].id, recipients[5].id]))
  })
})

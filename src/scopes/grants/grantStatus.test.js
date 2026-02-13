import faker from '@faker-js/faker'
import { Op, filtersToScopes, Grant, Recipient, sequelize, setupSharedTestData, tearDownSharedTestData, sharedTestData } from './testHelpers'
import { createGrant } from '../../testUtils'

describe('grants/grantStatus', () => {
  let activeCdiGrant
  let inactiveCdiGrant
  let activeNonCdiGrant
  let inactiveNonCdiGrant

  let grantIds

  beforeAll(async () => {
    await setupSharedTestData()

    // Create the grants.
    activeCdiGrant = await createGrant({
      userId: sharedTestData.mockUser.id,
      regionId: 1,
      status: 'Active',
      name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
      cdi: true,
    })

    inactiveCdiGrant = await createGrant({
      userId: sharedTestData.mockUser.id,
      regionId: 1,
      status: 'Inactive',
      name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
      cdi: true,
    })

    activeNonCdiGrant = await createGrant({
      userId: sharedTestData.mockUser.id,
      regionId: 1,
      status: 'Active',
      name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
      cdi: false,
    })

    inactiveNonCdiGrant = await createGrant({
      userId: sharedTestData.mockUser.id,
      regionId: 1,
      status: 'Inactive',
      name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
      cdi: false,
    })

    grantIds = [activeCdiGrant.id, inactiveCdiGrant.id, activeNonCdiGrant.id, inactiveNonCdiGrant.id]
  })

  afterAll(async () => {
    // Clean up grants.
    await Grant.destroy({
      where: {
        id: grantIds,
      },
      individualHooks: true,
    })

    // Clean up recipients.
    await Recipient.destroy({
      where: {
        id: [activeCdiGrant.recipientId, inactiveCdiGrant.recipientId, activeNonCdiGrant.recipientId, inactiveNonCdiGrant.recipientId],
      },
    })

    await tearDownSharedTestData()
    await sequelize.close()
  })

  it('filters by active grants', async () => {
    const filters = { 'grantStatus.in': ['active'] }
    const scope = await filtersToScopes(filters)
    const found = await Grant.findAll({
      where: {
        [Op.and]: [scope.grant.where, { id: grantIds }],
      },
    })
    expect(found.length).toBe(1)
    expect(found.map((f) => f.id).includes(activeNonCdiGrant.id)).toBe(true)
  })

  it('filters by not active grants', async () => {
    const filters = { 'grantStatus.nin': ['active'] }
    const scope = await filtersToScopes(filters)
    const found = await Grant.findAll({
      where: {
        [Op.and]: [scope.grant.where, { id: grantIds }],
      },
    })
    expect(found.length).toBe(1)
    expect(found.map((f) => f.id).includes(inactiveNonCdiGrant.id)).toBe(true)
  })

  it('filters by inactive grants', async () => {
    const filters = { 'grantStatus.in': ['inactive'] }
    const scope = await filtersToScopes(filters)
    const found = await Grant.findAll({
      where: {
        [Op.and]: [scope.grant.where, { id: grantIds }],
      },
    })
    expect(found.length).toBe(1)
    expect(found.map((f) => f.id).includes(inactiveNonCdiGrant.id)).toBe(true)
  })

  it('filters by not inactive grants', async () => {
    const filters = { 'grantStatus.nin': ['inactive'] }
    const scope = await filtersToScopes(filters)
    const found = await Grant.findAll({
      where: {
        [Op.and]: [scope.grant.where, { id: grantIds }],
      },
    })
    expect(found.length).toBe(1)
    expect(found.map((f) => f.id).includes(activeNonCdiGrant.id)).toBe(true)
  })

  it('filters by cdi grants', async () => {
    const filters = { 'grantStatus.in': ['cdi'] }
    const scope = await filtersToScopes(filters)
    const found = await Grant.findAll({
      where: {
        [Op.and]: [scope.grant.where, { id: grantIds }],
      },
    })
    expect(found.length).toBe(1)
    expect(found.map((f) => f.id).includes(activeCdiGrant.id)).toBe(true)
  })

  it('filters by not cdi grants', async () => {
    const filters = { 'grantStatus.nin': ['cdi'] }
    const scope = await filtersToScopes(filters)
    const found = await Grant.findAll({
      where: {
        [Op.and]: [scope.grant.where, { id: grantIds }],
      },
    })
    expect(found.length).toBe(2)
    expect(found.map((f) => f.id).includes(activeNonCdiGrant.id)).toBe(true)
    expect(found.map((f) => f.id).includes(inactiveNonCdiGrant.id)).toBe(true)
  })
})

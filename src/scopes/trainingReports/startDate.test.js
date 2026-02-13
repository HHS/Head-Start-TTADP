import { Op, filtersToScopes, User, EventReportPilot, sequelize, mockUser } from './testHelpers'
import { filterAssociation } from './utils'

describe('trainingReports/startDate', () => {
  let lteEventReportPilot
  let gteEventReportPilot
  let betweenEventReportPilot
  let possibleIds

  beforeAll(async () => {
    // create user.
    await User.create(mockUser)

    // create lte report.
    lteEventReportPilot = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [],
      regionId: mockUser.homeRegionId,
      data: {
        startDate: '2021/06/06',
      },
    })

    // create gte report.
    gteEventReportPilot = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [],
      regionId: mockUser.homeRegionId,
      data: {
        startDate: '2021/06/08',
      },
    })

    // create between report.
    betweenEventReportPilot = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [],
      regionId: mockUser.homeRegionId,
      data: {
        startDate: '2021/06/07',
      },
    })

    possibleIds = [lteEventReportPilot.id, gteEventReportPilot.id, betweenEventReportPilot.id]
  })

  afterAll(async () => {
    // destroy reports.
    await EventReportPilot.destroy({
      where: {
        id: [lteEventReportPilot.id, gteEventReportPilot.id, betweenEventReportPilot.id],
      },
    })

    // destroy user.
    await User.destroy({ where: { id: mockUser.id } })

    await sequelize.close()
  })

  it('before returns reports with start dates before the given date', async () => {
    const filters = { 'startDate.bef': '2021/06/06' }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })
    expect(found.length).toBe(1)
    expect(found[0].id).toBe(lteEventReportPilot.id)
  })

  it('before returns reports with start dates between the given dates', async () => {
    const filters = { 'startDate.win': '2021/06/07-2021/06/07' }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })
    expect(found.length).toBe(1)
    expect(found[0].id).toBe(betweenEventReportPilot.id)
  })

  it('before returns reports with start dates after the given date', async () => {
    const filters = { 'startDate.aft': '2021/06/08' }
    const { trainingReport: scope } = await filtersToScopes(filters)

    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })
    expect(found.length).toBe(1)
    expect(found[0].id).toBe(gteEventReportPilot.id)
  })

  it('returns an empty object when date range is invalid', async () => {
    const filters = { 'startDate.win': '2021/06/07' }
    const { trainingReport: scope } = await filtersToScopes(filters)
    expect(scope).toEqual([{}])
  })

  it('uses default comparator when none is provided', async () => {
    const out = filterAssociation('asdf', ['1', '2'], false)
    expect(out.where[Op.or][0]).toStrictEqual(sequelize.literal('"EventReportPilot"."id" IN (asdf ~* \'1\')'))
    expect(out.where[Op.or][1]).toStrictEqual(sequelize.literal('"EventReportPilot"."id" IN (asdf ~* \'2\')'))
  })
})

import { Op, filtersToScopes, User, EventReportPilot, sequelize, mockUser, mockCollaboratorUser } from './testHelpers'

describe('trainingReports/collaborators', () => {
  let reportWithCollaborator
  let reportWithBothCollaborators
  let reportWithOtherCollaborator
  let possibleIds

  beforeAll(async () => {
    // create user.
    await User.create(mockUser)

    // Create collaborator user.
    await User.create(mockCollaboratorUser)

    // create report with mockUser as collaborator
    reportWithCollaborator = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [mockUser.id],
      regionId: mockUser.homeRegionId,
      data: {},
    })

    // create report with both mockUser and mockCollaboratorUser as collaborators
    reportWithBothCollaborators = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [mockUser.id, mockCollaboratorUser.id],
      regionId: mockUser.homeRegionId,
      data: {},
    })

    // create report with mockCollaboratorUser as collaborator
    reportWithOtherCollaborator = await EventReportPilot.create({
      ownerId: mockCollaboratorUser.id,
      pocIds: [mockCollaboratorUser.id],
      collaboratorIds: [mockCollaboratorUser.id],
      regionId: 3,
      data: {},
    })

    possibleIds = [reportWithCollaborator.id, reportWithBothCollaborators.id, reportWithOtherCollaborator.id]
  })

  afterAll(async () => {
    // destroy reports.
    await EventReportPilot.destroy({
      where: {
        id: possibleIds,
      },
    })

    // destroy user.
    await User.destroy({ where: { id: [mockUser.id, mockCollaboratorUser.id] } })

    await sequelize.close()
  })

  it('returns reports with mockUser as collaborator', async () => {
    const filters = { 'collaborators.in': String(mockUser.id) }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })
    expect(found.length).toBe(2)

    const reportIds = found.map((report) => report.id)

    expect(reportIds.includes(reportWithCollaborator.id)).toBe(true)
    expect(reportIds.includes(reportWithBothCollaborators.id)).toBe(true)
  })

  it('returns reports with mockCollaboratorUser as collaborator', async () => {
    const filters = { 'collaborators.in': String(mockCollaboratorUser.id) }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })
    expect(found.length).toBe(2)

    const reportIds = found.map((report) => report.id)

    expect(reportIds.includes(reportWithBothCollaborators.id)).toBe(true)
    expect(reportIds.includes(reportWithOtherCollaborator.id)).toBe(true)
  })

  it('does not match reports without the collaborator', async () => {
    const otherUserId = 99999 // A user ID not in any report
    const filters = { 'collaborators.in': String(otherUserId) }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })
    expect(found.length).toBe(0)
  })
})

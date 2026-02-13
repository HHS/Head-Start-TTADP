import { Op, filtersToScopes, User, EventReportPilot, sequelize, mockUser, mockCollaboratorUser } from './testHelpers'

import { GoalTemplate, SessionReportPilot, SessionReportPilotGoalTemplate } from '../../models'

describe('trainingReports/standard', () => {
  let reportWithDisasterRecovery
  let reportWithERSEA
  let reportWithBothStandards

  let goalTemplateDisasterRecovery
  let goalTemplateERSEA

  let sessionReportPilotDisaster
  let sessionReportPilotERSEA
  let sessionReportPilotBoth

  let possibleIds

  beforeAll(async () => {
    // Create users
    await User.create(mockUser)
    await User.create(mockCollaboratorUser)

    // Create goal templates with different standards
    // The standard field is generated from templateName for curated templates
    goalTemplateDisasterRecovery = await GoalTemplate.findOne({
      where: {
        standard: 'Disaster Recovery',
      },
    })

    if (!goalTemplateDisasterRecovery) {
      throw new Error('No disaster recovery template, seeders didnot run')
    }

    goalTemplateERSEA = await GoalTemplate.findOne({
      where: {
        standard: 'ERSEA',
      },
    })

    if (!goalTemplateERSEA) {
      throw new Error('No disaster recovery template, seeders didnot run')
    }

    // Create event reports
    reportWithDisasterRecovery = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [],
      regionId: mockUser.homeRegionId,
      data: {},
    })

    reportWithERSEA = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [],
      regionId: mockUser.homeRegionId,
      data: {},
    })

    reportWithBothStandards = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [],
      regionId: mockUser.homeRegionId,
      data: {},
    })

    // Create session reports
    sessionReportPilotDisaster = await SessionReportPilot.create({
      eventId: reportWithDisasterRecovery.id,
      data: {},
    })

    sessionReportPilotERSEA = await SessionReportPilot.create({
      eventId: reportWithERSEA.id,
      data: {},
    })

    sessionReportPilotBoth = await SessionReportPilot.create({
      eventId: reportWithBothStandards.id,
      data: {},
    })

    // Create associations between sessions and goal templates
    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportPilotDisaster.id,
      goalTemplateId: goalTemplateDisasterRecovery.id,
    })

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportPilotERSEA.id,
      goalTemplateId: goalTemplateERSEA.id,
    })

    // Report with both standards
    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportPilotBoth.id,
      goalTemplateId: goalTemplateDisasterRecovery.id,
    })

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportPilotBoth.id,
      goalTemplateId: goalTemplateERSEA.id,
    })

    possibleIds = [reportWithDisasterRecovery.id, reportWithERSEA.id, reportWithBothStandards.id]
  })

  afterAll(async () => {
    // Destroy join records
    await SessionReportPilotGoalTemplate.destroy({
      where: {},
    })

    // Destroy session reports
    await SessionReportPilot.destroy({
      where: {
        id: [sessionReportPilotDisaster.id, sessionReportPilotERSEA.id, sessionReportPilotBoth.id],
      },
    })

    // Destroy event reports
    await EventReportPilot.destroy({
      where: {
        id: possibleIds,
      },
    })

    // Destroy users
    await User.destroy({
      where: { id: [mockUser.id, mockCollaboratorUser.id] },
    })

    await sequelize.close()
  })

  it('returns reports with a single standard filter', async () => {
    const filters = { 'standard.in': ['Disaster Recovery'] }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })

    expect(found.length).toBe(2)
    const foundIds = found.map((f) => f.id)
    expect(foundIds).toContain(reportWithDisasterRecovery.id)
    expect(foundIds).toContain(reportWithBothStandards.id)
  })

  it('returns reports matching multiple standards', async () => {
    const filters = { 'standard.in': ['Disaster Recovery', 'ERSEA'] }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })

    expect(found.length).toBe(3)
    const foundIds = found.map((f) => f.id)
    expect(foundIds).toContain(reportWithDisasterRecovery.id)
    expect(foundIds).toContain(reportWithERSEA.id)
    expect(foundIds).toContain(reportWithBothStandards.id)
  })

  it('returns reports excluding a standard', async () => {
    const filters = { 'standard.nin': ['Disaster Recovery'] }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })

    expect(found.length).toBe(1)
    const foundIds = found.map((f) => f.id)
    expect(foundIds).toContain(reportWithERSEA.id)
    expect(foundIds).not.toContain(reportWithDisasterRecovery.id)
    expect(foundIds).not.toContain(reportWithBothStandards.id)
  })

  it('returns reports excluding multiple standards', async () => {
    const filters = { 'standard.nin': ['Disaster Recovery', 'ERSEA'] }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })

    expect(found.length).toBe(0)
  })
})

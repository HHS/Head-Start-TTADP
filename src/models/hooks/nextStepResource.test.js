import { faker } from '@faker-js/faker'
import { REPORT_STATUSES } from '@ttahub/common'
import { sequelize, ActivityReport, NextStepResource, NextStep, Resource, User } from '..'
import { draftObject } from './testHelpers'

jest.mock('bull')

describe('nextStepResource hooks', () => {
  let mockUser
  let resourceToDestroy
  let arToDestroy
  let nextStepToDestroy

  beforeAll(async () => {
    // Create user.
    mockUser = await User.create({
      id: faker.datatype.number(),
      homeRegionId: 1,
      hsesUsername: faker.datatype.string(),
      hsesUserId: faker.datatype.string(),
      lastLogin: new Date(),
    })

    // Create resource.
    resourceToDestroy = await Resource.create({ url: 'https://next-step-resource-hook.gov' })

    // Create report.
    arToDestroy = await ActivityReport.create({
      ...draftObject,
      userId: mockUser.id,
      submissionStatus: REPORT_STATUSES.DRAFT,
      calculatedStatus: REPORT_STATUSES.DRAFT,
    })

    // Create next step.
    nextStepToDestroy = await NextStep.create({
      activityReportId: arToDestroy.id,
      note: 'ns resource test',
      completeDate: '2022-12-12T12:00:00Z',
      noteType: 'RECIPIENT',
    })

    // Create activity report resource.
    await NextStepResource.create({
      nextStepId: nextStepToDestroy.id,
      resourceId: resourceToDestroy.id,
      sourceFields: ['resource'],
    })
  })

  afterAll(async () => {
    // Delete activity report resource.
    await NextStepResource.destroy({
      where: { nextStepId: nextStepToDestroy.id },
      individualHooks: true,
    })

    // Delete next step.
    await NextStep.destroy({
      where: { activityReportId: arToDestroy.id },
      individualHooks: true,
    })

    // Delete report.
    await ActivityReport.destroy({ where: { id: [arToDestroy.id] } })

    // Delete resource.
    await Resource.destroy({
      where: { id: [resourceToDestroy.id] },
      individualHooks: true,
    })

    // Delete user.
    await User.destroy({
      where: {
        id: [mockUser.id],
      },
    })

    // Close sequelize connection.
    await sequelize.close()
  })

  it('afterDestroy', async () => {
    // Verify activity report resource exist's.
    let nsr = await NextStepResource.findOne({
      where: { nextStepId: nextStepToDestroy.id },
    })
    expect(nsr).not.toBeNull()

    // Verify resource exists's.
    let resource = await Resource.findOne({ where: { id: [resourceToDestroy.id] } })
    expect(resource).not.toBeNull()

    // Delete with hooks.
    await NextStepResource.destroy({
      where: { nextStepId: nextStepToDestroy.id },
      individualHooks: true,
    })

    // Verify activity report resource deleted.
    nsr = await NextStepResource.findOne({
      where: { nextStepId: nextStepToDestroy.id },
    })
    expect(nsr).toBeNull()

    // Verify resource was deleted.
    resource = await Resource.findOne({ where: { id: [resourceToDestroy.id] } })
    expect(resource).toBeNull()
  })
})

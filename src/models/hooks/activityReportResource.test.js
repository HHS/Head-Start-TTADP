import { faker } from '@faker-js/faker'
import { REPORT_STATUSES } from '@ttahub/common'
import { sequelize, ActivityReport, ActivityReportResource, Resource, User } from '..'
import { draftObject } from './testHelpers'

jest.mock('bull')

describe('activityReportResource hooks', () => {
  let mockUser
  let resourceToDestroy
  let arToDestroy

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
    resourceToDestroy = await Resource.create({ url: 'https://activity-report-resource-hook.gov' })

    // Create report.
    arToDestroy = await ActivityReport.create({
      ...draftObject,
      userId: mockUser.id,
      submissionStatus: REPORT_STATUSES.DRAFT,
      calculatedStatus: REPORT_STATUSES.DRAFT,
    })

    // Create activity report resource.
    await ActivityReportResource.create({
      activityReportId: arToDestroy.id,
      resourceId: resourceToDestroy.id,
      sourceFields: ['resource'],
    })
  })

  afterAll(async () => {
    // Delete activity report resource.
    await ActivityReportResource.destroy({
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
    let arr = await ActivityReportResource.findOne({
      where: { activityReportId: arToDestroy.id },
    })
    expect(arr).not.toBeNull()

    // Verify resource exists's.
    let resource = await Resource.findOne({ where: { id: [resourceToDestroy.id] } })
    expect(resource).not.toBeNull()

    // Delete with hooks.
    await ActivityReportResource.destroy({
      where: { activityReportId: arToDestroy.id },
      individualHooks: true,
    })

    // Verify activity report resource deleted.
    arr = await ActivityReportResource.findOne({
      where: { activityReportId: arToDestroy.id },
    })
    expect(arr).toBeNull()

    // Verify resource was deleted.
    resource = await Resource.findOne({ where: { id: [resourceToDestroy.id] } })
    expect(resource).toBeNull()
  })
})

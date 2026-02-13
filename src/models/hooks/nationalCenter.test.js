import { EVENT_REPORT_STATUSES } from '@ttahub/common'
import faker from '@faker-js/faker'
import db from '..'
import { updateById } from '../../services/nationalCenters'

jest.mock('./sessionReportPilot')

describe('nationalCenter hooks', () => {
  describe('afterDestroy', () => {
    let center1
    const centerOneName = faker.lorem.words(8)
    let center2
    const centerTwoName = faker.lorem.words(8)
    let center3
    const centerThreeName = faker.lorem.words(8)
    let center4
    const centerFourName = faker.lorem.words(8)

    let eventReport
    let sessionReport
    let sessionReport2
    beforeAll(async () => {
      center1 = await db.NationalCenter.create({ name: centerOneName })
      center2 = await db.NationalCenter.create({ name: centerTwoName })
      center3 = await db.NationalCenter.create({ name: centerThreeName })

      eventReport = await db.EventReportPilot.create({
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3, 4],
        regionId: [1],
        data: {
          status: EVENT_REPORT_STATUSES.IN_PROGRESS,
        },
        imported: {},
      })

      sessionReport = await db.SessionReportPilot.create({
        eventId: eventReport.id,
        data: {
          status: EVENT_REPORT_STATUSES.IN_PROGRESS,
          objectiveTrainers: [center1.name, center2.name],
        },
      })
      sessionReport2 = await db.SessionReportPilot.create({
        eventId: eventReport.id,
        data: {
          status: EVENT_REPORT_STATUSES.IN_PROGRESS,
          objectiveTrainers: [center1.name, center2.name, center3.name],
        },
      })
    })

    afterAll(async () => {
      await db.SessionReportPilot.destroy({
        where: {
          id: [sessionReport.id, sessionReport2.id],
        },
      })

      await db.EventReportPilot.destroy({
        where: {
          id: eventReport.id,
        },
      })

      await db.NationalCenter.destroy({
        where: {
          id: [center1.id, center2.id, center3.id, center4.id],
        },
        force: true,
      })

      await db.sequelize.close()
    })

    it('should fire the hook and update the session report', async () => {
      await updateById(center3.id, { name: centerFourName })

      let sessionReportUpdated = await db.SessionReportPilot.findOne({
        where: {
          id: sessionReport2.id,
        },
      })

      center4 = await db.NationalCenter.findOne({ where: { name: centerFourName } })

      expect(sessionReportUpdated.data.objectiveTrainers).toEqual([center1.name, center2.name, center4.name])

      await center4.destroy({ individualHooks: true })

      sessionReportUpdated = await db.SessionReportPilot.findOne({
        where: {
          id: sessionReport2.id,
        },
      })

      expect(sessionReportUpdated.data.objectiveTrainers).toEqual([center1.name, center2.name])

      await eventReport.update({
        data: {
          status: EVENT_REPORT_STATUSES.COMPLETE,
        },
      })

      await center1.destroy({ individualHooks: true })

      sessionReportUpdated = await db.SessionReportPilot.findOne({
        where: {
          id: sessionReport2.id,
        },
      })

      expect(sessionReportUpdated.data.objectiveTrainers).toEqual([center1.name, center2.name])

      const unchangedSessionReport = await db.SessionReportPilot.findOne({
        where: {
          id: sessionReport.id,
        },
      })

      expect(unchangedSessionReport.data.objectiveTrainers).toEqual([center1.name, center2.name])
    })
  })
})

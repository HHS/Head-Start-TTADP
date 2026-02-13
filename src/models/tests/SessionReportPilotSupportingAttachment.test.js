import faker from '@faker-js/faker'
import { EVENT_REPORT_STATUSES } from '@ttahub/common'
import { FILE_STATUSES } from '../../constants'
import db, { EventReportPilot, SessionReportPilot, SessionReportPilotSupportingAttachment, File, User } from '..'

describe('SessionReportPilotSupportingAttachment', () => {
  let user
  let event
  let session
  let sessionTwo
  let file
  let fileTwo
  beforeAll(async () => {
    // Create mock user.
    user = await User.create({
      id: faker.datatype.number(),
      homeRegionId: 1,
      hsesUsername: faker.datatype.string(),
      hsesUserId: faker.datatype.string(),
      lastLogin: new Date(),
    })

    // Create Event.
    event = await EventReportPilot.create({
      ownerId: user.id,
      pocIds: [],
      collaboratorIds: [],
      regionId: [1],
      data: {
        status: EVENT_REPORT_STATUSES.IN_PROGRESS,
      },
      imported: {},
    })

    // Create SessionEventReportPilot.
    session = await SessionReportPilot.create({
      eventId: event.id,
      data: {},
    })

    // Create SessionEventReportPilot two.
    sessionTwo = await SessionReportPilot.create({
      eventId: event.id,
      data: {},
    })

    // Create File.
    file = await File.create({
      originalFileName: 'session-supporting-attach.txt',
      key: 'session-supporting-attach.key',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 1234,
    })

    // Create File.
    fileTwo = await File.create({
      originalFileName: 'session-supporting-attach-two.txt',
      key: 'session-supporting-attach-two.key',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 1235,
    })

    // Create SessionReportPilotSupportingAttachment.
    await SessionReportPilotSupportingAttachment.create({
      id: faker.datatype.number(),
      sessionReportPilotId: session.id,
      fileId: file.id,
    })
  })
  afterAll(async () => {
    // Destroy SessionReportPilotSupportingAttachment.
    await SessionReportPilotSupportingAttachment.destroy({
      where: {
        sessionReportPilotId: [session.id, sessionTwo.id],
      },
    })

    // Destroy SessionEventReportPilot.
    await SessionReportPilot.destroy({
      where: {
        eventId: event.id,
      },
    })

    // Destroy File.
    await File.destroy({
      where: {
        id: [file.id, fileTwo.id],
      },
    })

    // Destroy Event.
    await EventReportPilot.destroy({
      where: {
        id: event.id,
      },
    })

    // Destroy user.
    await User.destroy({
      where: {
        id: user.id,
      },
    })

    await db.sequelize.close()
  })

  it('SessionReportPilotSupportingAttachment', async () => {
    // Get SessionReportPilotSupportingAttachment.
    let ssa = await SessionReportPilotSupportingAttachment.findOne({
      where: {
        sessionReportPilotId: session.id,
      },
    })

    // Assert session and file id.
    expect(ssa.sessionReportPilotId).toBe(session.id)
    expect(ssa.fileId).toBe(file.id)

    // Update SessionReportPilotSupportingAttachment.
    await SessionReportPilotSupportingAttachment.update(
      {
        fileId: fileTwo.id,
        sessionReportPilotId: sessionTwo.id,
      },
      {
        where: {
          sessionReportPilotId: session.id,
        },
      }
    )

    // Get updated SessionReportPilotSupportingAttachment.
    ssa = await SessionReportPilotSupportingAttachment.findOne({
      where: {
        id: ssa.id,
      },
    })

    // Assert updated session and file id.
    expect(ssa.sessionReportPilotId).toBe(sessionTwo.id)
    expect(ssa.fileId).toBe(fileTwo.id)
  })
})

import faker from '@faker-js/faker';
import { EVENT_REPORT_STATUSES } from '@ttahub/common';
import { FILE_STATUSES } from '../../constants';
import db, {
  TrainingReport,
  SessionReport,
  SessionReportSupportingAttachment,
  File,
  User,
} from '..';

describe('SessionReportSupportingAttachment', () => {
  let user;
  let event;
  let session;
  let sessionTwo;
  let file;
  let fileTwo;
  beforeAll(async () => {
    // Create mock user.
    user = await User.create({
      id: faker.datatype.number(),
      homeRegionId: 1,
      hsesUsername: faker.datatype.string(),
      hsesUserId: faker.datatype.string(),
      lastLogin: new Date(),
    });

    // Create Event.
    event = await TrainingReport.create({
      ownerId: user.id,
      pocIds: [],
      collaboratorIds: [],
      regionId: [1],
      data: {
        status: EVENT_REPORT_STATUSES.IN_PROGRESS,
      },
      imported: {},
    });

    // Create SessionTrainingReport.
    session = await SessionReport.create({
      eventId: event.id,
      data: {},
    });

    // Create SessionTrainingReport two.
    sessionTwo = await SessionReport.create({
      eventId: event.id,
      data: {},
    });

    // Create File.
    file = await File.create({
      originalFileName: 'session-supporting-attach.txt',
      key: 'session-supporting-attach.key',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 1234,
    });

    // Create File.
    fileTwo = await File.create({
      originalFileName: 'session-supporting-attach-two.txt',
      key: 'session-supporting-attach-two.key',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 1235,
    });

    // Create SessionReportSupportingAttachment.
    await SessionReportSupportingAttachment.create({
      id: faker.datatype.number(),
      sessionReportId: session.id,
      fileId: file.id,
    });
  });
  afterAll(async () => {
    // Destroy SessionReportSupportingAttachment.
    await SessionReportSupportingAttachment.destroy({
      where: {
        sessionReportId: [session.id, sessionTwo.id],
      },
    });

    // Destroy SessionTrainingReport.
    await SessionReport.destroy({
      where: {
        eventId: event.id,
      },
    });

    // Destroy File.
    await File.destroy({
      where: {
        id: [file.id, fileTwo.id],
      },
    });

    // Destroy Event.
    await TrainingReport.destroy({
      where: {
        id: event.id,
      },
    });

    // Destroy user.
    await User.destroy({
      where: {
        id: user.id,
      },
    });

    await db.sequelize.close();
  });

  it('SessionReportSupportingAttachment', async () => {
    // Get SessionReportSupportingAttachment.
    let ssa = await SessionReportSupportingAttachment
      .findOne(
        {
          where: {
            sessionReportId: session.id,
          },
        },
      );

    // Assert session and file id.
    expect(ssa.sessionReportId).toBe(session.id);
    expect(ssa.fileId).toBe(file.id);

    // Update SessionReportSupportingAttachment.
    await SessionReportSupportingAttachment.update({
      fileId: fileTwo.id,
      sessionReportId: sessionTwo.id,
    }, {
      where: {
        sessionReportId: session.id,
      },
    });

    // Get updated SessionReportSupportingAttachment.
    ssa = await SessionReportSupportingAttachment
      .findOne(
        {
          where: {
            id: ssa.id,
          },
        },
      );

    // Assert updated session and file id.
    expect(ssa.sessionReportId).toBe(sessionTwo.id);
    expect(ssa.fileId).toBe(fileTwo.id);
  });
});

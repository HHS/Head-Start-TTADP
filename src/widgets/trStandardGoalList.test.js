import faker from '@faker-js/faker';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import {
  EventReportPilot,
  GoalTemplate,
  SessionReportPilot,
  SessionReportPilotGoalTemplate,
  sequelize,
  User,
} from '../models';
import filtersToScopes from '../scopes';
import { createEvent } from '../services/event';
import trStandardGoalList from './trStandardGoalList';

const mockUser = {
  homeRegionId: 1,
  name: faker.name.findName(),
  hsesUsername: faker.internet.email(),
  hsesUserId: `fake${faker.unique(() => faker.datatype.number({ min: 1, max: 10000 }))}`,
  lastLogin: new Date(),
};

const testEventLongId = `R99-TRSG-${faker.unique(() => faker.datatype.number({ min: 10000, max: 99999 }))}`;

describe('trStandardGoalList', () => {
  let user;
  let eventReportComplete1;
  let eventReportComplete2;
  let eventReportIncomplete;
  let goalTemplate1;
  let goalTemplate2;
  let sessionReportComplete1;
  let sessionReportComplete2;
  let sessionReportComplete3;
  let sessionReportIncomplete;

  const createAnEvent = async ({ userId, status, startDate }) =>
    createEvent({
      ownerId: userId,
      regionId: userId,
      pocIds: [userId],
      collaboratorIds: [userId],
      data: {
        eventId: testEventLongId,
        startDate,
        status,
      },
    });

  beforeAll(async () => {
    user = await User.create(mockUser);

    goalTemplate1 = await GoalTemplate.findOne({
      where: { standard: 'Teaching Practices' },
    });

    if (!goalTemplate1) {
      throw new Error('Teaching Practices template not found - migration did not run');
    }

    goalTemplate2 = await GoalTemplate.findOne({
      where: { standard: 'ERSEA' },
    });

    if (!goalTemplate2) {
      throw new Error('ERSEA template not found - migration did not run');
    }

    eventReportComplete1 = await createAnEvent({
      userId: user.id,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      startDate: '10/01/2025',
    });

    eventReportComplete2 = await createAnEvent({
      userId: user.id,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      startDate: '11/15/2025',
    });

    eventReportIncomplete = await createAnEvent({
      userId: user.id,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      startDate: '10/01/2025',
    });

    sessionReportComplete1 = await SessionReportPilot.create({
      eventId: eventReportComplete1.id,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportComplete1.id,
      goalTemplateId: goalTemplate1.id,
    });

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportComplete1.id,
      goalTemplateId: goalTemplate2.id,
    });

    sessionReportComplete2 = await SessionReportPilot.create({
      eventId: eventReportComplete2.id,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportComplete2.id,
      goalTemplateId: goalTemplate1.id,
    });

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportComplete2.id,
      goalTemplateId: goalTemplate2.id,
    });

    sessionReportComplete3 = await SessionReportPilot.create({
      eventId: eventReportComplete1.id,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    });

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportComplete3.id,
      goalTemplateId: goalTemplate1.id,
    });

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportComplete3.id,
      goalTemplateId: goalTemplate2.id,
    });

    sessionReportIncomplete = await SessionReportPilot.create({
      eventId: eventReportIncomplete.id,
      data: {
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      },
    });

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportIncomplete.id,
      goalTemplateId: goalTemplate1.id,
    });

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportIncomplete.id,
      goalTemplateId: goalTemplate2.id,
    });

    await sequelize.query(`
      UPDATE "EventReportPilots"
        SET data = JSONB_SET(data,'{status}','"${TRAINING_REPORT_STATUSES.COMPLETE}"')
      WHERE id IN (${eventReportComplete1.id}, ${eventReportComplete2.id});
    `);
  });

  afterAll(async () => {
    await SessionReportPilotGoalTemplate.destroy({
      where: {
        sessionReportPilotId: [
          sessionReportComplete1.id,
          sessionReportComplete2.id,
          sessionReportComplete3.id,
          sessionReportIncomplete.id,
        ],
      },
    });

    await SessionReportPilot.destroy({
      where: {
        id: [
          sessionReportComplete1.id,
          sessionReportComplete2.id,
          sessionReportComplete3.id,
          sessionReportIncomplete.id,
        ],
      },
      force: true,
    });

    await EventReportPilot.destroy({
      where: {
        id: [eventReportComplete1.id, eventReportComplete2.id, eventReportIncomplete.id],
      },
      force: true,
    });

    await User.destroy({
      where: {
        id: user.id,
      },
      force: true,
    });
  });

  it('returns standard goals sorted by count', async () => {
    const scopes = await filtersToScopes({}, {});

    const result = await trStandardGoalList(scopes);

    expect(result).toEqual([
      { name: 'ERSEA', count: 2 },
      { name: 'Teaching Practices', count: 2 },
    ]);
  });
});

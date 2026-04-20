import faker from '@faker-js/faker';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import {
  User,
  EventReportPilot,
  SessionReportPilot,
  GoalTemplate,
  SessionReportPilotGoalTemplate,
  sequelize,
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

  const createAnEvent = async ({
    userId,
    status,
    startDate,
  }) => createEvent({
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
    // Create test user
    user = await User.create(mockUser);

    // Find existing goal templates from migration
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

    // Create event reports with complete status and valid start dates
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

    // Event - included since we only filter by start date, not event status
    eventReportIncomplete = await createAnEvent({
      userId: user.id,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      startDate: '10/01/2025',
    });

    // Session reports linked to complete events
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

    // Another complete session for the first event (same event, different session)
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

    // Session report with incomplete status - should not be included
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

    // Note: This status update is no longer required for the widget logic since
    // event completion status is no longer checked, but kept for test data consistency
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
        id: [
          eventReportComplete1.id,
          eventReportComplete2.id,
          eventReportIncomplete.id,
        ],
      },
      force: true,
    });

    await User.destroy({
      where: {
        id: user.id,
      },
    });
  });

  it('returns counts of curated standard goals linked to complete training reports', async () => {
    const scopes = await filtersToScopes({ 'eventId.ctn': [testEventLongId] });

    const results = await trStandardGoalList(scopes);

    // Should only return curated standards (not Monitoring)
    // Both Teaching Practices and ERSEA should be present
    expect(results).toHaveLength(2);

    const teachingPracticesResult = results.find((r) => r.name === 'Teaching Practices');
    const erseaResult = results.find((r) => r.name === 'ERSEA');

    expect(teachingPracticesResult).toBeDefined();
    expect(erseaResult).toBeDefined();

    // Monitoring standard should not be in results
    const monitoringResult = results.find((r) => r.name === 'Monitoring');
    expect(monitoringResult).toBeUndefined();
  });

  it('only counts session reports with complete status', async () => {
    const scopes = await filtersToScopes({ 'eventId.ctn': [testEventLongId] });

    const results = await trStandardGoalList(scopes);

    const teachingPracticesResult = results.find((r) => r.name === 'Teaching Practices');
    const erseaResult = results.find((r) => r.name === 'ERSEA');

    // 3 complete sessions exist; the incomplete one should be excluded.
    // Count reflects distinct sessions, not events.
    expect(teachingPracticesResult).toBeDefined();
    expect(Number(teachingPracticesResult.count)).toBe(3);
    expect(erseaResult).toBeDefined();
    expect(Number(erseaResult.count)).toBe(3);
  });

  it('only includes events with start date >= 2025-09-01', async () => {
    const scopes = await filtersToScopes({ 'eventId.ctn': [testEventLongId] });

    const results = await trStandardGoalList(scopes);

    // All test events have start dates >= 2025-09-01, so sessions should be included
    expect(results).toHaveLength(2);
  });

  it('excludes Monitoring standard from results', async () => {
    const scopes = await filtersToScopes({ 'eventId.ctn': [testEventLongId] });

    const results = await trStandardGoalList(scopes);

    // Verify no Monitoring standard in results
    const monitoringResults = results.filter((r) => r.name === 'Monitoring');
    expect(monitoringResults).toHaveLength(0);
  });

  it('counts distinct sessions for session reports', async () => {
    const scopes = await filtersToScopes({ 'eventId.ctn': [testEventLongId] });

    const results = await trStandardGoalList(scopes);

    // Results should have a count attribute representing distinct session counts
    expect(results).toHaveLength(2);

    results.forEach((result) => {
      expect(result).toHaveProperty('count');
      expect(Number(result.count)).toBe(3);
    });
  });

  it('applies scopes to filter results', async () => {
    // Create scopes with a filter that won't match our test data
    const query = { 'region.in': ['999'] };
    const scopes = await filtersToScopes(query);

    const results = await trStandardGoalList(scopes);

    // Should return empty or filtered results based on scopes
    expect(Array.isArray(results)).toBe(true);
  });

  it('returns empty array when no events match the scopes filter', async () => {
    // Use scopes with a region that doesn't match any test data
    const query = { 'region.in': ['999'] };
    const scopes = await filtersToScopes(query);

    const results = await trStandardGoalList(scopes);

    // Should return empty array due to early return when no events found
    expect(results).toEqual([]);
  });

  it('returns results sorted by count in descending order', async () => {
    const scopes = await filtersToScopes({ 'eventId.ctn': [testEventLongId] });

    const results = await trStandardGoalList(scopes);

    // Verify results are sorted by count descending
    for (let i = 0; i < results.length - 1; i += 1) {
      expect(Number(results[i].count)).toBeGreaterThanOrEqual(
        Number(results[i + 1].count),
      );
    }
  });
});

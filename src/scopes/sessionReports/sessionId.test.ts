import { Op } from 'sequelize';
import {
  mockUser,
} from './testHelpers';
import db from '../../models';
import filtersToScopes from '..';

const { sequelize } = db;

describe('sessionReports/sessionId', () => {
  let eventReportPilot;
  let sessionReport1;
  let sessionReport2;
  let sessionReport3;
  let possibleIds;

  beforeAll(async () => {
    // Create user.
    await db.User.create(mockUser);

    // Create event report (required for session reports).
    eventReportPilot = await db.EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [],
      regionId: mockUser.homeRegionId,
      data: {},
    }, { individualHooks: false });

    // Create session reports.
    sessionReport1 = await db.SessionReportPilot.create({
      eventId: eventReportPilot.id,
      data: {},
    }, { individualHooks: false });

    sessionReport2 = await db.SessionReportPilot.create({
      eventId: eventReportPilot.id,
      data: {},
    }, { individualHooks: false });

    sessionReport3 = await db.SessionReportPilot.create({
      eventId: eventReportPilot.id,
      data: {},
    }, { individualHooks: false });

    possibleIds = [sessionReport1.id, sessionReport2.id, sessionReport3.id];
  });

  afterAll(async () => {
    // Destroy session reports.
    await db.SessionReportPilot.destroy({
      where: { id: possibleIds },
    });

    // Destroy event report.
    await db.EventReportPilot.destroy({
      where: { id: eventReportPilot.id },
    });

    // Destroy user.
    await db.User.destroy({ where: { id: mockUser.id } });

    await sequelize.close();
  });

  it('returns session with matching id', async () => {
    const filters = { 'sessionId.in': [sessionReport1.id.toString()] };
    const { sessionReport: scope } = await filtersToScopes(filters);
    const found = await db.SessionReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    });
    expect(found.length).toBe(1);
    expect(found[0].id).toBe(sessionReport1.id);
  });

  it('returns multiple sessions with matching ids', async () => {
    const filters = {
      'sessionId.in': [sessionReport1.id.toString(), sessionReport2.id.toString()],
    };
    const { sessionReport: scope } = await filtersToScopes(filters);
    const found = await db.SessionReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    });
    expect(found.length).toBe(2);
    const foundIds = found.map((report) => report.id);
    expect(foundIds).toContain(sessionReport1.id);
    expect(foundIds).toContain(sessionReport2.id);
  });

  it('returns empty results when no ids match', async () => {
    const filters = { 'sessionId.in': ['999999'] };
    const { sessionReport: scope } = await filtersToScopes(filters);
    const found = await db.SessionReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    });
    expect(found.length).toBe(0);
  });

  it('returns all matching sessions from possible ids', async () => {
    const filters = {
      'sessionId.in': possibleIds.map((id) => id.toString()),
    };
    const { sessionReport: scope } = await filtersToScopes(filters);
    const found = await db.SessionReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    });
    expect(found.length).toBe(3);
  });
});

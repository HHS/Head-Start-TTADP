import { Op } from 'sequelize';
import db from '../../models';
import filtersToScopes from '..';
import { createGrant, createRecipient } from '../../testUtils';
import { mockUser } from './testHelpers';

const { sequelize } = db;

describe('sessionReports/recipientId', () => {
  let recipient;
  let grant;
  let eventReportPilot;
  let sessionWithRecipient;
  let sessionWithoutRecipient;
  let possibleIds;

  beforeAll(async () => {
    await db.User.create(mockUser);

    recipient = await createRecipient();
    grant = await createGrant({ recipientId: recipient.id });

    eventReportPilot = await db.EventReportPilot.create(
      {
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
        collaboratorIds: [],
        regionId: mockUser.homeRegionId,
        data: {},
      },
      { individualHooks: false }
    );

    // Session linked to the recipient via grantId in JSONB recipients array.
    sessionWithRecipient = await db.SessionReportPilot.create(
      {
        eventId: eventReportPilot.id,
        data: {
          recipients: [{ value: grant.id, label: recipient.name }],
        },
      },
      { individualHooks: false }
    );

    // Session with no recipients.
    sessionWithoutRecipient = await db.SessionReportPilot.create(
      {
        eventId: eventReportPilot.id,
        data: { recipients: [] },
      },
      { individualHooks: false }
    );

    possibleIds = [sessionWithRecipient.id, sessionWithoutRecipient.id];
  });

  afterAll(async () => {
    await db.SessionReportPilot.destroy({ where: { id: possibleIds } });
    await db.EventReportPilot.destroy({ where: { id: eventReportPilot.id } });
    await db.Grant.destroy({ where: { id: grant.id }, individualHooks: true });
    await db.Recipient.destroy({ where: { id: recipient.id }, individualHooks: true });
    await db.User.destroy({ where: { id: mockUser.id } });
    await sequelize.close();
  });

  it('returns sessions that include a grant belonging to the recipient', async () => {
    const filters = { 'recipientId.ctn': [recipient.id.toString()] };
    const { sessionReport: scope } = await filtersToScopes(filters);
    const found = await db.SessionReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    });
    expect(found.length).toBe(1);
    expect(found[0].id).toBe(sessionWithRecipient.id);
  });

  it('returns no sessions when the recipient has no matching grants', async () => {
    const filters = { 'recipientId.ctn': ['999999'] };
    const { sessionReport: scope } = await filtersToScopes(filters);
    const found = await db.SessionReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    });
    expect(found.length).toBe(0);
  });
});

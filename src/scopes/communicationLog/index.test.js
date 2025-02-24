import faker from '@faker-js/faker';
import {
  COMMUNICATION_METHODS,
  COMMUNICATION_RESULTS,
  COMMUNICATION_PURPOSES,
} from '@ttahub/common';
import db from '../../models';
import { createUser, createRecipient } from '../../testUtils';
import { logsByRecipientAndScopes } from '../../services/communicationLog';
import { communicationLogFiltersToScopes } from './index';
import { withinCommunicationDate } from './communicationDate';

describe('communicationLog filtersToScopes', () => {
  const userName = faker.name.findName();
  const secondUserName = faker.name.findName();
  let user;
  let secondUser;
  let recipient;
  let ignoredRecipient;
  const regionId = faker.datatype.number({ min: 10000, max: 100000 });
  let region;

  let communicationLogs;
  let logForIgnoredRecipient;

  beforeAll(async () => {
    region = await db.Region.create({
      id: regionId,
      name: `Region ${regionId}`,
    });

    user = await createUser({ homeRegionId: regionId, name: userName });
    secondUser = await createUser({ homeRegionId: regionId, name: secondUserName });
    recipient = await createRecipient();
    ignoredRecipient = await createRecipient();

    const defaultLog = {
      userId: user.id,
    };

    const defaultData = {
      communicationDate: '2023/01/01',
      result: COMMUNICATION_RESULTS[0],
      method: COMMUNICATION_METHODS[0],
      purpose: COMMUNICATION_PURPOSES[0],
    };

    communicationLogs = await Promise.all([
      db.CommunicationLog.create({
        ...defaultLog,
        data: {
          ...defaultData,
          communicationDate: '2022/12/01',
        },
      }),
      db.CommunicationLog.create({
        ...defaultLog,
        data: {
          ...defaultData,
          result: COMMUNICATION_RESULTS[1],
        },
      }),
      db.CommunicationLog.create({
        ...defaultLog,
        data: {
          ...defaultData,
          method: COMMUNICATION_METHODS[1],
          purpose: COMMUNICATION_PURPOSES[1],
        },
      }),
      db.CommunicationLog.create({
        ...defaultLog,
        userId: secondUser.id,
        data: defaultData,
      }),
    ]);

    await db.CommunicationLogRecipient.bulkCreate(communicationLogs.map((log) => ({
      recipientId: recipient.id,
      communicationLogId: log.id,
    })));

    logForIgnoredRecipient = await db.CommunicationLog.create({
      ...defaultLog,
      data: defaultData,
    });

    await db.CommunicationLogRecipient.create({
      recipientId: ignoredRecipient.id,
      communicationLogId: logForIgnoredRecipient.id,
    });
  });

  afterAll(async () => {
    await db.CommunicationLogRecipient.destroy({
      where: {
        communicationLogId: [
          ...communicationLogs.map((log) => log.id),
          logForIgnoredRecipient.id,
        ],
      },
    });

    await db.CommunicationLog.destroy({
      where: {
        id: [
          ...communicationLogs.map((log) => log.id),
          logForIgnoredRecipient.id,
        ],
      },
    });
    await db.Recipient.destroy({
      where: {
        id: [
          recipient.id,
          ignoredRecipient.id,
        ],
      },
    });
    await db.User.destroy({
      where: {
        id: [user.id, secondUser.id],
      },
    });
    await db.Region.destroy({ where: { id: region.id } });
    await db.sequelize.close();
  });

  it('should return all logs when no filters are provided', async () => {
    const scopes = communicationLogFiltersToScopes([]);
    const { rows, count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(4);

    const recipientIds = rows.map((row) => row.recipientId);
    expect(recipientIds).not.toContain(ignoredRecipient.id);
  });

  it('filters by result within', async () => {
    const scopes = communicationLogFiltersToScopes({
      'result.in': [COMMUNICATION_RESULTS[1]],
    });

    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by result without', async () => {
    const scopes = communicationLogFiltersToScopes({
      'result.nin': [COMMUNICATION_RESULTS[1]],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(3);
  });

  it('filters by purpose within', async () => {
    const scopes = communicationLogFiltersToScopes({
      'purpose.in': [COMMUNICATION_PURPOSES[1]],
    });

    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by purpose without', async () => {
    const scopes = communicationLogFiltersToScopes({
      'purpose.nin': [COMMUNICATION_PURPOSES[1]],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(3);
  });

  it('filters by method within', async () => {
    const scopes = communicationLogFiltersToScopes({
      'method.in': [COMMUNICATION_METHODS[1]],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by method without', async () => {
    const scopes = communicationLogFiltersToScopes({
      'method.nin': [COMMUNICATION_METHODS[1]],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(3);
  });

  it('filters by creator within', async () => {
    const scopes = communicationLogFiltersToScopes({
      'creator.ctn': [secondUserName.substring(0, 8)],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by creator without', async () => {
    const scopes = communicationLogFiltersToScopes({
      'creator.nctn': [secondUserName.substring(0, 8)],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(3);
  });

  it('filters by communication date before', async () => {
    const scopes = communicationLogFiltersToScopes({
      'communicationDate.bef': ['2022/12/15'],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by communication date after', async () => {
    const scopes = communicationLogFiltersToScopes({
      'communicationDate.aft': ['2022/12/31'],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(3);
  });
  it('filters by communication date within', async () => {
    const scopes = communicationLogFiltersToScopes({
      'communicationDate.win': ['2022/10/01-2022/12/15'],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('filters by communication date in', async () => {
    const scopes = communicationLogFiltersToScopes({
      'communicationDate.in': ['2022/10/01-2022/12/15'],
    });
    const { count } = await logsByRecipientAndScopes(recipient.id, 'communicationDate', 0, 'DESC', 10, scopes);
    expect(count).toBe(1);
  });

  it('returns empty when the dates split at "-" is less than 2', () => {
    const out = withinCommunicationDate(['2022/10/01']);
    expect(out).toMatchObject({});
  });
});

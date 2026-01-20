import stringify from 'csv-stringify/lib/sync';
// import { expect } from '@playwright/test';
import db, {
  User,
  Recipient,
  CommunicationLog,
  CommunicationLogRecipient,
  CommunicationLogFile,
  File,
} from '../models';
import {
  logById,
  logsByRecipientAndScopes,
  csvLogsByRecipientAndScopes,
  deleteLog,
  updateLog,
  createLog,
  orderLogsBy,
  formatCommunicationDateWithJsonData,
  COMMUNICATION_LOG_SORT_KEYS,
} from './communicationLog';
import { createRecipient, createUser } from '../testUtils';

jest.mock('csv-stringify/lib/sync');

const { sequelize } = db;

describe('communicationLog services', () => {
  let user;
  let recipient;
  let secondRecipient;
  let log;

  beforeAll(async () => {
    user = await createUser();
    recipient = await createRecipient({});
    secondRecipient = await createRecipient({});
    log = await createLog([recipient.id], user.id, {});
  });

  afterAll(async () => {
    await CommunicationLogRecipient.destroy({ where: { communicationLogId: log.id } });
    await CommunicationLog.destroy({ where: { userId: user.id } });
    await Recipient.destroy({ where: { id: [recipient.id, secondRecipient.id] } });
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });

  it('gets a log by id', async () => {
    const result = await logById(log.id);
    expect(result.id).toEqual(log.id);
    expect(result.recipients[0].id).toEqual(recipient.id);
    expect(result.userId).toEqual(user.id);
    expect(result.data).toEqual({});
  });

  it('gets logs by recipient Id', async () => {
    const result = await logsByRecipientAndScopes(recipient.id);
    expect(result.count).toEqual(1);
    expect(result.rows[0].id).toEqual(log.id);
  });

  it('gets mulitrecipient logs by recipient Id', async () => {
    await CommunicationLogRecipient.create(
      { communicationLogId: log.id, recipientId: secondRecipient.id },
    );
    const result = await logsByRecipientAndScopes(recipient.id);
    expect(result.count).toEqual(1);
    expect(result.rows[0].id).toEqual(log.id);
    expect(result.rows[0].recipients.length).toEqual(2);
    await CommunicationLogRecipient.destroy({
      where: { communicationLogId: log.id, recipientId: secondRecipient.id },
    });
  });

  it('does not include recipients who have been removed', async () => {
    await CommunicationLogRecipient.create(
      { communicationLogId: log.id, recipientId: secondRecipient.id },
    );
    let result = await logsByRecipientAndScopes(recipient.id);
    expect(result.count).toEqual(1);
    expect(result.rows[0].id).toEqual(log.id);
    expect(result.rows[0].recipients.length).toEqual(2);
    await CommunicationLogRecipient.destroy({
      where: { communicationLogId: log.id, recipientId: secondRecipient.id },
    });
    result = await logsByRecipientAndScopes(recipient.id);
    expect(result.count).toEqual(1);
    expect(result.rows[0].id).toEqual(log.id);
    expect(result.rows[0].recipients.length).toEqual(1);
    expect(result.rows[0].recipients[0].id).toEqual(recipient.id);
  });

  it('gets logs by recipient Id with params', async () => {
    const result = await logsByRecipientAndScopes(
      recipient.id,
      'communicationDate',
      0,
      'DESC',
      10,
    );
    expect(result.count).toEqual(1);
    expect(result.rows[0].id).toEqual(log.id);
  });

  it('gets logs by recipient Id as csv', async () => {
    await csvLogsByRecipientAndScopes(recipient.id);
    expect(stringify).toHaveBeenCalledWith([
      {
        author: user.name,
        communicationDate: '',
        duration: '',
        files: '',
        id: expect.any(Number),
        method: '',
        notes: '',
        purpose: '',
        result: '',
        recipients: expect.any(String),
        goals: '',
        recipientNextSteps: '',
        regionId: '',
        specialistNextSteps: '',
        otherStaff: '',
      },
    ], { header: true, quoted: true, quoted_empty: true });
  });

  it('updates logs', async () => {
    const result = await updateLog(log.id, { foo: 'bar', recipients: [{ value: recipient.id }] });
    expect(result.id).toEqual(log.id);
    expect(result.recipients[0].id).toEqual(recipient.id);
    expect(result.userId).toEqual(user.id);
    expect(result.data).toEqual({ foo: 'bar' });
  });

  it('deletes logs', async () => {
    const file = await File.create({
      originalFileName: 'test.txt',
      key: 'test-key',
      status: 'APPROVED',
      fileSize: 1,
    });
    await CommunicationLogFile.create({
      communicationLogId: log.id,
      fileId: file.id,
    });
    const result = await deleteLog(log.id);
    expect(result).toEqual(1);
    const remainingFiles = await CommunicationLogFile.count({
      where: { communicationLogId: log.id },
    });
    expect(remainingFiles).toEqual(0);
    const remainingRecipients = await CommunicationLogRecipient.count({
      where: { communicationLogId: log.id },
    });
    expect(remainingRecipients).toEqual(0);
  });

  describe('orderLogsBy', () => {
    it('should return the correct result when sortBy is AUTHOR', () => {
      const sortBy = COMMUNICATION_LOG_SORT_KEYS.AUTHOR;
      const sortDir = 'asc';

      const result = orderLogsBy(sortBy, sortDir);

      expect(result).toEqual([
        [sequelize.literal('author.name ASC')],
        [sequelize.literal('(NULLIF(data ->> \'communicationDate\',\'\'))::DATE ASC')],
      ]);
    });

    it('should return the correct result when sortBy is PURPOSE', () => {
      const sortBy = COMMUNICATION_LOG_SORT_KEYS.PURPOSE;
      const sortDir = 'desc';

      const result = orderLogsBy(sortBy, sortDir);

      expect(result).toEqual([
        [sequelize.literal("data->>'purpose' DESC")],
      ]);
    });

    it('should return the correct result when sortBy is RESULT', () => {
      const sortBy = COMMUNICATION_LOG_SORT_KEYS.RESULT;
      const sortDir = 'asc';

      const result = orderLogsBy(sortBy, sortDir);

      expect(result).toEqual([
        [sequelize.literal("data->>'result' ASC")],
      ]);
    });

    it('should return the correct result when sortBy is DATE', () => {
      const sortBy = COMMUNICATION_LOG_SORT_KEYS.DATE;
      const sortDir = 'desc';

      const result = orderLogsBy(sortBy, sortDir);

      expect(result).toEqual(
        [
          [sequelize.literal('(NULLIF(data ->> \'communicationDate\',\'\'))::DATE DESC')],
          [sequelize.col('id'), 'DESC'],
        ],
      );
    });

    it('should return the correct result when sortBy is not provided', () => {
      const sortDir = 'asc';

      const result = orderLogsBy(undefined, sortDir);

      expect(result).toEqual(
        [[sequelize.literal('(NULLIF(data ->> \'communicationDate\',\'\'))::DATE ASC')]],
        [sequelize.col('id'), 'ASC'],
      );
    });

    it('should default to DESC if sortDir is invalid', () => {
      const sortBy = COMMUNICATION_LOG_SORT_KEYS.PURPOSE;
      const sortDir = 'invalid';

      const result = orderLogsBy(sortBy, sortDir);

      expect(result).toEqual([
        [sequelize.literal("data->>'purpose' DESC")],
      ]);
    });

    it('should default to DATE when sortBy is invalid', () => {
      const invalidSortBy = 'INVALID_KEY';
      const sortDir = 'asc';

      const result = orderLogsBy(invalidSortBy, sortDir);

      expect(result).toEqual([
        [sequelize.literal("(NULLIF(data ->> 'communicationDate',''))::DATE ASC")],
        [sequelize.col('id'), 'ASC'],
      ]);
    });
  });

  describe('formatCommunicationDateWithJsonData', () => {
    const badDatesLong = [
      '08/16/24',
      '8/16/24',
      '8/16/2024',
      '08/16//24',
      '8-16-24',
      '08/16/20240.75',
    ];

    const badDatesShort = [
      '08/4/2024',
      '8/4/24',
      '8/4/2024',
      '08/4/24',
    ];

    it.each(badDatesLong)('should return 08/16/2024 when the date is %s', (date) => {
      expect(formatCommunicationDateWithJsonData({ communicationDate: date })).toEqual({ communicationDate: '08/16/2024' });
    });

    it.each(badDatesShort)('should return 08/04/2024 when the date is %s', (date) => {
      expect(formatCommunicationDateWithJsonData({ communicationDate: date })).toEqual({ communicationDate: '08/04/2024' });
    });
  });
});

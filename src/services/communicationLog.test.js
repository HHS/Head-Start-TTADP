import stringify from 'csv-stringify/lib/sync';
import { expect } from '@playwright/test';
import db, { User, Recipient, CommunicationLog } from '../models';
import {
  logById,
  logsByRecipientAndScopes,
  csvLogsByRecipientAndScopes,
  deleteLog,
  updateLog,
  createLog,
  orderLogsBy,
} from './communicationLog';
import { createRecipient, createUser } from '../testUtils';

jest.mock('csv-stringify/lib/sync');

const { sequelize } = db;

describe('communicationLog services', () => {
  let user;
  let recipient;
  let log;

  beforeAll(async () => {
    user = await createUser();
    recipient = await createRecipient({});
    log = await createLog(recipient.id, user.id, {});
  });

  afterAll(async () => {
    await CommunicationLog.destroy({ where: { userId: user.id } });
    await Recipient.destroy({ where: { id: recipient.id } });
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });

  it('gets a log by id', async () => {
    const result = await logById(log.id);
    expect(result.id).toEqual(log.id);
    expect(result.recipientId).toEqual(recipient.id);
    expect(result.userId).toEqual(user.id);
    expect(result.data).toEqual({});
  });

  it('gets logs by recipient Id', async () => {
    const result = await logsByRecipientAndScopes(recipient.id);
    expect(result.count).toEqual(1);
    expect(result.rows[0].id).toEqual(log.id);
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
      },
    ], { header: true, quoted: true, quoted_empty: true });
  });

  it('updates logs', async () => {
    const result = await updateLog(log.id, { foo: 'bar' });
    expect(result.id).toEqual(log.id);
    expect(result.recipientId).toEqual(recipient.id);
    expect(result.userId).toEqual(user.id);
    expect(result.data).toEqual({ foo: 'bar' });
  });

  it('deletes logs', async () => {
    const result = await deleteLog(log.id);
    expect(result).toEqual(1);
  });

  describe('orderLogsBy', () => {
    it('should return the correct result when sortBy is authorName', () => {
      const sortBy = 'authorName';
      const sortDir = 'asc';

      const result = orderLogsBy(sortBy, sortDir);

      expect(result).toEqual([
        [sequelize.literal('author.name asc')],
        ['data.communicationDate', 'asc'],
      ]);
    });

    it('should return the correct result when sortBy is purpose', () => {
      const sortBy = 'purpose';
      const sortDir = 'desc';

      const result = orderLogsBy(sortBy, sortDir);

      expect(result).toEqual([
        ['data.purpose', 'desc'],
        ['data.communicationDate', 'desc'],
      ]);
    });

    it('should return the correct result when sortBy is result', () => {
      const sortBy = 'result';
      const sortDir = 'asc';

      const result = orderLogsBy(sortBy, sortDir);

      expect(result).toEqual([
        ['data.result', 'asc'],
        ['data.communicationDate', 'asc'],
      ]);
    });

    it('should return the correct result when sortBy is communicationDate', () => {
      const sortBy = 'communicationDate';
      const sortDir = 'desc';

      const result = orderLogsBy(sortBy, sortDir);

      expect(result).toEqual([['data.communicationDate', 'desc']]);
    });

    it('should return the correct result when sortBy is not provided', () => {
      const sortDir = 'asc';

      const result = orderLogsBy(undefined, sortDir);

      expect(result).toEqual([['data.communicationDate', 'asc']]);
    });
  });
});

import db, { User, Recipient, CommunicationLog } from '../models';
import {
  logById,
  logsByRecipientAndScopes,
  deleteLog,
  updateLog,
  createLog,
} from './communicationLog';
import { createRecipient, createUser } from '../testUtils';

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
    expect(result.length).toEqual(1);
    expect(result[0].id).toEqual(log.id);
  });

  it('updates logs', async () => {
    const result = await updateLog(log.id, { data: { foo: 'bar' } });
    expect(result.id).toEqual(log.id);
    expect(result.recipientId).toEqual(recipient.id);
    expect(result.userId).toEqual(user.id);
    expect(result.data).toEqual({ foo: 'bar' });
  });

  it('deletes logs', async () => {
    const result = await deleteLog(log.id);
    expect(result).toEqual(1);
  });
});

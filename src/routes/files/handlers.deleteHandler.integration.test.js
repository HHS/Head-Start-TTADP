import { FILE_STATUSES } from '../../constants';
import db, { CommunicationLog, CommunicationLogFile, File, User } from '../../models';
import { currentUserId } from '../../services/currentUser';
import { addDeleteFileToQueue } from '../../services/s3Queue';
import { createUser } from '../../testUtils';
import transactionWrapper from '../transactionWrapper';
import { deleteHandler } from './handlers';

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));
jest.mock('../../services/s3Queue', () => ({
  addDeleteFileToQueue: jest.fn(),
}));

// Exercises the real models, their hooks and transactionWrapper's commit and rollback.
describe('deleteHandler with the database', () => {
  let user;
  let logA;
  let logB;
  let file;

  const mockRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    json: jest.fn(),
    end: jest.fn(),
  });

  const linkIds = async () =>
    (await CommunicationLogFile.findAll({ where: { fileId: file.id } }))
      .map((l) => l.communicationLogId)
      .sort();

  beforeAll(async () => {
    user = await createUser();
    currentUserId.mockResolvedValue(user.id);
    [logA, logB] = await Promise.all([
      CommunicationLog.create({ userId: user.id, data: { note: 'delete handler test A' } }),
      CommunicationLog.create({ userId: user.id, data: { note: 'delete handler test B' } }),
    ]);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    currentUserId.mockResolvedValue(user.id);
    file = await File.create({
      originalFileName: 'delete-handler-test.txt',
      key: `delete-handler-test-${Date.now()}.txt`,
      status: FILE_STATUSES.APPROVED,
      fileSize: 10,
    });
    await CommunicationLogFile.bulkCreate([
      { communicationLogId: logA.id, fileId: file.id },
      { communicationLogId: logB.id, fileId: file.id },
    ]);
  });

  afterEach(async () => {
    await CommunicationLogFile.destroy({ where: { fileId: file.id }, individualHooks: false });
    await File.destroy({ where: { id: file.id }, individualHooks: false });
  });

  afterAll(async () => {
    await CommunicationLog.destroy({ where: { id: [logA.id, logB.id] } });
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });

  const remove = (communicationLogId) =>
    transactionWrapper(deleteHandler)(
      { params: { communicationLogId: String(communicationLogId), fileId: String(file.id) } },
      mockRes()
    );

  it('refuses to delete an unrelated file through a log the user owns', async () => {
    const unrelated = await File.create({
      originalFileName: 'unrelated.txt',
      key: `unrelated-${Date.now()}.txt`,
      status: FILE_STATUSES.APPROVED,
      fileSize: 10,
    });
    const res = mockRes();

    try {
      await transactionWrapper(deleteHandler)(
        { params: { communicationLogId: String(logA.id), fileId: String(unrelated.id) } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(await File.findByPk(unrelated.id)).not.toBeNull();
      expect(addDeleteFileToQueue).not.toHaveBeenCalled();
    } finally {
      await File.destroy({ where: { id: unrelated.id }, individualHooks: false });
    }
  });

  it('keeps a file that is still linked elsewhere and queues no S3 delete', async () => {
    await remove(logA.id);

    expect(await linkIds()).toEqual([logB.id]);
    expect(await File.findByPk(file.id)).not.toBeNull();
    expect(addDeleteFileToQueue).not.toHaveBeenCalled();
  });

  it('deletes the file and queues one S3 delete once the last link is removed', async () => {
    await remove(logA.id);
    await remove(logB.id);

    expect(await linkIds()).toEqual([]);
    expect(await File.findByPk(file.id)).toBeNull();
    expect(addDeleteFileToQueue).toHaveBeenCalledTimes(1);
    expect(addDeleteFileToQueue).toHaveBeenCalledWith(file.id, file.key, expect.any(Number));
  });

  it('leaves the file and its S3 object alone when the transaction rolls back', async () => {
    await remove(logA.id);
    jest.clearAllMocks();

    const res = mockRes();
    const failAfterDelete = async (req, response) => {
      await deleteHandler(req, response);
      throw new Error('fail after delete');
    };
    await transactionWrapper(failAfterDelete)(
      { params: { communicationLogId: String(logB.id), fileId: String(file.id) } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(await linkIds()).toEqual([logB.id]);
    expect(await File.findByPk(file.id)).not.toBeNull();
    expect(addDeleteFileToQueue).not.toHaveBeenCalled();
  });
});

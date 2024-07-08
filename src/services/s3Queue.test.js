import Queue from 'bull';
import { addDeleteFileToQueue, s3Queue } from './s3Queue';
import { FILE_STATUSES } from '../constants';
import db, { File } from '../models';

jest.mock('bull');

describe('s3 queue manager tests', () => {
  let file;
  const mockPassword = 'SUPERSECUREPASSWORD';
  const originalEnv = process.env;

  beforeAll(async () => {
    process.env.REDIS_PASS = mockPassword;
    file = await File.create({
      originalFileName: 'file-for-s3-delete.xlsx',
      key: 'file-for-s3-delete.xlsx',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 123445,
    });
    jest.spyOn(s3Queue, 'add').mockImplementation(() => jest.fn());
  });

  afterAll(async () => {
    await File.destroy({ where: { id: file.id } });
    await db.sequelize.close();
    process.env = originalEnv;
  });

  beforeEach(() => {
    Queue.mockImplementation(() => s3Queue);
  });

  it('test schedule delete file', async () => {
    addDeleteFileToQueue(file.id, file.key);
    expect(s3Queue.add).toHaveBeenCalled();
  });

  it('calls s3.add', async () => {
    addDeleteFileToQueue(file.id, file.key);
    expect(Queue).toHaveBeenCalledWith('s3', 'redis://undefined:6379', expect.objectContaining({
      maxRetriesPerRequest: 50,
      redis: { password: mockPassword },
      retryStrategy: expect.any(Function),
    }));
    expect(s3Queue.add).toHaveBeenCalled();
  });
});

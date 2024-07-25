import Queue from 'bull';
import { addDeleteFileToQueue, s3Queue } from './s3Queue';
import { FILE_STATUSES, S3_ACTIONS } from '../constants';
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('test schedule delete file', async () => {
    await addDeleteFileToQueue(file.id, file.key);
    expect(s3Queue.add).toHaveBeenCalled();
  });

  it('calls s3.add', async () => {
    await addDeleteFileToQueue(file.id, file.key);
    expect(s3Queue.add).toHaveBeenCalledWith(
      S3_ACTIONS.DELETE_FILE,
      {
        fileId: file.id,
        fileKey: file.key,
        key: S3_ACTIONS.DELETE_FILE,
      },
    );
  });
});

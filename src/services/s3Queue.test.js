import Queue from 'bull';
import { addDeleteFileToQueue, s3Queue } from './s3Queue';
import { FILE_STATUSES } from '../constants';
import db, { File } from '../models';

jest.mock('bull');

describe('s3 queue manager tests', () => {
  let file;
  beforeAll(async () => {
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
  });

  it('test schedule delete file', async () => {
    addDeleteFileToQueue(
      file.id,
      file.key,
    );
    expect(s3Queue.add).toHaveBeenCalled();
  });

  it('calls s3.add', async () => {
    addDeleteFileToQueue(
      file.id,
      file.key,
    );
    expect(Queue).toHaveBeenCalledWith('s3', 'redis://undefined:6379', { redis: { password: undefined } });
    expect(s3Queue.add).toHaveBeenCalled();
  });
});

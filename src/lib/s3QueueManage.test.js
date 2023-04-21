import { s3Queue, deleteFileJob } from './s3QueueManager';
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
    jest.spyOn(s3Queue, 'add').mockImplementation(async () => Promise.resolve());
  });
  afterAll(async () => {
    await File.destroy({ where: { id: file.id } });
    await db.sequelize.close();
  });

  it('test schedule delete file', async () => {
    await deleteFileJob(
      file.id,
      file.key,
    );
    expect(s3Queue.add).toHaveBeenCalled();
  });
});

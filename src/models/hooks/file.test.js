import {
  sequelize,
  File,
} from '..';
import { addDeleteFileToQueue } from '../../services/s3Queue';
import { FILE_STATUSES } from '../../constants';

jest.mock('bull');

jest.mock('../../services/s3Queue', () => ({
  addDeleteFileToQueue: jest.fn(),
}));

describe('file hooks', () => {
  let file;
  const fileName = 'file-for-s3-hook-delete.xlsx';

  beforeAll(async () => {
    file = await File.create({
      originalFileName: fileName,
      key: fileName,
      status: FILE_STATUSES.UPLOADED,
      fileSize: 123445,
    });
  });

  afterAll(async () => {
    await File.destroy({ where: { id: file.id } });
    await sequelize.close();
  });
  describe('afterDestroy', () => {
    it('should queue s3 delete', async () => {
      await File.destroy({
        where: { id: file.id },
        individualHooks: true,
      });
      await expect(addDeleteFileToQueue).toHaveBeenCalledWith(file.id, fileName);
    });
  });
});

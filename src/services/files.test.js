import { faker } from '@faker-js/faker';
import { FILE_STATUSES } from '../constants';
import db, { File } from '../models';
import {
  createFileMetaData,
  markFilesQueuedForScan,
  queueFilesForScan,
  updateStatusByKey,
} from './files';
import addToScanQueue from './scanQueue';

jest.mock('./scanQueue', () => jest.fn());

describe('files service', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('updateStatusByKey', () => {
    const key = 'file123';
    const fileStatus = 'processed';
    const mockUpdatedFile = {
      dataValues: {
        key,
        status: fileStatus,
      },
      toJSON: () => ({
        key,
        status: fileStatus,
      }),
    };

    // Assuming File.update is a Sequelize method, we need to spy on it instead of mocking
    const updateSpy = jest.spyOn(File, 'update');

    beforeEach(() => {
      updateSpy.mockClear();
    });

    afterAll(() => {
      updateSpy.mockRestore();
    });

    it('should update the file status and return the updated file object', async () => {
      updateSpy.mockResolvedValue([1, [mockUpdatedFile]]); // Mocking sequelize update response

      const result = await updateStatusByKey(key, fileStatus);

      expect(updateSpy).toHaveBeenCalledWith(
        { status: fileStatus },
        { where: { key }, individualHooks: true }
      );
      expect(result).toEqual(mockUpdatedFile.toJSON());
    });

    it('should throw an error when the update operation fails', async () => {
      const mockError = new Error('Update failed');
      updateSpy.mockRejectedValue(mockError);

      await expect(updateStatusByKey(key, fileStatus)).rejects.toEqual(mockError);

      expect(updateSpy).toHaveBeenCalledWith(
        { status: fileStatus },
        { where: { key }, individualHooks: true }
      );
    });

    it('should handle the case when no file is updated', async () => {
      updateSpy.mockResolvedValue([0, []]); // No files updated

      const result = await updateStatusByKey(key, fileStatus);

      expect(updateSpy).toHaveBeenCalledWith(
        { status: fileStatus },
        { where: { key }, individualHooks: true }
      );
      // Depending on the actual behavior, this might need to be adjusted
      // If the function is supposed to return undefined or an empty object when no file is updated
      expect(result).toEqual(undefined);
    });
  });

  describe('createFileMetaData', () => {
    let filesForCreateFileMetaData;
    beforeAll(async () => {
      filesForCreateFileMetaData = await Promise.all([
        File.create({
          originalFileName: 'test.pdf',
          key: faker.string.uuid(),
          status: 'APPROVED',
          fileSize: 12345,
        }),
      ]);
    });

    afterAll(async () => {
      await File.destroy({
        where: {
          id: filesForCreateFileMetaData.map((file) => file.id),
        },
      });
    });

    it('creates a file where needed', async () => {
      const newFile = await createFileMetaData('test2.pdf', faker.string.uuid(), 99);
      filesForCreateFileMetaData = [...filesForCreateFileMetaData, newFile];
      expect(newFile.originalFileName).toBe('test2.pdf');
    });

    it('returns an existing file', async () => {
      const [existingFile] = filesForCreateFileMetaData;

      const newFile = await createFileMetaData(
        existingFile.originalFileName,
        existingFile.key,
        existingFile.fileSize
      );

      expect(newFile.id).toEqual(existingFile.id);
    });
  });

  describe('scan queueing', () => {
    let files;

    beforeEach(async () => {
      addToScanQueue.mockReset();
      files = await Promise.all([
        File.create({
          originalFileName: 'scan1.pdf',
          key: `${faker.string.uuid()}.pdf`,
          status: FILE_STATUSES.UPLOADED,
          fileSize: 1,
        }),
        File.create({
          originalFileName: 'scan2.pdf',
          key: `${faker.string.uuid()}.pdf`,
          status: FILE_STATUSES.UPLOADED,
          fileSize: 1,
        }),
      ]);
    });

    afterEach(async () => {
      await File.destroy({ where: { id: files.map((file) => file.id) } });
    });

    // statuses in the same order as `files`
    const statuses = async () =>
      Promise.all(files.map(async (file) => (await File.findByPk(file.id)).status));

    it('markFilesQueuedForScan marks every file QUEUED', async () => {
      await markFilesQueuedForScan(files);

      expect(await statuses()).toEqual([FILE_STATUSES.QUEUED, FILE_STATUSES.QUEUED]);
    });

    it('queueFilesForScan adds a scan job for each file', async () => {
      await queueFilesForScan(files);

      expect(addToScanQueue).toHaveBeenCalledTimes(2);
      expect(addToScanQueue).toHaveBeenCalledWith({ key: files[0].key });
      expect(addToScanQueue).toHaveBeenCalledWith({ key: files[1].key });
      expect(await statuses()).toEqual([FILE_STATUSES.UPLOADED, FILE_STATUSES.UPLOADED]);
    });

    it('queueFilesForScan marks only the files that fail to queue QUEUEING_FAILED', async () => {
      addToScanQueue.mockImplementation(async ({ key }) => {
        if (key === files[1].key) {
          throw new Error('redis unavailable');
        }
      });

      await queueFilesForScan(files);

      expect(await statuses()).toEqual([FILE_STATUSES.UPLOADED, FILE_STATUSES.QUEUEING_FAILED]);
    });
  });
});

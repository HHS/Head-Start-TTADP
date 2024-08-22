import faker from '@faker-js/faker';
import db, {
  File,
  Objective,
} from '../models';
import {
  updateStatusByKey,
  createFileMetaData,
} from './files';

describe('files service', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  test('Dummy test to satisfy Jest', () => {
    /*
    * Jest 27 Introduction:
    *   The update to Jest 27 introduced stricter rules to prevent situations where beforeAll
    *   and afterAll hooks are used in describe blocks that do not contain any tests. This
    *   prevents potential confusion and ensures that all setup and teardown logic is tied to
    *   specific tests
    *   (GitHub: https://github.com/jestjs/jest/issues/11485)
    *   (Jest: https://jestjs.io/blog/2021/05/25/jest-27)
    */

    expect(true).toBe(true);
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
        { where: { key }, individualHooks: true },
      );
      expect(result).toEqual(mockUpdatedFile.toJSON());
    });

    it('should throw an error when the update operation fails', async () => {
      const mockError = new Error('Update failed');
      updateSpy.mockRejectedValue(mockError);

      await expect(updateStatusByKey(key, fileStatus)).rejects.toEqual(mockError);

      expect(updateSpy).toHaveBeenCalledWith(
        { status: fileStatus },
        { where: { key }, individualHooks: true },
      );
    });

    it('should handle the case when no file is updated', async () => {
      updateSpy.mockResolvedValue([0, []]); // No files updated

      const result = await updateStatusByKey(key, fileStatus);

      expect(updateSpy).toHaveBeenCalledWith(
        { status: fileStatus },
        { where: { key }, individualHooks: true },
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
          key: faker.datatype.uuid(),
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
      const newFile = await createFileMetaData('test2.pdf', faker.datatype.uuid(), 99);
      filesForCreateFileMetaData = [...filesForCreateFileMetaData, newFile];
      expect(newFile.originalFileName).toBe('test2.pdf');
    });

    it('returns an existing file', async () => {
      const [existingFile] = filesForCreateFileMetaData;

      const newFile = await createFileMetaData(
        existingFile.originalFileName,
        existingFile.key,
        existingFile.fileSize,
      );

      expect(newFile.id).toEqual(existingFile.id);
    });
  });
});

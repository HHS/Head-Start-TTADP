import { faker } from '@faker-js/faker';
import { FILE_STATUSES } from '../constants';
import db, { CommunicationLog, CommunicationLogFile, File, User } from '../models';
import { createUser } from '../testUtils';
import {
  createFileMetaData,
  fileHasReferences,
  markFilesQueuedForScan,
  queueFilesForScan,
  removeOrphanedFiles,
  updateStatusByKey,
} from './files';
import { addDeleteFileToQueue } from './s3Queue';
import addToScanQueue from './scanQueue';

jest.mock('./scanQueue', () => jest.fn());
jest.mock('./s3Queue', () => ({
  addDeleteFileToQueue: jest.fn(),
}));

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

  describe('fileHasReferences', () => {
    const unreferenced = {
      reportFiles: [],
      reportObjectiveFiles: [],
      sessionFiles: [],
      communicationLogFiles: [],
      supportingAttachments: [],
      importFile: null,
    };

    it('is false when no association holds the file', () => {
      expect(fileHasReferences(unreferenced)).toBe(false);
    });

    it.each([
      ['reportFiles', [{ id: 1 }]],
      ['reportObjectiveFiles', [{ id: 1 }]],
      ['sessionFiles', [{ id: 1 }]],
      ['communicationLogFiles', [{ id: 1 }]],
      ['supportingAttachments', [{ id: 1 }]],
      ['importFile', { id: 1 }],
    ])('is true when %s references the file', (association, value) => {
      expect(fileHasReferences({ ...unreferenced, [association]: value })).toBe(true);
    });

    it('treats an association that was not loaded as a reference', () => {
      const { communicationLogFiles: _omitted, ...partial } = unreferenced;
      expect(fileHasReferences(partial)).toBe(true);
    });
  });

  describe('removeOrphanedFiles', () => {
    let user;
    let log;
    const createdFileIds = [];

    const makeFile = async (linked = false) => {
      const file = await File.create({
        originalFileName: 'orphan-test.txt',
        key: `orphan-test-${faker.string.uuid()}.txt`,
        status: FILE_STATUSES.APPROVED,
        fileSize: 10,
      });
      createdFileIds.push(file.id);
      if (linked) {
        await CommunicationLogFile.create({ communicationLogId: log.id, fileId: file.id });
      }
      return file;
    };

    beforeAll(async () => {
      user = await createUser();
      log = await CommunicationLog.create({ userId: user.id, data: { note: 'orphan test' } });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await CommunicationLogFile.destroy({ where: { fileId: createdFileIds } });
      await File.destroy({ where: { id: createdFileIds } });
      await CommunicationLog.destroy({ where: { id: log.id } });
      await User.destroy({ where: { id: user.id } });
    });

    it('deletes an unreferenced file and queues its S3 delete only after commit', async () => {
      const file = await makeFile();

      await db.sequelize.transaction(async () => {
        expect(await removeOrphanedFiles([file.id, file.id, null])).toEqual([file.id]);
        expect(addDeleteFileToQueue).not.toHaveBeenCalled();
      });

      expect(await File.findByPk(file.id)).toBeNull();
      expect(addDeleteFileToQueue).toHaveBeenCalledTimes(1);
      expect(addDeleteFileToQueue).toHaveBeenCalledWith(file.id, file.key);
    });

    it('keeps a file that is still referenced', async () => {
      const file = await makeFile(true);

      await db.sequelize.transaction(async () => {
        expect(await removeOrphanedFiles([file.id])).toEqual([]);
      });

      expect(await File.findByPk(file.id)).not.toBeNull();
      expect(addDeleteFileToQueue).not.toHaveBeenCalled();
    });

    it('keeps the file and queues nothing when the transaction rolls back', async () => {
      const file = await makeFile();

      await expect(
        db.sequelize.transaction(async () => {
          await removeOrphanedFiles([file.id]);
          throw new Error('roll back');
        })
      ).rejects.toThrow('roll back');

      expect(await File.findByPk(file.id)).not.toBeNull();
      expect(addDeleteFileToQueue).not.toHaveBeenCalled();
    });

    it('keeps a file when a concurrent link commits during cleanup', async () => {
      const file = await makeFile();
      const linking = await db.sequelize.transaction();
      let cleanup;
      try {
        await CommunicationLogFile.create(
          { communicationLogId: log.id, fileId: file.id },
          { transaction: linking }
        );
        // PostgreSQL cannot grant cleanup's row lock until the link transaction completes.
        let started;
        const locking = new Promise((resolve) => {
          started = resolve;
        });
        const findAll = File.findAll.bind(File);
        const spy = jest.spyOn(File, 'findAll').mockImplementation((options) => {
          if (options.lock) started();
          return findAll(options);
        });
        try {
          cleanup = removeOrphanedFiles([file.id]);
          await Promise.race([locking, cleanup]);
        } finally {
          spy.mockRestore();
        }
        await linking.commit();
      } finally {
        if (!linking.finished) await linking.rollback();
      }
      expect(await cleanup).toEqual([]);
      expect(await File.findByPk(file.id)).not.toBeNull();
      expect(addDeleteFileToQueue).not.toHaveBeenCalled();
    });

    it('waits for the outermost transaction when called inside a savepoint', async () => {
      const file = await makeFile();

      await db.sequelize.transaction(async (outer) => {
        await db.sequelize.transaction({ transaction: outer }, async (savepoint) => {
          await removeOrphanedFiles([file.id], { transaction: savepoint });
        });
        expect(addDeleteFileToQueue).not.toHaveBeenCalled();
      });

      expect(addDeleteFileToQueue).toHaveBeenCalledWith(file.id, file.key);
    });

    it('does not queue a delete when a savepoint rolls back but its parent commits', async () => {
      const file = await makeFile();
      await db.sequelize.transaction(async (outer) => {
        await expect(
          db.sequelize.transaction({ transaction: outer }, async (savepoint) => {
            await removeOrphanedFiles([file.id], { transaction: savepoint });
            throw new Error('roll back savepoint');
          })
        ).rejects.toThrow('roll back savepoint');
      });
      expect(await File.findByPk(file.id)).not.toBeNull();
      expect(addDeleteFileToQueue).not.toHaveBeenCalled();
    });

    it('queues the S3 delete right away when there is no transaction', async () => {
      const file = await makeFile();

      await removeOrphanedFiles([file.id]);

      expect(await File.findByPk(file.id)).toBeNull();
      expect(addDeleteFileToQueue).toHaveBeenCalledWith(file.id, file.key);
    });

    it('hands the S3 delete to a caller-supplied afterCommit', async () => {
      const file = await makeFile();
      const callbacks = [];

      await removeOrphanedFiles([file.id], { afterCommit: (cb) => callbacks.push(cb) });

      expect(addDeleteFileToQueue).not.toHaveBeenCalled();
      expect(callbacks).toHaveLength(1);
      await callbacks[0]();
      expect(addDeleteFileToQueue).toHaveBeenCalledWith(file.id, file.key);
    });
  });
});

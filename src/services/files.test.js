import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import db, {
  File,
  Objective,
  ObjectiveFile,
} from '../models';
import {
  createFileMetaData,
  createObjectivesFileMetaData,
} from './files';

describe('files service', () => {
  afterAll(async () => {
    await db.sequelize.close();
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
        individualHooks: true,
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

  describe('createObjectiveFileMetaData', () => {
    let objective;

    let filesForObjectiveFileMetaData;
    beforeAll(async () => {
      objective = await Objective.create({
        title: 'A brand new test objective',
        status: 'Not Started',
      });

      filesForObjectiveFileMetaData = await Promise.all([
        File.create({
          originalFileName: 'test.pdf',
          key: faker.datatype.uuid(),
          status: 'APPROVED',
          fileSize: 12345,
        }),
      ]);
    });

    afterAll(async () => {
      await ObjectiveFile.destroy({
        where: {
          [Op.or]: [
            {
              objectiveId: objective.id,
            },
            {
              fileId: filesForObjectiveFileMetaData.map((file) => file.id),
            },
          ],
        },
        individualHooks: true,
      });

      await Objective.destroy({
        where: {
          id: objective.id,
        },
        individualHooks: true,
      });

      await File.destroy({
        where: {
          id: filesForObjectiveFileMetaData.map((file) => file.id),
        },
        individualHooks: true,
      });
    });

    it('creates a file where needed', async () => {
      const newFile = await createObjectivesFileMetaData('test2.pdf', faker.datatype.uuid(), [objective.id], 99);
      filesForObjectiveFileMetaData = [...filesForObjectiveFileMetaData, newFile];

      const objectiveFiles = await ObjectiveFile.findAll({
        where: {
          objectiveId: objective.id,
          fileId: newFile.id,
        },
      });

      expect(objectiveFiles.length).toBe(1);

      expect(newFile.originalFileName).toBe('test2.pdf');
    });

    it('returns an existing file', async () => {
      const [existingFile] = filesForObjectiveFileMetaData;

      const newFile = await createObjectivesFileMetaData(
        existingFile.originalFileName,
        existingFile.key,
        [objective.id],
        existingFile.fileSize,
      );

      const objectiveFiles = await ObjectiveFile.findAll({
        where: {
          objectiveId: objective.id,
          fileId: newFile.id,
        },
      });

      expect(objectiveFiles.length).toBe(1);

      expect(newFile.id).toEqual(existingFile.id);
    });
  });
});

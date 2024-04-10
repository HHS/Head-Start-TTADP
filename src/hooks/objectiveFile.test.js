import {
  sequelize,
} from '../models';
import {
  beforeValidate,
  checkForUseOnApprovedReport,
} from './objectiveFile';
import { fileGenerator, objectiveTemplateGenerator } from './testHelpers';
import { CURATED_CREATION } from '../constants';

describe('objectiveFile hooks', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  describe('propagateCreateToTemplate', () => {
    let objectiveTemplate;
    let objective;
    let file;
    let objectiveFile;

    beforeAll(async () => {
      const transaction = await sequelize.transaction();
      objectiveTemplate = await sequelize.models.ObjectiveTemplate.create(
        objectiveTemplateGenerator(),
        { transaction, individualHooks: true },
      );
      objective = await sequelize.models.Objective.create({
        title: 'test',
        objectiveTemplateId: objectiveTemplate.id,
      }, { transaction, individualHooks: true });
      file = await sequelize.models.File.create(
        fileGenerator(),
        { transaction, individualHooks: true },
      );
      objectiveFile = await sequelize.models.ObjectiveFile.create({
        objectiveId: objective.id,
        fileId: file.id,
      }, { transaction, individualHooks: true });
      await transaction.commit();
    });

    it('propagates', async () => {
      const otf = await sequelize.models.ObjectiveTemplateFile.findOne({
        where: {
          objectiveTemplateId: objectiveTemplate.id,
          fileId: objectiveFile.fileId,
        },
      });

      expect(otf).not.toBeNull();
    });

    afterAll(async () => {
      await sequelize.models.ObjectiveTemplateFile.destroy({
        where: {
          objectiveTemplateId: objectiveTemplate.id,
        },
      });
      await sequelize.models.ObjectiveFile.destroy({
        where: {
          id: objectiveFile.id,
        },
      });
      await sequelize.models.Objective.destroy({
        where: {
          id: objective.id,
        },
        force: true,
      });
      await sequelize.models.ObjectiveTemplate.destroy({
        where: {
          id: objectiveTemplate.id,
        },
      });
    });
  });
  describe('cleanupOrphanFiles', () => {
    let objectiveTemplate;
    let objective;
    let file;
    let objectiveFile;

    beforeAll(async () => {
      const transaction = await sequelize.transaction();
      objectiveTemplate = await sequelize.models.ObjectiveTemplate.create(
        {
          templateTitle: 'Objective Template for Orphan File Test',
          hash: 'objective-template-for-orphan-file-test',
          regionId: 1,
          creationMethod: CURATED_CREATION,
        },
        { transaction, individualHooks: true },
      );
      objective = await sequelize.models.Objective.create({
        title: 'Objective for Orphan File Test',
        objectiveTemplateId: objectiveTemplate.id,
      }, { transaction, individualHooks: true });
      file = await sequelize.models.File.create(
        fileGenerator(),
        { transaction, individualHooks: true },
      );
      objectiveFile = await sequelize.models.ObjectiveFile.create({
        objectiveId: objective.id,
        fileId: file.id,
      }, { transaction, individualHooks: true });
      await transaction.commit();
    });

    it('clean up orphan file', async () => {
      await sequelize.models.ObjectiveFile.destroy({
        where: { objectiveId: objective.id },
        individualHooks: true,
      });
      const deletedFile = await sequelize.models.File.findOne({
        where: {
          id: objectiveFile.id,
        },
      });
      expect(deletedFile).toBeNull();
    });

    afterAll(async () => {
      await sequelize.models.ObjectiveFile.destroy({
        where: {
          id: objectiveFile.id,
        },
      });
      await sequelize.models.Objective.destroy({
        where: {
          id: objective.id,
        },
        force: true,
      });
      await sequelize.models.ObjectiveTemplate.destroy({
        where: {
          id: objectiveTemplate.id,
        },
      });
    });
  });
  describe('beforeValidate', () => {
    it('beforeValidate', async () => {
      const instance = {
      };
      instance.set = (name, value) => { instance[name] = value; };
      const options = {};
      beforeValidate({}, instance, options);
      expect(instance.onAR).toBe(false);
      expect(instance.onApprovedAR).toBe(false);
      expect(options.fields.sort()).toStrictEqual(['onAR', 'onApprovedAR'].sort());
    });
  });

  describe('checkForUseOnApprovedReport', () => {
    it('should throw an error if the file is used on an approved report', async () => {
      const transaction = await sequelize.transaction();
      const objective = await sequelize.models.Objective.create({
        title: 'test',
        onApprovedAR: true,
      }, { transaction });

      const mockInstance = {
        objectiveId: objective.id,
      };
      const mockOptions = {
        transaction,
      };

      await expect(checkForUseOnApprovedReport(sequelize, mockInstance, mockOptions)).rejects.toThrow('File cannot be removed, used on approved report.');
      await transaction.commit();

      await sequelize.models.Objective.destroy({
        where: {
          id: objective.id,
        },
        force: true,
      });
    });
    it('should not throw an error if the file is not used on an approved report', async () => {
      const transaction = await sequelize.transaction();
      const objective = await sequelize.models.Objective.create({
        title: 'test',
        onApprovedAR: false,
      }, { transaction });

      const mockInstance = {
        objectiveId: objective.id,
      };
      const mockOptions = {
        transaction,
      };

      await expect(
        checkForUseOnApprovedReport(sequelize, mockInstance, mockOptions),
      ).resolves.toBeUndefined();
      await transaction.commit();

      await sequelize.models.Objective.destroy({
        where: {
          id: objective.id,
        },
        force: true,
      });
    });
  });
});

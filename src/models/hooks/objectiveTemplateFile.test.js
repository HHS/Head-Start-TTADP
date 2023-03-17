import {
  sequelize,
  Objective,
  ObjectiveTemplate,
  File,
} from '..';

import { OBJECTIVE_STATUS } from '../../constants';
import {
  afterCreate,
  checkForUseOnApprovedReport,
} from './objectiveTemplateFile';
import { objectiveTemplateGenerator, fileGenerator } from './testHelpers';

describe('objectiveTemplateFile hooks', () => {
  describe('afterCreate', () => {
    afterEach(() => jest.clearAllMocks());
    it('won\'t call update if no objective is found', async () => {
      const transaction = await sequelize.transaction();

      const objectiveTemplate = await ObjectiveTemplate.create(
        objectiveTemplateGenerator('should update the objective template updatedAt field'),
        { transaction },
      );

      const { updatedAt } = objectiveTemplate;

      const objective = await Objective.create({
        title: 'test',
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        objectiveTemplateId: objectiveTemplate.id,
      }, { transaction });

      const objectiveId = objective.id;

      // delete the id so that the objective is not found, but
      // is reserved so we don't sweat test collisions
      await objective.destroy({ transaction });

      const file = await File.create(
        fileGenerator(),
        { transaction },
      );

      const mockInstance = {
        objectiveId,
        objective: {
          objectiveTemplateId: objectiveTemplate.id,
        },
        fileId: file.id,
      };
      const mockOptions = {
        transaction,
      };

      await afterCreate(sequelize, mockInstance, mockOptions);

      const updatedObjectiveTemplate = await ObjectiveTemplate.findOne({
        where: { id: objectiveTemplate.id },
        transaction,
      });

      expect(updatedObjectiveTemplate.updatedAt).toEqual(updatedAt);

      await transaction.rollback();
    });
  });

  describe('checkForUseOnApprovedReport', () => {
    it('should throw an error if the file is used on an approved report', async () => {
      const transaction = await sequelize.transaction();

      const objectiveTemplate = await ObjectiveTemplate.create(
        objectiveTemplateGenerator('should update the objective template updatedAt field'),
        { transaction },
      );

      await Objective.create({
        title: 'test',
        objectiveTemplateId: objectiveTemplate.id,
        onApprovedAR: true,
      }, { transaction });

      const mockInstance = {
        objectiveTemplateId: objectiveTemplate.id,
      };
      const mockOptions = {
        transaction,
      };

      await expect(checkForUseOnApprovedReport(sequelize, mockInstance, mockOptions)).rejects.toThrow('File cannot be removed, used on approved report.');

      await transaction.rollback();
    });
    it('should not throw an error if the file is not used on an approved report', async () => {
      const transaction = await sequelize.transaction();

      const objectiveTemplate = await ObjectiveTemplate.create(
        objectiveTemplateGenerator('should update the objective template updatedAt field'),
        { transaction },
      );

      await Objective.create({
        title: 'test',
        objectiveTemplateId: objectiveTemplate.id,
        onApprovedAR: false,
      }, { transaction });

      const mockInstance = {
        objectiveTemplateId: objectiveTemplate.id,
      };
      const mockOptions = {
        transaction,
      };

      await expect(
        checkForUseOnApprovedReport(sequelize, mockInstance, mockOptions),
      ).resolves.toBeUndefined();

      await transaction.rollback();
    });
  });
});

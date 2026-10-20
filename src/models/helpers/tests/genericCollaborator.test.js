const { EmptyResultError } = require('sequelize');
const {
  createCollaborator,
  getCollaboratorRecord,
  findOrCreateCollaborator,
  getIdForCollaboratorType,
  removeCollaboratorsForType,
} = require('../genericCollaborator');

describe('GenericCollaborator', () => {
  describe('createCollaborator', () => {
    it('should create a new goal collaborator in the database', async () => {
      // Mock Sequelize instance and transaction
      const sequelize = {
        models: {
          GoalCollaborator: {
            create: jest.fn().mockResolvedValue({}),
          },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'create', id: 1 }),
          },
        },
      };
      const transaction = {};

      // Define input parameters
      const goalId = 1;
      const userId = 2;
      const typeName = 'Creator';
      const linkBack = null;

      // Call the function
      await createCollaborator('goal', sequelize, transaction, goalId, userId, typeName, linkBack);

      // Verify that the create method is called with the correct arguments
      expect(sequelize.models.GoalCollaborator.create).toHaveBeenCalledWith(
        {
          goalId,
          userId,
          collaboratorTypeId: 1,
          linkBack,
        },
        { transaction }
      );
    });

    it('throws an exception if the collaborator type is not found', async () => {
      // Mock Sequelize instance and transaction
      const sequelize = {
        models: {
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
      };
      const transaction = {};

      // Define input parameters
      const goalId = 1;
      const userId = 2;
      const typeName = 'NonExistentType';
      const linkBack = null;

      // Call the function and expect an error
      await expect(
        createCollaborator('goal', sequelize, transaction, goalId, userId, typeName, linkBack)
      ).rejects.toThrow('No collaborator type found for "NonExistentType" in Goals');
    });
  });

  describe('getCollaboratorRecord', () => {
    it('should retrieve a goal collaborator record from the database', async () => {
      // Mock Sequelize instance and transaction
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn().mockResolvedValue({}),
          },
          CollaboratorType: {},
        },
      };
      const transaction = {};

      // Define input parameters
      const goalId = 1;
      const userId = 2;
      const typeName = 'type';

      // Call the function
      await getCollaboratorRecord('goal', sequelize, transaction, goalId, userId, typeName);

      // Verify that the findOne method is called with the correct arguments
      expect(sequelize.models.GoalCollaborator.findOne).toHaveBeenCalledWith({
        where: {
          goalId,
          userId,
        },
        include: [
          {
            model: sequelize.models.CollaboratorType,
            as: 'collaboratorType',
            required: true,
            where: { name: typeName },
            attributes: ['name'],
            include: [
              {
                model: sequelize.models.ValidFor,
                as: 'validFor',
                required: true,
                attributes: [],
                where: { name: 'Goals' },
              },
            ],
          },
        ],
        transaction,
      });
    });
  });

  describe('findOrCreateCollaborator', () => {
    it('should find or create a goal collaborator record in the database', async () => {
      // Mock Sequelize instance and transaction
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn().mockResolvedValue({
              dataValues: { id: 1, linkBack: { activityReportIds: [1] } },
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'create', id: 1 }),
          },
        },
      };
      const transaction = {};

      // Define input parameters
      const goalId = 1;
      const userId = 2;
      const typeName = 'Creator';
      const linkBack = { activityReportIds: [2] };

      // Call the function
      await findOrCreateCollaborator(
        'goal',
        sequelize,
        transaction,
        goalId,
        userId,
        typeName,
        linkBack
      );

      // Verify that the update method is called with the merged linkBack
      expect(sequelize.models.GoalCollaborator.update).toHaveBeenCalledWith(
        {
          linkBack: { activityReportIds: [1, 2] },
        },
        {
          where: { id: expect.anything() },
          transaction,
          individualHooks: true,
          returning: true,
        }
      );
    });

    it('skips the update when the merged linkBack is unchanged', async () => {
      const existingCollaborator = { dataValues: { id: 1, linkBack: { activityReportIds: [1] } } };
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn().mockResolvedValue(existingCollaborator),
            update: jest.fn().mockResolvedValue({}),
          },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'create', id: 1 }),
          },
        },
      };
      const transaction = {};

      const result = await findOrCreateCollaborator(
        'goal',
        sequelize,
        transaction,
        1,
        2,
        'Creator',
        null
      );

      expect(sequelize.models.GoalCollaborator.update).not.toHaveBeenCalled();
      expect(result).toBe(existingCollaborator);
    });

    it('propagates errors from the initial collaborator lookup, and recovers on retry', async () => {
      const error = new Error('collaborator lookup failed');
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest
              .fn()
              .mockRejectedValueOnce(error)
              .mockResolvedValueOnce({ dataValues: { id: 1, linkBack: null } }),
            update: jest.fn().mockResolvedValue({}),
          },
          CollaboratorType: {},
        },
      };
      const transaction = {};
      const args = ['goal', sequelize, transaction, 1, 2, 'Creator', null];

      await expect(findOrCreateCollaborator(...args)).rejects.toThrow(error);
      await expect(findOrCreateCollaborator(...args)).resolves.toBeDefined();
    });

    it('falls back to the winning row when create loses a unique constraint race', async () => {
      const winningRecord = { dataValues: { id: 1, linkBack: { activityReportIds: [1] } } };
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(winningRecord),
            // ON CONFLICT DO NOTHING skipped the insert.
            create: jest.fn().mockRejectedValueOnce(new EmptyResultError('insert skipped')),
            update: jest.fn().mockResolvedValue({}),
          },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'create', id: 1 }),
          },
        },
      };
      const transaction = {};

      const result = await findOrCreateCollaborator(
        'goal',
        sequelize,
        transaction,
        1,
        2,
        'Creator',
        { activityReportIds: [2] }
      );

      expect(sequelize.models.GoalCollaborator.update).toHaveBeenCalledWith(
        { linkBack: { activityReportIds: [1, 2] } },
        {
          where: { id: winningRecord.dataValues.id },
          transaction,
          individualHooks: true,
          returning: true,
        }
      );
      expect(result).toBeDefined();
    });

    it('surfaces an insert skipped by a conflict on some other constraint instead of masking it', async () => {
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockRejectedValueOnce(new EmptyResultError('insert skipped')),
            update: jest.fn(),
          },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'create', id: 1 }),
          },
        },
      };
      const transaction = {};

      await expect(
        findOrCreateCollaborator('goal', sequelize, transaction, 1, 2, 'Creator', null)
      ).rejects.toThrow('no matching row was found');
      expect(sequelize.models.GoalCollaborator.update).not.toHaveBeenCalled();
    });
  });

  describe('getIdForCollaboratorType', () => {
    it('should find the ID for a given collaborator type in the database', async () => {
      // Mock Sequelize instance and transaction
      const sequelize = {
        models: {
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({}),
          },
        },
      };
      const transaction = {};

      // Define input parameters
      const typeName = 'type';

      // Call the function
      await getIdForCollaboratorType('goal', sequelize, transaction, typeName);

      // Verify that the findOne method is called with the correct arguments
      expect(sequelize.models.CollaboratorType.findOne).toHaveBeenCalledWith({
        where: {
          name: typeName,
        },
        include: [
          {
            model: sequelize.models.ValidFor,
            as: 'validFor',
            required: true,
            attributes: [],
            where: { name: 'Goals' },
          },
        ],
        raw: true,
        transaction,
      });
    });
  });

  describe('removeCollaboratorsForType', () => {
    it('should remove all collaborators of a specific type for a given goal', async () => {
      // Define input parameters
      const goalId = 1;
      const userId = 1;
      const typeName = 'Linker';
      const linkBack = { activityReportIds: [1] };

      // Mock Sequelize instance and transaction
      const sequelize = {
        models: {
          GoalCollaborator: {
            destroy: jest.fn().mockResolvedValue({}),
            findAll: jest.fn().mockResolvedValue([
              {
                dataValues: {
                  id: 1,
                  goalId,
                  userId,
                  collaboratorTypeId: 1,
                  linkBack,
                },
              },
            ]),
          },
        },
      };
      const transaction = {};

      // Call the function
      await removeCollaboratorsForType('goal', sequelize, transaction, goalId, typeName, linkBack);

      // Verify that the destroy method is called with the correct arguments
      expect(sequelize.models.GoalCollaborator.destroy).toHaveBeenCalledWith({
        where: {
          id: [goalId],
        },
        individualHooks: true,
        transaction,
      });
    });
    it('should should do nothing when no linkBack given', async () => {
      // Define input parameters
      const goalId = 1;
      const userId = 1;
      const typeName = 'Linker';
      const linkBack = { activityReportIds: [1] };

      // Mock Sequelize instance and transaction
      const sequelize = {
        models: {
          GoalCollaborator: {
            destroy: jest.fn().mockResolvedValue({}),
            findAll: jest.fn().mockResolvedValue([
              {
                dataValues: {
                  id: 1,
                  goalId,
                  userId,
                  collaboratorTypeId: 1,
                  linkBack,
                },
              },
            ]),
          },
        },
      };
      const transaction = {};

      // Call the function
      await removeCollaboratorsForType('goal', sequelize, { transaction }, goalId, typeName, null);

      // Verify that the destroy method is called with the correct arguments
      expect(sequelize.models.GoalCollaborator.destroy).not.toHaveBeenCalled();
    });
    it('should do nothing when empty link back given', async () => {
      // Define input parameters
      const goalId = 1;
      const userId = 1;
      const typeName = 'Linker';
      const linkBack = { activityReportIds: [1] };

      // Mock Sequelize instance and transaction
      const sequelize = {
        models: {
          GoalCollaborator: {
            destroy: jest.fn().mockResolvedValue({}),
            findAll: jest.fn().mockResolvedValue([
              {
                dataValues: {
                  id: 1,
                  goalId,
                  userId,
                  collaboratorTypeId: 1,
                  linkBack,
                },
              },
            ]),
          },
        },
      };
      const transaction = {};

      // Call the function
      await removeCollaboratorsForType('goal', sequelize, { transaction }, goalId, typeName, {
        activityReportIds: [null],
      });

      // Verify that the destroy method is called with the correct arguments
      expect(sequelize.models.GoalCollaborator.destroy).not.toHaveBeenCalled();
    });
  });
});

const {
  createGoalCollaborator,
  getGoalCollaboratorRecord,
  findOrCreateGoalCollaborator,
  getIdForCollaboratorType,
  currentUserPopulateCollaboratorForType,
  removeCollaboratorsForType,
} = require('../goalCollaborator');

describe('GoalCollaborator', () => {
  describe('createGoalCollaborator', () => {
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
      await createGoalCollaborator(sequelize, transaction, goalId, userId, typeName, linkBack);

      // Verify that the create method is called with the correct arguments
      expect(sequelize.models.GoalCollaborator.create).toHaveBeenCalledWith(
        {
          goalId,
          userId,
          collaboratorTypeId: 1,
          linkBack,
        },
        { transaction },
      );
    });
  });

  describe('getGoalCollaboratorRecord', () => {
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
      await getGoalCollaboratorRecord(sequelize, transaction, goalId, userId, typeName);

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
          },
        ],
      }, { transaction });
    });
  });

  describe('findOrCreateGoalCollaborator', () => {
    it('should find or create a goal collaborator record in the database', async () => {
      // Mock Sequelize instance and transaction
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn().mockResolvedValue({ dataValues: { id: 1, linkBack: null } }),
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
      const linkBack = null;

      // Call the function
      await findOrCreateGoalCollaborator(
        sequelize,
        transaction,
        goalId,
        userId,
        typeName,
        linkBack,
      );

      // Verify that the update method is called with the correct arguments
      expect(sequelize.models.GoalCollaborator.update).toHaveBeenCalledWith(
        {
          linkBack: null,
        },
        {
          where: { id: expect.anything() },
          transaction,
          independentHooks: true,
          returning: true,
        },
      );
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
      await getIdForCollaboratorType(sequelize, transaction, typeName);

      // Verify that the findOne method is called with the correct arguments
      expect(sequelize.models.CollaboratorType.findOne).toHaveBeenCalledWith({
        where: {
          name: typeName,
        },
        include: [
          {
            model: sequelize.models.validFor,
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

  describe('currentUserPopulateCollaboratorForType', () => {
    it('should populate the collaborator for a specific type of goal for the current user', async () => {
      // Mock Sequelize instance and options
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn().mockResolvedValue({ dataValues: { id: 1, linkBack: null } }),
            update: jest.fn().mockResolvedValue({}),
          },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'create', id: 1 }),
          },
        },
      };
      const options = {};

      // Mock httpContext.get method
      const loggedUser = 1;
      jest.mock('express', () => ({
        get: jest.fn().mockReturnValue(loggedUser),
      }));

      // Define input parameters
      const goalId = 1;
      const typeName = 'type';
      const linkBack = null;

      // Call the function
      await currentUserPopulateCollaboratorForType(
        sequelize,
        options,
        findOrCreateGoalCollaborator,
        goalId,
        typeName,
        linkBack,
      );

      // Verify that the findOrCreateGoalCollaborator function is called with the correct arguments
      expect(findOrCreateGoalCollaborator).toHaveBeenCalledWith(
        sequelize,
        options.transaction,
        goalId,
        loggedUser,
        typeName,
        linkBack,
      );
    });
  });

  describe('removeCollaboratorsForType', () => {
    it('should remove all collaborators of a specific type for a given goal', async () => {
      // Mock Sequelize instance and transaction
      const sequelize = {
        models: {
          GoalCollaborator: {
            destroy: jest.fn().mockResolvedValue({}),
          },
        },
      };
      const transaction = {};

      // Define input parameters
      const goalId = 1;
      const typeName = 'type';
      const linkBack = { activityReportIds: [1] };

      // Call the function
      await removeCollaboratorsForType(sequelize, transaction, goalId, typeName, linkBack);

      // Verify that the destroy method is called with the correct arguments
      expect(sequelize.models.GoalCollaborator.destroy).toHaveBeenCalledWith({
        where: {
          goalId,
        },
        include: [
          {
            model: sequelize.models.CollaboratorType,
            as: 'collaboratorType',
            required: true,
            where: { name: typeName },
            attributes: ['name'],
          },
        ],
        transaction,
      });
    });
  });
});

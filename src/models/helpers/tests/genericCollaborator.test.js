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
      const sequelize = {
        models: {
          GoalCollaborator: {
            create: jest.fn().mockResolvedValue({ id: 5 }),
          },
          GoalCollaboratorActivityReport: { bulkCreate: jest.fn() },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'create', id: 1 }),
          },
        },
      };
      const transaction = {};

      await createCollaborator('goal', sequelize, transaction, 1, 2, 'Creator', null);

      expect(sequelize.models.GoalCollaborator.create).toHaveBeenCalledWith(
        { goalId: 1, userId: 2, collaboratorTypeId: 1 },
        { transaction }
      );
      expect(sequelize.models.GoalCollaboratorActivityReport.bulkCreate).not.toHaveBeenCalled();
    });

    it('links the new collaborator to the given activity reports', async () => {
      const sequelize = {
        models: {
          GoalCollaborator: {
            create: jest.fn().mockResolvedValue({ id: 5 }),
          },
          GoalCollaboratorActivityReport: { bulkCreate: jest.fn().mockResolvedValue([]) },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'Linker', id: 1 }),
          },
        },
      };
      const transaction = {};

      await createCollaborator('goal', sequelize, transaction, 1, 2, 'Linker', {
        activityReportIds: [7, 8],
      });

      expect(sequelize.models.GoalCollaboratorActivityReport.bulkCreate).toHaveBeenCalledWith(
        [
          { goalCollaboratorId: 5, activityReportId: 7 },
          { goalCollaboratorId: 5, activityReportId: 8 },
        ],
        { transaction }
      );
    });

    it('creates the collaborator and its links in one transaction when the caller has none', async () => {
      const transaction = {};
      const sequelize = {
        models: {
          GoalCollaborator: { create: jest.fn().mockResolvedValue({ id: 5 }) },
          GoalCollaboratorActivityReport: { bulkCreate: jest.fn().mockResolvedValue([]) },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'Linker', id: 1 }),
          },
        },
        transaction: jest.fn((work) => work(transaction)),
      };

      await createCollaborator('goal', sequelize, null, 1, 2, 'Linker', {
        activityReportIds: [7],
      });

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(sequelize.models.GoalCollaborator.create.mock.calls[0][1].transaction).toBe(
        transaction
      );
      expect(
        sequelize.models.GoalCollaboratorActivityReport.bulkCreate.mock.calls[0][1].transaction
      ).toBe(transaction);
    });

    it('throws an exception if the collaborator type is not found', async () => {
      const sequelize = {
        models: {
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
      };
      const transaction = {};

      await expect(
        createCollaborator('goal', sequelize, transaction, 1, 2, 'NonExistentType', null)
      ).rejects.toThrow('No collaborator type found for "NonExistentType" in Goals');
    });

    it('rejects activity report links for group collaborators', async () => {
      const sequelize = { models: { GroupCollaborator: { create: jest.fn() } } };

      await expect(
        createCollaborator('group', sequelize, {}, 1, 2, 'Creator', { activityReportIds: [7] })
      ).rejects.toThrow("group collaborators can't be linked to activity reports");
      expect(sequelize.models.GroupCollaborator.create).not.toHaveBeenCalled();
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
    it('returns an existing collaborator without writing when no reports are given', async () => {
      const existingCollaborator = { id: 1 };
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn().mockResolvedValue(existingCollaborator),
            create: jest.fn(),
          },
          CollaboratorType: {},
        },
        query: jest.fn(),
      };

      const result = await findOrCreateCollaborator('goal', sequelize, {}, 1, 2, 'Creator', null);

      expect(result).toBe(existingCollaborator);
      expect(sequelize.models.GoalCollaborator.create).not.toHaveBeenCalled();
      expect(sequelize.query).not.toHaveBeenCalled();
    });

    it('creates a missing collaborator with ON CONFLICT DO NOTHING when no reports are given', async () => {
      const created = { id: 3 };
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(created),
          },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'Creator', id: 1 }),
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

      expect(result).toBe(created);
      expect(sequelize.models.GoalCollaborator.create).toHaveBeenCalledWith(
        { goalId: 1, userId: 2, collaboratorTypeId: 1 },
        { transaction, ignoreDuplicates: true }
      );
    });

    it('propagates errors from the initial collaborator lookup, and recovers on retry', async () => {
      const error = new Error('collaborator lookup failed');
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce({ id: 1 }),
          },
          CollaboratorType: {},
        },
      };
      const args = ['goal', sequelize, {}, 1, 2, 'Creator', null];

      await expect(findOrCreateCollaborator(...args)).rejects.toThrow(error);
      await expect(findOrCreateCollaborator(...args)).resolves.toBeDefined();
    });

    it('falls back to the winning row when create loses a unique constraint race', async () => {
      const winningRecord = { id: 1 };
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(winningRecord),
            // ON CONFLICT DO NOTHING skipped the insert.
            create: jest.fn().mockRejectedValueOnce(new EmptyResultError('insert skipped')),
          },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'Creator', id: 1 }),
          },
        },
      };

      const result = await findOrCreateCollaborator('goal', sequelize, {}, 1, 2, 'Creator', null);

      expect(result).toBe(winningRecord);
    });

    it('surfaces an insert skipped by a conflict on some other constraint instead of masking it', async () => {
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockRejectedValueOnce(new EmptyResultError('insert skipped')),
          },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'Creator', id: 1 }),
          },
        },
      };

      await expect(
        findOrCreateCollaborator('goal', sequelize, {}, 1, 2, 'Creator', null)
      ).rejects.toThrow('no matching row was found');
    });

    it('locks and links an existing collaborator in one statement, without rewriting it', async () => {
      const row = { id: 9, goalId: 1 };
      const built = { id: 9 };
      const sequelize = {
        models: {
          GoalCollaborator: {
            findOne: jest.fn(),
            build: jest.fn().mockReturnValue(built),
          },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'Linker', id: 4 }),
          },
        },
        query: jest.fn().mockResolvedValue([row]),
      };
      const transaction = {};

      const result = await findOrCreateCollaborator(
        'goal',
        sequelize,
        transaction,
        1,
        2,
        'Linker',
        {
          activityReportIds: [7, '7', 8, null, 'x', 0, 2147483647, 2147483648],
        }
      );

      expect(result).toBe(built);
      expect(sequelize.query).toHaveBeenCalledTimes(1);
      const [sql, options] = sequelize.query.mock.calls[0];
      expect(sql).toContain('FOR UPDATE');
      expect(sql).not.toContain('INSERT INTO "GoalCollaborators"');
      expect(sql).not.toContain('UPDATE "GoalCollaborators"');
      expect(sql).toContain('INSERT INTO "GoalCollaboratorActivityReports"');
      expect(options).toMatchObject({
        replacements: {
          entityId: 1,
          userId: 2,
          collaboratorTypeId: 4,
          reportIds: [7, 8, 2147483647],
        },
        transaction,
      });
      expect(sequelize.models.GoalCollaborator.build).toHaveBeenCalledWith(row, {
        isNewRecord: false,
        raw: true,
      });
      expect(sequelize.models.GoalCollaborator.findOne).not.toHaveBeenCalled();
    });

    it('creates and links the collaborator in one statement when there is no active one', async () => {
      const row = { id: 9 };
      const sequelize = {
        models: {
          GoalCollaborator: { build: jest.fn().mockReturnValue(row) },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'Linker', id: 4 }),
          },
        },
        query: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([row]),
      };

      const result = await findOrCreateCollaborator('goal', sequelize, {}, 1, 2, 'Linker', {
        activityReportIds: [7],
      });

      expect(result).toBe(row);
      expect(sequelize.query).toHaveBeenCalledTimes(2);
      const [createSql] = sequelize.query.mock.calls[1];
      expect(createSql).toContain('INSERT INTO "GoalCollaborators"');
      expect(createSql).toContain('DO NOTHING');
      expect(createSql).toContain('INSERT INTO "GoalCollaboratorActivityReports"');
    });

    it('tries again when a concurrently created collaborator was not yet visible', async () => {
      const row = { id: 9 };
      const sequelize = {
        models: {
          GoalCollaborator: { build: jest.fn().mockReturnValue(row) },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'Linker', id: 4 }),
          },
        },
        // No active row, then the insert conflicts, then the next pass finds the winner.
        query: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([row]),
      };

      const result = await findOrCreateCollaborator('goal', sequelize, {}, 1, 2, 'Linker', {
        activityReportIds: [7],
      });

      expect(result).toBe(row);
      expect(sequelize.query).toHaveBeenCalledTimes(3);
    });

    it('gives up after repeated attempts find no collaborator', async () => {
      const sequelize = {
        models: {
          GoalCollaborator: { build: jest.fn() },
          CollaboratorType: {
            findOne: jest.fn().mockResolvedValue({ name: 'Linker', id: 4 }),
          },
        },
        query: jest.fn().mockResolvedValue([]),
      };

      await expect(
        findOrCreateCollaborator('goal', sequelize, {}, 1, 2, 'Linker', { activityReportIds: [7] })
      ).rejects.toThrow('Could not find or create the Linker collaborator for goal 1');
      expect(sequelize.query).toHaveBeenCalledTimes(6);
    });

    it('rejects activity report links for group collaborators', async () => {
      const sequelize = {
        models: { GroupCollaborator: {}, CollaboratorType: {} },
        query: jest.fn(),
      };

      await expect(
        findOrCreateCollaborator('group', sequelize, {}, 1, 2, 'Creator', {
          activityReportIds: [7],
        })
      ).rejects.toThrow("group collaborators can't be linked to activity reports");
      expect(sequelize.query).not.toHaveBeenCalled();
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
    it('locks the collaborators, then unlinks the reports in a single statement', async () => {
      const sequelize = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ id: 3 }, { id: 5 }])
          .mockResolvedValueOnce([]),
      };
      const transaction = {};

      await removeCollaboratorsForType('goal', sequelize, transaction, 1, 'Linker', {
        activityReportIds: [7, null],
      });

      expect(sequelize.query).toHaveBeenCalledTimes(2);
      const [lockSql, lockOptions] = sequelize.query.mock.calls[0];
      const [removeSql, removeOptions] = sequelize.query.mock.calls[1];
      expect(lockSql).toContain('FOR UPDATE');
      // Only collaborators linked to these reports are locked, in the order adds lock them.
      expect(lockSql).toContain('FROM "GoalCollaboratorActivityReports" l');
      expect(lockSql).toContain('ORDER BY c."userId", c.id');
      expect(removeSql).toContain('DELETE FROM "GoalCollaboratorActivityReports"');
      expect(removeSql).toContain('IN (:lockedIds)');
      expect(removeSql).toContain('SET "deletedAt" = NOW()');
      [lockOptions, removeOptions].forEach((options) => {
        expect(options).toMatchObject({
          replacements: { entityId: 1, typeName: 'Linker', validFor: 'Goals', reportIds: [7] },
          transaction,
        });
      });
      // The unlink only touches the collaborators the lock statement returned.
      expect(removeOptions.replacements.lockedIds).toEqual([3, 5]);
    });

    it('unlinks nothing when no collaborator is linked to the reports', async () => {
      const sequelize = { query: jest.fn().mockResolvedValue([]) };

      await removeCollaboratorsForType('goal', sequelize, {}, 1, 'Linker', {
        activityReportIds: [7],
      });

      expect(sequelize.query).toHaveBeenCalledTimes(1);
    });

    it('opens a transaction for both statements when the caller has none', async () => {
      const transaction = {};
      const sequelize = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ id: 3 }])
          .mockResolvedValueOnce([]),
        transaction: jest.fn((work) => work(transaction)),
      };

      await removeCollaboratorsForType('goal', sequelize, null, 1, 'Linker', {
        activityReportIds: [7],
      });

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(sequelize.query).toHaveBeenCalledTimes(2);
      sequelize.query.mock.calls.forEach(([, options]) => {
        expect(options.transaction).toBe(transaction);
      });
    });

    it('should do nothing when no linkBack given', async () => {
      const sequelize = { query: jest.fn() };

      await removeCollaboratorsForType('goal', sequelize, {}, 1, 'Linker', null);

      expect(sequelize.query).not.toHaveBeenCalled();
    });

    it('should do nothing when empty link back given', async () => {
      const sequelize = { query: jest.fn() };

      await removeCollaboratorsForType('goal', sequelize, {}, 1, 'Linker', {
        activityReportIds: [null],
      });

      expect(sequelize.query).not.toHaveBeenCalled();
    });

    it('does nothing for group collaborators, which are never linked to reports', async () => {
      const sequelize = { query: jest.fn() };

      await removeCollaboratorsForType('group', sequelize, {}, 1, 'Creator', {
        activityReportIds: [7],
      });

      expect(sequelize.query).not.toHaveBeenCalled();
    });
  });
});

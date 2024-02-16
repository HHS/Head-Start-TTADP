const { REPORT_STATUSES } = require('@ttahub/common');
const { destroyLinkedSimilarityGroups } = require('./activityReportGoal');

describe('destroyLinkedSimilarityGroups', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const sequelize = {
    models: {
      GoalSimilarityGroup: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        destroy: jest.fn(),
      },
      GoalSimilarityGroupGoal: {
        destroy: jest.fn(),
      },
    },
  };

  it('should destroy similarity groups and associated goals', async () => {
    const instance = {
      goalId: 1,
      status: REPORT_STATUSES.DRAFT,
    };

    const options = {
      transaction: 'mockTransaction',
    };

    const similarityGroup = {
      id: 1,
      recipientId: 1,
    };

    const similarityGroups = [
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ];

    // Mock the necessary Sequelize methods
    sequelize.models.GoalSimilarityGroup.findOne.mockResolvedValue(similarityGroup);
    sequelize.models.GoalSimilarityGroup.findAll.mockResolvedValue(similarityGroups);
    sequelize.models.GoalSimilarityGroupGoal.destroy.mockResolvedValue(true);
    sequelize.models.GoalSimilarityGroup.destroy.mockResolvedValue(true);

    await destroyLinkedSimilarityGroups(sequelize, instance, options);

    expect(sequelize.models.GoalSimilarityGroup.findOne).toHaveBeenCalledWith({
      attributes: ['recipientId', 'id'],
      where: {
        userHasInvalidated: false,
        finalGoalId: null,
      },
      include: [
        {
          model: sequelize.models.Goal,
          as: 'goals',
          attributes: ['id'],
          required: true,
          where: {
            id: instance.goalId,
          },
        },
      ],
      transaction: options.transaction,
    });

    expect(sequelize.models.GoalSimilarityGroup.findAll).toHaveBeenCalledWith({
      attributes: ['id'],
      where: {
        recipientId: similarityGroup.recipientId,
        userHasInvalidated: false,
        finalGoalId: null,
      },
      transaction: options.transaction,
    });

    expect(sequelize.models.GoalSimilarityGroupGoal.destroy).toHaveBeenCalledWith({
      where: {
        similarityGroupId: similarityGroups.map((sg) => sg.id),
      },
      transaction: options.transaction,
    });

    expect(sequelize.models.GoalSimilarityGroup.destroy).toHaveBeenCalledWith({
      where: {
        recipientId: similarityGroup.recipientId,
        userHasInvalidated: false,
        finalGoalId: null,
      },
      transaction: options.transaction,
    });
  });

  it('does not need to destroy similarity groups and associated goals if there are not any', async () => {
    const instance = {
      goalId: 1,
      status: REPORT_STATUSES.DRAFT,
    };

    const options = {
      transaction: 'mockTransaction',
    };

    // Mock the necessary Sequelize methods
    sequelize.models.GoalSimilarityGroup.findOne.mockResolvedValue(null);

    await destroyLinkedSimilarityGroups(sequelize, instance, options);

    expect(sequelize.models.GoalSimilarityGroup.findOne).toHaveBeenCalledWith({
      attributes: ['recipientId', 'id'],
      where: {
        userHasInvalidated: false,
        finalGoalId: null,
      },
      include: [
        {
          model: sequelize.models.Goal,
          as: 'goals',
          attributes: ['id'],
          required: true,
          where: {
            id: instance.goalId,
          },
        },
      ],
      transaction: options.transaction,
    });

    expect(sequelize.models.GoalSimilarityGroup.findAll).not.toHaveBeenCalled();

    expect(sequelize.models.GoalSimilarityGroupGoal.destroy).not.toHaveBeenCalled();

    expect(sequelize.models.GoalSimilarityGroup.destroy).not.toHaveBeenCalled();
  });

  it('should not destroy similarity groups and associated goals if status is approved', async () => {
    const instance = {
      goalId: 1,
      status: REPORT_STATUSES.APPROVED,
    };

    const options = {
      transaction: 'mockTransaction',
    };

    await destroyLinkedSimilarityGroups(sequelize, instance, options);

    expect(sequelize.models.GoalSimilarityGroup.findOne).not.toHaveBeenCalled();
    expect(sequelize.models.GoalSimilarityGroup.findAll).not.toHaveBeenCalled();
    expect(sequelize.models.GoalSimilarityGroupGoal.destroy).not.toHaveBeenCalled();
    expect(sequelize.models.GoalSimilarityGroup.destroy).not.toHaveBeenCalled();
  });
});

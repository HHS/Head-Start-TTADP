const { REPORT_STATUSES } = require('@ttahub/common');
const { destroyLinkedSimilarityGroups } = require('./activityReportGoal');

describe('destroyLinkedSimilarityGroups', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const sequelize = {
    models: {
      ActivityReport: {
        findOne: jest.fn(),
      },
      Recipient: {
        findOne: jest.fn(),
      },
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
    };

    const options = {
      transaction: 'mockTransaction',
    };

    const recipient = {
      id: 1,
    };

    const similarityGroups = [
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ];

    // Mock the necessary Sequelize methods
    sequelize.models.Recipient.findOne.mockResolvedValue(recipient);
    sequelize.models.GoalSimilarityGroup.findAll.mockResolvedValue(similarityGroups);
    sequelize.models.GoalSimilarityGroupGoal.destroy.mockResolvedValue(true);
    sequelize.models.GoalSimilarityGroup.destroy.mockResolvedValue(true);
    sequelize.models.ActivityReport.findOne.mockResolvedValue({
      calculatedStatus: REPORT_STATUSES.DRAFT,
    });

    await destroyLinkedSimilarityGroups(sequelize, instance, options);

    expect(sequelize.models.Recipient.findOne).toHaveBeenCalledWith({
      attributes: ['id'],
      include: [
        {
          model: sequelize.models.Grant,
          as: 'grants',
          attributes: ['id'],
          required: true,
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
        },
      ],
      transaction: options.transaction,
    });

    expect(sequelize.models.GoalSimilarityGroup.findAll).toHaveBeenCalledWith({
      attributes: ['id'],
      where: {
        recipientId: recipient.id,
        userHasInvalidated: false,
        finalGoalId: null,
      },
      transaction: options.transaction,
    });

    expect(sequelize.models.GoalSimilarityGroupGoal.destroy).toHaveBeenCalledWith({
      where: {
        goalSimilarityGroupId: similarityGroups.map((sg) => sg.id),
      },
      transaction: options.transaction,
    });

    expect(sequelize.models.GoalSimilarityGroup.destroy).toHaveBeenCalledWith({
      where: {
        recipientId: recipient.id,
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

    const recipient = {
      id: 1,
    };
    // Mock the necessary Sequelize methods
    sequelize.models.Recipient.findOne.mockResolvedValue(recipient);
    sequelize.models.ActivityReport.findOne.mockResolvedValue({
      calculatedStatus: REPORT_STATUSES.DRAFT,
    });
    sequelize.models.GoalSimilarityGroup.findAll.mockResolvedValue([]);

    await destroyLinkedSimilarityGroups(sequelize, instance, options);

    expect(sequelize.models.Recipient.findOne).toHaveBeenCalledWith({
      attributes: ['id'],
      include: [
        {
          model: sequelize.models.Grant,
          as: 'grants',
          attributes: ['id'],
          required: true,
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
        },
      ],
      transaction: options.transaction,
    });

    expect(sequelize.models.GoalSimilarityGroup.findAll).toHaveBeenCalledWith({
      attributes: ['id'],
      where: {
        recipientId: recipient.id,
        userHasInvalidated: false,
        finalGoalId: null,
      },
      transaction: options.transaction,
    });

    expect(sequelize.models.GoalSimilarityGroupGoal.destroy).not.toHaveBeenCalled();
    expect(sequelize.models.GoalSimilarityGroup.destroy).not.toHaveBeenCalled();
  });

  it('should not destroy similarity groups and associated goals if status is approved', async () => {
    const instance = {
      goalId: 1,
    };

    const options = {
      transaction: 'mockTransaction',
    };

    sequelize.models.ActivityReport.findOne.mockResolvedValue({
      calculatedStatus: REPORT_STATUSES.APPROVED,
    });

    await destroyLinkedSimilarityGroups(sequelize, instance, options);

    expect(sequelize.models.Recipient.findOne).not.toHaveBeenCalled();
    expect(sequelize.models.GoalSimilarityGroup.findAll).not.toHaveBeenCalled();
    expect(sequelize.models.GoalSimilarityGroupGoal.destroy).not.toHaveBeenCalled();
    expect(sequelize.models.GoalSimilarityGroup.destroy).not.toHaveBeenCalled();
  });
  it('should not destroy similarity groups and associated goals if report is not found', async () => {
    const instance = {
      goalId: 1,
    };

    const options = {
      transaction: 'mockTransaction',
    };

    sequelize.models.ActivityReport.findOne.mockResolvedValue(null);

    await destroyLinkedSimilarityGroups(sequelize, instance, options);

    expect(sequelize.models.Recipient.findOne).not.toHaveBeenCalled();
    expect(sequelize.models.GoalSimilarityGroup.findAll).not.toHaveBeenCalled();
    expect(sequelize.models.GoalSimilarityGroupGoal.destroy).not.toHaveBeenCalled();
    expect(sequelize.models.GoalSimilarityGroup.destroy).not.toHaveBeenCalled();
  });
});

const { Op } = require('sequelize'); // Import Sequelize operators
const { REPORT_STATUSES } = require('@ttahub/common');
const {
  destroyLinkedSimilarityGroups,
  updateOnARAndOnApprovedARForMergedGoals,
} = require('./activityReportGoal');

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

describe('updateOnARAndOnApprovedARForMergedGoals', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const sequelize = {
    models: {
      Goal: {
        update: jest.fn(),
      },
      ActivityReport: {
        count: jest.fn(),
      },
    },
  };

  it('should update onAR and onApprovedAR for merged goals when originalGoalId and goalId are changed', async () => {
    const instance = {
      goalId: 1,
      originalGoalId: 2,
      activityReportId: 1,
      changed: () => ['originalGoalId', 'goalId'], // Simulate that both columns have changed
    };

    const options = {
      transaction: 'mockTransaction',
    };

    // Mock the necessary Sequelize methods
    // Simulate approved ActivityReport exists
    sequelize.models.ActivityReport.count.mockResolvedValue(1);

    await updateOnARAndOnApprovedARForMergedGoals(sequelize, instance, options);

    expect(sequelize.models.ActivityReport.count).toHaveBeenCalledWith({
      where: {
        calculatedStatus: 'approved',
        id: instance.activityReportId,
      },
    });

    expect(sequelize.models.Goal.update).toHaveBeenCalledWith(
      { onAR: true, onApprovedAR: true },
      {
        where: {
          id: instance.goalId,
          [Op.or]: [
            // Ensure onAR condition is in the where clause
            { onAR: { [Op.ne]: true } },
            // Ensure onApprovedAR condition is in the where clause
            { onApprovedAR: { [Op.ne]: true } },
          ],
        },
        individualHooks: true,
      },
    );
  });

  it('should update onAR and onApprovedAR with false when there are no approved activity reports', async () => {
    const instance = {
      goalId: 1,
      originalGoalId: 2,
      activityReportId: 1,
      changed: () => ['originalGoalId', 'goalId'], // Simulate that both columns have changed
    };

    const options = {
      transaction: 'mockTransaction',
    };

    // Mock the necessary Sequelize methods
    sequelize.models.ActivityReport.count.mockResolvedValue(0); // No approved ActivityReports

    await updateOnARAndOnApprovedARForMergedGoals(sequelize, instance, options);

    expect(sequelize.models.ActivityReport.count).toHaveBeenCalledWith({
      where: {
        calculatedStatus: 'approved',
        id: instance.activityReportId,
      },
    });

    expect(sequelize.models.Goal.update).toHaveBeenCalledWith(
      { onAR: true, onApprovedAR: false }, // onApprovedAR is false since no approved reports
      {
        where: { id: instance.goalId },
        individualHooks: true,
      },
    );
  });

  it('should not update if originalGoalId or goalId is not changed', async () => {
    const instance = {
      goalId: 1,
      originalGoalId: 2,
      activityReportId: 1,
      changed: () => [], // Simulate no changes
    };

    const options = {
      transaction: 'mockTransaction',
    };

    await updateOnARAndOnApprovedARForMergedGoals(sequelize, instance, options);

    expect(sequelize.models.ActivityReport.count).not.toHaveBeenCalled();
    expect(sequelize.models.Goal.update).not.toHaveBeenCalled();
  });

  it('should not update if originalGoalId is null', async () => {
    const instance = {
      goalId: 1,
      originalGoalId: null,
      activityReportId: 1,
      changed: () => ['originalGoalId', 'goalId'], // Simulate that both columns have changed
    };

    const options = {
      transaction: 'mockTransaction',
    };

    await updateOnARAndOnApprovedARForMergedGoals(sequelize, instance, options);

    expect(sequelize.models.ActivityReport.count).not.toHaveBeenCalled();
    expect(sequelize.models.Goal.update).not.toHaveBeenCalled();
  });

  it('should not update if onAR and onApprovedAR are already set to the correct values', async () => {
    const instance = {
      goalId: 1,
      originalGoalId: 2,
      activityReportId: 1,
      changed: () => ['originalGoalId', 'goalId'], // Simulate that both columns have changed
    };

    const options = {
      transaction: 'mockTransaction',
    };

    // Mock the necessary Sequelize methods
    // Simulate approved ActivityReport exists
    sequelize.models.ActivityReport.count.mockResolvedValue(1);
    // Simulate that the update doesn't happen
    sequelize.models.Goal.update.mockResolvedValue(0);

    await updateOnARAndOnApprovedARForMergedGoals(sequelize, instance, options);

    expect(sequelize.models.Goal.update).toHaveBeenCalledWith(
      { onAR: true, onApprovedAR: true },
      {
        where: {
          id: instance.goalId,
          [Op.or]: [
            { onAR: { [Op.ne]: true } }, // Check if onAR is already true
            { onApprovedAR: { [Op.ne]: true } }, // Check if onApprovedAR is already true
          ],
        },
        individualHooks: true,
      },
    );
  });
});

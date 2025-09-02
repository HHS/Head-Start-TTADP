import { GOAL_STATUS } from '../constants';
import { standardGoalsForRecipient } from './standardGoals';
import db from '../models';
import { createRecipient, createGrant } from '../testUtils';

const {
  Goal,
  GoalTemplate,
  CollaboratorType,
  GoalCollaborator,
  User,
  Grant,
  ValidFor,
} = db;

describe('standardGoalsForRecipient sorting tests', () => {
  let recipient;
  let grant;
  let templateNotStarted;
  let templateInProgress;
  let templateSuspended;
  let templateClosed;
  let notStartedGoal;
  let inProgressGoal;
  let suspendedGoal;
  let closedGoal;
  let user;
  let creatorType;

  beforeAll(async () => {
    // Create recipient and grant
    recipient = await createRecipient();
    grant = await createGrant({ recipientId: recipient.id, regionId: 1 });

    // Create a goal template
    // Create goal templates for each goal
    templateNotStarted = await GoalTemplate.create({
      templateName: 'Not Started Test Template',
      creationMethod: 'Curated',
    });

    templateInProgress = await GoalTemplate.create({
      templateName: 'In Progress Test Template',
      creationMethod: 'Curated',
    });

    templateSuspended = await GoalTemplate.create({
      templateName: 'Suspended Test Template',
      creationMethod: 'Curated',
    });

    templateClosed = await GoalTemplate.create({
      templateName: 'Closed Test Template',
      creationMethod: 'Curated',
    });

    // Find a user to use as creator
    user = await User.findOne();
    if (!user) {
      throw new Error('No user found for test');
    }

    // Find the ValidFor record for 'Goals'
    let goalsValidFor = await ValidFor.findOne({
      where: {
        name: 'Goals',
      },
    });

    if (!goalsValidFor) {
      // Create the ValidFor record for 'Goals' if it doesn't exist
      goalsValidFor = await ValidFor.create({
        name: 'Goals',
      });
    }

    // Create collaborator type for 'Creator'
    const [creatorTypeFound] = await CollaboratorType.findOrCreate({
      where: { name: 'Creator' },
      defaults: {
        name: 'Creator',
        validForId: goalsValidFor.id,
      },
    });
    creatorType = creatorTypeFound;

    // Create goals with different statuses
    notStartedGoal = await Goal.create({
      name: 'Not Started Goal',
      status: GOAL_STATUS.NOT_STARTED,
      grantId: grant.id,
      goalTemplateId: templateNotStarted.id,
      createdVia: 'rtr',
    });

    inProgressGoal = await Goal.create({
      name: 'In Progress Goal',
      status: GOAL_STATUS.IN_PROGRESS,
      grantId: grant.id,
      goalTemplateId: templateInProgress.id,
      createdVia: 'rtr',
    });

    suspendedGoal = await Goal.create({
      name: 'Suspended Goal',
      status: GOAL_STATUS.SUSPENDED,
      grantId: grant.id,
      goalTemplateId: templateSuspended.id,
      createdVia: 'rtr',
    });

    closedGoal = await Goal.create({
      name: 'Closed Goal',
      status: GOAL_STATUS.CLOSED,
      grantId: grant.id,
      goalTemplateId: templateClosed.id,
      createdVia: 'rtr',
    });

    // Add collaborators to the goals
    const goalIds = [
      notStartedGoal?.id,
      inProgressGoal?.id,
      suspendedGoal?.id,
      closedGoal?.id,
    ].filter(Boolean);

    if (goalIds.length > 0 && user?.id && creatorType?.id) {
      await Promise.all(
        goalIds.map((goalId) => (
          GoalCollaborator.create({
            goalId,
            userId: user.id,
            collaboratorTypeId: creatorType.id,
          })
        )),
      );
    }
  });

  afterAll(async () => {
    await GoalCollaborator.destroy({
      where: {
        goalId: [
          notStartedGoal.id,
          inProgressGoal.id,
          suspendedGoal.id,
          closedGoal.id,
        ],
      },
      force: true,
    });

    // Clean up goals
    await Goal.destroy({
      where: {
        id: [
          notStartedGoal.id,
          inProgressGoal.id,
          suspendedGoal.id,
          closedGoal.id,
        ],
      },
      individualHooks: true,
      force: true,
    });

    // Clean up goal template if it was created
    await GoalTemplate.destroy({
      where: {
        id: [
          templateNotStarted.id,
          templateInProgress.id,
          templateSuspended.id,
          templateClosed.id],
      },
      individualHooks: true,
      force: true,
    });

    // Clean up grant if it was created
    await Grant.destroy({
      where: {
        id: grant.id,
      },
      individualHooks: true,
      force: true,
    });
  });

  it('sorts goals by status with ASC direction showing Not Started first', async () => {
    // Call the function with the recipient and region from the grant
    const result = await standardGoalsForRecipient(
      recipient.id,
      grant.regionId,
      { sortBy: 'goalStatus', sortDir: 'asc' },
    );

    // Verify we have goals in the result
    expect(result.goalRows.length).toBe(4);

    // Assert the order of the goals by status
    const expectedOrder = [
      GOAL_STATUS.NOT_STARTED,
      GOAL_STATUS.IN_PROGRESS,
      GOAL_STATUS.SUSPENDED,
      GOAL_STATUS.CLOSED,
    ];
    const actualOrder = result.goalRows.map((goal) => goal.status);
    expect(actualOrder).toEqual(expectedOrder);
  });
});

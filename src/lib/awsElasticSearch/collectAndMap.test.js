/* eslint-disable dot-notation */
import db, {
  User,
  ActivityReport,
  NextStep,
  Recipient,
  Grant,
  Goal,
  ActivityRecipient,
  Objective,
  ActivityReportGoal,
  ActivityReportObjective,
} from '../../models';
import { formatModelForAwsElasticsearch } from './modelMapper';
import { collectModelData } from './datacollector';
import { AWS_ELASTIC_SEARCH_INDEXES, REPORT_STATUSES } from '../../constants';
import { auditLogger } from '../../logger';

jest.mock('bull');

const mockUser = {
  homeRegionId: 1,
  name: 'Jon Smitz',
  hsesUsername: 'JS321423',
  hsesUserId: 'JS321423',
  role: ['Grants Specialist', 'Health Specialist'],
};

const draft = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  regionId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['Children with Disabilities', 'Infants and Toddlers (ages birth to 3)'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
  context: 'Lets give some context.',
};

const approvedReport = {
  ...draft,
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
};

describe('Collect and Map AWS Elasticsearch data', () => {
  let user;
  let recipient;
  let grant;
  let goal;
  let objective;

  let reportOne;

  beforeAll(async () => {
    try {
      // User.
      user = await User.create({ ...mockUser });

      // Recipient.
      recipient = await Recipient.create({
        id: 75165,
        name: 'Sample Elasticsearch Recipient',
      });

      // Grant.
      grant = await Grant.create({
        id: 584224,
        number: 'ES584224',
        recipientId: recipient.id,
        regionId: 1,
      });

      // Approved Reports.
      reportOne = await ActivityReport.create({
        ...approvedReport,
        context: 'Lets give some context',
        userId: user.id,
      });

      // Recipient Next Steps.
      await NextStep.bulkCreate([{
        activityReportId: reportOne.id, noteType: 'RECIPIENT', note: 'The journey of a thousand miles begins with one step', completeDate: '2022-12-12T12:00:00Z',
      },
      {
        activityReportId: reportOne.id, noteType: 'RECIPIENT', note: 'I think, therefore I am', completeDate: '2022-12-12T12:00:00Z',
      },
      {
        activityReportId: reportOne.id, noteType: 'SPECIALIST', note: 'Tough times never last but tough people do', completeDate: '2022-12-12T12:00:00Z',
      },
      {
        activityReportId: reportOne.id, noteType: 'SPECIALIST', note: 'You must be the change you wish to see in the world', completeDate: '2022-12-12T12:00:00Z',
      },
      ], { updateOnDuplicate: ['note', 'completeDate', 'updatedAt'] });

      // Activity Recipients.
      await ActivityRecipient.create({
        activityReportId: reportOne.id,
        grantId: grant.id,
      });

      // Create Goal.
      goal = await Goal.create({
        name: 'This is an Elasticsearch goal',
        status: 'In Progress',
        grantId: grant.id,
        previousStatus: 'Not Started',
      });

      // Create Objective.
      objective = await Objective.create(
        {
          title: 'Objective for Elasticsearch',
          goalId: goal.id,
          status: 'Not Started',
        },
      );

      // Create ARG's.
      await ActivityReportGoal.create({
        activityReportId: reportOne.id,
        goalId: goal.id,
        name: 'Read a book',
      });

      // Create ARO's.
      await ActivityReportObjective.create({
        activityReportId: reportOne.id,
        objectiveId: objective.id,
        title: 'Reading glasses',
        ttaProvided: 'Go to the library',
        status: 'Complete',
      });
    } catch (e) {
      auditLogger.error(JSON.stringify(e));
      throw e;
    }
  });

  afterAll(async () => {
    try {
      // Delete Next Steps.
      await NextStep.destroy({
        where: {
          activityReportId: [reportOne.id],
        },
      });

      // Delete ARO's.
      await ActivityReportObjective.destroy({
        where: { activityReportId: [reportOne.id] },
      });

      // Delete ARG's.
      await ActivityReportGoal.destroy({
        where: { activityReportId: [reportOne.id] },
      });

      // Delete activity recipient.
      await ActivityRecipient.destroy({ where: { activityReportId: reportOne.id } });

      // Delete Objective.
      await Objective.destroy({
        where: {
          id: objective.id,
        },
      });

      // Delete Goal.
      await Goal.destroy({
        where: {
          grantId: grant.id,
        },
      });
      // Delete Report's.
      await ActivityReport.destroy({ where: { id: reportOne.id } });

      // Delete Grant.
      await Grant.destroy({ where: { id: grant.id } });

      // Delete Recipient.
      await Recipient.destroy({ where: { id: recipient.id } });

      // Delete User.
      await User.destroy({ where: { id: user.id } });

      await db.sequelize.close();
    } catch (e) {
      auditLogger.error(JSON.stringify(e));
      throw e;
    }
  });

  it('retrieve and map data', async () => {
    // Get AR.
    const ar = await ActivityReport.findOne({ where: { id: reportOne.id } });
    expect(ar).not.toBeNull();

    // Call datacollector.
    const collectedData = await collectModelData(
      [reportOne.id],
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      db.sequelize,
    );

    // Check collected data.
    const {
      recipientNextStepsToIndex,
      specialistNextStepsToIndex,
      goalsToIndex,
      objectivesToIndex,
    } = collectedData;

    // Recipient Next Steps.
    expect(recipientNextStepsToIndex).not.toBeNull();
    expect(recipientNextStepsToIndex.length).toBe(2);
    expect(recipientNextStepsToIndex[0].activityReportId).toBe(reportOne.id);
    expect(recipientNextStepsToIndex[0].note).toBe('I think, therefore I am');
    expect(recipientNextStepsToIndex[1].activityReportId).toBe(reportOne.id);
    expect(recipientNextStepsToIndex[1].note).toBe('The journey of a thousand miles begins with one step');

    // Specialist Next Steps.
    expect(specialistNextStepsToIndex).not.toBeNull();
    expect(specialistNextStepsToIndex.length).toBe(2);
    expect(specialistNextStepsToIndex[0].activityReportId).toBe(reportOne.id);
    expect(specialistNextStepsToIndex[0].note).toBe('Tough times never last but tough people do');
    expect(specialistNextStepsToIndex[1].activityReportId).toBe(reportOne.id);
    expect(specialistNextStepsToIndex[1].note).toBe('You must be the change you wish to see in the world');

    // Goals.
    expect(goalsToIndex).not.toBeNull();
    expect(goalsToIndex.length).toBe(1);
    expect(goalsToIndex[0].activityReportId).toBe(reportOne.id);
    expect(goalsToIndex[0].name).toBe('Read a book');

    // Objective.
    expect(objectivesToIndex).not.toBeNull();
    expect(objectivesToIndex.length).toBe(1);
    expect(objectivesToIndex[0].activityReportId).toBe(reportOne.id);
    expect(objectivesToIndex[0].title).toBe('Reading glasses');
    expect(objectivesToIndex[0].ttaProvided).toBe('Go to the library');

    // Format as AWS Elasticsearch document.
    const document = await formatModelForAwsElasticsearch(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      { ...collectedData, ar: { ...ar.dataValues } },
    );

    expect(document.id).toBe(reportOne.id);
    expect(document.context).toBe('Lets give some context');

    // Recipient steps.
    expect(document.recipientNextSteps.length).toBe(2);
    expect(document.recipientNextSteps[0]).toBe('I think, therefore I am');
    expect(document.recipientNextSteps[1]).toBe('The journey of a thousand miles begins with one step');

    // Specialist steps.
    expect(document.specialistNextSteps.length).toBe(2);
    expect(document.specialistNextSteps[0]).toBe('Tough times never last but tough people do');
    expect(document.specialistNextSteps[1]).toBe('You must be the change you wish to see in the world');

    // Goals.
    expect(document.activityReportGoals.length).toBe(1);
    expect(document.activityReportGoals[0]).toBe('Read a book');

    // Objectives.
    expect(document.activityReportObjectives.length).toBe(1);
    expect(document.activityReportObjectives[0]).toBe('Reading glasses');

    // Objective TTA.
    expect(document.activityReportObjectivesTTA.length).toBe(1);
    expect(document.activityReportObjectivesTTA[0]).toBe('Go to the library');
  });
});

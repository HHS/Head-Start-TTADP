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
  ActivityReportObjectiveResource,
} from '../models';
import createAwsElasticSearchIndexes from './createAwsElasticSearchIndexes';
import {
  search,
} from '../lib/awsElasticSearch/index';
import { AWS_ELASTIC_SEARCH_INDEXES, REPORT_STATUSES } from '../constants';
import { auditLogger } from '../logger';

const mockUser = {
  homeRegionId: 1,
  name: 'Tom Green',
  hsesUsername: 'tg234234',
  hsesUserId: 'tg234234',
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

jest.mock('bull');

describe('Create AWS Elastic Search Indexes', () => {
  let user;
  let recipient;
  let grant;
  let goal;
  let objective;

  let draftReport;
  let reportOne;
  let reportTwo;
  let reportThree;

  let activityReportObjective1;
  let activityReportObjective2;

  beforeAll(async () => {
    try {
      // User.
      user = await User.create({ ...mockUser });

      // Recipient.
      recipient = await Recipient.create({
        id: 651653,
        name: 'Sample Elasticsearch Recipient',
      });

      // Grant.
      grant = await Grant.create({
        id: 564987,
        number: 'ES234234',
        recipientId: recipient.id,
        regionId: 1,
      });

      // Draft Report (excluded).
      draftReport = await ActivityReport.create({ ...draft, userId: user.id });

      // Approved Reports.
      reportOne = await ActivityReport.create({
        ...approvedReport,
        context: 'Lets give some',
        userId: user.id,
      });
      reportTwo = await ActivityReport.create(
        {
          ...approvedReport,
          context: 'New context to test',
          userId: user.id,
        },
      );
      reportThree = await ActivityReport.create(
        {
          ...approvedReport,
          context: 'If the search works',
          userId: user.id,
        },
      );

      // Recipient Next Steps.
      await NextStep.bulkCreate([{
        activityReportId: reportOne.id, noteType: 'RECIPIENT', note: 'The journey of a thousand miles begins with one step', completeDate: '2022-12-12T12:00:00Z',
      },
      {
        activityReportId: reportTwo.id, noteType: 'RECIPIENT', note: 'I think, therefore I am', completeDate: '2022-12-12T12:00:00Z',
      },
      {
        activityReportId: reportThree.id, noteType: 'RECIPIENT', note: 'Fortune favors the bold', completeDate: '2022-12-12T12:00:00Z',
      },
      {
        activityReportId: reportOne.id, noteType: 'SPECIALIST', note: 'Tough times never last but tough people do', completeDate: '2022-12-12T12:00:00Z',
      },
      {
        activityReportId: reportTwo.id, noteType: 'SPECIALIST', note: 'You must be the change you wish to see in the world', completeDate: '2022-12-12T12:00:00Z',
      },
      {
        activityReportId: reportThree.id, noteType: 'SPECIALIST', note: 'The journey of a thousand begins with one step', completeDate: '2022-12-12T12:00:00Z',
      },
      ], { updateOnDuplicate: ['note', 'completeDate', 'updatedAt'] });

      // Activity Recipients.
      await ActivityRecipient.create({
        activityReportId: reportOne.id,
        grantId: grant.id,
      });

      await ActivityRecipient.create({
        activityReportId: reportTwo.id,
        grantId: grant.id,
      });

      await ActivityRecipient.create({
        activityReportId: reportThree.id,
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
      await ActivityReportGoal.create({
        activityReportId: reportTwo.id,
        goalId: goal.id,
        name: 'Learn to cook',
      });
      await ActivityReportGoal.create({
        activityReportId: reportThree.id,
        goalId: goal.id,
        name: 'Play a sport',
      });

      // Create ARO's.
      activityReportObjective1 = await ActivityReportObjective.create({
        activityReportId: reportOne.id,
        objectiveId: objective.id,
        title: 'Reading glasses',
        ttaProvided: 'Go to the library',
        status: 'Complete',
      });
      activityReportObjective2 = await ActivityReportObjective.create({
        activityReportId: reportTwo.id,
        objectiveId: objective.id,
        title: 'How to prepare your work space',
        ttaProvided: 'Buy a cook book',
        status: 'Complete',
      });
      await ActivityReportObjective.create({
        activityReportId: reportThree.id,
        objectiveId: objective.id,
        title: 'Get Involved',
        ttaProvided: 'Search for local activities',
        status: 'Complete',
      });

      // Create ARO resources.
      await ActivityReportObjectiveResource.create({
        activityReportObjectiveId: activityReportObjective1.id,
        userProvidedUrl: 'http://google.com',
      });
      await ActivityReportObjectiveResource.create({
        activityReportObjectiveId: activityReportObjective1.id,
        userProvidedUrl: 'http://yahoo.com',
      });
      await ActivityReportObjectiveResource.create({
        activityReportObjectiveId: activityReportObjective2.id,
        userProvidedUrl: 'http://bing.com',
      });
      await ActivityReportObjectiveResource.create({
        activityReportObjectiveId: activityReportObjective2.id,
        userProvidedUrl: 'https://eclkc.ohs.acf.hhs.gov/',
      });
    } catch (e) {
      auditLogger.error(JSON.stringify(e));
      throw e;
    }
  });

  afterAll(async () => {
    try {
      // Delete objective resource.
      await ActivityReportObjectiveResource.destroy({
        where: {
          activityReportObjectiveId: [activityReportObjective1.id, activityReportObjective2.id],
        },
      });

      // Delete Next Steps.
      await NextStep.destroy({
        where: {
          activityReportId: [reportOne.id, reportTwo.id, reportThree.id],
        },
      });

      // Delete ARO's.
      await ActivityReportObjective.destroy({
        where: { activityReportId: [reportOne.id, reportTwo.id, reportThree.id] },
      });

      // Delete ARG's.
      await ActivityReportGoal.destroy({
        where: { activityReportId: [reportOne.id, reportTwo.id, reportThree.id] },
      });

      // Delete activity recipient.
      await ActivityRecipient.destroy({ where: { activityReportId: reportOne.id } });
      await ActivityRecipient.destroy({ where: { activityReportId: reportTwo.id } });
      await ActivityRecipient.destroy({ where: { activityReportId: reportThree.id } });

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
      await ActivityReport.destroy({ where: { id: reportTwo.id } });
      await ActivityReport.destroy({ where: { id: reportThree.id } });
      await ActivityReport.destroy({ where: { id: draftReport.id } });
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

  it('should bulk create index and documents', async () => {
    // Create Indexes.
    await createAwsElasticSearchIndexes();

    // Context Search.
    let query = 'context to test';
    let searchResult = await search(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      ['context'],
      query,
    );

    expect(searchResult.hits.length).toBe(1);
    expect(searchResult.hits[0]['_id']).toBe(reportTwo.id.toString());

    // Recipient Next Steps.
    query = 'bold';
    searchResult = await search(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      ['recipientNextSteps'],
      query,
    );

    expect(searchResult.hits.length).toBe(1);
    expect(searchResult.hits[0]['_id']).toBe(reportThree.id.toString());

    // Specialist Next Steps (contains two matches).
    query = 'change';
    searchResult = await search(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      ['specialistNextSteps'],
      query,
    );
    expect(searchResult.hits.length).toBe(1);
    expect(searchResult.hits[0]['_id']).toBe(reportTwo.id.toString());

    // ARG.
    query = 'book';
    searchResult = await search(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      ['activityReportGoals'],
      query,
    );
    expect(searchResult.hits.length).toBe(1);
    expect(searchResult.hits[0]['_id']).toBe(reportOne.id.toString());

    // ARO.
    query = 'How to prepare';
    searchResult = await search(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      ['activityReportObjectives'],
      query,
    );
    expect(searchResult.hits.length).toBe(1);
    expect(searchResult.hits[0]['_id']).toBe(reportTwo.id.toString());

    // ARO TTA.
    query = 'local activities';
    searchResult = await search(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      ['activityReportObjectivesTTA'],
      query,
    );
    expect(searchResult.hits.length).toBe(1);
    expect(searchResult.hits[0]['_id']).toBe(reportThree.id.toString());

    // ARO Resources.
    // query = 'https://eclkc.ohs.acf.hhs.gov/';
    query = 'eclkc';
    searchResult = await search(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      ['activityReportObjectiveResources'],
      query,
    );
    expect(searchResult.hits.length).toBe(1);
    expect(searchResult.hits[0]['_id']).toBe(reportTwo.id.toString());

    // Search all indexes.
    query = 'thousand miles';
    searchResult = await search(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      [],
      query,
    );
    expect(searchResult.hits.length).toBe(2);
    expect(searchResult.hits[0]['_id']).toBe(reportOne.id.toString());
    expect(searchResult.hits[1]['_id']).toBe(reportThree.id.toString());
  });
});

import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  ActivityReport,
  ActivityRecipient,
  Topic,
  User,
  Recipient,
  Grant,
  NextStep,
  Goal,
  Objective,
  ActivityReportObjective,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
} from '../../models';
import filtersToScopes from '../../scopes';
import {
  resourceFlatData,
} from './resource';
import { RESOURCE_DOMAIN } from '../../constants';
import { processActivityReportObjectiveForResourcesById } from '../resource';

const RECIPIENT_ID = 46204400;
const GRANT_ID_ONE = 107843;
const REGION_ID = 14;
const NONECLKC_DOMAIN = 'non.test1.gov';
const ECLKC_RESOURCE_URL = `https://${RESOURCE_DOMAIN.ECLKC}/test`;
const ECLKC_RESOURCE_URL2 = `https://${RESOURCE_DOMAIN.ECLKC}/test2`;
const NONECLKC_RESOURCE_URL = `https://${NONECLKC_DOMAIN}/a/b/c`;

const mockUser = {
  id: 5426871,
  homeRegionId: 1,
  name: 'user5426862',
  hsesUsername: 'user5426862',
  hsesUserId: '5426862',
  lastLogin: new Date(),
};

const mockRecipient = {
  name: 'recipient',
  id: RECIPIENT_ID,
  uei: 'NNA5N2KHMGN2XX',
};

const mockGrant = {
  id: GRANT_ID_ONE,
  number: `${GRANT_ID_ONE}`,
  recipientId: RECIPIENT_ID,
  regionId: REGION_ID,
  status: 'Active',
};

const mockGoal = {
  name: 'Goal 1',
  status: 'Draft',
  endDate: null,
  isFromSmartsheetTtaPlan: false,
  onApprovedAR: false,
  onAR: false,
  grantId: GRANT_ID_ONE,
  createdVia: 'rtr',
};

const reportObject = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { grantId: GRANT_ID_ONE },
  ],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'method',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  ttaType: ['technical-assistance'],
  version: 2,
};

const regionOneReportA = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 1,
  startDate: '2021-01-02T12:00:00Z',
  endDate: '2021-01-31T12:00:00Z',
};

const regionOneReportB = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 2,
  startDate: '2021-01-15T12:00:00Z',
  endDate: '2021-02-15T12:00:00Z',
};

const regionOneReportC = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 3,
  startDate: '2021-01-20T12:00:00Z',
  endDate: '2021-02-28T12:00:00Z',
};

const regionOneReportD = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 3,
  startDate: '2021-01-22T12:00:00Z',
  endDate: '2021-01-31T12:00:00Z',
};

const regionOneDraftReport = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 7,
  startDate: '2021-01-02T12:00:00Z',
  endDate: '2021-01-31T12:00:00Z',
  submissionStatus: REPORT_STATUSES.DRAFT,
  calculatedStatus: REPORT_STATUSES.DRAFT,
};

let grant;
let goal;
let objective;
let goalTwo;
let objectiveTwo;
let activityReportOneObjectiveOne;
let activityReportOneObjectiveTwo;
let activityReportObjectiveTwo;
let activityReportObjectiveThree;
let arIds;

describe('Resources dashboard', () => {
  beforeAll(async () => {
    await User.findOrCreate({ where: mockUser, individualHooks: true });
    await Recipient.findOrCreate({ where: mockRecipient, individualHooks: true });
    [grant] = await Grant.findOrCreate({
      where: mockGrant,
      validate: true,
      individualHooks: true,
    });
    [goal] = await Goal.findOrCreate({ where: mockGoal, validate: true, individualHooks: true });
    [goalTwo] = await Goal.findOrCreate({ where: { ...mockGoal, name: 'Goal 2' }, validate: true, individualHooks: true });
    [objective] = await Objective.findOrCreate({
      where: {
        title: 'Objective 1',
        goalId: goal.dataValues.id,
        status: 'In Progress',
      },
    });

    [objectiveTwo] = await Objective.findOrCreate({
      where: {
        title: 'Objective 2',
        goalId: goalTwo.dataValues.id,
        status: 'In Progress',
      },
    });

    // Get topic ID's.
    const { topicId: classOrgTopicId } = await Topic.findOne({
      attributes: [['id', 'topicId']],
      where: { name: 'CLASS: Classroom Organization' },
      raw: true,
    });

    const { topicId: erseaTopicId } = await Topic.findOne({
      attributes: [['id', 'topicId']],
      where: { name: 'ERSEA' },
      raw: true,
    });

    const { topicId: coachingTopicId } = await Topic.findOne({
      attributes: [['id', 'topicId']],
      where: { name: 'Coaching' },
      raw: true,
    });

    const { topicId: facilitiesTopicId } = await Topic.findOne({
      attributes: [['id', 'topicId']],
      where: { name: 'Facilities' },
      raw: true,
    });

    const { topicId: fiscalBudgetTopicId } = await Topic.findOne({
      attributes: [['id', 'topicId']],
      where: { name: 'Fiscal / Budget' },
      raw: true,
    });

    const { topicId: nutritionTopicId } = await Topic.findOne({
      attributes: [['id', 'topicId']],
      where: { name: 'Nutrition' },
      raw: true,
    });

    const { topicId: oralHealthTopicId } = await Topic.findOne({
      attributes: [['id', 'topicId']],
      where: { name: 'Oral Health' },
      raw: true,
    });

    const { topicId: equityTopicId } = await Topic.findOne({
      attributes: [['id', 'topicId']],
      where: { name: 'Equity' },
      raw: true,
    });

    // Report 1 (Mixed Resources).
    const reportOne = await ActivityReport.create({
      ...regionOneReportA,
    }, {
      individualHooks: true,
    });
    await ActivityRecipient.findOrCreate({
      where: { activityReportId: reportOne.id, grantId: mockGrant.id },
    });

    // Report 1 - Activity Report Objective 1
    [activityReportOneObjectiveOne] = await ActivityReportObjective.findOrCreate({
      where: {
        activityReportId: reportOne.id,
        status: 'Complete',
        objectiveId: objective.id,
      },
    });

    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportOneObjectiveOne.id,
        topicId: classOrgTopicId,
      },
    });

    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportOneObjectiveOne.id,
        topicId: erseaTopicId,
      },
    });

    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportOneObjectiveOne.id,
        topicId: coachingTopicId,
      },
    });

    // Report 1 ECLKC Resource 1.
    // Report 1 Non-ECLKC Resource 1.
    await processActivityReportObjectiveForResourcesById(
      activityReportOneObjectiveOne.id,
      [ECLKC_RESOURCE_URL, NONECLKC_RESOURCE_URL],
    );

    // Report 1 - Activity Report Objective 2
    [activityReportOneObjectiveTwo] = await ActivityReportObjective.findOrCreate({
      where: {
        activityReportId: reportOne.id,
        status: 'Complete',
        objectiveId: objectiveTwo.id,
      },
    });

    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportOneObjectiveTwo.id,
        topicId: coachingTopicId,
      },
    });

    await processActivityReportObjectiveForResourcesById(
      activityReportOneObjectiveTwo.id,
      [ECLKC_RESOURCE_URL, NONECLKC_RESOURCE_URL],
    );

    // Report 2 (Only ECLKC).
    const reportTwo = await ActivityReport.create({ ...regionOneReportB });
    await ActivityRecipient.create({ activityReportId: reportTwo.id, grantId: mockGrant.id });

    activityReportObjectiveTwo = await ActivityReportObjective.create({
      activityReportId: reportTwo.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Report 2 ECLKC Resource 1.
    await processActivityReportObjectiveForResourcesById(
      activityReportObjectiveTwo.id,
      [ECLKC_RESOURCE_URL, ECLKC_RESOURCE_URL2],
    );

    // Report 2 Topic 1.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveTwo.id,
        topicId: oralHealthTopicId,
      },
    });

    // Report 3 (Only Non-ECLKC).
    const reportThree = await ActivityReport.create({ ...regionOneReportC });
    await ActivityRecipient.create({ activityReportId: reportThree.id, grantId: mockGrant.id });

    activityReportObjectiveThree = await ActivityReportObjective.create({
      activityReportId: reportThree.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Report 3 Non-ECLKC Resource 1.
    await processActivityReportObjectiveForResourcesById(
      activityReportObjectiveThree.id,
      [NONECLKC_RESOURCE_URL, ECLKC_RESOURCE_URL2],
    );

    // Report 3 Topic 1.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveThree.id,
        topicId: nutritionTopicId,
      },
    });

    // Report 4.
    const reportFour = await ActivityReport.create({ ...regionOneReportD });
    await ActivityRecipient.create({ activityReportId: reportFour.id, grantId: mockGrant.id });

    const activityReportObjectiveForReport4 = await ActivityReportObjective.create({
      activityReportId: reportFour.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Report 4 Topic 1.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveForReport4.id,
        topicId: facilitiesTopicId,
      },
    });

    // Report 4 Topic 2.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveForReport4.id,
        topicId: fiscalBudgetTopicId,
      },
    });

    // Report 4 Topic 3.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveForReport4.id,
        topicId: erseaTopicId,
      },
    });

    // Report 3 Non-ECLKC Resource 1.
    await processActivityReportObjectiveForResourcesById(
      activityReportObjectiveForReport4.id,
      [ECLKC_RESOURCE_URL2],
    );

    // Report 5 (No resources).
    const reportFive = await ActivityReport.create({ ...regionOneReportD });
    await ActivityRecipient.create({ activityReportId: reportFive.id, grantId: mockGrant.id });

    const activityReportObjectiveForReport5 = await ActivityReportObjective.create({
      activityReportId: reportFive.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Report 5 Topic 1.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveForReport5.id,
        topicId: facilitiesTopicId,
      },
    });

    // Draft Report (Excluded).
    const reportDraft = await ActivityReport.create({ ...regionOneDraftReport });
    await ActivityRecipient.create({ activityReportId: reportDraft.id, grantId: mockGrant.id });

    const activityReportObjectiveDraft = await ActivityReportObjective.create({
      activityReportId: reportDraft.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Report Draft ECLKC Resource 1.
    // Report Draft Non-ECLKC Resource 1.
    await processActivityReportObjectiveForResourcesById(
      activityReportObjectiveDraft.id,
      [ECLKC_RESOURCE_URL, NONECLKC_RESOURCE_URL],
    );

    // Draft Report 5 Topic 1.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveDraft.id,
        topicId: equityTopicId,
      },
    });

    // Draft Report 5 Topic 2.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveDraft.id,
        topicId: erseaTopicId,
      },
    });

    arIds = [
      reportOne.id,
      reportTwo.id,
      reportThree.id,
      reportFour.id,
      reportFive.id,
      reportDraft.id,
    ];
  });

  afterAll(async () => {
    const reports = await ActivityReport
      .findAll({ where: { userId: [mockUser.id] } });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });

    await ActivityReportObjectiveResource.destroy({
      where: {
        activityReportObjectiveId: activityReportOneObjectiveOne.id,
      },
    });
    await ActivityReportObjectiveTopic.destroy({
      where: {
        activityReportObjectiveId: arIds,
      },
    });

    // eslint-disable-next-line max-len
    await ActivityReportObjective.destroy({ where: { objectiveId: [objective.id, objectiveTwo.id] } });
    await ActivityReport.destroy({ where: { id: ids } });
    await Objective.destroy({ where: { id: [objective.id, objectiveTwo.id] }, force: true });
    await Goal.destroy({ where: { id: [goal.id, goalTwo.id] }, force: true });
    await Grant.destroy({ where: { id: GRANT_ID_ONE }, individualHooks: true });
    await User.destroy({ where: { id: [mockUser.id] } });
    await Recipient.destroy({ where: { id: RECIPIENT_ID } });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /*
  it('testAllReports', async () => {
    const scopes = await filtersToScopes({});
    const { resourceUseResult } = await resourceFlatData(scopes);
    // console.log('\n\n\n-----resourceUseResult:', resourceUseResult, '\n\n\n');
    expect(true).toBe(true);
  });
  */

  it('resourceUseFlat', async () => {
    const scopes = await filtersToScopes({ 'region.in': [REGION_ID], 'startDate.win': '2021/01/01-2021/01/31' });
    const { resourceUseResult } = await resourceFlatData(scopes);
    expect(resourceUseResult).toBeDefined();
    expect(resourceUseResult.length).toBe(3);

    expect(resourceUseResult).toStrictEqual([
      {
        url: 'https://eclkc.ohs.acf.hhs.gov/test',
        rollUpDate: 'Jan-21',
        resourceCount: '2',
        totalCount: '2',
      },
      {
        url: 'https://eclkc.ohs.acf.hhs.gov/test2',
        rollUpDate: 'Jan-21',
        resourceCount: '3',
        totalCount: '3',
      },
      {
        url: 'https://non.test1.gov/a/b/c',
        rollUpDate: 'Jan-21',
        resourceCount: '2',
        totalCount: '2',
      },
    ]);
  });

  it('resourceTopicUseFlat', async () => {
    const scopes = await filtersToScopes({ 'region.in': [REGION_ID], 'startDate.win': '2021/01/01-2021/01/31' });
    const { topicUseResult } = await resourceFlatData(scopes);
    expect(topicUseResult).toBeDefined();

    expect(topicUseResult).toStrictEqual([
      {
        name: 'CLASS: Classroom Organization', rollUpDate: 'Jan-21', resourceCount: '2', totalCount: '2',
      },
      {
        name: 'Coaching', rollUpDate: 'Jan-21', resourceCount: '4', totalCount: '4',
      },
      {
        name: 'ERSEA', rollUpDate: 'Jan-21', resourceCount: '3', totalCount: '3',
      },
      {
        name: 'Facilities', rollUpDate: 'Jan-21', resourceCount: '1', totalCount: '1',
      },
      {
        name: 'Fiscal / Budget', rollUpDate: 'Jan-21', resourceCount: '1', totalCount: '1',
      },
      {
        name: 'Nutrition', rollUpDate: 'Jan-21', resourceCount: '2', totalCount: '2',
      },
      {
        name: 'Oral Health', rollUpDate: 'Jan-21', resourceCount: '2', totalCount: '2',
      },
    ]);
  });

  it('overviewFlat', async () => {
    const scopes = await filtersToScopes({ 'region.in': [REGION_ID], 'startDate.win': '2021/01/01-2021/01/31' });
    const { overView } = await resourceFlatData(scopes);
    expect(overView).toBeDefined();
    const {
      numberOfParticipants,
      numberOfRecipients,
      pctOfReportsWithResources,
      pctOfECKLKCResources,
    } = overView;

    // Number of Participants.
    expect(numberOfParticipants).toStrictEqual([{
      participants: '44',
    }]);

    // Number of Recipients.
    expect(numberOfRecipients).toStrictEqual([{
      recipients: '1',
    }]);

    // Percent of Reports with Resources.
    expect(pctOfReportsWithResources).toStrictEqual([
      {
        reportsWithResourcesCount: '4',
        totalReportsCount: '5',
        resourcesPct: '80.0000',
      },
    ]);

    // Percent of ECLKC reports.
    expect(pctOfECKLKCResources).toStrictEqual([
      {
        eclkcCount: '2',
        allCount: '3',
        eclkcPct: '66.6667',
      },
    ]);
  });
});

/* eslint-disable jest/no-commented-out-tests */
/* eslint-disable max-len */
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
  Resource,
} from '../../models';
import filtersToScopes from '../../scopes';
import {
  resourceFlatData,
  rollUpResourceUse,
  rollUpTopicUse,
  restructureOverview,
} from './resource';
import { RESOURCE_DOMAIN } from '../../constants';
import { processActivityReportObjectiveForResourcesById } from '../resource';

const RECIPIENT_ID = 46204400;
const GRANT_ID_ONE = 107843;
const REGION_ID = 14;
const NON_HEADSTART_DOMAIN = 'non.test1.gov';
const HEADSTART_RESOURCE_URL = `https://${RESOURCE_DOMAIN.HEAD_START}/test`;
const HEADSTART_RESOURCE_URL2 = `https://${RESOURCE_DOMAIN.HEAD_START}/test2`;
const NON_HEADSTART_RESOURCE_URL = `https://${NON_HEADSTART_DOMAIN}/a/b/c`;
const MAPPED_ECLKC_RESOURCE = 'https://eclkc.ohs.acf.hhs.gov/testmapped';

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
  HeadStartResourcesUsed: ['test'],
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

let goal;
let objective;
let goalTwo;
let goalThree;
let objectiveTwo;
let objectiveThree;
let activityReportOneObjectiveOne;
let activityReportOneObjectiveTwo;
let activityReportOneObjectiveThree; // Topic but no resources.
let activityReportObjectiveTwo;
let activityReportObjectiveThree;
let arIds;

describe('Resources dashboard', () => {
  beforeAll(async () => {
    await User.findOrCreate({ where: mockUser, individualHooks: true });
    await Recipient.findOrCreate({ where: mockRecipient, individualHooks: true });
    await Grant.findOrCreate({
      where: mockGrant,
      validate: true,
      individualHooks: true,
    });
    [goal] = await Goal.findOrCreate({ where: mockGoal, validate: true, individualHooks: true });
    [goalTwo] = await Goal.findOrCreate({ where: { ...mockGoal, name: 'Goal 2' }, validate: true, individualHooks: true });
    [goalThree] = await Goal.findOrCreate({ where: { ...mockGoal, name: 'Goal 3' }, validate: true, individualHooks: true });
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

    [objectiveThree] = await Objective.findOrCreate({
      where: {
        title: 'Objective 3',
        goalId: goalThree.dataValues.id,
        status: 'In Progress',
      },
    });

    // Create topics if they don't exist
    const [classOrgTopicCreated] = await Topic.findOrCreate({
      where: { name: 'CLASS: Classroom Organization' },
      defaults: { name: 'CLASS: Classroom Organization' },
    });

    const [erseaTopicCreated] = await Topic.findOrCreate({
      where: { name: 'ERSEA' },
      defaults: { name: 'ERSEA' },
    });

    const [coachingTopicCreated] = await Topic.findOrCreate({
      where: { name: 'Coaching' },
      defaults: { name: 'Coaching' },
    });

    const [facilitiesTopicCreated] = await Topic.findOrCreate({
      where: { name: 'Facilities' },
      defaults: { name: 'Facilities' },
    });

    const [fiscalBudgetTopicCreated] = await Topic.findOrCreate({
      where: { name: 'Fiscal / Budget' },
      defaults: { name: 'Fiscal / Budget' },
    });

    const [nutritionTopicCreated] = await Topic.findOrCreate({
      where: { name: 'Nutrition' },
      defaults: { name: 'Nutrition' },
    });

    const [oralHealthTopicCreated] = await Topic.findOrCreate({
      where: { name: 'Oral Health' },
      defaults: { name: 'Oral Health' },
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
        topicId: classOrgTopicCreated.id,
      },
    });

    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportOneObjectiveOne.id,
        topicId: erseaTopicCreated.id,
      },
    });

    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportOneObjectiveOne.id,
        topicId: coachingTopicCreated.id,
      },
    });

    // Report 1 HeadStart Resource 1.
    // Report 1 Non-HeadStart Resource 1.
    await processActivityReportObjectiveForResourcesById(
      activityReportOneObjectiveOne.id,
      [HEADSTART_RESOURCE_URL, NON_HEADSTART_RESOURCE_URL, MAPPED_ECLKC_RESOURCE],
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
        topicId: coachingTopicCreated.id,
      },
    });

    await processActivityReportObjectiveForResourcesById(
      activityReportOneObjectiveTwo.id,
      [HEADSTART_RESOURCE_URL, NON_HEADSTART_RESOURCE_URL],
    );

    // Report 1 - Activity Report Objective 3 (No resources)
    // This topic should NOT count as there are no resources.
    [activityReportOneObjectiveThree] = await ActivityReportObjective.findOrCreate({
      where: {
        activityReportId: reportOne.id,
        status: 'Complete',
        objectiveId: objectiveThree.id,
      },
    });

    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportOneObjectiveThree.id,
        topicId: nutritionTopicCreated.id,
      },
    });

    // Report 2 (Only HeadStart).
    const reportTwo = await ActivityReport.create({ ...regionOneReportB });
    await ActivityRecipient.create({ activityReportId: reportTwo.id, grantId: mockGrant.id });

    activityReportObjectiveTwo = await ActivityReportObjective.create({
      activityReportId: reportTwo.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Report 2 HeadStart Resource 1.
    await processActivityReportObjectiveForResourcesById(
      activityReportObjectiveTwo.id,
      [HEADSTART_RESOURCE_URL, HEADSTART_RESOURCE_URL2],
    );

    // Report 2 Topic 1.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveTwo.id,
        topicId: oralHealthTopicCreated.id,
      },
    });

    // Report 3 (Only Non-HeadStart).
    const reportThree = await ActivityReport.create({ ...regionOneReportC });
    await ActivityRecipient.create({ activityReportId: reportThree.id, grantId: mockGrant.id });

    activityReportObjectiveThree = await ActivityReportObjective.create({
      activityReportId: reportThree.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Report 3 Non-HeadStart Resource 1.
    await processActivityReportObjectiveForResourcesById(
      activityReportObjectiveThree.id,
      [NON_HEADSTART_RESOURCE_URL, HEADSTART_RESOURCE_URL2],
    );

    // Report 3 Topic 1.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveThree.id,
        topicId: nutritionTopicCreated.id,
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
        topicId: facilitiesTopicCreated.id,
      },
    });

    // Report 4 Topic 2.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveForReport4.id,
        topicId: fiscalBudgetTopicCreated.id,
      },
    });

    // Report 4 Topic 3.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveForReport4.id,
        topicId: erseaTopicCreated.id,
      },
    });

    // Report 4 Non-HeadStart Resource 1.
    await processActivityReportObjectiveForResourcesById(
      activityReportObjectiveForReport4.id,
      [HEADSTART_RESOURCE_URL2],
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
        topicId: facilitiesTopicCreated.id,
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

    // Report Draft HeadStart Resource 1.
    // Report Draft Non-HeadStart Resource 1.
    await processActivityReportObjectiveForResourcesById(
      activityReportObjectiveDraft.id,
      [HEADSTART_RESOURCE_URL, NON_HEADSTART_RESOURCE_URL],
    );

    // Draft Report 5 Topic 2.
    await ActivityReportObjectiveTopic.findOrCreate({
      where: {
        activityReportObjectiveId: activityReportObjectiveDraft.id,
        topicId: erseaTopicCreated.id,
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
    await ActivityReportObjective.destroy({ where: { objectiveId: [objective.id, objectiveTwo.id, objectiveThree.id] } });
    await ActivityReport.destroy({ where: { id: ids } });
    await Objective.destroy({ where: { id: [objective.id, objectiveTwo.id, objectiveThree.id] }, force: true });
    await Goal.destroy({ where: { id: [goal.id, goalTwo.id, goalThree.id] }, force: true });
    await Grant.destroy({ where: { id: GRANT_ID_ONE }, individualHooks: true });
    await User.destroy({ where: { id: [mockUser.id] } });
    await Recipient.destroy({ where: { id: RECIPIENT_ID } });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resourceUseFlat', async () => {
    const scopes = await filtersToScopes({ 'region.in': [REGION_ID], 'startDate.win': '2021/01/01-2021/01/31' });
    let resourceUseResult;
    const mappedResource = await Resource.findOne({
      where: { url: MAPPED_ECLKC_RESOURCE },
    });

    await db.sequelize.transaction(async () => {
      ({ resourceUseResult } = await resourceFlatData(scopes));

      expect(resourceUseResult).toBeDefined();
      expect(resourceUseResult.length).toBe(4);

      expect(resourceUseResult).toStrictEqual([
        {
          date: '2021-01-01',
          url: 'https://headstart.gov/test',
          rollUpDate: 'Jan-21',
          title: null,
          resourceCount: '2',
          totalCount: '2',
        },
        {
          date: '2021-01-01',
          url: 'https://headstart.gov/test2',
          rollUpDate: 'Jan-21',
          title: null,
          resourceCount: '3',
          totalCount: '3',
        },
        {
          date: '2021-01-01',
          url: 'https://headstart.gov/testmapped',
          rollUpDate: 'Jan-21',
          title: null,
          resourceCount: '1',
          totalCount: '1',
        },
        {
          date: '2021-01-01',
          url: 'https://non.test1.gov/a/b/c',
          rollUpDate: 'Jan-21',
          title: null,
          resourceCount: '2',
          totalCount: '2',
        },
      ]);
    });
  });

  it('resourceTopicUseFlat', async () => {
    const scopes = await filtersToScopes({ 'region.in': [REGION_ID], 'startDate.win': '2021/01/01-2021/01/31' });
    let topicUseResult;
    await db.sequelize.transaction(async () => {
      ({ topicUseResult } = await resourceFlatData(scopes));

      expect(topicUseResult).toBeDefined();

      expect(topicUseResult).toStrictEqual([
        {
          name: 'CLASS: Classroom Organization', rollUpDate: 'Jan-21', resourceCount: '3', totalCount: '3', date: '2021-01-01',
        },
        {
          name: 'Coaching', rollUpDate: 'Jan-21', resourceCount: '3', totalCount: '3', date: '2021-01-01',
        },
        {
          name: 'ERSEA', rollUpDate: 'Jan-21', resourceCount: '4', totalCount: '4', date: '2021-01-01',
        },
        {
          name: 'Facilities', rollUpDate: 'Jan-21', resourceCount: '1', totalCount: '1', date: '2021-01-01',
        },
        {
          name: 'Fiscal / Budget', rollUpDate: 'Jan-21', resourceCount: '1', totalCount: '1', date: '2021-01-01',
        },
        {
          name: 'Nutrition', rollUpDate: 'Jan-21', resourceCount: '2', totalCount: '2', date: '2021-01-01',
        },
        {
          name: 'Oral Health', rollUpDate: 'Jan-21', resourceCount: '2', totalCount: '2', date: '2021-01-01',
        },
      ]);
    });
  });

  it('overviewFlat', async () => {
    const scopes = await filtersToScopes({ 'region.in': [REGION_ID], 'startDate.win': '2021/01/01-2021/01/31' });
    let overView;
    await db.sequelize.transaction(async () => {
      ({ overView } = await resourceFlatData(scopes));

      expect(overView).toBeDefined();
      const {
        numberOfParticipants,
        numberOfRecipients,
        pctOfReportsWithResources,
        pctOfHeadStartResources,
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
          resourcesPct: '80.00',
        },
      ]);

      // Percent of HeadStart reports.
      expect(pctOfHeadStartResources).toStrictEqual([
        {
          headStartCount: '3',
          allCount: '4',
          headStartPct: '75.00',
        },
      ]);
    });
  });

  it('resourceDateHeadersFlat', async () => {
    const scopes = await filtersToScopes({ 'region.in': [REGION_ID], 'startDate.win': '2021/01/01-2021/01/31' });
    let dateHeaders;
    await db.sequelize.transaction(async () => {
      ({ dateHeaders } = await resourceFlatData(scopes));
      expect(dateHeaders).toBeDefined();
      expect(dateHeaders.length).toBe(1);
      expect(dateHeaders).toStrictEqual([
        {
          rollUpDate: 'Jan-21',
        },
      ]);
    });
  });

  it('should roll up resource use results correctly', async () => {
    const data = {
      resourceUseResult: [
        {
          url: 'http://google.com', resourceCount: 1, rollUpDate: 'Jan-21', title: null, totalCount: 10,
        },
        {
          url: 'http://google.com', resourceCount: 2, rollUpDate: 'Feb-21', title: null, totalCount: 10,
        },
        {
          url: 'http://google.com', resourceCount: 3, rollUpDate: 'Mar-21', title: null, totalCount: 10,
        },
        {
          url: 'http://google.com', resourceCount: 4, rollUpDate: 'Apr-21', title: null, totalCount: 10,
        },
        {
          url: 'http://github.com', resourceCount: 1, rollUpDate: 'Jan-21', title: null, totalCount: 10,
        },
        {
          url: 'http://github.com', resourceCount: 2, rollUpDate: 'Feb-21', title: null, totalCount: 10,
        },
        {
          url: 'http://github.com', resourceCount: 3, rollUpDate: 'Mar-21', title: null, totalCount: 10,
        },
        {
          url: 'http://github.com', resourceCount: 4, rollUpDate: 'Apr-21', title: null, totalCount: 10,
        },
        {
          url: 'http://yahoo.com', resourceCount: 1, rollUpDate: 'Jan-21', title: null, totalCount: 10,
        },
        {
          url: 'http://yahoo.com', resourceCount: 2, rollUpDate: 'Feb-21', title: null, totalCount: 10,
        },
        {
          url: 'http://yahoo.com', resourceCount: 3, rollUpDate: 'Mar-21', title: null, totalCount: 10,
        },
        {
          url: 'http://yahoo.com', resourceCount: 4, rollUpDate: 'Apr-21', title: null, totalCount: 10,
        },
      ],
    };

    const result = await rollUpResourceUse(data);

    expect(result).toEqual([
      {
        heading: 'http://github.com',
        url: 'http://github.com',
        total: 10,
        title: null,
        sortBy: 'http://github.com',
        isUrl: true,
        data: [
          {
            title: 'Jan-21', value: 1,
          },
          {
            title: 'Feb-21', value: 2,
          },
          {
            title: 'Mar-21', value: 3,
          },
          {
            title: 'Apr-21', value: 4,
          },
          {
            title: 'Total', value: 10,
          },
        ],
      },
      {
        heading: 'http://google.com',
        url: 'http://google.com',
        title: null,
        sortBy: 'http://google.com',
        total: 10,
        isUrl: true,
        data: [
          {
            title: 'Jan-21', value: 1,
          },
          {
            title: 'Feb-21', value: 2,
          },
          {
            title: 'Mar-21', value: 3,
          },
          {
            title: 'Apr-21', value: 4,
          },
          {
            title: 'Total', value: 10,
          },
        ],
      },
      {
        heading: 'http://yahoo.com',
        url: 'http://yahoo.com',
        total: 10,
        title: null,
        sortBy: 'http://yahoo.com',
        isUrl: true,
        data: [
          {
            title: 'Jan-21', value: 1,
          },
          {
            title: 'Feb-21', value: 2,
          },
          {
            title: 'Mar-21', value: 3,
          },
          {
            title: 'Apr-21', value: 4,
          },
          {
            title: 'Total', value: 10,
          },
        ],
      },
    ]);
  });

  it('should roll up topic use results correctly', async () => {
    const data = {
      topicUseResult: [
        {
          name: 'CLASS: Classroom Organization', rollUpDate: 'Jan-21', resourceCount: '1', totalCount: '6',
        },
        {
          name: 'CLASS: Classroom Organization', rollUpDate: 'Feb-21', resourceCount: '2', totalCount: '6',
        },
        {
          name: 'CLASS: Classroom Organization', rollUpDate: 'Mar-21', resourceCount: '3', totalCount: '6',
        },
        {
          name: 'ERSEA', rollUpDate: 'Jan-21', resourceCount: '1', totalCount: '6',
        },
        {
          name: 'ERSEA', rollUpDate: 'Feb-21', resourceCount: '2', totalCount: '6',
        },
        {
          name: 'ERSEA', rollUpDate: 'Mar-21', resourceCount: '3', totalCount: '6',
        },
      ],
    };

    const result = await rollUpTopicUse(data);

    expect(result).toEqual([
      {
        heading: 'CLASS: Classroom Organization',
        name: 'CLASS: Classroom Organization',
        total: '6',
        isUrl: false,
        data: [
          {
            title: 'Jan-21', value: '1',
          },
          {
            title: 'Feb-21', value: '2',
          },
          {
            title: 'Mar-21', value: '3',
          },
          {
            title: 'Total', value: '6',
          },
        ],
      },
      {
        heading: 'ERSEA',
        name: 'ERSEA',
        total: '6',
        isUrl: false,
        data: [
          {
            title: 'Jan-21', value: '1',
          },
          {
            title: 'Feb-21', value: '2',
          },
          {
            title: 'Mar-21', value: '3',
          },
          {
            title: 'Total', value: '6',
          },
        ],
      },
    ]);
  });

  it('verify overview restructures correctly', async () => {
    const overviewData = {
      overView: {
        pctOfReportsWithResources: [{ resourcesPct: '80.0000', reportsWithResourcesCount: '4', totalReportsCount: '5' }],
        numberOfParticipants: [{ participants: '44' }],
        numberOfRecipients: [{ recipients: '1' }],
        pctOfHeadStartResources: [{ headStartCount: '2', allCount: '3', headStartPct: '66.6667' }],
        pctOfReportsWithCourses: [{ coursesPct: '80.0000', reportsWithCoursesCount: '4', totalReportsCount: '5' }],
      },
    };

    const result = restructureOverview(overviewData);

    expect(result).toEqual({
      report: {
        percentResources: '80.00%',
        numResources: '4',
        num: '5',
      },
      participant: {
        numParticipants: '44',
      },
      recipient: {
        numResources: '1',
      },
      resource: {
        numHeadStart: '2',
        num: '3',
        percentHeadStart: '66.67%',
      },
      ipdCourses: {
        percentReports: '80.00%',
      },
    });
  });
});

import db, {
  ActivityReport,
  ActivityRecipient,
  User,
  Recipient,
  Grant,
  NextStep,
  Goal,
  Objective,
  ActivityReportObjective,
  ActivityReportObjectiveResource,
} from '../models';
import filtersToScopes from '../scopes';
import { resourceList, resourceDomainList, resourcesDashboardOverview } from './resourceList';
import { REPORT_STATUSES, RESOURCE_DOMAIN } from '../constants';
import { processActivityReportObjectiveForResourcesById } from '../services/resource';

const RECIPIENT_ID = 46204400;
const GRANT_ID_ONE = 107843;
const REGION_ID = 14;
const NONECLKC_DOMAIN = 'non.test1.gov';
const ECLKC_RESOURCE_URL = `https://${RESOURCE_DOMAIN.ECLKC}/test`;
const NONECLKC_RESOURCE_URL = `https://${NONECLKC_DOMAIN}/a/b/c`;

const mockUser = {
  id: 5426871,
  homeRegionId: 1,
  name: 'user5426862',
  hsesUsername: 'user5426862',
  hsesUserId: '5426862',
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
    { activityRecipientId: GRANT_ID_ONE },
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
  topics: ['topics'],
  ttaType: ['technical-assistance'],
};

const regionOneReportA = {
  ...reportObject,
  regionId: REGION_ID,
  duration: 1,
  startDate: '2021-01-01T12:00:00Z',
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
  startDate: '2021-01-01T12:00:00Z',
  endDate: '2021-01-31T12:00:00Z',
  submissionStatus: REPORT_STATUSES.DRAFT,
  calculatedStatus: REPORT_STATUSES.DRAFT,
};

let goal;
let objective;
let activityReportObjectiveOne;
let activityReportObjectiveTwo;
let activityReportObjectiveThree;

describe('Resources list widget', () => {
  beforeAll(async () => {
    await User.create(mockUser);
    await Recipient.create({ ...mockRecipient });
    await Grant.create({ ...mockGrant }, { validate: true, individualHooks: true });
    goal = await Goal.create({ ...mockGoal }, { validate: true, individualHooks: true });
    objective = await Objective.create({
      title: 'Objective 1',
      goalId: goal.id,
      status: 'In Progress',
    });

    // Report 1 (Mixed Resources).
    const reportOne = await ActivityReport.create({ ...regionOneReportA });
    await ActivityRecipient.create({ activityReportId: reportOne.id, grantId: mockGrant.id });

    activityReportObjectiveOne = await ActivityReportObjective.create({
      activityReportId: reportOne.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    const x = await processActivityReportObjectiveForResourcesById(
      activityReportObjectiveOne.id,
      [ECLKC_RESOURCE_URL, NONECLKC_RESOURCE_URL],
    );
    // console.log(x);

    // // Report 1 ECLKC Resource 1.
    // await ActivityReportObjectiveResource.create({
    //   activityReportObjectiveId: activityReportObjectiveOne.id,
    //   userProvidedUrl: ECLKC_RESOURCE_URL,
    // });

    // // Report 1 Non-ECLKC Resource 1.
    // await ActivityReportObjectiveResource.create({
    //   activityReportObjectiveId: activityReportObjectiveOne.id,
    //   userProvidedUrl: NONECLKC_RESOURCE_URL,
    // });

    // Report 2 (Only ECLKC).
    const reportTwo = await ActivityReport.create({ ...regionOneReportB });
    await ActivityRecipient.create({ activityReportId: reportTwo.id, grantId: mockGrant.id });

    activityReportObjectiveTwo = await ActivityReportObjective.create({
      activityReportId: reportTwo.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    await processActivityReportObjectiveForResourcesById(
      activityReportObjectiveTwo.id,
      [ECLKC_RESOURCE_URL],
    );
    // // Report 2 ECLKC Resource 1.
    // await ActivityReportObjectiveResource.create({
    //   activityReportObjectiveId: activityReportObjectiveTwo.id,
    //   userProvidedUrl: ECLKC_RESOURCE_URL,
    // });

    // Report 3 (Only Non-ECLKC).
    const reportThree = await ActivityReport.create({ ...regionOneReportC });
    await ActivityRecipient.create({ activityReportId: reportThree.id, grantId: mockGrant.id });

    activityReportObjectiveThree = await ActivityReportObjective.create({
      activityReportId: reportThree.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    await processActivityReportObjectiveForResourcesById(
      activityReportObjectiveThree.id,
      [NONECLKC_RESOURCE_URL],
    );

    // // Report 3 Non-ECLKC Resource 1.
    // await ActivityReportObjectiveResource.create({
    //   activityReportObjectiveId: activityReportObjectiveThree.id,
    //   userProvidedUrl: NONECLKC_RESOURCE_URL,
    // });

    // Report 4 (No Resources).
    const reportFour = await ActivityReport.create({ ...regionOneReportD });
    await ActivityRecipient.create({ activityReportId: reportFour.id, grantId: mockGrant.id });

    await ActivityReportObjective.create({
      activityReportId: reportFour.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Draft Report (Excluded).
    const reportDraft = await ActivityReport.create({ ...regionOneDraftReport });
    await ActivityRecipient.create({ activityReportId: reportDraft.id, grantId: mockGrant.id });

    const activityReportObjectiveDraft = await ActivityReportObjective.create({
      activityReportId: reportDraft.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    await processActivityReportObjectiveForResourcesById(
      activityReportObjectiveDraft.id,
      [ECLKC_RESOURCE_URL, NONECLKC_RESOURCE_URL],
    );

    // // Report Draft ECLKC Resource 1.
    // await ActivityReportObjectiveResource.create({
    //   activityReportObjectiveId: activityReportObjectiveDraft.id,
    //   userProvidedUrl: ECLKC_RESOURCE_URL,
    // });

    // // Report Draft Non-ECLKC Resource 1.
    // await ActivityReportObjectiveResource.create({
    //   activityReportObjectiveId: activityReportObjectiveDraft.id,
    //   userProvidedUrl: NONECLKC_RESOURCE_URL,
    // });
  });

  afterAll(async () => {
    const reports = await ActivityReport
      .findAll({ where: { userId: [mockUser.id] } });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });

    await ActivityReportObjectiveResource.destroy({
      where: {
        activityReportObjectiveId: activityReportObjectiveOne.id,
      },
    });

    await ActivityReportObjective.destroy({ where: { objectiveId: objective.id } });
    await ActivityReport.destroy({ where: { id: ids } });
    await Objective.destroy({ where: { id: objective.id } });
    await Goal.destroy({ where: { id: goal.id } });
    await Grant.destroy({ where: { id: GRANT_ID_ONE } });
    await User.destroy({ where: { id: [mockUser.id] } });
    await Recipient.destroy({ where: { id: RECIPIENT_ID } });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves resources list within date range for specified region', async () => {
    const scopes = filtersToScopes({
      'region.in': [REGION_ID],
      'startDate.win': '2021/01/01-2021/01/31',
      'creator.ctn': [mockUser.id],
      'recipientId.ctn': [RECIPIENT_ID],
      // 'grantNumber.ctn': GRANT_ID_ONE,
    });
    const { activityReport: reportScope } = await filtersToScopes({
      'region.in': [REGION_ID],
      'startDate.win': '2021/01/01-2021/01/31',
      'creator.ctn': [mockUser.id],
    });
    const { goal: goalScope } = await filtersToScopes({ 'recipientId.ctn': [RECIPIENT_ID] }, 'goal');
    const res = await resourceList({ report: reportScope, goal: goalScope });
    expect(res.length).toBe(3);

    expect(res[0].name).toBe(ECLKC_RESOURCE_URL);
    expect(res[0].url).toBe(ECLKC_RESOURCE_URL);
    expect(res[0].count).toBe(2);
    expect(res[0].reportCount).toBe(2);
    expect(res[0].participantCount).toBe(22);
    expect(res[0].recipientCount).toBe(1);

    expect(res[1].name).toBe(NONECLKC_RESOURCE_URL);
    expect(res[1].url).toBe(NONECLKC_RESOURCE_URL);
    expect(res[1].count).toBe(2);
    expect(res[1].reportCount).toBe(2);
    expect(res[1].participantCount).toBe(22);
    expect(res[1].recipientCount).toBe(1);

    expect(res[2].name).toBe('none');
    expect(res[2].url).toBe(null);
    expect(res[2].count).toBe(1);
    expect(res[2].reportCount).toBe(1);
    expect(res[2].participantCount).toBe(11);
    expect(res[2].recipientCount).toBe(0);
  });

  it('retrieves resources list short date range for specified region', async () => {
    const scopes = filtersToScopes({ 'region.in': [REGION_ID], 'startDate.win': '2021/01/01-2021/01/20' });
    const res = await resourceList(scopes);
    expect(res.length).toBe(2);

    expect(res[0].name).toBe(ECLKC_RESOURCE_URL);
    expect(res[0].url).toBe(ECLKC_RESOURCE_URL);
    expect(res[0].count).toBe(2);
    expect(res[0].reportCount).toBe(2);
    expect(res[0].participantCount).toBe(22);
    expect(res[0].recipientCount).toBe(1);

    expect(res[1].name).toBe(NONECLKC_RESOURCE_URL);
    expect(res[1].url).toBe(NONECLKC_RESOURCE_URL);
    expect(res[1].count).toBe(2);
    expect(res[1].reportCount).toBe(2);
    expect(res[0].participantCount).toBe(22);
    expect(res[1].recipientCount).toBe(1);
  });

  it('retrieves resources domain list within date range for specified region', async () => {
    const scopes = filtersToScopes({ 'region.in': [REGION_ID], 'startDate.win': '2021/01/01-2021/01/31' });
    const domains = await resourceDomainList(scopes);
    expect(domains.length).toBe(2);

    expect(domains[0].domain).toBe(RESOURCE_DOMAIN.ECLKC);
    expect(domains[0].count).toBe(2);
    expect(domains[0].resourceCount).toBe(1);
    expect(domains[0].reportCount).toBe(2);
    expect(domains[0].recipientCount).toBe(1);

    expect(domains[1].domain).toBe(NONECLKC_DOMAIN);
    expect(domains[1].count).toBe(2);
    expect(domains[1].resourceCount).toBe(1);
    expect(domains[1].reportCount).toBe(2);
    expect(domains[1].recipientCount).toBe(1);
  });

  it('retrieves resources dashboard overview within date range for specified region', async () => {
    const scopes = filtersToScopes({ 'region.in': [REGION_ID], 'startDate.win': '2021/01/01-2021/01/31' });
    const data = await resourcesDashboardOverview(scopes);
    expect(data).toStrictEqual({
      recipient: {
        num: '1',
        numEclkc: '1',
        numNoResources: '0',
        numNonEclkc: '1',
        numResources: '1',
        percentEclkc: '100.00%',
        percentNoResources: '0%',
        percentNonEclkc: '100.00%',
        percentResources: '100.00%',
      },
      report: {
        num: '4',
        numEclkc: '2',
        numNoResources: '1',
        numNonEclkc: '2',
        numResources: '3',
        percentEclkc: '50.00%',
        percentNoResources: '25.00%',
        percentNonEclkc: '50.00%',
        percentResources: '75.00%',
      },
      resource: {
        num: '2',
        numEclkc: '1',
        numNonEclkc: '1',
        percentEclkc: '50.00%',
        percentNonEclkc: '50.00%',
      },
    });
  });
});

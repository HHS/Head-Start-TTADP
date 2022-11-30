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
import resourceList from './resourceList';
import { REPORT_STATUSES } from '../constants';

const RECIPIENT_ID = 462044;
const GRANT_ID_ONE = 107843;

const mockUser = {
  id: 5426871,
  homeRegionId: 1,
  name: 'user5426862',
  hsesUsername: 'user5426862',
  hsesUserId: '5426862',
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
  regionId: 8,
  duration: 1,
  startDate: '2021-01-01T12:00:00Z',
  endDate: '2021-01-31T12:00:00Z',
};

const regionOneReportB = {
  ...reportObject,
  regionId: 8,
  duration: 2,
  startDate: '2021-01-15T12:00:00Z',
  endDate: '2021-02-15T12:00:00Z',
};

const regionOneReportC = {
  ...reportObject,
  regionId: 8,
  duration: 3,
  startDate: '2021-01-20T12:00:00Z',
  endDate: '2021-02-28T12:00:00Z',
};

const regionOneReportD = {
  ...reportObject,
  regionId: 8,
  duration: 3,
  startDate: '2021-01-22T12:00:00Z',
  endDate: '2021-01-31T12:00:00Z',
};

const regionOneDraftReport = {
  ...reportObject,
  regionId: 8,
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
    await Recipient.create({ name: 'recipient', id: RECIPIENT_ID, uei: 'NNA5N2KHMGN2' });
    await Grant.create(
      {
        id: GRANT_ID_ONE, number: GRANT_ID_ONE, recipientId: RECIPIENT_ID, regionId: 3, status: 'Active',
      },
      { validate: true, individualHooks: true },
    );

    goal = await Goal.create({
      name: 'Goal 1',
      status: 'Draft',
      endDate: null,
      isFromSmartsheetTtaPlan: false,
      onApprovedAR: false,
      grantId: GRANT_ID_ONE,
      createdVia: 'rtr',
    });

    objective = await Objective.create({
      title: 'Objective 1',
      goalId: goal.id,
      status: 'In Progress',
    });

    // Report 1 (Mixed Resources).
    const reportOne = await ActivityReport.create({ ...regionOneReportA });

    activityReportObjectiveOne = await ActivityReportObjective.create({
      activityReportId: reportOne.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Report 1 ECLKC Resource 1.
    await ActivityReportObjectiveResource.create({
      activityReportObjectiveId: activityReportObjectiveOne.id,
      userProvidedUrl: 'https://eclkc.test1.gov',
    });

    // Report 1 Non-ECLKC Resource 1.
    await ActivityReportObjectiveResource.create({
      activityReportObjectiveId: activityReportObjectiveOne.id,
      userProvidedUrl: 'https://non.test1.gov',
    });

    // Report 2 (Only ECLKC).
    const reportTwo = await ActivityReport.create({ ...regionOneReportB });

    activityReportObjectiveTwo = await ActivityReportObjective.create({
      activityReportId: reportTwo.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Report 2 ECLKC Resource 1.
    await ActivityReportObjectiveResource.create({
      activityReportObjectiveId: activityReportObjectiveTwo.id,
      userProvidedUrl: 'https://eclkc.test1.gov',
    });

    // Report 3 (Only Non-ECLKC).
    const reportThree = await ActivityReport.create({ ...regionOneReportC });

    activityReportObjectiveThree = await ActivityReportObjective.create({
      activityReportId: reportThree.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Report 3 Non-ECLKC Resource 1.
    await ActivityReportObjectiveResource.create({
      activityReportObjectiveId: activityReportObjectiveThree.id,
      userProvidedUrl: 'https://non.test1.gov',
    });

    // Report 4 (No Resources).
    const activityReportFour = await ActivityReport.create({ ...regionOneReportD });

    await ActivityReportObjective.create({
      activityReportId: activityReportFour.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Draft Report (Excluded).
    const activityReportDraft = await ActivityReport.create({ ...regionOneDraftReport });

    const activityReportObjectiveDraft = await ActivityReportObjective.create({
      activityReportId: activityReportDraft.id,
      status: 'Complete',
      objectiveId: objective.id,
    });

    // Report Draft ECLKC Resource 1.
    await ActivityReportObjectiveResource.create({
      activityReportObjectiveId: activityReportObjectiveDraft.id,
      userProvidedUrl: 'https://test1.eclkc.gov',
    });

    // Report Draft Non-ECLKC Resource 1.
    await ActivityReportObjectiveResource.create({
      activityReportObjectiveId: activityReportObjectiveDraft.id,
      userProvidedUrl: 'https://non.test1.gov',
    });
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

    await Objective.destroy({
      where: {
        id: objective.id,
      },
    });

    await Goal.destroy({
      where: {
        id: goal.id,
      },
    });

    await User.destroy({ where: { id: [mockUser.id] } });
    await Grant.destroy({ where: { id: GRANT_ID_ONE } });
    await Recipient.destroy({ where: { id: RECIPIENT_ID } });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves resources list within date range for specified region', async () => {
    const scopes = filtersToScopes({ 'region.in': ['8'], 'startDate.win': '2021/01/01-2021/01/31' });
    const res = await resourceList(scopes);
    expect(res.length).toBe(3);

    expect(res[0].name).toBe('https://eclkc.test1.gov');
    expect(res[0].count).toBe(2);
    expect(res[1].name).toBe('https://non.test1.gov');
    expect(res[1].count).toBe(2);
    expect(res[2].name).toBe('none');
    expect(res[2].count).toBe(1);
  });

  it('retrieves reason list short date range for specified region', async () => {
    const scopes = filtersToScopes({ 'region.in': ['8'], 'startDate.win': '2021/01/01-2021/01/20' });
    const res = await resourceList(scopes);
    expect(res.length).toBe(2);
    expect(res[0].name).toBe('https://eclkc.test1.gov');
    expect(res[0].count).toBe(2);
    expect(res[1].name).toBe('https://non.test1.gov');
    expect(res[1].count).toBe(2);
  });
});

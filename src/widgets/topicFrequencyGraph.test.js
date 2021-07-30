import db, {
  ActivityReport, ActivityRecipient, User, Grantee, Grant, NextStep, Region,
} from '../models';
import { filtersToScopes } from '../scopes/activityReport';
import { REPORT_STATUSES } from '../constants';
import { createOrUpdate } from '../services/activityReports';
import topicFrequencyGraph, { topics } from './topicFrequencyGraph';

const BASE_REASONS = topics.map((topic) => ({
  reason: topic,
  count: 0,
  roles: [],
}));

const GRANTEE_ID = 30;

const mockUser = {
  id: 2000,
  homeRegionId: 1,
  name: 'user1000',
  hsesUsername: 'user1000',
  hsesUserId: '1000',
  role: ['Grants Specialist'],
};

const reportObject = {
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { activityRecipientId: GRANTEE_ID },
  ],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'in-person',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants', 'genies'],
  topics: ['Program Planning and Services'],
  ttaType: ['technical-assistance'],
};

const regionOneReport = {
  ...reportObject,
  regionId: 17,
};

const regionOneReportDistinctDate = {
  ...reportObject,
  startDate: '2000-06-01T12:00:00Z',
  endDate: '2000-06-02T12:00:00Z',
  regionId: 17,
};

const regionTwoReport = {
  ...reportObject,
  regionId: 18,
};

describe('Topics and frequency graph widget', () => {
  beforeAll(async () => {
    await User.create(mockUser);
    await Grantee.findOrCreate({ where: { name: 'grantee', id: GRANTEE_ID } });
    await Region.create({ name: 'office 17', id: 17 });
    await Region.create({ name: 'office 18', id: 18 });
    await Grant.findOrCreate({
      where: {
        id: GRANTEE_ID, number: '1', granteeId: GRANTEE_ID, regionId: 17, status: 'Active', startDate: new Date('2000/01/01'),
      },
    });

    const reportOne = await ActivityReport.findOne({ where: { duration: 1 } });
    await createOrUpdate(regionOneReport, reportOne);

    const reportTwo = await ActivityReport.findOne({ where: { duration: 2 } });
    await createOrUpdate({ ...regionOneReportDistinctDate, duration: 2, topics: ['Program Planning and Services', 'Recordkeeping and Reporting'] }, reportTwo);

    const reportThree = await ActivityReport.findOne({ where: { duration: 3 } });
    await createOrUpdate({ ...regionTwoReport, duration: 3 }, reportThree);
  });

  afterAll(async () => {
    const reports = await ActivityReport
      .findAll({ where: { userId: [mockUser.id] } });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: [mockUser.id] } });
    await Grant.destroy({
      where:
      { id: [GRANTEE_ID] },
    });
    await Grantee.destroy({
      where:
      { id: [GRANTEE_ID] },
    });
    await Region.destroy({ where: { id: 17 } });
    await Region.destroy({ where: { id: 18 } });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns data in the correct format', async () => {
    const query = { 'region.in': [17], 'startDate.win': '2000/01/01-2000/01/01' };
    const scopes = filtersToScopes(query);
    const data = await topicFrequencyGraph(scopes);

    const reasons = [...BASE_REASONS];
    const reasonToModify = reasons.find((reason) => reason.reason === 'Program Planning and Services');

    reasonToModify.count = 1;
    reasonToModify.roles = ['Grants Specialist'];

    expect(data).toStrictEqual(reasons);
  });

  it('respects the region scope', async () => {
    const query = { 'region.in': [18], 'startDate.win': '2000/01/01-2000/01/01' };
    const scopes = filtersToScopes(query);
    const data = await topicFrequencyGraph(scopes);
    const reasons = [...BASE_REASONS];
    const reasonToModify = reasons.find((reason) => reason.reason === 'Program Planning and Services');
    reasonToModify.count = 1;
    reasonToModify.roles = ['Grants Specialist'];

    expect(data).toStrictEqual(reasons);
  });

  it('respects the date scope', async () => {
    const query = { 'region.in': [17], 'startDate.win': '2000/01/01-2000/06/02' };
    const scopes = filtersToScopes(query);
    const data = await topicFrequencyGraph(scopes);

    const reasons = [...BASE_REASONS];
    const reasonToModify = reasons.find((reason) => reason.reason === 'Program Planning and Services');

    reasonToModify.count = 2;
    reasonToModify.roles = ['Grants Specialist'];

    const secondReasonToModify = reasons.find((reason) => reason.reason === 'Recordkeeping and Reporting');
    secondReasonToModify.count = 1;
    secondReasonToModify.roles = ['Grants Specialist'];

    expect(data).toStrictEqual(reasons);
  });
});

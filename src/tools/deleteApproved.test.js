import {
  sequelize,
  ActivityReport,
  ActivityRecipient,
  User,
  Grantee,
  Grant,
  NextStep,
} from '../models';
import { REPORT_STATUSES } from '../constants';
import deleteApproved from './deleteApproved';

jest.mock('../logger');

const GRANTEE_ID_ONE = 7778;
const GRANTEE_ID_TWO = 7775;
const GRANT_ID_ONE = 88889;
const GRANT_ID_TWO = 88886;

const mockUser = {
  id: 3004,
  homeRegionId: 1,
  name: 'user3004',
  hsesUsername: 'user3004',
  hsesUserId: '3004',
  email: 'user3004@test.com',
};

const mockCollaboratorOne = {
  id: 3006,
  homeRegionId: 1,
  name: 'user3006',
  hsesUsername: 'user3006',
  hsesUserId: '3006',
  email: 'user3006@test.com',
};

const mockCollaboratorTwo = {
  id: 3007,
  homeRegionId: 1,
  name: 'user3007',
  hsesUsername: 'user3007',
  hsesUserId: '3007',
  email: 'user3007@test.com',
};

const reportObject = {
  activityRecipientType: 'grantee',
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { activityRecipientId: GRANTEE_ID_ONE },
    { activityRecipientId: GRANTEE_ID_TWO },
  ],
  status: REPORT_STATUSES.APPROVED,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
};

describe('deleteApproved', () => {
  beforeAll(async () => {
    await User.findOrCreate({ where: mockUser });
    await User.findOrCreate({ where: mockCollaboratorOne });
    await User.findOrCreate({ where: mockCollaboratorTwo });

    await Grantee.findOrCreate({ where: { name: 'Agency Three, Inc.', id: GRANTEE_ID_ONE } });
    await Grantee.findOrCreate({ where: { name: 'Agency Four', id: GRANTEE_ID_TWO } });
    await Grant.findOrCreate({
      where: {
        id: GRANT_ID_ONE, number: '01GN011312', granteeId: GRANTEE_ID_ONE, regionId: 1, status: 'Active',
      },
    });
    await Grant.findOrCreate({
      where: {
        id: GRANT_ID_TWO, number: '01GN011412', granteeId: GRANTEE_ID_TWO, regionId: 1, status: 'Active',
      },
    });
  });

  afterAll(async () => {
    const reports = await ActivityReport.findAll({
      where: {
        userId: [
          mockUser.id,
          mockCollaboratorOne.id,
          mockCollaboratorTwo.id,
        ],
      },
    });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({
      where: {
        id: [
          mockUser.id,
          mockCollaboratorOne.id,
          mockCollaboratorTwo.id,
        ],
      },
    });
    await Grant.destroy({ where: { id: GRANT_ID_ONE } });
    await Grant.destroy({ where: { id: GRANT_ID_TWO } });
    await Grantee.destroy({ where: { id: GRANTEE_ID_ONE } });
    await Grantee.destroy({ where: { id: GRANTEE_ID_TWO } });
    await sequelize.close();
  });

  it('changes activity report(s) status to deleted', async () => {
    const report = await ActivityReport.create(reportObject);

    expect(report.status).toBe(REPORT_STATUSES.APPROVED);
    await deleteApproved(report.id.toString());

    const deletedReport = await ActivityReport.unscoped().findOne({ where: { id: report.id } });

    expect(deletedReport.status).toBe(REPORT_STATUSES.DELETED);
  });
});

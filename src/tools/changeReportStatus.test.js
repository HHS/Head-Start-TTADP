import {
  sequelize,
  ActivityReport,
  Approval,
  Collaborator,
  User,
  UserRole,
  Role,
} from '../models';
import { REPORT_STATUSES } from '../constants';
import changeReportStatus from './changeReportStatus';
import { createOrUpdate } from '../services/activityReports';
import { destroyReport } from '../testUtils';

jest.mock('../logger');

const mockUser = {
  id: 5426861,
  homeRegionId: 1,
  name: 'user5426861',
  hsesUsername: 'user5426861',
  hsesUserId: '5426861',
};

const reportObject = {
  approval: {
    submissionStatus: REPORT_STATUSES.APPROVED,
    calculatedStatus: REPORT_STATUSES.APPROVED,
  },
  activityRecipientType: 'recipient',
  regionId: 1,
  ECLKCResourcesUsed: ['test'],
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
  owner: {
    userId: mockUser.id,
  },
};

describe('changeStatus', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  it('changes activity report(s) status to deleted', async () => {
    const role = await Role.create({ id: 1000, name: 'a', isSpecialist: true });
    await User.create(mockUser);
    await UserRole.create({ userId: mockUser.id, roleId: role.id });

    let report = await createOrUpdate(reportObject);

    report = await ActivityReport.findOne({
      where: { id: report.id },
      include: [
        {
          model: Approval,
          as: 'approval',
          attributes: ['submissionStatus'],
        },
        {
          model: Collaborator,
          as: 'owner',
          where: { userId: mockUser.id },
          required: true,
        },
      ],
    });

    expect(report.approval.submissionStatus).toBe(REPORT_STATUSES.APPROVED);
    await changeReportStatus(report.id.toString(), REPORT_STATUSES.DELETED);

    const deletedReport = await ActivityReport.unscoped().findOne({
      where: { id: report.id },
      include: [{ model: Approval, as: 'approval', attributes: ['submissionStatus'] }],
    });

    expect(deletedReport.approval.submissionStatus).toBe(REPORT_STATUSES.DELETED);

    await destroyReport(report);
  });

  it('handles unknown ids', async () => {
    await expect(changeReportStatus('-1', REPORT_STATUSES.DELETED)).resolves.not.toThrowError();
  });
});

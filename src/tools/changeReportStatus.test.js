import {
  sequelize,
  ActivityReport,
  Approval,
} from '../models';
import { REPORT_STATUSES } from '../constants';
import changeReportStatus from './changeReportStatus';
import { createOrUpdate } from '../services/activityReports';

jest.mock('../logger');

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
};

describe('changeStatus', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  it('changes activity report(s) status to deleted', async () => {
    let report = await createOrUpdate(reportObject);

    report = await ActivityReport.findOne({
      where: { id: report.id },
      include: [{ model: Approval, as: 'approval', attributes: ['submissionStatus'] }],
    });

    expect(report.approval.submissionStatus).toBe(REPORT_STATUSES.APPROVED);
    await changeReportStatus(report.id.toString(), 'deleted');

    const deletedReport = await ActivityReport.unscoped().findOne({
      where: { id: report.id },
      include: [{ model: Approval, as: 'approval', attributes: ['submissionStatus'] }],
    });

    expect(deletedReport.approval.submissionStatus).toBe(REPORT_STATUSES.DELETED);

    await ActivityReport.destroy({ where: { id: deletedReport.id }, individualHooks: true });
  });

  it('handles unknown ids', async () => {
    await expect(changeReportStatus('-1', 'deleted')).resolves.not.toThrowError();
  });
});

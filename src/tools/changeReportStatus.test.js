import {
  sequelize,
  ActivityReport,
} from '../models';
import { REPORT_STATUSES } from '../constants';
import changeReportStatus from './changeReportStatus';

jest.mock('../logger');

const reportObject = {
  activityRecipientType: 'grantee',
  regionId: 1,
  ECLKCResourcesUsed: ['test'],
  submissionStatus: REPORT_STATUSES.APPROVED,
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

describe('changeStatus', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  it('changes activity report(s) status to deleted', async () => {
    expect(1).toBe(1);
    const report = await ActivityReport.create(reportObject);

    expect(report.submissionStatus).toBe(REPORT_STATUSES.APPROVED);
    await changeReportStatus(report.id.toString(), 'deleted');

    const deletedReport = await ActivityReport.unscoped().findOne({ where: { id: report.id } });

    expect(deletedReport.submissionStatus).toBe(REPORT_STATUSES.DELETED);

    await ActivityReport.destroy({ where: { id: deletedReport.id } });
  });
});

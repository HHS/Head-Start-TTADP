import db from '../models';
import targetPopulationTable from './targetPopulationTable';
import { REPORT_STATUSES } from '../constants';
import { createReport, destroyReport } from '../testUtils';

const reportObject = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
  ECLKCResourcesUsed: ['test'],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'in-person',
  activityRecipients: [],
  duration: 1,
  endDate: '2021-01-01T12:00:00Z',
  startDate: '2021-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['Children with disabilities'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['technical-assistance'],
};

let report;

describe('Target Population Table', () => {
  beforeAll(async () => {
    report = await createReport(reportObject);
  });

  afterAll(async () => {
    await destroyReport(report);
    await db.sequelize.close();
  });

  it('counts target populations', async () => {
    const data = await targetPopulationTable({ activityReport: { id: report.id } });

    const children = data.filter((d) => d.name === 'Children with disabilities');
    expect(children[0].count).toBe(1);
  });
});

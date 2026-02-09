import moment from 'moment';
import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  ActivityReport, ActivityRecipient, User, Recipient, Grant, Region,
} from '../models';
import approvalRateByDeadline from './approvalRateByDeadline';
import { createOrUpdate } from '../services/activityReports';

const RECIPIENT_ID = 975109;
const GRANT_ID_ONE = 10639721;
const GRANT_ID_TWO = 20761386;

const mockUser = {
  id: 179539,
  homeRegionId: 1,
  name: 'user1779539',
  hsesUsername: 'user1779539',
  hsesUserId: 'user1779539',
  lastLogin: new Date(),
};

const baseReport = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { activityRecipientId: GRANT_ID_ONE },
    { activityRecipientId: GRANT_ID_TWO },
  ],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'method',
  duration: 1,
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['technical-assistance'],
  version: 2,
};

describe('approvalRateByDeadline widget', () => {
  beforeAll(async () => {
    await User.create(mockUser);
    await Region.bulkCreate([
      { name: 'office 1', id: 1 },
      { name: 'office 2', id: 2 },
    ], { validate: true, individualHooks: true });
    await Recipient.create({ name: 'recipient', id: RECIPIENT_ID, uei: 'NNA5N2KHMGN2' });
    await Grant.bulkCreate([{
      id: GRANT_ID_ONE,
      number: GRANT_ID_ONE,
      recipientId: RECIPIENT_ID,
      regionId: 1,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date('2021/01/02'),
    }, {
      id: GRANT_ID_TWO,
      number: GRANT_ID_TWO,
      recipientId: RECIPIENT_ID,
      regionId: 2,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date('2021/01/02'),
    }], { validate: true, individualHooks: true });
  });

  afterAll(async () => {
    const reports = await ActivityReport
      .findAll({ where: { userId: [mockUser.id] } });
    const ids = reports.map((report) => report.id);
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: [mockUser.id] } });
    await Grant.destroy({ where: { id: [GRANT_ID_ONE, GRANT_ID_TWO] }, individualHooks: true });
    await Recipient.destroy({ where: { id: [RECIPIENT_ID] } });
    await Region.destroy({ where: { id: [1, 2] } });
    await db.sequelize.close();
  });

  it('returns regional and national series for the requested region', async () => {
    const serviceDate = moment().subtract(1, 'month').startOf('month').add(5, 'days');
    const dateString = serviceDate.format('YYYY-MM-DD');
    const approvedAt = serviceDate.clone().add(20, 'days').toDate();

    const reportRegionOne = await createOrUpdate({
      ...baseReport,
      regionId: 1,
      endDate: dateString,
      startDate: dateString,
    });

    const reportRegionTwo = await createOrUpdate({
      ...baseReport,
      regionId: 2,
      endDate: dateString,
      startDate: dateString,
    });

    await ActivityReport.update({
      approvedAt,
      approvedAtTimezone: 'America/New_York',
      calculatedStatus: REPORT_STATUSES.APPROVED,
    }, { where: { id: [reportRegionOne.id, reportRegionTwo.id] } });

    const result = await approvalRateByDeadline(null, { 'region.in': ['1'] });
    const monthLabel = serviceDate.format('MMM YYYY');
    const monthRecord = result.records.find((r) => r.month_label === monthLabel);

    expect(monthRecord).toBeTruthy();
    expect(Number(monthRecord.region_total)).toBe(1);
    expect(Number(monthRecord.national_total)).toBe(2);
  });
});

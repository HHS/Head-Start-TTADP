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
  approvingManagerId: mockUser.id,
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

const created = {
  user: false,
  region1: false,
  region2: false,
  recipient: false,
  grant1: false,
  grant2: false,
};

describe('approvalRateByDeadline widget', () => {
  beforeAll(async () => {
    await db.sequelize.transaction(async (transaction) => {
      const [, userCreated] = await User.findOrCreate({
        where: { id: mockUser.id },
        defaults: mockUser,
        transaction,
      });
      created.user = userCreated;
      const [, region1Created] = await Region.findOrCreate({
        where: { id: 1 },
        defaults: { name: 'office 1', id: 1 },
        transaction,
      });
      created.region1 = region1Created;
      const [, region2Created] = await Region.findOrCreate({
        where: { id: 2 },
        defaults: { name: 'office 2', id: 2 },
        transaction,
      });
      created.region2 = region2Created;
      const [, recipientCreated] = await Recipient.findOrCreate({
        where: { id: RECIPIENT_ID },
        defaults: { name: 'recipient', id: RECIPIENT_ID, uei: 'NNA5N2KHMGN2' },
        transaction,
      });
      created.recipient = recipientCreated;
      const [, grant1Created] = await Grant.findOrCreate({
        where: { id: GRANT_ID_ONE },
        defaults: {
          id: GRANT_ID_ONE,
          number: GRANT_ID_ONE,
          recipientId: RECIPIENT_ID,
          regionId: 1,
          status: 'Active',
          startDate: new Date('2021/01/01'),
          endDate: new Date('2021/01/02'),
        },
        transaction,
      });
      created.grant1 = grant1Created;
      const [, grant2Created] = await Grant.findOrCreate({
        where: { id: GRANT_ID_TWO },
        defaults: {
          id: GRANT_ID_TWO,
          number: GRANT_ID_TWO,
          recipientId: RECIPIENT_ID,
          regionId: 2,
          status: 'Active',
          startDate: new Date('2021/01/01'),
          endDate: new Date('2021/01/02'),
        },
        transaction,
      });
      created.grant2 = grant2Created;
    });
  });

  afterAll(async () => {
    await db.sequelize.transaction(async (transaction) => {
      const reports = await ActivityReport
        .findAll({ where: { userId: [mockUser.id] }, transaction });
      const ids = reports.map((report) => report.id);
      await ActivityRecipient.destroy({ where: { activityReportId: ids }, transaction });
      await ActivityReport.destroy({ where: { id: ids }, transaction });
      if (created.user) {
        await User.destroy({ where: { id: [mockUser.id] }, transaction });
      }
      if (created.grant1 || created.grant2) {
        await Grant.destroy({
          where: {
            id: [
              ...(created.grant1 ? [GRANT_ID_ONE] : []),
              ...(created.grant2 ? [GRANT_ID_TWO] : []),
            ],
          },
          individualHooks: true,
          transaction,
        });
      }
      if (created.recipient) {
        await Recipient.destroy({ where: { id: [RECIPIENT_ID] }, transaction });
      }
      if (created.region1 || created.region2) {
        await Region.destroy({
          where: {
            id: [
              ...(created.region1 ? [1] : []),
              ...(created.region2 ? [2] : []),
            ],
          },
          transaction,
        });
      }
    });
    await db.sequelize.close();
  });

  it('returns regional and national series for the requested region', async () => {
    const serviceDate = moment().subtract(1, 'month').startOf('month').add(5, 'days');
    const dateString = serviceDate.format('YYYY-MM-DD');
    const approvedAt = serviceDate.clone().add(20, 'days').toDate();
    const monthLabel = serviceDate.format('MMM YYYY');

    const baseline = await approvalRateByDeadline(null, { 'region.in': ['1'] });
    const baselineMonth = baseline.records.find((r) => r.month_label === monthLabel);
    const baselineNationalTotal = baselineMonth ? Number(baselineMonth.national_total) : 0;
    const baselineRegionTotal = baselineMonth?.regions?.[1]
      ? Number(baselineMonth.regions[1].total)
      : 0;

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
    const monthRecord = result.records.find((r) => r.month_label === monthLabel);

    expect(monthRecord).toBeTruthy();
    expect(Number(monthRecord.national_total)).toBe(baselineNationalTotal + 2);
    expect(monthRecord.regions).toBeTruthy();
    expect(Number(monthRecord.regions[1].total)).toBe(baselineRegionTotal + 1);
  });
});

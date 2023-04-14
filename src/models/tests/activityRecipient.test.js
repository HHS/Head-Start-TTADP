import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  ActivityReport,
  ActivityRecipient,
  User,
  Recipient,
  OtherEntity,
  Grant,
} from '..';
import { auditLogger } from '../../logger';

const mockUser = {
  name: 'Joe Green',
  role: ['TTAC'],
  phoneNumber: '555-555-554',
  hsesUserId: '65535',
  hsesUsername: 'test49@test49.com',
  hsesAuthorities: ['ROLE_FEDERAL'],
  email: 'test49@test49.com',
  homeRegionId: 1,
  lastLogin: new Date('2021-02-09T15:13:00.000Z'),
  permissions: [
    {
      regionId: 1,
      scopeId: 1,
    },
    {
      regionId: 2,
      scopeId: 1,
    },
  ],
  flags: [],
};

const mockRecipient = {
  id: 65535,
  uei: 'NNA5N2KHMGM2',
  name: 'Tooth Brushing Academy',
  recipientType: 'Community Action Agency (CAA)',
};

const mockOtherEntity = {
  name: 'Regional TTA/Other Specialists',
};

const mockGrant = {
  id: 65535,
  number: '99CH9999',
  regionId: 2,
  status: 'Active',
  startDate: new Date('2021-02-09T15:13:00.000Z'),
  endDate: new Date('2021-02-09T15:13:00.000Z'),
  cdi: false,
  grantSpecialistName: null,
  grantSpecialistEmail: null,
  stateCode: 'NY',
  annualFundingMonth: 'October',
};

const sampleReport = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  calculatedStatus: REPORT_STATUSES.DRAFT,
  oldApprovingManagerId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2020-01-01T12:00:00Z',
  startDate: '2020-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  reason: ['reason'],
  topics: ['topics'],
  ttaType: ['type'],
  regionId: 2,
  targetPopulations: [],
  author: {
    fullName: 'Kiwi, GS',
    name: 'Kiwi',
    role: 'Grants Specialist',
    homeRegionId: 1,
  },
};

describe('Activity Reports model', () => {
  let user;
  let recipient;
  let otherEntity;
  let grant;
  let report;
  let activityRecipients;
  beforeAll(async () => {
    try {
      user = await User.create({ ...mockUser });
      recipient = await Recipient.create({ ...mockRecipient });
      otherEntity = await OtherEntity.create({ ...mockOtherEntity });
      await Grant.create({
        ...mockGrant,
        recipientId: recipient.id,
        programSpecialistName: user.name,
        programSpecialistEmail: user.email,
      });
      grant = await Grant.findOne({ where: { id: mockGrant.id } });
      report = await ActivityReport.create({ ...sampleReport });
      activityRecipients = await Promise.all([
        await ActivityRecipient.create({ activityReportId: report.id, grantId: grant.id }),
        await ActivityRecipient.create({
          activityReportId: report.id,
          otherEntityId: otherEntity.id,
        }),
        await ActivityRecipient.create({ activityReportId: report.id }, { validation: false }),
      ]);
    } catch (e) {
      auditLogger.error(JSON.stringify(e));
      throw e;
    }
  });
  afterAll(async () => {
    if (activityRecipients) {
      await Promise.all(activityRecipients
        .map(async (activityRecipient) => ActivityRecipient.destroy({
          where: {
            activityReportId: activityRecipient.activityReportId,
            grantId: activityRecipient.grantId,
            otherEntityId: activityRecipient.otherEntityId,
          },
        })));
      await ActivityReport.destroy({ where: { id: report.id } });
      await Grant.destroy({ where: { id: grant.id } });
      await OtherEntity.destroy({ where: { id: otherEntity.id } });
      await Recipient.destroy({ where: { id: recipient.id } });
      await User.destroy({ where: { id: user.id } });
      await db.sequelize.close();
    }
  });

  it('activityRecipientId', async () => {
    expect(activityRecipients[0].activityRecipientId).toEqual(grant.id);
    expect(activityRecipients[1].activityRecipientId).toEqual(otherEntity.id);
    expect(activityRecipients[2].activityRecipientId).toEqual(null);
  });
  it('name', async () => {
    try {
      const arr = await Promise.all(activityRecipients
        .map(async (activityRecipient) => ActivityRecipient.findOne({
          where: {
            activityReportId: activityRecipient.activityReportId,
            grantId: activityRecipient.grantId,
            otherEntityId: activityRecipient.otherEntityId,
          },
        })));
      expect(arr[0].name).toEqual(grant.name);
      expect(arr[1].name).toEqual(otherEntity.name);
      expect(arr[2].name).toEqual(null);
    } catch (e) {
      auditLogger.error(JSON.stringify(e));
      throw e;
    }
  });
});

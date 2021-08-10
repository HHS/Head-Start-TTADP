import db, {
  ActivityReport, ActivityRecipient, User, Grantee, Grant,
} from '../models';
import { REPORT_STATUSES } from '../constants';
import addMissingGrantsToReport from './addMissingGrantsToReports';

const mockUser = {
  id: 2000,
  homeRegionId: 1,
  name: 'test',
  hsesUsername: 'test',
  hsesUserId: '2000',
};

const reportObject = {
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'method',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  ttaType: ['technical-assistance'],
  regionId: 1,
};

describe('Add missing grants to report', () => {
  beforeAll(async () => {
    await User.create(mockUser);
    await Grantee.create({
      id: 1000,
      name: 'Child Care Corporation',
    });

    await Grantee.create({
      id: 2000,
      name: 'Opportunities, Inc.',
    });

    await Grantee.create({
      id: 3000,
      name: 'Family Services, Inc.',
    });

    await Grant.create({
      id: 1000,
      granteeId: 1000,
      number: '1000',
    });

    await Grant.create({
      id: 2000,
      granteeId: 2000,
      number: '2000',
    });

    await Grant.create({
      id: 3000,
      granteeId: 3000,
      number: '3000',
    });

    await Grant.create({
      id: 4000,
      granteeId: 2000,
      number: '4000',
    });

    await ActivityReport.create({ ...reportObject, id: 1000 });
    await ActivityReport.create({ ...reportObject, id: 2000 });
    await ActivityReport.create({ ...reportObject, id: 3000 });
    await ActivityReport.create({ ...reportObject, id: 4000 });

    await ActivityRecipient.create({
      activityReportId: 3000,
      grantId: 1000,
    });

    await addMissingGrantsToReport('additional_grants_test.csv');
  });

  afterAll(async () => {
    await ActivityRecipient.destroy({
      where: { activityReportId: [1000, 2000, 3000, 4000] },
    });

    await ActivityReport.destroy({
      where: { id: [1000, 2000, 3000, 4000] },
    });

    await Grant.destroy({
      where: { id: [1000, 2000, 3000, 4000] },
    });

    await Grantee.destroy({
      where: { id: [1000, 2000, 3000] },
    });

    await User.destroy({
      where: { id: mockUser.id },
    });
    await db.sequelize.close();
  });

  it('adds missing activity recipients', async () => {
    const recipients = await ActivityRecipient.findAll({
      where: { activityReportId: 1000 },
    });
    const recipientGrantIds = recipients.map((r) => r.grantId);
    expect(recipientGrantIds.length).toBe(2);
    expect(recipientGrantIds).toContain(1000);
    expect(recipientGrantIds).toContain(2000);
  });

  it('handles unknown grants from the CSV', async () => {
    const recipients = await ActivityRecipient.findAll({
      where: { activityReportId: 2000 },
    });
    const recipientGrantIds = recipients.map((r) => r.grantId);
    expect(recipientGrantIds.length).toBe(2);
    expect(recipientGrantIds).toContain(2000);
    expect(recipientGrantIds).toContain(3000);
  });

  it('skips grants that have already been added to the report', async () => {
    const recipients = await ActivityRecipient.findAll({
      where: { activityReportId: 3000 },
    });
    const recipientGrantIds = recipients.map((r) => r.grantId);
    expect(recipientGrantIds.length).toBe(3);
    expect(recipientGrantIds).toContain(1000);
    expect(recipientGrantIds).toContain(2000);
    expect(recipientGrantIds).toContain(3000);
  });

  it('does not update activity reports that are not in the CSV', async () => {
    const recipients = await ActivityRecipient.findAll({
      where: { activityReportId: 4000 },
    });
    const recipientGrantIds = recipients.map((r) => r.grantId);
    expect(recipientGrantIds.length).toBe(0);
  });
});

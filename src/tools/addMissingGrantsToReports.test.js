import db, {
  ActivityReport, ActivityRecipient, User,
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
  imported: {},
};

describe('Add missing grants to report', () => {
  beforeAll(async () => {
    await User.create(mockUser);

    await ActivityReport.create({ ...reportObject, id: 1000, imported: { test: 'test', granteeName: 'Test | 123' } });
    await ActivityReport.create({ ...reportObject, id: 2000 });
    await ActivityReport.create({ ...reportObject, id: 3000, imported: { granteeName: 'Opportunities, Inc. | 2000' } });
    await ActivityReport.create({ ...reportObject, id: 4000 });

    await addMissingGrantsToReport('additional_grants_test.csv');
  });

  afterAll(async () => {
    await ActivityReport.destroy({
      where: { id: [1000, 2000, 3000, 4000] },
    });

    await User.destroy({
      where: { id: mockUser.id },
    });
    await db.sequelize.close();
  });

  it('adds missing activity recipients', async () => {
    const report = await ActivityReport.findByPk(1000);
    const { granteeName } = report.imported;
    const expected = 'Test | 123\nChild Care Corporation | 1000\nOpportunities, Inc. | 2000';
    expect(granteeName).toBe(expected);
  });

  it('preserves other imported fields', async () => {
    const report = await ActivityReport.findByPk(1000);
    const { test } = report.imported;
    const expected = 'test';
    expect(test).toBe(expected);
  });

  it('unknown grants are imported', async () => {
    const report = await ActivityReport.findByPk(2000);
    const { granteeName } = report.imported;
    const expected = 'Opportunities, Inc. | 2000\nUnknown grant | 5000\nFamily Services, Inc. | 3000';
    expect(granteeName).toBe(expected);
  });

  it('skips grants that have already been added to the report', async () => {
    const report = await ActivityReport.findByPk(3000);
    const { granteeName } = report.imported;
    const expected = 'Opportunities, Inc. | 2000\nChild Care Corporation | 1000\nFamily Services, Inc. | 3000';
    expect(granteeName).toBe(expected);
  });

  it('does not update activity reports that are not in the CSV', async () => {
    const recipients = await ActivityRecipient.findAll({
      where: { activityReportId: 4000 },
    });
    const recipientGrantIds = recipients.map((r) => r.grantId);
    expect(recipientGrantIds.length).toBe(0);
  });
});

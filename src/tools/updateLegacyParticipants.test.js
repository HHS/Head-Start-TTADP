import { ActivityReport, sequelize } from '../models';
import updateLegacyParticipants from './updateLegacyParticipants';
import { REPORT_STATUSES } from '../constants';

const dumbReport = {
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
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
  userId: 1,
  regionId: 1,
  targetPopulations: ['Dual-Language Learners'],
};

describe('updateLegacyParticipants', () => {
  let reports;

  beforeAll(async () => {
    reports = await Promise.all(
      [
        ['Family Chlid Care'],
        ['Family Chlid Care', 'Test'],
        ['Test'],
      ].map(async (participants) => ActivityReport.create({
        ...dumbReport,
        participants,
      })),
    );
  });

  afterAll(async () => {
    await ActivityReport.destroy({
      where: {
        id: reports.map((r) => r.id),
      },
    });

    await sequelize.close();
  });

  it('updates legacy population data', async () => {
    const reportIds = reports.map((report) => report.id);
    const before = await ActivityReport.findAll({
      where: {
        id: reportIds,
      },
    });

    expect(before.length).toBe(3);

    await updateLegacyParticipants();

    const after = await ActivityReport.findAll({
      where: {
        id: reportIds,
      },
    });

    expect(after.length).toBe(3);
    const updatedParticipants = after.map(({ participants }) => participants);
    expect(updatedParticipants).toContainEqual(['Family Child Care', 'Test']);
    expect(updatedParticipants).toContainEqual(['Family Child Care']);
    expect(updatedParticipants).toContainEqual(['Test']);
  });
});

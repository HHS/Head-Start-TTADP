import { ActivityReport, sequelize } from '../models';
import updateParticipantsList from './updateParticipantsList';
import { REPORT_STATUSES } from '../constants';

const baseReport = {
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

describe('updateParticipants', () => {
  let reports;

  beforeAll(async () => {
    reports = await Promise.all(
      [
        ['Coach / Trainer', 'test 2'],
        ['test 1', 'Direct Service / Front line / Home Visitors', 'test 2'],
        ['test 1', 'Program Director (HS/EHS)'],
        ['State Agency staff'],
        ['test 3', 'test 4', 'test 5'],
        ['test 6', 'Coach / Trainer', 'test 7', 'Direct Service / Front line / Home Visitors', 'test 8'],
      ].map(async (participants) => ActivityReport.create({
        ...baseReport,
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

  it('update participants data', async () => {
    const reportIds = reports.map((report) => report.id);
    const before = await ActivityReport.findAll({
      where: {
        id: reportIds,
      },
    });

    expect(before.length).toBe(6);

    await updateParticipantsList();

    const after = await ActivityReport.findAll({
      where: {
        id: reportIds,
      },
    });

    expect(after.length).toBe(6);
    const updatedParticipants = after.map(({ participants }) => participants);
    expect(updatedParticipants).toContainEqual(['Coach', 'test 2']);
    expect(updatedParticipants).toContainEqual(['test 1', 'Home Visitor', 'test 2']);
    expect(updatedParticipants).toContainEqual(['test 1', 'Program Director (HS / EHS)']);
    expect(updatedParticipants).toContainEqual(['State Head Start Association']);
    expect(updatedParticipants).toContainEqual(['test 3', 'test 4', 'test 5']);
    expect(updatedParticipants).toContainEqual(['test 6', 'Coach', 'test 7', 'Home Visitor', 'test 8']);
  });
});

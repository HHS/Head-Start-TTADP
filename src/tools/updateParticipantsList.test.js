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
        {
          array: ['Coach / Trainer', 'test 2'],
          string: 'Coach / Trainer\ntest 2',
        },
        {
          array: ['test 1', 'Direct Service / Front line / Home Visitors', 'test 2'],
          string: 'test 1\nDirect Service / Front line / Home Visitors\ntest 2',
        },
        {
          array: ['test 1', 'Program Director (HS/EHS)'],
          string: 'test 1\nProgram Director (HS/EHS)',
        },
        {
          array: ['State Agency staff'],
          string: 'State Agency staff',
        },
        {
          array: ['test 3', 'test 4', 'test 5'],
          string: 'test 3\ntest 4\ntest 5',
        },
        {
          array: ['test 6', 'Coach / Trainer', 'test 7', 'Direct Service / Front line / Home Visitors', 'test 8'],
          string: 'test 6\nCoach / Trainer\ntest 7\nDirect Service / Front line / Home Visitors\ntest 8',
        },
      ].map(async (p) => ActivityReport.create({
        ...baseReport,
        participants: p.array,
        imported: {
          granteeParticipants: p.string,
        },

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
    expect(updatedParticipants).toContainEqual(['Local/State Agency(ies)']);
    expect(updatedParticipants).toContainEqual(['test 3', 'test 4', 'test 5']);
    expect(updatedParticipants).toContainEqual(['test 6', 'Coach', 'test 7', 'Home Visitor', 'test 8']);

    const updatedImportParticipants = after.map(({ imported }) => imported.granteeParticipants);
    expect(updatedImportParticipants).toContainEqual('Coach\ntest 2');
    expect(updatedImportParticipants).toContainEqual('test 1\nHome Visitor\ntest 2');
    expect(updatedImportParticipants).toContainEqual('test 1\nProgram Director (HS / EHS)');
    expect(updatedImportParticipants).toContainEqual('Local/State Agency(ies)');
    expect(updatedImportParticipants).toContainEqual('test 3\ntest 4\ntest 5');
    expect(updatedImportParticipants).toContainEqual('test 6\nCoach\ntest 7\nHome Visitor\ntest 8');
  });
});

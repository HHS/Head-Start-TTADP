import { submitReport } from './handlers';
import { APPROVER_STATUSES, REPORT_STATUSES } from '../../constants';
import * as mailer from '../../lib/mailer';
import SCOPES from '../../middleware/scopeConstants';
import db, {
  ActivityReportApprover, ActivityReport, Permission, User,
} from '../../models';

const draftObject = {
  activityRecipientType: 'grantee',
  regionId: 1,
  activityRecipients: [{ grantId: 1 }],
  submissionStatus: REPORT_STATUSES.DRAFT,
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

const mockUser = {
  id: 9064284,
  hsesUserId: '9064284',
  hsesUsername: 'user9064284',
};
const mockManager = {
  id: 1037200,
  hsesUserId: '1037200',
  hsesUsername: 'user21037200',
};
const secondMockManager = {
  id: 3076103,
  hsesUserId: '3076103',
  hsesUsername: 'user3076103',
};

const mockResponse = {
  attachment: jest.fn(),
  json: jest.fn(),
  send: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

beforeAll(async () => {
  await User.bulkCreate([mockUser, mockManager, secondMockManager]);
  await Permission.bulkCreate([{
    userId: mockUser.id,
    regionId: 1,
    scopeId: SCOPES.READ_WRITE_REPORTS,
  }, {
    userId: mockManager.id,
    regionId: 1,
    scopeId: SCOPES.APPROVE_REPORTS,
  }, {
    userId: secondMockManager.id,
    regionId: 1,
    scopeId: SCOPES.APPROVE_REPORTS,
  }]);
});

afterAll(async () => {
  const userIds = [mockUser.id, mockManager.id, secondMockManager.id];
  await ActivityReportApprover.destroy({
    where: { userId: [mockManager.id, secondMockManager.id] },
    force: true,
  });
  await ActivityReport.destroy({ where: { userId: mockUser.id } });
  await Permission.destroy({ where: { userId: userIds } });
  await User.destroy({ where: { id: userIds } });
  await db.sequelize.close();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('submitReport', () => {
  it('creates new approvers', async () => {
    const draftReport = await ActivityReport.create({ ...draftObject, userId: mockUser.id });
    const request = {
      session: { userId: mockUser.id },
      params: { activityReportId: draftReport.id },
      body: { approverUserIds: [mockManager.id, secondMockManager.id], additionalNotes: 'notes' },
    };
    const assignedNotification = jest.spyOn(mailer, 'approverAssignedNotification').mockImplementation();

    await submitReport(request, mockResponse);
    expect(assignedNotification).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
      approvers: [
        expect.objectContaining({ status: null, note: null }),
        expect.objectContaining({ status: null, note: null }),
      ],
    }));
  });
  it('resets NEEDS_ACTION approver statuses', async () => {
    const submittedReport = await ActivityReport.create({
      ...draftObject,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      userId: mockUser.id,
    });
    await ActivityReportApprover.create({
      activityReportId: submittedReport.id, userId: mockManager.id, status: APPROVER_STATUSES.NEEDS_ACTION, note: 'make changes x, y, z',
    });
    const reviewedReport = await ActivityReport.findByPk(submittedReport.id);
    // check that testing condition is correct
    expect(reviewedReport.calculatedStatus).toEqual(REPORT_STATUSES.NEEDS_ACTION);
    const request = {
      session: { userId: mockUser.id },
      params: { activityReportId: submittedReport.id },
      body: { approverUserIds: [mockManager.id], additionalNotes: 'I made those changes to x, y, z' },
    };
    const assignedNotification = jest.spyOn(mailer, 'approverAssignedNotification').mockImplementation();

    await submitReport(request, mockResponse);
    expect(assignedNotification).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
      approvers: [
        expect.objectContaining({ status: null, note: 'make changes x, y, z' }),
      ],
    }));
  });
});

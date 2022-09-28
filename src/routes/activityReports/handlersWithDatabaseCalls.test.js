import { Op } from 'sequelize';
import { submitReport, unlockReport } from './handlers';
import {
  APPROVER_STATUSES,
  REPORT_STATUSES,
  ENTITY_TYPES,
  COLLABORATOR_TYPES,
} from '../../constants';
import * as mailer from '../../lib/mailer';
import SCOPES from '../../middleware/scopeConstants';
import db, {
  ActivityReport, Permission, User,
} from '../../models';
import { upsertRatifier } from '../../services/collaborators';
import { createOrUpdate } from '../../services/activityReports';

const draftObject = {
  activityRecipientType: 'recipient',
  regionId: 1,
  activityRecipients: [{ grantId: 1 }],
  approval: { submissionStatus: REPORT_STATUSES.DRAFT },
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
  creatorRole: 'TTAC',
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

const reports = [];

beforeAll(async () => {
  await User.bulkCreate(
    [mockUser, mockManager, secondMockManager],
    { validate: true, individualHooks: true },
  );
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
  },
  {
    userId: mockUser.id,
    regionId: 14,
    scopeId: SCOPES.UNLOCK_APPROVED_REPORTS,
  }], { validate: true, individualHooks: true });
});

afterAll(async () => {
  const userIds = [mockUser.id, mockManager.id, secondMockManager.id];
  await ActivityReport.destroy({
    where: { id: reports.map((report) => report.id) },
    individualHooks: true,
  });
  await Permission.destroy({
    where: { userId: userIds },
    individualHooks: true,
  });
  await User.destroy({
    where: { id: userIds },
    individualHooks: true,
  });
  await db.sequelize.close();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('submitReport', () => {
  it('creates new approvers', async () => {
    const draftReport = await createOrUpdate({ ...draftObject, owner: { userId: mockUser.id } });
    reports.push(draftReport);
    const request = {
      session: { userId: mockUser.id },
      params: { activityReportId: draftReport.id },
      body: { approvers: [{ userId: mockManager.id }, { userId: secondMockManager.id }], additionalNotes: 'notes' },
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
    const submittedReport = await createOrUpdate({
      ...draftObject,
      approval: { submissionStatus: REPORT_STATUSES.SUBMITTED },
      owner: { userId: mockUser.id },
      approvers: [{
        userId: mockManager.id,
        status: APPROVER_STATUSES.NEEDS_ACTION,
        note: 'make changes x, y, z',
      }],
    });
    reports.push(submittedReport);
    const reviewedReport = await ActivityReport.findByPk(submittedReport.id);
    // check that testing condition is correct
    expect(reviewedReport.approval.calculatedStatus).toEqual(REPORT_STATUSES.NEEDS_ACTION);
    const request = {
      session: { userId: mockUser.id },
      params: { activityReportId: submittedReport.id },
      body: { approvers: [{ userId: mockManager.id }], additionalNotes: 'I made those changes to x, y, z' },
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
  it('resets to NEEDS_ACTION on unlock', async () => {
    const submittedReport = await createOrUpdate({
      ...draftObject,
      approval: { submissionStatus: REPORT_STATUSES.SUBMITTED },
      owner: { userId: mockUser.id },
      approvers: [{
        userId: mockManager.id,
        status: APPROVER_STATUSES.APPROVED,
        note: 'report looks good',
      }, {
        userId: secondMockManager.id,
        status: APPROVER_STATUSES.APPROVED,
        note: 'agree report looks good',
      }],
    });
    reports.push(submittedReport);

    const reviewedReport = await ActivityReport.findByPk(submittedReport.id);

    // check that testing condition is correct
    expect(reviewedReport.approval.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

    // Create request to unlock
    const request = {
      session: { userId: mockUser.id },
      params: { activityReportId: reviewedReport.id },
    };

    // Call Unlock.
    const mockUnlockResponse = {
      sendStatus: jest.fn(),
    };
    await unlockReport(request, mockUnlockResponse);

    expect(mockUnlockResponse.sendStatus).toHaveBeenCalledWith(204);

    // Verify report is set to NEEDS_ACTION.
    const needsActionReport = await ActivityReport.findByPk(submittedReport.id);
    expect(needsActionReport.approval.calculatedStatus).toBe(REPORT_STATUSES.NEEDS_ACTION);

    // Verify approving managers are set to NEEDS_ACTION.
    const approvers = await upsertRatifier({
      attributes: ['status'],
      where: {
        entityType: ENTITY_TYPES.REPORT,
        entityId: needsActionReport.id,
        collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.RATIFIER] },
      },
    });

    // Both approvers should now be NEEDS_ACTION status.
    expect(approvers.length).toBe(2);
    expect(approvers[0].status).toBe(REPORT_STATUSES.NEEDS_ACTION);
    expect(approvers[1].status).toBe(REPORT_STATUSES.NEEDS_ACTION);
  });
});

import { NOTIFICATION_TYPES } from '../../constants';
import {
  createApproverSubmittedNotification,
  createChangesRequestedNotification,
  createCollaboratorSubmittedNotification,
  createNotificationForCollaborators,
} from './activityReport';

jest.mock('./index', () => ({
  createNotification: jest.fn(),
}));

// eslint-disable-next-line import/first
import { createNotification } from './index';

const mockCreateNotification = createNotification as jest.MockedFunction<typeof createNotification>;

describe('activityReport notification helpers', () => {
  const reportBase = {
    id: 42,
    displayId: 'R01-AR-42',
    activityRecipients: [{ name: 'Recipient A' }, { name: 'Recipient B' }],
  };

  beforeEach(() => {
    mockCreateNotification.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createApproverSubmittedNotification', () => {
    it('calls createNotification once per approver with the ACTIVITY_REPORT_SUBMITTED type', async () => {
      const approvers = [{ userId: 1 }, { userId: 2 }];
      await createApproverSubmittedNotification(approvers, reportBase);

      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenNthCalledWith(
        1,
        1,
        reportBase.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
        expect.objectContaining({ metadata: expect.any(Object) })
      );
      expect(mockCreateNotification).toHaveBeenNthCalledWith(
        2,
        2,
        reportBase.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
        expect.objectContaining({ metadata: expect.any(Object) })
      );
    });

    it('passes id, displayId and recipientName (joined) in metadata', async () => {
      await createApproverSubmittedNotification([{ userId: 1 }], reportBase);

      expect(mockCreateNotification).toHaveBeenCalledWith(
        1,
        reportBase.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
        {
          metadata: {
            id: reportBase.id,
            displayId: reportBase.displayId,
            recipientName: 'Recipient A, Recipient B',
          },
        }
      );
    });

    it('produces an empty recipientName when activityRecipients is empty', async () => {
      const reportWithNoRecipients = { ...reportBase, activityRecipients: [] };
      await createApproverSubmittedNotification([{ userId: 1 }], reportWithNoRecipients);

      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it('returns an empty array and makes no calls when passed no approvers', async () => {
      const result = await createApproverSubmittedNotification([], reportBase);
      expect(result).toEqual([]);
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });
  });

  describe('createCollaboratorSubmittedNotification', () => {
    const reportWithAuthor = {
      ...reportBase,
      author: { name: 'Jane Doe' },
    };

    it('calls createNotification once per collaborator with the ACTIVITY_REPORT_SUBMITTED_COLLABORATOR type', async () => {
      const collaborators = [{ userId: 10 }, { userId: 11 }];
      await createCollaboratorSubmittedNotification(collaborators, reportWithAuthor);

      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenNthCalledWith(
        1,
        10,
        reportWithAuthor.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED_COLLABORATOR,
        expect.objectContaining({ metadata: expect.any(Object) })
      );
      expect(mockCreateNotification).toHaveBeenNthCalledWith(
        2,
        11,
        reportWithAuthor.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED_COLLABORATOR,
        expect.objectContaining({ metadata: expect.any(Object) })
      );
    });

    it('passes id, displayId and author name in metadata', async () => {
      await createCollaboratorSubmittedNotification([{ userId: 10 }], reportWithAuthor);

      expect(mockCreateNotification).toHaveBeenCalledWith(
        10,
        reportWithAuthor.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED_COLLABORATOR,
        {
          metadata: {
            id: reportWithAuthor.id,
            displayId: reportWithAuthor.displayId,
            author: 'Jane Doe',
          },
        }
      );
    });

    it('returns an empty array and makes no calls when passed no collaborators', async () => {
      const result = await createCollaboratorSubmittedNotification([], reportWithAuthor);
      expect(result).toEqual([]);
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });
  });

  describe('createChangesRequestedNotification', () => {
    const reportWithApprover = {
      ...reportBase,
      approver: { user: { name: 'Approver Name' } },
    };

    it('uses ACTIVITY_REPORT_NEEDS_ACTION for creators', async () => {
      await createChangesRequestedNotification({ userId: 10 }, 'creator', reportWithApprover);

      expect(mockCreateNotification).toHaveBeenCalledWith(
        10,
        reportWithApprover.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
        {
          metadata: {
            id: reportWithApprover.id,
            displayId: reportWithApprover.displayId,
            recipientName: 'Recipient A, Recipient B',
            approver: 'Approver Name',
          },
        }
      );
    });

    it('uses ACTIVITY_REPORT_NEEDS_ACTION_COLLABORATOR for collaborators', async () => {
      await createChangesRequestedNotification({ userId: 11 }, 'collaborator', reportWithApprover);

      expect(mockCreateNotification).toHaveBeenCalledWith(
        11,
        reportWithApprover.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION_COLLABORATOR,
        expect.objectContaining({ metadata: expect.any(Object) })
      );
    });

    it('does not create a notification when recipient names are empty', async () => {
      const reportWithNoRecipientNames = {
        ...reportWithApprover,
        activityRecipients: [{ name: '' }],
      };
      await createChangesRequestedNotification(
        { userId: 10 },
        'creator',
        reportWithNoRecipientNames
      );

      expect(mockCreateNotification).not.toHaveBeenCalled();
    });
  });

  describe('createNotificationForCollaborators', () => {
    const reportWithAuthor = {
      ...reportBase,
      author: { name: 'Jane Doe' },
    };

    it('calls createNotification once per collaborator with the ACTIVITY_REPORT_COLLABORATOR_ADDED type', async () => {
      const collaborators = [{ userId: 10 }, { userId: 11 }];
      await createNotificationForCollaborators(collaborators, reportWithAuthor);

      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenNthCalledWith(
        1,
        10,
        reportWithAuthor.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_COLLABORATOR_ADDED,
        expect.objectContaining({ metadata: expect.any(Object) })
      );
      expect(mockCreateNotification).toHaveBeenNthCalledWith(
        2,
        11,
        reportWithAuthor.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_COLLABORATOR_ADDED,
        expect.objectContaining({ metadata: expect.any(Object) })
      );
    });

    it('passes id, displayId, author and recipientName in metadata', async () => {
      await createNotificationForCollaborators([{ userId: 10 }], reportWithAuthor);

      expect(mockCreateNotification).toHaveBeenCalledWith(
        10,
        reportWithAuthor.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_COLLABORATOR_ADDED,
        {
          metadata: {
            id: reportWithAuthor.id,
            displayId: reportWithAuthor.displayId,
            author: 'Jane Doe',
            recipientName: 'Recipient A, Recipient B',
          },
        }
      );
    });

    it('returns an empty array and makes no calls when passed no collaborators', async () => {
      const result = await createNotificationForCollaborators([], reportWithAuthor);
      expect(result).toEqual([]);
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });
  });
});

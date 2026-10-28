import { NOTIFICATION_TYPES } from '../../constants';
import db from '../../models';
import Users from '../../policies/user';
import { archiveNotificationsByEntityAndType, createNotification } from './index';
import {
  archiveSessionNeedsActionNotifications,
  createNotificationForNewPocs,
  createNotificationForSessionSubmittedCollaborators,
  createSessionNeedsActionNotification,
} from './trainingReport';

jest.mock('./index', () => ({
  archiveNotificationsByEntityAndType: jest.fn(),
  createNotification: jest.fn(),
}));

const mockCreateNotification = createNotification as jest.MockedFunction<typeof createNotification>;

const REGIONAL_PD = 'Regional PD Event (with National Centers)';

const buildEvent = (eventOrganizer?: string) => ({
  id: 77,
  eventId: 'R01-TR-1234',
  ownerId: 1,
  data: { eventOrganizer },
});

describe('createNotificationForNewPocs', () => {
  let findAllSpy: jest.SpyInstance;
  let flagSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    findAllSpy = jest
      .spyOn(db.User, 'findAll')
      .mockImplementation(({ where }) =>
        Promise.resolve((where.id as number[]).map((id) => ({ id, flags: [], permissions: [] })))
      );
    flagSpy = jest.spyOn(Users.prototype, 'canSeeBehindFeatureFlag').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('notifies only newly added POCs with the correct type, entityId and metadata', async () => {
    await createNotificationForNewPocs(buildEvent(REGIONAL_PD), [2], [2, 3, 4]);

    expect(findAllSpy).toHaveBeenCalledWith(expect.objectContaining({ where: { id: [3, 4] } }));
    expect(flagSpy).toHaveBeenCalledWith('actionable_notifications');
    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    [3, 4].forEach((userId) => {
      expect(mockCreateNotification).toHaveBeenCalledWith(
        userId,
        77,
        NOTIFICATION_TYPES.TRAINING_REPORT_POC_ADDED,
        { metadata: { displayId: 'R01-TR-1234', id: 77 } }
      );
    });
  });

  it('skips POCs that were already present', async () => {
    await createNotificationForNewPocs(buildEvent(REGIONAL_PD), [2, 3], [2, 3, 4]);

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification.mock.calls[0][0]).toBe(4);
  });

  it('skips the owner', async () => {
    await createNotificationForNewPocs(buildEvent(REGIONAL_PD), [], [1, 5]);

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification.mock.calls[0][0]).toBe(5);
  });

  it('removes duplicate ids', async () => {
    await createNotificationForNewPocs(buildEvent(REGIONAL_PD), [], [5, 5]);

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
  });

  it('skips users without the feature flag', async () => {
    flagSpy.mockReset();
    flagSpy.mockReturnValueOnce(false).mockReturnValueOnce(true);

    await createNotificationForNewPocs(buildEvent(REGIONAL_PD), [], [3, 4]);

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification.mock.calls[0][0]).toBe(4);
  });

  it.each([['Regional TTA Hosted Event (no National Centers)'], [undefined]])(
    'makes no calls when the organizer is %s',
    async (organizer) => {
      await createNotificationForNewPocs(buildEvent(organizer), [], [3]);

      expect(findAllSpy).not.toHaveBeenCalled();
      expect(mockCreateNotification).not.toHaveBeenCalled();
    }
  );

  it('makes no calls when there are no new POCs', async () => {
    await createNotificationForNewPocs(buildEvent(REGIONAL_PD), [2], [2]);

    expect(findAllSpy).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('handles null previous and current POC ids', async () => {
    await createNotificationForNewPocs(buildEvent(REGIONAL_PD), null, [3]);
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);

    mockCreateNotification.mockClear();
    await createNotificationForNewPocs(buildEvent(REGIONAL_PD), [3], null);
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});

describe('createNotificationForSessionSubmittedCollaborators', () => {
  let findAllSpy: jest.SpyInstance;
  let flagSpy: jest.SpyInstance;

  const buildCollabEvent = (collaboratorIds: number[] | null) => ({
    eventId: 'R01-TR-1234',
    ownerId: 1,
    collaboratorIds,
  });

  const session = { id: 55, data: { sessionName: 'Opening session' } };

  beforeEach(() => {
    jest.clearAllMocks();
    findAllSpy = jest
      .spyOn(db.User, 'findAll')
      .mockImplementation(({ where }) =>
        Promise.resolve((where.id as number[]).map((id) => ({ id, flags: [], permissions: [] })))
      );
    flagSpy = jest.spyOn(Users.prototype, 'canSeeBehindFeatureFlag').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('notifies each collaborator with the correct type, entityId and metadata', async () => {
    await createNotificationForSessionSubmittedCollaborators(buildCollabEvent([2, 3]), session);

    expect(findAllSpy).toHaveBeenCalledWith(expect.objectContaining({ where: { id: [2, 3] } }));
    expect(flagSpy).toHaveBeenCalledWith('actionable_notifications');
    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    [2, 3].forEach((userId) => {
      expect(mockCreateNotification).toHaveBeenCalledWith(
        userId,
        55,
        NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_SUBMITTED_COLLABORATOR,
        { metadata: { sessionName: 'Opening session', displayId: 'R01-TR-1234', id: 55 } }
      );
    });
  });

  it('skips the owner and removes duplicate ids', async () => {
    await createNotificationForSessionSubmittedCollaborators(buildCollabEvent([1, 4, 4]), session);

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification.mock.calls[0][0]).toBe(4);
  });

  it('skips users without the feature flag', async () => {
    flagSpy.mockReset();
    flagSpy.mockReturnValueOnce(false).mockReturnValueOnce(true);

    await createNotificationForSessionSubmittedCollaborators(buildCollabEvent([3, 4]), session);

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification.mock.calls[0][0]).toBe(4);
  });

  it.each([[[]], [null], [[1]]])(
    'makes no calls when there are no collaborators to notify (%p)',
    async (collaboratorIds) => {
      await createNotificationForSessionSubmittedCollaborators(
        buildCollabEvent(collaboratorIds),
        session
      );

      expect(findAllSpy).not.toHaveBeenCalled();
      expect(mockCreateNotification).not.toHaveBeenCalled();
    }
  );
});

describe('createSessionNeedsActionNotification', () => {
  let findOneSpy: jest.SpyInstance;
  let flagSpy: jest.SpyInstance;

  const event = { eventId: 'R01-TR-1234', ownerId: 1 };
  const session = { id: 55, approverId: 9, data: { sessionName: 'Opening session' } };

  beforeEach(() => {
    jest.clearAllMocks();
    findOneSpy = jest
      .spyOn(db.User, 'findOne')
      .mockImplementation(({ where }) =>
        Promise.resolve(
          where.id === 9
            ? { name: 'approver', fullName: 'Approver Person' }
            : { id: where.id, flags: [], permissions: [] }
        )
      );
    flagSpy = jest.spyOn(Users.prototype, 'canSeeBehindFeatureFlag').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('notifies the owner with the approver name, skipping only archived notifications', async () => {
    await createSessionNeedsActionNotification(event, session);

    expect(flagSpy).toHaveBeenCalledWith('actionable_notifications');
    expect(mockCreateNotification).toHaveBeenCalledWith(
      1,
      55,
      NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_NEEDS_ACTION,
      {
        metadata: {
          approver: 'Approver Person',
          sessionName: 'Opening session',
          displayId: 'R01-TR-1234',
          id: 55,
        },
        skipExisting: 'archived',
      }
    );
  });

  it('does not notify an owner without the feature flag', async () => {
    flagSpy.mockReturnValue(false);

    await createSessionNeedsActionNotification(event, session);

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('does not notify when the owner is not found', async () => {
    findOneSpy.mockResolvedValue(null);

    await createSessionNeedsActionNotification(event, { ...session, approverId: null });

    expect(findOneSpy).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});

describe('archiveSessionNeedsActionNotifications', () => {
  it('archives only the TR-4a type for the session', async () => {
    await archiveSessionNeedsActionNotifications(55);

    expect(archiveNotificationsByEntityAndType).toHaveBeenCalledWith(55, [
      NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_NEEDS_ACTION,
    ]);
  });
});

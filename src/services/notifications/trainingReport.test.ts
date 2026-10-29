import { NOTIFICATION_TYPES } from '../../constants';
import runInSavepoint from '../../lib/runInSavepoint';
import db from '../../models';
import Users from '../../policies/user';
import { createNotification } from './index';
import {
  createNotificationForNewPocs,
  createNotificationForSessionSubmittedCollaborators,
} from './trainingReport';

jest.mock('./index', () => ({
  createNotification: jest.fn(),
}));

jest.mock('../../lib/runInSavepoint', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockRunInSavepoint = runInSavepoint as jest.MockedFunction<typeof runInSavepoint>;

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
    mockRunInSavepoint.mockImplementation(async (fn) => {
      await fn();
    });
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
        { metadata: { displayId: 'R01-TR-1234', id: 77 }, skipExisting: 'archived' }
      );
    });
  });

  it('runs each recipient in its own savepoint so one failure does not block the others', async () => {
    mockRunInSavepoint.mockImplementationOnce(async () => {});

    await createNotificationForNewPocs(buildEvent(REGIONAL_PD), [], [3, 4]);

    expect(mockRunInSavepoint).toHaveBeenCalledTimes(2);
    expect(mockRunInSavepoint).toHaveBeenCalledWith(
      expect.any(Function),
      'Error creating POC added notification for user 3 on event 77:'
    );
    expect(mockRunInSavepoint).toHaveBeenCalledWith(
      expect.any(Function),
      'Error creating POC added notification for user 4 on event 77:'
    );
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification.mock.calls[0][0]).toBe(4);
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

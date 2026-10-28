import { NOTIFICATION_TYPES } from '../../constants';
import db from '../../models';
import Users from '../../policies/user';
import { createNotification } from './index';
import { createNotificationForSessionSubmittedCollaborators } from './trainingReport';

jest.mock('./index', () => ({
  createNotification: jest.fn(),
}));

const mockCreateNotification = createNotification as jest.MockedFunction<typeof createNotification>;

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

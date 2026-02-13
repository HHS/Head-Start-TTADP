import { EMAIL_ACTIONS, FILE_STATUSES } from '../constants';
import { runQueueExerciseLive } from './queueExerciseLive';

const SITE_ACCESS = 1;
const READ_WRITE_TRAINING_REPORTS = 7;

const expectedNotificationActions = [
  EMAIL_ACTIONS.TRAINING_REPORT_EVENT_IMPORTED,
  EMAIL_ACTIONS.TRAINING_REPORT_COLLABORATOR_ADDED,
  EMAIL_ACTIONS.TRAINING_REPORT_SESSION_CREATED,
  EMAIL_ACTIONS.TRAINING_REPORT_EVENT_COMPLETED,
];

const buildNotificationJobs = (displayId, actions = expectedNotificationActions) => (
  actions.map((name, index) => ({
    id: index + 1,
    name,
    data: {
      displayId,
      reportPath: `/training-report/${displayId}`,
    },
  }))
);

const makeDeps = ({
  notificationActions = expectedNotificationActions,
  notificationEligibleUserIds = [1001, 1002],
  selectionEligibleUserIds = [1001, 1002],
  selectionRegionId = 1,
  resourceFindByPk = async () => ({
    title: 'Queue Exercise Resource',
    mimeType: 'text/html',
    lastStatusCode: 200,
    metadataUpdatedAt: new Date().toISOString(),
  }),
  fileStatus = FILE_STATUSES.APPROVED,
  downloadFile = async () => {
    throw new Error('NoSuchKey');
  },
  resourceDestroy = async () => {},
} = {}) => {
  let eventDisplayId = 'QE-R01-UNKNOWN';
  const selectionPermissionRows = selectionEligibleUserIds.flatMap((id) => ([
    { userId: id, scopeId: SITE_ACCESS, regionId: 14 },
    { userId: id, scopeId: READ_WRITE_TRAINING_REPORTS, regionId: selectionRegionId },
  ]));

  const deps = {
    sequelize: {
      authenticate: jest.fn().mockResolvedValue(undefined),
    },
    getRedis: jest.fn(() => ({
      ping: jest.fn().mockResolvedValue('PONG'),
    })),
    generateS3Config: jest.fn(() => ({ s3Bucket: 'queue-exercise-test-bucket' })),
    userById: jest.fn(async (userId, onlyActiveUsers = false) => {
      if (!onlyActiveUsers) {
        return { id: userId };
      }
      return notificationEligibleUserIds.includes(userId)
        ? { id: userId, email: `user${userId}@example.com` }
        : null;
    }),
    Permission: {
      findAll: jest.fn().mockResolvedValue(selectionPermissionRows),
    },
    User: {
      findByPk: jest.fn().mockResolvedValue({ id: 1001 }),
      findAll: jest.fn().mockResolvedValue(
        selectionEligibleUserIds.map((id) => ({ id, email: `user${id}@example.com` })),
      ),
    },
    Resource: {
      create: jest.fn().mockResolvedValue({ id: 2001 }),
      findByPk: jest.fn().mockImplementation(resourceFindByPk),
      destroy: jest.fn().mockImplementation(resourceDestroy),
    },
    File: {
      findByPk: jest.fn()
        .mockResolvedValueOnce({ status: fileStatus })
        .mockResolvedValueOnce(null),
      destroy: jest.fn().mockResolvedValue(undefined),
    },
    createEvent: jest.fn().mockImplementation(async (request) => {
      eventDisplayId = request.data.eventId;
      return { id: 3001 };
    }),
    updateEvent: jest.fn().mockResolvedValue(undefined),
    destroyEvent: jest.fn().mockResolvedValue(undefined),
    createSession: jest.fn().mockResolvedValue({ id: 4001 }),
    createFileMetaData: jest.fn().mockResolvedValue({ id: 5001 }),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    addToScanQueue: jest.fn().mockResolvedValue(undefined),
    uploadFile: jest.fn().mockResolvedValue({}),
    downloadFile: jest.fn().mockImplementation(downloadFile),
    deleteFileFromS3: jest.fn().mockResolvedValue(undefined),
    notificationQueue: {
      getJobs: jest.fn(async ([state]) => (
        state === 'completed' ? buildNotificationJobs(eventDisplayId, notificationActions) : []
      )),
    },
  };

  return deps;
};

describe('queueExerciseLive', () => {
  it('auto-selects region and actors when omitted', async () => {
    const deps = makeDeps();
    const result = await runQueueExerciseLive({
      timeoutSec: 1,
      pollMs: 1,
    }, deps);

    expect(result.preflight.passed).toBe(true);
    expect(result.options.region).toBe(1);
    expect(result.options.ownerUserId).toBe(1001);
    expect(result.options.collaboratorUserId).toBe(1002);
    expect(result.passed).toBe(true);
  });

  it('returns a passing summary when all flows complete', async () => {
    const deps = makeDeps();
    const result = await runQueueExerciseLive({
      region: 1,
      ownerUserId: 1001,
      timeoutSec: 1,
      pollMs: 1,
    }, deps);

    expect(result.preflight.passed).toBe(true);
    expect(result.flows.notifications.passed).toBe(true);
    expect(result.flows.resource.passed).toBe(true);
    expect(result.flows.scan.passed).toBe(true);
    expect(result.flows.s3.passed).toBe(true);
    expect(result.passed).toBe(true);
    expect(deps.destroyEvent).toHaveBeenCalledWith(result.entities.eventId);
  });

  it('fails notification flow when expected actions are missing', async () => {
    const deps = makeDeps({
      notificationActions: [EMAIL_ACTIONS.TRAINING_REPORT_EVENT_IMPORTED],
    });
    const result = await runQueueExerciseLive({
      region: 1,
      ownerUserId: 1001,
      timeoutSec: 0.02,
      pollMs: 1,
    }, deps);

    expect(result.flows.notifications.passed).toBe(false);
    expect(result.flows.notifications.error).toContain('Timed out');
    expect(result.passed).toBe(false);
  });

  it('fails preflight when collaborator is not notification-eligible', async () => {
    const deps = makeDeps({
      notificationEligibleUserIds: [1001],
      selectionEligibleUserIds: [1001, 1002],
    });

    const result = await runQueueExerciseLive({
      region: 1,
      ownerUserId: 1001,
      timeoutSec: 1,
      pollMs: 1,
    }, deps);

    expect(result.preflight.passed).toBe(false);
    expect(result.preflight.error).toContain('collaboratorUserId 1002 is not notification-eligible');
  });

  it('fails resource flow when metadata state never updates', async () => {
    const deps = makeDeps({
      resourceFindByPk: async () => ({
        title: null,
        mimeType: null,
        lastStatusCode: null,
        metadataUpdatedAt: null,
      }),
    });

    const result = await runQueueExerciseLive({
      region: 1,
      ownerUserId: 1001,
      timeoutSec: 0.02,
      pollMs: 1,
    }, deps);

    expect(result.flows.resource.passed).toBe(false);
    expect(result.flows.resource.error).toContain('Timed out');
    expect(result.passed).toBe(false);
  });

  it('fails scan flow when file status never reaches terminal state', async () => {
    const deps = makeDeps({
      fileStatus: FILE_STATUSES.QUEUED,
    });

    deps.File.findByPk = jest.fn().mockResolvedValue({ status: FILE_STATUSES.QUEUED });

    const result = await runQueueExerciseLive({
      region: 1,
      ownerUserId: 1001,
      timeoutSec: 0.02,
      pollMs: 1,
    }, deps);

    expect(result.flows.scan.passed).toBe(false);
    expect(result.flows.scan.error).toContain('Timed out');
    expect(result.passed).toBe(false);
  });

  it('records cleanup failures without throwing', async () => {
    const deps = makeDeps({
      resourceDestroy: async () => {
        throw new Error('resource cleanup failed');
      },
    });

    const result = await runQueueExerciseLive({
      region: 1,
      ownerUserId: 1001,
      timeoutSec: 1,
      pollMs: 1,
    }, deps);

    expect(result.cleanup.passed).toBe(false);
    expect(result.cleanup.errors.some((e) => e.includes('resource cleanup failed'))).toBe(true);
  });

  it('fails s3 flow when object remains available after delete enqueue', async () => {
    const deps = makeDeps({
      downloadFile: async () => ({ Body: Buffer.from('still there') }),
    });

    const result = await runQueueExerciseLive({
      region: 1,
      ownerUserId: 1001,
      timeoutSec: 0.02,
      pollMs: 1,
    }, deps);

    expect(result.flows.s3.passed).toBe(false);
    expect(result.flows.s3.error).toContain('Timed out');
    expect(result.passed).toBe(false);
  });
});

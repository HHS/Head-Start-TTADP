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

const redisSnapshot = ({
  connectedClients = 5,
  blockedClients = 0,
  usedMemory = 1024 * 1024,
  usedMemoryRss = 2 * 1024 * 1024,
  rejectedConnections = 0,
  evictedKeys = 0,
  clientListCount = 5,
} = {}) => ({
  connectedClients,
  blockedClients,
  usedMemory,
  usedMemoryRss,
  rejectedConnections,
  evictedKeys,
  clientListCount,
});

const buildNotificationJobs = (
  displayId,
  actions = expectedNotificationActions,
  failedReasonsByAction = {},
) => (
  actions.map((name, index) => ({
    id: index + 1,
    name,
    failedReason: failedReasonsByAction[name],
    data: {
      displayId,
      reportPath: `/training-report/${displayId}`,
    },
  }))
);

const makeDeps = ({
  notificationActions = expectedNotificationActions,
  notificationFailedActions = [],
  notificationFailedReasonsByAction = {},
  notificationEligibleUserIds = [1001, 1002],
  selectionEligibleUserIds = [1001, 1002],
  selectionRegionId = 1,
  soakJobState = 'completed',
  soakFailedReasons = ['SOAK_FAILED'],
  redisSnapshots = [redisSnapshot(), redisSnapshot()],
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
  let redisPhase = 0;
  const soakJobs = new Map();
  let removedSoakJobsCount = 0;
  const selectionPermissionRows = selectionEligibleUserIds.flatMap((id) => ([
    { userId: id, scopeId: SITE_ACCESS, regionId: 14 },
    { userId: id, scopeId: READ_WRITE_TRAINING_REPORTS, regionId: selectionRegionId },
  ]));
  const currentSnapshot = () => (
    redisSnapshots[Math.min(redisPhase, redisSnapshots.length - 1)] || redisSnapshot()
  );
  const infoFor = (snap, section) => {
    if (section === 'clients') {
      return `connected_clients:${snap.connectedClients}\nblocked_clients:${snap.blockedClients}\n`;
    }
    if (section === 'memory') {
      return `used_memory:${snap.usedMemory}\nused_memory_rss:${snap.usedMemoryRss}\n`;
    }
    return `rejected_connections:${snap.rejectedConnections}\nevicted_keys:${snap.evictedKeys}\n`;
  };
  const clientListFor = (snap) => (
    Array.from({ length: snap.clientListCount })
      .map((_, i) => `id=${i + 1} addr=127.0.0.1:${6000 + i}`)
      .join('\n')
  );
  const soakStateCounts = () => (
    Array.from(soakJobs.values()).reduce((acc, job) => ({
      ...acc,
      [job.state]: (acc[job.state] || 0) + 1,
    }), {
      waiting: 0,
      active: 0,
      delayed: 0,
      completed: 0,
      failed: 0,
      paused: 0,
    })
  );

  const deps = {
    sequelize: {
      authenticate: jest.fn().mockResolvedValue(undefined),
    },
    getRedis: jest.fn(() => ({
      ping: jest.fn().mockResolvedValue('PONG'),
      info: jest.fn(async (section) => infoFor(currentSnapshot(), section)),
      client: jest.fn(async (command) => {
        if (String(command).toLowerCase() === 'list') {
          const output = clientListFor(currentSnapshot());
          redisPhase += 1;
          return output;
        }
        return '';
      }),
    })),
    generateS3Config: jest.fn(() => ({ s3Bucket: 'queue-exercise-test-bucket' })),
    userById: jest.fn(async (userId, onlyActiveUsers = false) => {
      if (!onlyActiveUsers) {
        return { id: userId };
      }
      return notificationEligibleUserIds.includes(userId)
        ? { id: userId, email: `user${userId}@example.com`, name: `User ${userId}` }
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
      add: jest.fn(async (name, data, jobOpts = {}) => {
        if (String(jobOpts.jobId || '').startsWith('qe-soak-')) {
          const id = String(jobOpts.jobId);
          const nextFailedReason = soakFailedReasons[soakJobs.size % soakFailedReasons.length];
          const soakJob = {
            id,
            name,
            data,
            state: soakJobState,
            failedReason: soakJobState === 'failed' ? nextFailedReason : undefined,
            remove: jest.fn(async () => {
              removedSoakJobsCount += 1;
              soakJobs.delete(id);
            }),
          };
          soakJobs.set(id, soakJob);
          return soakJob;
        }
        return {
          id: `${name}-job`,
          name,
          data,
        };
      }),
      getJobCounts: jest.fn(async (...states) => {
        const counts = soakStateCounts();
        if (!states.length) {
          return counts;
        }
        return states.reduce((acc, state) => ({
          ...acc,
          [state]: counts[state] || 0,
        }), {});
      }),
      getJobs: jest.fn(async ([state]) => (
        [
          ...(state === 'completed'
            ? buildNotificationJobs(eventDisplayId, notificationActions)
            : []),
          ...(state === 'failed'
            ? buildNotificationJobs(
              eventDisplayId,
              notificationFailedActions,
              notificationFailedReasonsByAction,
            )
            : []),
          ...Array.from(soakJobs.values()).filter((job) => job.state === state),
        ]
      )),
    },
    debug: {
      getRemovedSoakJobsCount: () => removedSoakJobsCount,
      getCurrentSoakJobCount: () => soakJobs.size,
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

  it('runs soak test and passes when all soak jobs complete within thresholds', async () => {
    const deps = makeDeps();
    const result = await runQueueExerciseLive({
      region: 1,
      ownerUserId: 1001,
      soak: 25,
      timeoutSec: 1,
      pollMs: 1,
    }, deps);

    expect(result.flows.soak.enabled).toBe(true);
    expect(result.flows.soak.requestedActions).toBe(25);
    expect(result.flows.soak.enqueuedActions).toBe(25);
    expect(result.flows.soak.completedActions).toBe(25);
    expect(result.flows.soak.failedActions).toBe(0);
    expect(result.flows.soak.progressTimeline.length).toBeGreaterThan(0);
    expect(result.flows.soak.removedJobCount).toBe(25);
    expect(result.flows.soak.passed).toBe(true);
    expect(result.passed).toBe(true);
  });

  it('fails soak flow when soak jobs fail', async () => {
    const deps = makeDeps({
      soakJobState: 'failed',
      soakFailedReasons: ['SMTP timeout', 'SMTP timeout', 'Template missing'],
    });
    const result = await runQueueExerciseLive({
      region: 1,
      ownerUserId: 1001,
      soak: 10,
      timeoutSec: 1,
      pollMs: 1,
    }, deps);

    expect(result.flows.soak.enabled).toBe(true);
    expect(result.flows.soak.failedActions).toBe(10);
    expect(result.flows.soak.failedReasonCounts[0]).toEqual({
      reason: 'SMTP timeout',
      count: 7,
    });
    expect(result.flows.soak.failedReasonCounts[1]).toEqual({
      reason: 'Template missing',
      count: 3,
    });
    expect(result.flows.soak.failedReasonCountsByAction[0]).toEqual({
      action: EMAIL_ACTIONS.TRAINING_REPORT_EVENT_IMPORTED,
      reason: 'SMTP timeout',
      count: 7,
    });
    expect(result.flows.soak.failedJobSamples.length).toBeGreaterThan(0);
    expect(result.flows.soak.failedJobSamples[0].reason).toBeTruthy();
    expect(result.flows.soak.passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('fails soak flow when redis growth exceeds strict thresholds', async () => {
    const deps = makeDeps({
      redisSnapshots: [
        redisSnapshot({
          connectedClients: 5,
          blockedClients: 0,
          usedMemory: 10 * 1024 * 1024,
          clientListCount: 5,
        }),
        redisSnapshot({
          connectedClients: 15,
          blockedClients: 1,
          usedMemory: 200 * 1024 * 1024,
          clientListCount: 15,
        }),
      ],
    });
    const result = await runQueueExerciseLive({
      region: 1,
      ownerUserId: 1001,
      soak: 10,
      timeoutSec: 1,
      pollMs: 1,
    }, deps);

    expect(result.flows.soak.enabled).toBe(true);
    expect(result.flows.soak.passed).toBe(false);
    expect(result.flows.soak.error).toContain('connected_clients delta');
    expect(result.passed).toBe(false);
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

  it('fails notification flow when expected action reaches terminal failed state', async () => {
    const deps = makeDeps({
      notificationActions: [
        EMAIL_ACTIONS.TRAINING_REPORT_EVENT_IMPORTED,
        EMAIL_ACTIONS.TRAINING_REPORT_COLLABORATOR_ADDED,
        EMAIL_ACTIONS.TRAINING_REPORT_EVENT_COMPLETED,
      ],
      notificationFailedActions: [EMAIL_ACTIONS.TRAINING_REPORT_SESSION_CREATED],
      notificationFailedReasonsByAction: {
        [EMAIL_ACTIONS.TRAINING_REPORT_SESSION_CREATED]: 'SMTP timeout',
      },
    });
    const result = await runQueueExerciseLive({
      region: 1,
      ownerUserId: 1001,
      timeoutSec: 1,
      pollMs: 1,
    }, deps);

    expect(result.flows.notifications.passed).toBe(false);
    expect(result.flows.notifications.error).toContain('failed=[trainingReportSessionCreated:SMTP timeout]');
    expect(result.flows.notifications.failedReasonCounts).toEqual([
      { reason: 'SMTP timeout', count: 1 },
    ]);
    expect(result.flows.notifications.terminalActionStates).toContainEqual({
      action: EMAIL_ACTIONS.TRAINING_REPORT_SESSION_CREATED,
      state: 'failed',
      failedReason: 'SMTP timeout',
      jobId: '1',
    });
  });

  it('retains soak jobs when keepSoakJobs is enabled', async () => {
    const deps = makeDeps();
    const result = await runQueueExerciseLive({
      region: 1,
      ownerUserId: 1001,
      soak: 8,
      keepSoakJobs: true,
      timeoutSec: 1,
      pollMs: 1,
    }, deps);

    expect(result.flows.soak.passed).toBe(true);
    expect(result.flows.soak.retainedJobs).toBe(true);
    expect(result.flows.soak.removedJobCount).toBe(0);
    expect(result.flows.soak.warnings).toContain('Retained soak jobs for postmortem analysis');
    expect(deps.debug.getRemovedSoakJobsCount()).toBe(0);
    expect(deps.debug.getCurrentSoakJobCount()).toBe(8);
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

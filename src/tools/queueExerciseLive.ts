import { randomBytes } from 'crypto';
import { Op } from 'sequelize';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { auditLogger, logger } from '../logger';
import { EMAIL_ACTIONS, FILE_STATUSES } from '../constants';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import { getRedis } from '../lib/redisClient';
import {
  generateS3Config,
  uploadFile,
  downloadFile,
  deleteFileFromS3,
} from '../lib/s3';
import { createEvent, updateEvent, destroyEvent } from '../services/event';
import { createSession } from '../services/sessionReports';
import { createFileMetaData, updateStatus } from '../services/files';
import addToScanQueue from '../services/scanQueue';
import { notificationQueue } from '../lib/mailer';
import { userById } from '../services/users';

const {
  sequelize,
  User,
  Permission,
  Resource,
  File,
} = db as any;

const DEFAULT_TIMEOUT_SEC = 300;
const DEFAULT_POLL_MS = 5000;
const DEFAULT_REGION = 0;
const DEFAULT_RESOURCE_URL = 'https://headstart.gov/';
const NOTIFICATION_JOB_STATES = ['waiting', 'active', 'delayed', 'completed', 'failed'] as const;
const NOTIFICATION_QUEUE_COUNT_STATES = ['waiting', 'active', 'delayed', 'completed', 'failed', 'paused'];
const DEFAULT_SOAK_ACTIONS = 100;
const SOAK_BATCH_SIZE = 100;
const SOAK_CLIENT_DELTA_LIMIT = 3;
const SOAK_MIN_MEMORY_DELTA_BYTES = 64 * 1024 * 1024;
const SOAK_MEMORY_PERCENT_DELTA_LIMIT = 0.25;
const SOAK_TIMELINE_MAX_POINTS = 120;
const SOAK_FAILED_SAMPLE_LIMIT = 10;
const REQUEST_FAILURE_PATTERN = /(RequestError|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up)/i;
const TRAINING_REPORT_SELECTION_SCOPES = [
  SCOPES.READ_WRITE_TRAINING_REPORTS,
  SCOPES.POC_TRAINING_REPORTS,
];
const NO_SEND_EMAIL_PREFIX = 'no-send_';

export type QueueExerciseLiveOptions = {
  region?: number;
  ownerUserId?: number;
  collaboratorUserId?: number;
  resourceUrl?: string;
  timeoutSec?: number;
  pollMs?: number;
  keepData?: boolean;
  keepSoakJobs?: boolean;
  soak?: number;
};

type RedisDiagnostics = {
  clients: {
    connectedClients: number;
    blockedClients: number;
    clientListCount: number;
  };
  memory: {
    usedMemory: number;
    usedMemoryRss: number;
  };
  stats: {
    rejectedConnections: number;
    evictedKeys: number;
  };
};

type QueueExerciseSummary = {
  runId: string;
  startedAt: string;
  finishedAt?: string;
  options: Required<QueueExerciseLiveOptions>;
  passed: boolean;
  preflight: {
    passed: boolean;
    checks: Record<string, unknown>;
    error?: string;
  };
  actors: {
    ownerUserId?: number;
    collaboratorUserId?: number;
  };
  entities: {
    eventId?: number;
    eventDisplayId?: string;
    sessionId?: number;
    resourceId?: number;
    resourceUrl?: string;
    fileId?: number;
    fileKey?: string;
  };
  flows: {
    notifications: {
      passed: boolean;
      expectedActions: string[];
      observedActions: string[];
      completedActions: string[];
      failedActions: string[];
      terminalActionStates: Array<{
        action: string;
        state: 'completed' | 'failed' | 'missing';
        failedReason?: string;
        jobId?: string;
      }>;
      failedReasonCounts: Array<{
        reason: string;
        count: number;
      }>;
      queueStateCounts: Record<string, number>;
      error?: string;
    };
    resource: {
      passed: boolean;
      finalState?: Record<string, unknown>;
      error?: string;
    };
    scan: {
      passed: boolean;
      finalStatus?: string;
      error?: string;
    };
    s3: {
      passed: boolean;
      objectDeleted?: boolean;
      error?: string;
    };
    soak: {
      enabled: boolean;
      passed: boolean;
      requestedActions: number;
      enqueuedActions: number;
      completedActions: number;
      failedActions: number;
      failedReasonCounts: Array<{
        reason: string;
        count: number;
      }>;
      failedReasonCountsByAction: Array<{
        action: string;
        reason: string;
        count: number;
      }>;
      failedJobSamples: Array<{
        id: string;
        action: string;
        reason: string;
        attemptsMade?: number;
      }>;
      progressTimeline: Array<{
        elapsedMs: number;
        waiting: number;
        active: number;
        delayed: number;
        completed: number;
        failed: number;
        paused: number;
      }>;
      durationMs: number;
      queueCountsBefore: Record<string, number>;
      queueCountsAfter: Record<string, number>;
      redisBefore?: RedisDiagnostics;
      redisAfter?: RedisDiagnostics;
      thresholds: Record<string, unknown>;
      warnings: string[];
      retainedJobs: boolean;
      removedJobCount: number;
      error?: string;
    };
  };
  cleanup: {
    skipped: boolean;
    passed: boolean;
    errors: string[];
  };
};

type QueueExerciseDeps = {
  sequelize: any;
  getRedis: typeof getRedis;
  generateS3Config: typeof generateS3Config;
  User: any;
  Permission: any;
  Resource: any;
  File: any;
  createEvent: typeof createEvent;
  updateEvent: typeof updateEvent;
  destroyEvent: typeof destroyEvent;
  createSession: typeof createSession;
  createFileMetaData: typeof createFileMetaData;
  updateStatus: typeof updateStatus;
  addToScanQueue: typeof addToScanQueue;
  uploadFile: typeof uploadFile;
  downloadFile: typeof downloadFile;
  deleteFileFromS3: typeof deleteFileFromS3;
  notificationQueue: typeof notificationQueue;
  userById: typeof userById;
};

const defaultDeps: QueueExerciseDeps = {
  sequelize,
  getRedis,
  generateS3Config,
  User,
  Permission,
  Resource,
  File,
  createEvent,
  updateEvent,
  destroyEvent,
  createSession,
  createFileMetaData,
  updateStatus,
  addToScanQueue,
  uploadFile,
  downloadFile,
  deleteFileFromS3,
  notificationQueue,
  userById,
};

const withDefaults = (
  options: QueueExerciseLiveOptions = {},
): Required<QueueExerciseLiveOptions> => ({
  region: options.region || DEFAULT_REGION,
  ownerUserId: options.ownerUserId || Number(process.env.CURRENT_USER_ID || 0),
  collaboratorUserId: options.collaboratorUserId || 0,
  resourceUrl: options.resourceUrl || DEFAULT_RESOURCE_URL,
  timeoutSec: options.timeoutSec || DEFAULT_TIMEOUT_SEC,
  pollMs: options.pollMs || DEFAULT_POLL_MS,
  keepData: !!options.keepData,
  keepSoakJobs: !!options.keepSoakJobs,
  soak: options.soak || 0,
});

const sleep = async (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const buildRunId = () => {
  const suffix = randomBytes(3).toString('hex');
  return `qe-${Date.now()}-${suffix}`;
};

const buildEventDisplayId = (region: number, runId: string) => {
  const shortRun = runId.slice(-6).toUpperCase();
  const reg = String(region).padStart(2, '0');
  return `QE-R${reg}-${shortRun}`;
};

const buildTaggedUrl = (baseUrl: string, runId: string) => {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}qe_run=${encodeURIComponent(runId)}`;
};

const waitForCondition = async (
  condition: () => Promise<{ ok: boolean; details?: Record<string, unknown> }>,
  timeoutSec: number,
  pollMs: number,
) => {
  const timeoutAt = Date.now() + (timeoutSec * 1000);
  let lastDetails: Record<string, unknown> = {};
  while (Date.now() < timeoutAt) {
    // eslint-disable-next-line no-await-in-loop
    const check = await condition();
    lastDetails = check.details || {};
    if (check.ok) {
      return { ok: true, details: lastDetails };
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(pollMs);
  }
  return { ok: false, details: lastDetails };
};

const stringifyError = (error: unknown) => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
};

const jobMatchesRun = (job: any, eventDisplayId: string, runId: string) => {
  const displayId = job?.data?.displayId
    || job?.data?.report?.displayId
    || '';
  const reportPath = job?.data?.reportPath || '';
  return String(displayId).includes(eventDisplayId)
    || String(reportPath).includes(eventDisplayId)
    || String(reportPath).includes(runId);
};

const ensureCleanupFileDeletion = async (
  deps: QueueExerciseDeps,
  key?: string,
) => {
  if (!key) {
    return;
  }

  try {
    await deps.downloadFile(key);
    await deps.deleteFileFromS3(key);
  } catch (error) {
    if (stringifyError(error).toLowerCase().includes('nosuchkey')) {
      return;
    }
    throw error;
  }
};

const toNumericId = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const hasSendableEmail = (email: unknown): boolean => (
  typeof email === 'string'
  && email.length > 0
  && !email.startsWith(NO_SEND_EMAIL_PREFIX)
);

const selectQueueExerciseActors = async (
  deps: QueueExerciseDeps,
  requestedRegionId: number,
  requestedOwnerUserId: number,
  requestedCollaboratorUserId: number,
) => {
  const rawPermissions = await deps.Permission.findAll({
    attributes: ['userId', 'scopeId', 'regionId'],
    where: {
      [Op.or]: [
        { scopeId: SCOPES.SITE_ACCESS },
        { scopeId: { [Op.in]: TRAINING_REPORT_SELECTION_SCOPES } },
      ],
    },
    raw: true,
  });

  const allUserIds = new Set<number>();
  (rawPermissions || []).forEach((permission) => {
    const userId = toNumericId(permission.userId);
    if (userId) {
      allUserIds.add(userId);
    }
  });

  const rawUsers = allUserIds.size > 0
    ? await deps.User.findAll({
      attributes: ['id', 'email'],
      where: {
        id: {
          [Op.in]: Array.from(allUserIds),
        },
      },
      order: [['id', 'ASC']],
      raw: true,
    })
    : [];

  const sendableUserIds = new Set<number>();
  (rawUsers || []).forEach((user) => {
    const userId = toNumericId(user.id);
    if (userId && hasSendableEmail(user.email)) {
      sendableUserIds.add(userId);
    }
  });

  const siteAccessUserIds = new Set<number>();
  const eligibleUserIdsByRegion = new Map<number, Set<number>>();

  (rawPermissions || []).forEach((permission) => {
    const userId = toNumericId(permission.userId);
    const scopeId = toNumericId(permission.scopeId);
    const regionId = toNumericId(permission.regionId);
    if (!userId || !scopeId || !sendableUserIds.has(userId)) {
      return;
    }

    if (scopeId === SCOPES.SITE_ACCESS) {
      siteAccessUserIds.add(userId);
      return;
    }

    if (TRAINING_REPORT_SELECTION_SCOPES.includes(scopeId) && regionId) {
      if (!eligibleUserIdsByRegion.has(regionId)) {
        eligibleUserIdsByRegion.set(regionId, new Set<number>());
      }
      eligibleUserIdsByRegion.get(regionId)?.add(userId);
    }
  });

  const regionCandidates = Array.from(eligibleUserIdsByRegion.entries())
    .map(([regionId, userIds]) => ({
      regionId,
      userIds: Array.from(userIds)
        .filter((userId) => siteAccessUserIds.has(userId))
        .sort((a, b) => a - b),
    }))
    .filter(({ userIds }) => userIds.length > 0)
    .sort((a, b) => a.regionId - b.regionId);

  let selectedRegionId = requestedRegionId;
  if (!selectedRegionId) {
    const regionCandidate = regionCandidates.find(({ userIds }) => {
      if (requestedOwnerUserId && !userIds.includes(requestedOwnerUserId)) {
        return false;
      }
      if (requestedCollaboratorUserId && !userIds.includes(requestedCollaboratorUserId)) {
        return false;
      }

      const ids = new Set<number>(userIds);
      if (requestedOwnerUserId) {
        ids.add(requestedOwnerUserId);
      }
      if (requestedCollaboratorUserId) {
        ids.add(requestedCollaboratorUserId);
      }
      return ids.size >= 2;
    });
    selectedRegionId = regionCandidate?.regionId || 0;
  }

  const selectedRegionUsers = (
    regionCandidates.find(({ regionId }) => regionId === selectedRegionId)?.userIds || []
  );

  let selectedOwnerUserId = requestedOwnerUserId;
  if (!selectedOwnerUserId || !selectedRegionUsers.includes(selectedOwnerUserId)) {
    selectedOwnerUserId = selectedRegionUsers[0] || 0;
  }

  let selectedCollaboratorUserId = requestedCollaboratorUserId;
  if (
    !selectedCollaboratorUserId
    || selectedCollaboratorUserId === selectedOwnerUserId
    || !selectedRegionUsers.includes(selectedCollaboratorUserId)
  ) {
    selectedCollaboratorUserId = selectedRegionUsers.find((id) => id !== selectedOwnerUserId) || 0;
  }

  return {
    selectedRegionId,
    selectedOwnerUserId,
    selectedCollaboratorUserId,
    regionCandidates,
  };
};

const parseRedisInfoNumericField = (info: string, field: string): number => {
  const match = info.match(new RegExp(`^${field}:(.+)$`, 'm'));
  if (!match) {
    return 0;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
};

const collectRedisDiagnostics = async (redis: any): Promise<RedisDiagnostics> => {
  const [clientsInfo, memoryInfo, statsInfo, clientListRaw] = await Promise.all([
    redis.info('clients'),
    redis.info('memory'),
    redis.info('stats'),
    redis.client('list'),
  ]);
  const clientListCount = String(clientListRaw || '')
    .split(/\r?\n/)
    .filter((line) => !!line.trim())
    .length;

  return {
    clients: {
      connectedClients: parseRedisInfoNumericField(String(clientsInfo), 'connected_clients'),
      blockedClients: parseRedisInfoNumericField(String(clientsInfo), 'blocked_clients'),
      clientListCount,
    },
    memory: {
      usedMemory: parseRedisInfoNumericField(String(memoryInfo), 'used_memory'),
      usedMemoryRss: parseRedisInfoNumericField(String(memoryInfo), 'used_memory_rss'),
    },
    stats: {
      rejectedConnections: parseRedisInfoNumericField(String(statsInfo), 'rejected_connections'),
      evictedKeys: parseRedisInfoNumericField(String(statsInfo), 'evicted_keys'),
    },
  };
};

const collectNotificationQueueCounts = async (queue: any): Promise<Record<string, number>> => {
  const counts = await queue.getJobCounts(...NOTIFICATION_QUEUE_COUNT_STATES);
  return NOTIFICATION_QUEUE_COUNT_STATES.reduce((acc, key) => ({
    ...acc,
    [key]: Number(counts?.[key] || 0),
  }), {});
};

const soakJobIdPrefix = (runId: string) => `qe-soak-${runId}-`;
const buildSoakJobId = (runId: string, index: number) => `${soakJobIdPrefix(runId)}${index}`;

const buildSoakNotificationJobData = (runId: string, index: number, emailTo: string) => {
  const displayId = `QE-SOAK-${runId}-${index}`;
  return {
    displayId,
    reportPath: `/training-report/soak/${runId}/${index}`,
    emailTo,
    templatePath: 'tr_event_imported',
    debugMessage: `MAILER: Queue exercise soak job ${runId} #${index}`,
    report: {
      displayId,
    },
  };
};

const listSoakJobsByStates = async (
  queue: any,
  runId: string,
  states: string[],
  rangeEnd: number,
) => {
  const all = await Promise.all(states.map(async (state) => {
    const jobs = await queue.getJobs([state], 0, rangeEnd, false);
    const matching = jobs.filter((job) => String(job?.id || '').startsWith(soakJobIdPrefix(runId)));
    return [state, matching] as const;
  }));
  return all.reduce(
    (acc, [state, jobs]) => ({ ...acc, [state]: jobs }),
    {} as Record<string, any[]>,
  );
};

const removeSoakJobs = async (queue: any, runId: string, rangeEnd: number): Promise<number> => {
  const jobsByState = await listSoakJobsByStates(
    queue,
    runId,
    [...NOTIFICATION_JOB_STATES, 'paused'],
    rangeEnd,
  );
  const jobs = Object.values(jobsByState).flat();
  await Promise.all(jobs.map(async (job) => {
    try {
      await job.remove();
    } catch (error) {
      auditLogger.error(`[queue-exercise] Failed removing soak job ${job?.id}: ${stringifyError(error)}`);
    }
  }));
  return jobs.length;
};

const aggregateFailedReasons = (jobs: any[]) => {
  const counts = jobs.reduce((acc, job) => {
    const reason = String(job?.failedReason || '').trim() || 'Unknown failure';
    return {
      ...acc,
      [reason]: Number(acc[reason] || 0) + 1,
    };
  }, {} as Record<string, number>);

  return Object.keys(counts)
    .map((reason) => ({ reason, count: counts[reason] }))
    .sort((a, b) => b.count - a.count);
};

const aggregateFailedReasonsByAction = (jobs: any[]) => {
  const counts = jobs.reduce((acc, job) => {
    const action = String(job?.name || 'unknownAction');
    const reason = String(job?.failedReason || '').trim() || 'Unknown failure';
    const key = `${action}@@${reason}`;
    return {
      ...acc,
      [key]: Number(acc[key] || 0) + 1,
    };
  }, {} as Record<string, number>);

  return Object.keys(counts)
    .map((key) => {
      const [action, reason] = key.split('@@');
      return {
        action,
        reason,
        count: counts[key],
      };
    })
    .sort((a, b) => b.count - a.count);
};

const buildFailedJobSamples = (jobs: any[], limit: number) => jobs
  .slice(0, limit)
  .map((job) => ({
    id: String(job?.id || ''),
    action: String(job?.name || 'unknownAction'),
    reason: String(job?.failedReason || '').trim() || 'Unknown failure',
    attemptsMade: Number.isFinite(Number(job?.attemptsMade)) ? Number(job.attemptsMade) : undefined,
  }));

export async function runQueueExerciseLive(
  inputOptions: QueueExerciseLiveOptions = {},
  depsOverride: Partial<QueueExerciseDeps> = {},
): Promise<QueueExerciseSummary> {
  const options = withDefaults(inputOptions);
  const regionWasExplicit = typeof inputOptions.region === 'number' && inputOptions.region > 0;
  const ownerWasExplicit = typeof inputOptions.ownerUserId === 'number' && inputOptions.ownerUserId > 0;
  const collaboratorWasExplicit = (
    typeof inputOptions.collaboratorUserId === 'number'
    && inputOptions.collaboratorUserId > 0
  );
  const deps = { ...defaultDeps, ...depsOverride };
  const runId = buildRunId();
  const startedAt = new Date().toISOString();

  const summary: QueueExerciseSummary = {
    runId,
    startedAt,
    options,
    passed: false,
    preflight: {
      passed: false,
      checks: {},
    },
    actors: {},
    entities: {},
    flows: {
      notifications: {
        passed: false,
        expectedActions: [
          EMAIL_ACTIONS.TRAINING_REPORT_EVENT_IMPORTED,
          EMAIL_ACTIONS.TRAINING_REPORT_COLLABORATOR_ADDED,
          EMAIL_ACTIONS.TRAINING_REPORT_SESSION_CREATED,
          EMAIL_ACTIONS.TRAINING_REPORT_EVENT_COMPLETED,
        ],
        observedActions: [],
        completedActions: [],
        failedActions: [],
        terminalActionStates: [],
        failedReasonCounts: [],
        queueStateCounts: {},
      },
      resource: {
        passed: false,
      },
      scan: {
        passed: false,
      },
      s3: {
        passed: false,
      },
      soak: {
        enabled: options.soak > 0,
        passed: true,
        requestedActions: options.soak,
        enqueuedActions: 0,
        completedActions: 0,
        failedActions: 0,
        failedReasonCounts: [],
        failedReasonCountsByAction: [],
        failedJobSamples: [],
        progressTimeline: [],
        durationMs: 0,
        queueCountsBefore: {},
        queueCountsAfter: {},
        thresholds: {},
        warnings: [],
        retainedJobs: false,
        removedJobCount: 0,
      },
    },
    cleanup: {
      skipped: options.keepData,
      passed: true,
      errors: [],
    },
  };

  let createdEventId: number | undefined;
  let createdResourceId: number | undefined;
  let createdFileId: number | undefined;
  let createdFileKey: string | undefined;
  let notificationSoakEmail: string | undefined;

  try {
    logger.info(`[queue-exercise] Starting run ${runId}`);

    const preflightChecks: Record<string, unknown> = {};
    try {
      await deps.sequelize.authenticate();
      preflightChecks.database = 'ok';
    } catch (error) {
      preflightChecks.database = stringifyError(error);
    }

    try {
      const redis = deps.getRedis();
      const ping = await redis.ping();
      preflightChecks.redis = ping;
    } catch (error) {
      preflightChecks.redis = stringifyError(error);
    }

    try {
      const { s3Bucket } = deps.generateS3Config();
      if (!s3Bucket) {
        throw new Error('S3 bucket is not configured');
      }
      preflightChecks.s3 = `bucket:${s3Bucket}`;
    } catch (error) {
      preflightChecks.s3 = stringifyError(error);
    }

    summary.preflight.checks = preflightChecks;
    summary.preflight.passed = ['database', 'redis', 's3']
      .every((key) => String(preflightChecks[key]).toLowerCase().includes('ok')
        || String(preflightChecks[key]).toLowerCase().startsWith('bucket:')
        || String(preflightChecks[key]).toLowerCase() === 'pong');

    if (!summary.preflight.passed) {
      summary.preflight.error = 'One or more preflight checks failed';
      return summary;
    }

    const notificationsDisabledByCI = (
      String(process.env.CI || '').toLowerCase() === 'true'
      && process.env.NODE_ENV !== 'test'
    );
    if (notificationsDisabledByCI) {
      summary.preflight.passed = false;
      summary.preflight.error = 'CI=true disables training report notifications';
      return summary;
    }

    const selectedActors = await selectQueueExerciseActors(
      deps,
      options.region,
      ownerWasExplicit ? options.ownerUserId : 0,
      collaboratorWasExplicit ? options.collaboratorUserId : 0,
    );

    const {
      selectedRegionId,
      selectedOwnerUserId,
      selectedCollaboratorUserId,
      regionCandidates,
    } = selectedActors;

    if (!selectedRegionId) {
      summary.preflight.passed = false;
      summary.preflight.error = 'Unable to resolve a region with users eligible for training report queue exercise';
      return summary;
    }

    if (
      regionWasExplicit
      && !regionCandidates.some(({ regionId }) => regionId === selectedRegionId)
    ) {
      summary.preflight.passed = false;
      summary.preflight.error = `region ${options.region} does not have users with SITE_ACCESS and training report permissions`;
      return summary;
    }

    if (ownerWasExplicit && selectedOwnerUserId !== options.ownerUserId) {
      summary.preflight.passed = false;
      summary.preflight.error = `ownerUserId ${options.ownerUserId} is not eligible in region ${selectedRegionId}`;
      return summary;
    }

    if (!selectedOwnerUserId) {
      summary.preflight.passed = false;
      summary.preflight.error = 'Unable to resolve an owner user for notification flows';
      return summary;
    }

    if (collaboratorWasExplicit && selectedCollaboratorUserId !== options.collaboratorUserId) {
      summary.preflight.passed = false;
      summary.preflight.error = `collaboratorUserId ${options.collaboratorUserId} is not eligible in region ${selectedRegionId}`;
      return summary;
    }

    if (!selectedCollaboratorUserId || selectedCollaboratorUserId === selectedOwnerUserId) {
      summary.preflight.passed = false;
      summary.preflight.error = 'Unable to resolve a collaborator user for notification flows';
      return summary;
    }

    options.region = selectedRegionId;
    options.ownerUserId = selectedOwnerUserId;
    options.collaboratorUserId = selectedCollaboratorUserId;
    summary.options.region = selectedRegionId;
    summary.options.ownerUserId = selectedOwnerUserId;
    summary.options.collaboratorUserId = selectedCollaboratorUserId;

    preflightChecks.selection = {
      requested: {
        region: regionWasExplicit ? inputOptions.region : null,
        ownerUserId: ownerWasExplicit ? inputOptions.ownerUserId : null,
        collaboratorUserId: collaboratorWasExplicit ? inputOptions.collaboratorUserId : null,
      },
      selected: {
        region: selectedRegionId,
        ownerUserId: selectedOwnerUserId,
        collaboratorUserId: selectedCollaboratorUserId,
      },
    };

    logger.info(
      `[queue-exercise] Selected region ${selectedRegionId}, owner ${selectedOwnerUserId}, collaborator ${selectedCollaboratorUserId}`,
    );

    const owner = await deps.User.findByPk(options.ownerUserId, { attributes: ['id'] });
    if (!owner) {
      summary.preflight.passed = false;
      summary.preflight.error = `ownerUserId ${options.ownerUserId} was not found`;
      return summary;
    }

    const ownerForNotifications = await deps.userById(options.ownerUserId, true);
    if (!ownerForNotifications) {
      summary.preflight.passed = false;
      summary.preflight.error = `ownerUserId ${options.ownerUserId} is not notification-eligible (missing SITE_ACCESS)`;
      return summary;
    }
    notificationSoakEmail = ownerForNotifications.email;

    const { collaboratorUserId } = options;

    const collaboratorForNotifications = await deps.userById(collaboratorUserId, true);
    if (!collaboratorForNotifications) {
      summary.preflight.passed = false;
      summary.preflight.error = `collaboratorUserId ${collaboratorUserId} is not notification-eligible (missing SITE_ACCESS)`;
      return summary;
    }

    summary.actors.ownerUserId = options.ownerUserId;
    summary.actors.collaboratorUserId = collaboratorUserId;

    const eventDisplayId = buildEventDisplayId(options.region, runId);
    summary.entities.eventDisplayId = eventDisplayId;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const baseEventData = {
        eventId: eventDisplayId,
        eventName: `Queue Exercise ${runId}`,
        status: TRAINING_REPORT_STATUSES.NOT_STARTED,
        startDate: today,
        endDate: today,
      };

      const createdEvent = await deps.createEvent({
        ownerId: options.ownerUserId,
        pocIds: [options.ownerUserId],
        collaboratorIds: [],
        regionId: options.region,
        data: baseEventData,
      } as any);
      createdEventId = createdEvent.id;
      summary.entities.eventId = createdEventId;

      await deps.updateEvent(createdEventId, {
        ownerId: options.ownerUserId,
        pocIds: [options.ownerUserId],
        collaboratorIds: [collaboratorUserId],
        regionId: options.region,
        data: baseEventData,
      } as any);

      const createdSession = await deps.createSession({
        eventId: createdEventId,
        data: {
          sessionName: `Queue Exercise Session ${runId}`,
          startDate: today,
          endDate: today,
          duration: 1,
        },
      });
      summary.entities.sessionId = createdSession.id;

      await deps.updateEvent(createdEventId, {
        ownerId: options.ownerUserId,
        pocIds: [options.ownerUserId],
        collaboratorIds: [collaboratorUserId],
        regionId: options.region,
        data: {
          ...baseEventData,
          status: TRAINING_REPORT_STATUSES.COMPLETE,
        },
      } as any);

      const notificationCheck = await waitForCondition(async () => {
        const observedActions = new Set<string>();
        const completedActions = new Set<string>();
        const failedActions = new Set<string>();
        const terminalActions = new Set<string>();
        const failedJobs: any[] = [];
        const completedActionMeta: Record<string, { jobId: string }> = {};
        const failedActionMeta: Record<string, { jobId: string; failedReason: string }> = {};
        const stateCounts: Record<string, number> = {};

        await Promise.all(NOTIFICATION_JOB_STATES.map(async (state) => {
          const jobs = await deps.notificationQueue.getJobs([state], 0, 200, false);
          const matching = jobs.filter((job) => jobMatchesRun(job, eventDisplayId, runId));
          stateCounts[state] = matching.length;
          matching.forEach((job) => {
            observedActions.add(job.name);
            if (state === 'completed') {
              completedActions.add(job.name);
              terminalActions.add(job.name);
              if (!completedActionMeta[job.name]) {
                completedActionMeta[job.name] = {
                  jobId: String(job?.id || ''),
                };
              }
            }
            if (state === 'failed') {
              failedActions.add(job.name);
              terminalActions.add(job.name);
              failedJobs.push(job);
              if (!failedActionMeta[job.name]) {
                failedActionMeta[job.name] = {
                  jobId: String(job?.id || ''),
                  failedReason: String(job?.failedReason || '').trim() || 'Unknown failure',
                };
              }
            }
          });
        }));

        return {
          ok: summary.flows.notifications.expectedActions
            .every((action) => terminalActions.has(action)),
          details: {
            observedActions: Array.from(observedActions),
            completedActions: Array.from(completedActions),
            failedActions: Array.from(failedActions),
            queueStateCounts: stateCounts,
            completedActionMeta,
            failedActionMeta,
            failedReasonCounts: aggregateFailedReasons(failedJobs),
          },
        };
      }, options.timeoutSec, options.pollMs);

      summary.flows.notifications.observedActions = (
        (notificationCheck.details?.observedActions as string[]) || []
      );
      summary.flows.notifications.completedActions = (
        (notificationCheck.details?.completedActions as string[]) || []
      );
      summary.flows.notifications.failedActions = (
        (notificationCheck.details?.failedActions as string[]) || []
      );
      summary.flows.notifications.queueStateCounts = (
        (notificationCheck.details?.queueStateCounts as Record<string, number>) || {}
      );
      const failedReasonCountsRaw = notificationCheck.details?.failedReasonCounts;
      summary.flows.notifications.failedReasonCounts = Array.isArray(failedReasonCountsRaw)
        ? failedReasonCountsRaw.map((row: any) => ({
          reason: String(row?.reason || 'Unknown failure'),
          count: Number(row?.count || 0),
        }))
        : [];
      const completedActionMeta = (
        (notificationCheck.details?.completedActionMeta as Record<string, { jobId: string }>) || {}
      );
      const failedActionMetaDetails = notificationCheck.details?.failedActionMeta;
      const failedActionMeta = (
        failedActionMetaDetails || {}
      ) as Record<string, { jobId: string; failedReason: string }>;
      const completedActions = (
        (notificationCheck.details?.completedActions as string[]) || []
      );
      const failedActions = (
        (notificationCheck.details?.failedActions as string[]) || []
      );
      const failedExpectedActions = summary.flows.notifications.expectedActions
        .filter((action) => failedActions.includes(action));
      const missingCompletedActions = summary.flows.notifications.expectedActions
        .filter((action) => !completedActions.includes(action));
      summary.flows.notifications.terminalActionStates = summary.flows.notifications.expectedActions
        .map((action) => {
          if (failedActionMeta[action]) {
            return {
              action,
              state: 'failed' as const,
              failedReason: failedActionMeta[action].failedReason,
              jobId: failedActionMeta[action].jobId,
            };
          }
          if (completedActionMeta[action]) {
            return {
              action,
              state: 'completed' as const,
              jobId: completedActionMeta[action].jobId,
            };
          }
          return {
            action,
            state: 'missing' as const,
          };
        });

      summary.flows.notifications.passed = (
        notificationCheck.ok
        && failedExpectedActions.length === 0
        && missingCompletedActions.length === 0
      );
      if (!notificationCheck.ok) {
        summary.flows.notifications.error = 'Timed out waiting for expected notification actions';
      } else if (!summary.flows.notifications.passed) {
        const failedWithReason = failedExpectedActions
          .map((action) => `${action}:${failedActionMeta[action]?.failedReason || 'Unknown failure'}`)
          .join(', ');
        summary.flows.notifications.error = (
          'Notification actions failed or not completed. '
          + `failed=[${failedWithReason}], `
          + `missingCompleted=[${missingCompletedActions.join(', ')}]`
        );
      }
    } catch (error) {
      summary.flows.notifications.passed = false;
      summary.flows.notifications.error = stringifyError(error);
    }

    try {
      const taggedUrl = buildTaggedUrl(options.resourceUrl, runId);
      const resource = await deps.Resource.create({ url: taggedUrl });
      createdResourceId = resource.id;
      summary.entities.resourceId = resource.id;
      summary.entities.resourceUrl = taggedUrl;

      const resourceCheck = await waitForCondition(async () => {
        const current = await deps.Resource.findByPk(resource.id, {
          attributes: ['id', 'title', 'mimeType', 'lastStatusCode', 'metadataUpdatedAt'],
        });
        if (!current) {
          return { ok: false, details: {} };
        }

        const finalState = {
          title: current.title,
          mimeType: current.mimeType,
          lastStatusCode: current.lastStatusCode,
          metadataUpdatedAt: current.metadataUpdatedAt,
        };

        const hasUpdate = !!(
          current.title
          || current.mimeType
          || current.lastStatusCode
          || current.metadataUpdatedAt
        );

        return {
          ok: hasUpdate,
          details: { finalState },
        };
      }, options.timeoutSec, options.pollMs);

      summary.flows.resource.passed = resourceCheck.ok;
      summary.flows.resource.finalState = (
        resourceCheck.details?.finalState as Record<string, unknown>
      ) || undefined;
      if (!resourceCheck.ok) {
        summary.flows.resource.error = 'Timed out waiting for resource metadata updates';
      }
    } catch (error) {
      summary.flows.resource.passed = false;
      summary.flows.resource.error = stringifyError(error);
    }

    try {
      const key = `queue-exercise-${runId}.txt`;
      const body = Buffer.from(`queue exercise ${runId}\n`, 'utf8');
      createdFileKey = key;
      summary.entities.fileKey = key;

      await deps.uploadFile(body, key, { mime: 'text/plain', ext: '.txt' } as any);
      const file = await deps.createFileMetaData(`queue-exercise-${runId}.txt`, key, body.length);
      createdFileId = file.id;
      summary.entities.fileId = file.id;

      await deps.updateStatus(file.id, FILE_STATUSES.UPLOADED);
      await deps.addToScanQueue({ key });
      await deps.updateStatus(file.id, FILE_STATUSES.QUEUED);

      const scanCheck = await waitForCondition(async () => {
        const currentFile = await deps.File.findByPk(file.id, { attributes: ['status'] });
        const status = currentFile?.status || 'unknown';
        const terminalStatuses = [
          FILE_STATUSES.APPROVED,
          FILE_STATUSES.REJECTED,
          FILE_STATUSES.SCANNING_FAILED,
        ];
        return {
          ok: terminalStatuses.includes(status),
          details: { status },
        };
      }, options.timeoutSec, options.pollMs);

      summary.flows.scan.passed = scanCheck.ok;
      summary.flows.scan.finalStatus = scanCheck.details?.status as string;
      if (!scanCheck.ok) {
        summary.flows.scan.error = 'Timed out waiting for scan terminal status';
      }

      await deps.File.destroy({ where: { id: file.id }, individualHooks: true });
      const s3DeleteCheck = await waitForCondition(async () => {
        try {
          await deps.downloadFile(key);
          return { ok: false, details: { objectDeleted: false } };
        } catch (error) {
          return {
            ok: true,
            details: {
              objectDeleted: true,
              lastError: stringifyError(error),
            },
          };
        }
      }, options.timeoutSec, options.pollMs);

      summary.flows.s3.passed = s3DeleteCheck.ok;
      summary.flows.s3.objectDeleted = !!s3DeleteCheck.details?.objectDeleted;
      if (!s3DeleteCheck.ok) {
        summary.flows.s3.error = 'Timed out waiting for S3 object deletion';
      }
    } catch (error) {
      summary.flows.scan.passed = false;
      summary.flows.s3.passed = false;
      summary.flows.scan.error = summary.flows.scan.error || stringifyError(error);
      summary.flows.s3.error = summary.flows.s3.error || stringifyError(error);
    }

    if (options.soak > 0) {
      const soakRangeEnd = Math.max((options.soak * 3), 3000);
      const soakFlow = summary.flows.soak;
      const soakStartedAt = Date.now();
      const soakFailures: string[] = [];

      try {
        if (!notificationSoakEmail) {
          throw new Error('Unable to resolve a notification email for soak jobs');
        }

        const redis = deps.getRedis();
        soakFlow.queueCountsBefore = await collectNotificationQueueCounts(deps.notificationQueue);
        soakFlow.redisBefore = await collectRedisDiagnostics(redis);

        const enqueueErrors: string[] = [];
        for (let offset = 0; offset < options.soak; offset += SOAK_BATCH_SIZE) {
          const batchCount = Math.min(SOAK_BATCH_SIZE, options.soak - offset);
          // eslint-disable-next-line no-await-in-loop
          const settled = await Promise.allSettled(
            Array.from({ length: batchCount }).map((_, idx) => {
              const index = offset + idx;
              return deps.notificationQueue.add(
                EMAIL_ACTIONS.TRAINING_REPORT_EVENT_IMPORTED,
                buildSoakNotificationJobData(runId, index, notificationSoakEmail as string),
                {
                  jobId: buildSoakJobId(runId, index),
                  removeOnComplete: false,
                  removeOnFail: false,
                },
              );
            }),
          );

          settled.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
              soakFlow.enqueuedActions += 1;
              return;
            }
            enqueueErrors.push(`job ${offset + idx}: ${stringifyError(result.reason)}`);
          });
        }

        if (enqueueErrors.length > 0) {
          soakFlow.warnings.push(`Encountered ${enqueueErrors.length} enqueue errors during soak`);
        }

        if (soakFlow.enqueuedActions === 0) {
          throw new Error('No soak jobs were enqueued');
        }

        const timeoutAt = Date.now() + (options.timeoutSec * 1000);
        let reachedTerminal = false;
        while (Date.now() < timeoutAt) {
          // eslint-disable-next-line no-await-in-loop
          const jobsByState = await listSoakJobsByStates(
            deps.notificationQueue,
            runId,
            [...NOTIFICATION_JOB_STATES, 'paused'],
            soakRangeEnd,
          );
          const stateCounts = Object.keys(jobsByState).reduce((acc, state) => ({
            ...acc,
            [state]: jobsByState[state].length,
          }), {} as Record<string, number>);

          const completed = stateCounts.completed || 0;
          const failed = stateCounts.failed || 0;
          const terminal = completed + failed;

          soakFlow.completedActions = completed;
          soakFlow.failedActions = failed;
          if (
            soakFlow.progressTimeline.length < SOAK_TIMELINE_MAX_POINTS
            || terminal >= soakFlow.enqueuedActions
          ) {
            soakFlow.progressTimeline.push({
              elapsedMs: Date.now() - soakStartedAt,
              waiting: stateCounts.waiting || 0,
              active: stateCounts.active || 0,
              delayed: stateCounts.delayed || 0,
              completed,
              failed,
              paused: stateCounts.paused || 0,
            });
          }

          if (terminal >= soakFlow.enqueuedActions) {
            reachedTerminal = true;
            break;
          }

          // eslint-disable-next-line no-await-in-loop
          await sleep(options.pollMs);
        }

        if (!reachedTerminal) {
          soakFailures.push('Timed out waiting for soak notification jobs to reach terminal states');
        }

        if (soakFlow.failedActions > 0) {
          soakFailures.push(`Soak jobs failed: ${soakFlow.failedActions}`);

          const failedOnly = await listSoakJobsByStates(
            deps.notificationQueue,
            runId,
            ['failed'],
            soakRangeEnd,
          );
          const failedJobs = failedOnly.failed || [];
          soakFlow.failedReasonCounts = aggregateFailedReasons(failedJobs);
          soakFlow.failedReasonCountsByAction = aggregateFailedReasonsByAction(failedJobs);
          soakFlow.failedJobSamples = buildFailedJobSamples(failedJobs, SOAK_FAILED_SAMPLE_LIMIT);

          const requestFailureCount = soakFlow.failedReasonCounts
            .filter(({ reason }) => REQUEST_FAILURE_PATTERN.test(reason))
            .reduce((acc, row) => acc + row.count, 0);
          if (requestFailureCount > 0) {
            soakFlow.warnings.push(
              `Detected ${requestFailureCount} failed jobs with request/network style errors`,
            );
          }
        }

        if (soakFlow.completedActions !== soakFlow.enqueuedActions) {
          soakFailures.push(
            `Completed soak jobs (${soakFlow.completedActions}) did not match enqueued (${soakFlow.enqueuedActions})`,
          );
        }

        soakFlow.queueCountsAfter = await collectNotificationQueueCounts(deps.notificationQueue);
        soakFlow.redisAfter = await collectRedisDiagnostics(redis);

        if (soakFlow.redisBefore && soakFlow.redisAfter) {
          const connectedClientsDelta = (
            soakFlow.redisAfter.clients.connectedClients
            - soakFlow.redisBefore.clients.connectedClients
          );
          const clientListCountDelta = (
            soakFlow.redisAfter.clients.clientListCount
            - soakFlow.redisBefore.clients.clientListCount
          );
          const blockedClientsDelta = (
            soakFlow.redisAfter.clients.blockedClients
            - soakFlow.redisBefore.clients.blockedClients
          );
          const usedMemoryDelta = (
            soakFlow.redisAfter.memory.usedMemory
            - soakFlow.redisBefore.memory.usedMemory
          );
          const memoryGrowthLimit = Math.max(
            SOAK_MIN_MEMORY_DELTA_BYTES,
            Math.floor(soakFlow.redisBefore.memory.usedMemory * SOAK_MEMORY_PERCENT_DELTA_LIMIT),
          );
          const rejectedConnectionsDelta = (
            soakFlow.redisAfter.stats.rejectedConnections
            - soakFlow.redisBefore.stats.rejectedConnections
          );
          const evictedKeysDelta = (
            soakFlow.redisAfter.stats.evictedKeys
            - soakFlow.redisBefore.stats.evictedKeys
          );

          soakFlow.thresholds = {
            connectedClients: {
              before: soakFlow.redisBefore.clients.connectedClients,
              after: soakFlow.redisAfter.clients.connectedClients,
              delta: connectedClientsDelta,
              limit: SOAK_CLIENT_DELTA_LIMIT,
            },
            clientListCount: {
              before: soakFlow.redisBefore.clients.clientListCount,
              after: soakFlow.redisAfter.clients.clientListCount,
              delta: clientListCountDelta,
              limit: SOAK_CLIENT_DELTA_LIMIT,
            },
            blockedClients: {
              before: soakFlow.redisBefore.clients.blockedClients,
              after: soakFlow.redisAfter.clients.blockedClients,
              delta: blockedClientsDelta,
              limit: 0,
            },
            usedMemory: {
              before: soakFlow.redisBefore.memory.usedMemory,
              after: soakFlow.redisAfter.memory.usedMemory,
              delta: usedMemoryDelta,
              limit: memoryGrowthLimit,
            },
            rejectedConnections: {
              before: soakFlow.redisBefore.stats.rejectedConnections,
              after: soakFlow.redisAfter.stats.rejectedConnections,
              delta: rejectedConnectionsDelta,
            },
            evictedKeys: {
              before: soakFlow.redisBefore.stats.evictedKeys,
              after: soakFlow.redisAfter.stats.evictedKeys,
              delta: evictedKeysDelta,
            },
          };

          if (connectedClientsDelta > SOAK_CLIENT_DELTA_LIMIT) {
            soakFailures.push(
              `connected_clients delta ${connectedClientsDelta} exceeded limit ${SOAK_CLIENT_DELTA_LIMIT}`,
            );
          }
          if (clientListCountDelta > SOAK_CLIENT_DELTA_LIMIT) {
            soakFailures.push(
              `CLIENT LIST count delta ${clientListCountDelta} exceeded limit ${SOAK_CLIENT_DELTA_LIMIT}`,
            );
          }
          if (blockedClientsDelta > 0) {
            soakFailures.push(`blocked_clients increased by ${blockedClientsDelta}`);
          }
          if (usedMemoryDelta > memoryGrowthLimit) {
            soakFailures.push(
              `used_memory delta ${usedMemoryDelta} exceeded limit ${memoryGrowthLimit}`,
            );
          }
        }
      } catch (error) {
        soakFailures.push(stringifyError(error));
      } finally {
        soakFlow.durationMs = Date.now() - soakStartedAt;
        if (options.keepSoakJobs || options.keepData) {
          soakFlow.retainedJobs = true;
          soakFlow.warnings.push('Retained soak jobs for postmortem analysis');
        } else {
          try {
            soakFlow.removedJobCount = await removeSoakJobs(
              deps.notificationQueue,
              runId,
              soakRangeEnd,
            );
          } catch (error) {
            soakFailures.push(`Failed removing soak jobs: ${stringifyError(error)}`);
          }
        }
      }

      soakFlow.passed = soakFailures.length === 0;
      if (!soakFlow.passed) {
        soakFlow.error = soakFailures.join('; ');
      }
    }
  } catch (error) {
    auditLogger.error(`[queue-exercise] Run failed: ${stringifyError(error)}`);
  } finally {
    if (!options.keepData) {
      if (createdFileId) {
        try {
          const file = await deps.File.findByPk(createdFileId);
          if (file) {
            await deps.File.destroy({ where: { id: createdFileId }, individualHooks: true });
          }
        } catch (error) {
          summary.cleanup.passed = false;
          summary.cleanup.errors.push(`file cleanup: ${stringifyError(error)}`);
        }
      }

      try {
        await ensureCleanupFileDeletion(deps, createdFileKey);
      } catch (error) {
        summary.cleanup.passed = false;
        summary.cleanup.errors.push(`s3 cleanup: ${stringifyError(error)}`);
      }

      if (createdResourceId) {
        try {
          await deps.Resource.destroy({ where: { id: createdResourceId }, individualHooks: true });
        } catch (error) {
          summary.cleanup.passed = false;
          summary.cleanup.errors.push(`resource cleanup: ${stringifyError(error)}`);
        }
      }

      if (createdEventId) {
        try {
          await deps.destroyEvent(createdEventId);
        } catch (error) {
          summary.cleanup.passed = false;
          summary.cleanup.errors.push(`event cleanup: ${stringifyError(error)}`);
        }
      }
    }

    summary.finishedAt = new Date().toISOString();
    summary.passed = summary.preflight.passed
      && summary.flows.notifications.passed
      && summary.flows.resource.passed
      && summary.flows.scan.passed
      && summary.flows.s3.passed
      && summary.flows.soak.passed;
  }

  return summary;
}

export default runQueueExerciseLive;

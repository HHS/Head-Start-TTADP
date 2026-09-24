import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import type {
  RecipientTimelineEventPresentation,
  RecipientTimelineEventType,
  RecipientTimelineFilterTopic,
  RecipientTimelineRequestParams,
} from '@ttahub/common/src/recipientTimeline';
import { convert } from 'html-to-text';
import { literal, Op } from 'sequelize';
import formatMonitoringCitationName from '../lib/formatMonitoringCitationName';
import { getSignedDownloadUrl } from '../lib/s3';
import db from '../models';

const {
  ActivityRecipient,
  ActivityReport,
  ActivityReportCollaborator,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  ActivityReportObjectiveTopic,
  CommunicationLog,
  CommunicationLogFile,
  CommunicationLogRecipient,
  EventReportPilot,
  File,
  Goal,
  GoalStatusChange,
  GoalTemplate,
  Grant,
  Objective,
  Program,
  Role,
  SessionReportPilot,
  Topic,
  User,
} = db;

export interface TimelineSourceBindings {
  /** Add a source provided replacement and return its SQL placeholder. */
  add(name: string, value: unknown): string;
}

export interface TimelineEventSource {
  /** Stable discriminator that, together with sourceId, identifies an event globally. */
  readonly name: string;
  readonly supportedFilterTopics: readonly RecipientTimelineFilterTopic[];
  /**
   * Return trusted SQL with date as a DATE or TIMESTAMP (with or without a timezone).
   * Preserve full timestamps; timezone-free values are interpreted as UTC. Bind URL-derived values.
   */
  buildIndexQuery(
    context: RecipientTimelineRequestParams,
    bindings: TimelineSourceBindings
  ): string;
  /** Populate exact page IDs without reapplying index eligibility or filter predicates. */
  populate(
    sourceIds: readonly number[],
    context: RecipientTimelineRequestParams
  ): Promise<Map<number, RecipientTimelineEventPresentation>>;
}

const uniqueSorted = (values: Array<string | null | undefined>): string[] =>
  [
    ...new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value)),
  ].sort((left, right) => left.localeCompare(right));

const formatCreatorRole = (role: string | null): string => {
  if (!role) return '';
  if (role === 'TTAC' || role === 'COR') return role;
  return role
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('');
};

const nameWithRoles = (name: string | null, roles: string[]): string | null => {
  if (!name?.trim()) return null;
  const roleSuffix = uniqueSorted(roles).join(', ');
  return roleSuffix ? `${name.trim()}, ${roleSuffix}` : name.trim();
};

const formatDeliveryMethod = (method: string | null): string | null => {
  switch (method?.trim().toLowerCase()) {
    case 'in-person':
    case 'in person':
      return 'In person';
    case 'virtual':
      return 'Virtual';
    case 'hybrid':
      return 'Hybrid';
    default:
      return method?.trim() || null;
  }
};

const pushMapValue = <T>(map: Map<number, T[]>, key: number, value: T) => {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
};

const activityReportStandardPredicate = (replacement: string, negate: boolean) => `
  ${negate ? 'NOT ' : ''}EXISTS (
    SELECT 1
    FROM "ActivityReportGoals" AS "filteredActivityReportGoal"
    INNER JOIN "Goals" AS "filteredGoal"
      ON "filteredGoal"."id" = "filteredActivityReportGoal"."goalId"
      AND "filteredGoal"."deletedAt" IS NULL
      AND "filteredGoal"."mapsToParentGoalId" IS NULL
    INNER JOIN "GoalTemplates" AS "filteredGoalTemplate"
      ON "filteredGoalTemplate"."id" = "filteredGoal"."goalTemplateId"
      AND "filteredGoalTemplate"."deletedAt" IS NULL
    INNER JOIN "Grants" AS "filteredGrant"
      ON "filteredGrant"."id" = "filteredGoal"."grantId"
    WHERE "filteredActivityReportGoal"."activityReportId" = "report"."id"
      AND "filteredGrant"."recipientId" = :recipientId
      AND "filteredGrant"."regionId" = :regionId
      AND "filteredGoalTemplate"."standard" IN (${replacement})
  )`;

const buildActivityReportIndexQuery = (
  context: RecipientTimelineRequestParams,
  bindings: TimelineSourceBindings
): string => {
  const standardPredicates = context.filters
    .filter(({ topic }) => topic === 'standard')
    .map((filter, index) => {
      if (!Array.isArray(filter.query) || filter.query.length === 0) {
        throw new Error('Timeline standard filters require at least one value');
      }

      const replacement = bindings.add(`standard_${index}`, filter.query);
      return activityReportStandardPredicate(replacement, filter.condition === 'is not');
    });

  return `
    SELECT
      "report"."id" AS "sourceId",
      "report"."startDate" AS "date",
      'TTA activity' AS "eventType",
      "grant"."recipientId",
      "grant"."regionId"
    FROM "ActivityReports" AS "report"
    INNER JOIN "ActivityRecipients" AS "activityRecipient"
      ON "activityRecipient"."activityReportId" = "report"."id"
    INNER JOIN "Grants" AS "grant"
      ON "grant"."id" = "activityRecipient"."grantId"
      AND "grant"."regionId" = "report"."regionId"
    WHERE "report"."calculatedStatus" = 'approved'
      AND "report"."submissionStatus" <> 'deleted'
      ${standardPredicates.map((predicate) => `AND ${predicate}`).join('\n      ')}`;
};

const emptyActivityReportPresentation = (): RecipientTimelineEventPresentation => ({
  durationHours: null,
  title: 'TTA activity',
  subtitle: null,
  byline: null,
  indicators: [],
  tags: [],
  details: [],
  links: [],
});

async function populateActivityReports(
  sourceIds: readonly number[],
  context: RecipientTimelineRequestParams
): Promise<Map<number, RecipientTimelineEventPresentation>> {
  if (sourceIds.length === 0) return new Map();

  const reportIds = [...new Set(sourceIds)];
  const activityRecipients = await ActivityRecipient.unscoped().findAll({
    attributes: ['activityReportId', 'grantId'],
    where: {
      activityReportId: { [Op.in]: reportIds },
      grantId: { [Op.ne]: null },
    },
  });
  const referencedGrantIds = [
    ...new Set(
      activityRecipients
        .map(({ grantId }) => grantId)
        .filter((grantId): grantId is number => Number.isInteger(grantId))
    ),
  ];
  const populationResults = await Promise.all([
    ActivityReport.unscoped().findAll({
      attributes: ['id', 'duration', 'deliveryMethod', 'legacyId', 'userId', 'creatorRole'],
      where: { id: { [Op.in]: reportIds } },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    }),
    ActivityReportCollaborator.findAll({
      attributes: ['activityReportId', 'userId'],
      where: { activityReportId: { [Op.in]: reportIds } },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name'], required: true },
        {
          model: Role,
          as: 'roles',
          attributes: ['name'],
          through: { attributes: [] },
          required: false,
        },
      ],
    }),
    referencedGrantIds.length
      ? Grant.unscoped().findAll({
          attributes: ['id', 'number'],
          where: {
            id: { [Op.in]: referencedGrantIds },
            recipientId: context.recipientId,
            regionId: context.regionId,
          },
          include: [
            {
              model: Program,
              as: 'programs',
              attributes: ['programType'],
              required: false,
            },
          ],
        })
      : Promise.resolve([]),
    ActivityReportGoal.findAll({
      attributes: ['activityReportId', 'goalId'],
      where: { activityReportId: { [Op.in]: reportIds } },
    }),
    ActivityReportObjective.findAll({
      attributes: ['id', 'activityReportId', 'objectiveId'],
      where: { activityReportId: { [Op.in]: reportIds } },
    }),
  ]);
  const [reports, collaborators, recipientGrants, reportGoals, reportObjectives] =
    populationResults;

  const grantById = new Map<number, any>(recipientGrants.map((grant) => [grant.id, grant]));
  const recipientGrantIds = [...grantById.keys()];
  const goalIds = [...new Set(reportGoals.map(({ goalId }) => goalId))];
  const activityReportObjectiveIds = reportObjectives.map(({ id }) => id);

  const [goals, citationRows] = await Promise.all([
    goalIds.length && recipientGrantIds.length
      ? Goal.findAll({
          attributes: ['id', 'grantId'],
          where: {
            id: { [Op.in]: goalIds },
            grantId: { [Op.in]: recipientGrantIds },
            mapsToParentGoalId: null,
          },
          include: [
            {
              model: GoalTemplate,
              as: 'goalTemplate',
              attributes: ['standard'],
              required: false,
            },
          ],
        })
      : Promise.resolve([]),
    activityReportObjectiveIds.length && recipientGrantIds.length
      ? ActivityReportObjectiveCitation.findAll({
          attributes: ['activityReportObjectiveId', 'grantId', 'acro', 'citation', 'findingSource'],
          where: {
            activityReportObjectiveId: { [Op.in]: activityReportObjectiveIds },
            grantId: { [Op.in]: recipientGrantIds },
          },
        })
      : Promise.resolve([]),
  ]);

  const recipientGoalIds = goals.map(({ id }) => id);
  const reportObjectiveIds = reportObjectives.map(({ objectiveId }) => objectiveId);
  const recipientObjectives =
    recipientGoalIds.length && reportObjectiveIds.length
      ? await Objective.findAll({
          attributes: ['id'],
          where: {
            id: { [Op.in]: reportObjectiveIds },
            goalId: { [Op.in]: recipientGoalIds },
          },
        })
      : [];
  const recipientObjectiveIds = new Set(recipientObjectives.map(({ id }) => id));
  const recipientActivityReportObjectiveIds = reportObjectives
    .filter(({ objectiveId }) => recipientObjectiveIds.has(objectiveId))
    .map(({ id }) => id);
  const topicRows = recipientActivityReportObjectiveIds.length
    ? await ActivityReportObjectiveTopic.findAll({
        attributes: ['activityReportObjectiveId'],
        where: { activityReportObjectiveId: { [Op.in]: recipientActivityReportObjectiveIds } },
        include: [{ model: Topic, as: 'topic', attributes: ['name'], required: true }],
      })
    : [];

  const collaboratorsByReport = new Map<number, any[]>();
  collaborators.forEach((collaborator) => {
    pushMapValue(collaboratorsByReport, collaborator.activityReportId, collaborator);
  });

  const grantsByReport = new Map<number, any[]>();
  activityRecipients.forEach(({ activityReportId, grantId }) => {
    const grant = grantId ? grantById.get(grantId) : null;
    if (grant) pushMapValue(grantsByReport, activityReportId, grant);
  });

  const reportIdsByGoalId = new Map<number, number[]>();
  reportGoals.forEach(({ activityReportId, goalId }) => {
    pushMapValue(reportIdsByGoalId, goalId, activityReportId);
  });
  const standardsByReport = new Map<number, string[]>();
  goals.forEach((goal) => {
    const standard = goal.goalTemplate?.standard;
    if (!standard) return;
    (reportIdsByGoalId.get(goal.id) ?? []).forEach((reportId) => {
      pushMapValue(standardsByReport, reportId, standard);
    });
  });

  const reportIdByObjectiveId = new Map<number, number>(
    reportObjectives.map(({ id, activityReportId }) => [id, activityReportId])
  );
  const topicsByReport = new Map<number, string[]>();
  topicRows.forEach((row) => {
    const reportId = reportIdByObjectiveId.get(row.activityReportObjectiveId);
    const topic = row.topic?.name;
    if (reportId && topic) pushMapValue(topicsByReport, reportId, topic);
  });
  const citationsByReport = new Map<number, string[]>();
  citationRows.forEach((row) => {
    const reportId = reportIdByObjectiveId.get(row.activityReportObjectiveId);
    const citation = formatMonitoringCitationName(row);
    if (reportId && citation) pushMapValue(citationsByReport, reportId, citation);
  });

  const presentations = new Map<number, RecipientTimelineEventPresentation>();
  reports.forEach((report) => {
    const presentation = emptyActivityReportPresentation();
    const creatorRole = formatCreatorRole(report.creatorRole);
    const creator = nameWithRoles(report.author?.name ?? null, creatorRole ? [creatorRole] : []);
    const collaboratorNames = (collaboratorsByReport.get(report.id) ?? [])
      .filter(({ userId }) => userId !== report.userId)
      .map((collaborator) =>
        nameWithRoles(
          collaborator.user?.name ?? null,
          (collaborator.roles ?? []).map(({ name }) => name)
        )
      )
      .filter((name): name is string => !!name)
      .sort((left, right) => left.localeCompare(right));
    const specialists = [creator, ...collaboratorNames].filter((name): name is string => !!name);
    const standards = uniqueSorted(standardsByReport.get(report.id) ?? []);
    const topics = uniqueSorted(topicsByReport.get(report.id) ?? []);
    const deliveryMethod = formatDeliveryMethod(report.deliveryMethod);
    const grants = uniqueSorted(
      (grantsByReport.get(report.id) ?? []).map((grant) => {
        const programTypes = uniqueSorted(
          (grant.programs ?? []).map(({ programType }) => programType)
        );
        return [grant.number, programTypes.join(', ')].filter(Boolean).join(' - ');
      })
    );
    const citations = standards.includes('Monitoring')
      ? uniqueSorted(citationsByReport.get(report.id) ?? [])
      : [];

    presentation.durationHours = report.duration === null ? null : Number(report.duration);
    presentation.byline = specialists.length ? { label: 'Specialists', values: specialists } : null;
    presentation.tags = standards.map((label) => ({
      label,
      flagged: label === 'Monitoring',
    }));
    presentation.details = [
      ...(topics.length ? [{ label: 'Topics', items: [{ text: topics.join(', ') }] }] : []),
      ...(deliveryMethod ? [{ label: 'Delivery method', items: [{ text: deliveryMethod }] }] : []),
      ...(citations.length
        ? [{ label: 'Citations addressed', items: citations.map((text) => ({ text })) }]
        : []),
      ...(grants.length
        ? [{ label: 'Grant numbers', items: grants.map((text) => ({ text })) }]
        : []),
    ];
    presentation.links = [
      {
        label: 'View activity report',
        to: report.legacyId
          ? `/activity-reports/legacy/${report.legacyId}`
          : `/activity-reports/view/${report.id}`,
      },
    ];
    presentations.set(report.id, presentation);
  });

  return presentations;
}

export const ACTIVITY_REPORT_TIMELINE_SOURCE: TimelineEventSource = Object.freeze({
  name: 'activityReport',
  supportedFilterTopics: ['standard'] as const,
  buildIndexQuery: buildActivityReportIndexQuery,
  populate: populateActivityReports,
});

// These rules also drive presentation titles, keeping index filters and population consistent.
const GOAL_STATUS_EVENT_RULES: Array<{
  eventType: RecipientTimelineEventType;
  oldStatuses: Array<string | null>;
  newStatuses: string[];
  requiresPriorClosedGoal?: boolean;
}> = [
  {
    eventType: 'Goal reopened',
    oldStatuses: [null, 'Draft'],
    newStatuses: ['Not Started', 'In Progress'],
    requiresPriorClosedGoal: true,
  },
  {
    eventType: 'Goal added',
    oldStatuses: [null, 'Draft'],
    newStatuses: ['Not Started', 'In Progress', 'Suspended', 'Closed'],
  },
  {
    eventType: 'Goal suspended',
    oldStatuses: ['Not Started', 'In Progress', 'Closed'],
    newStatuses: ['Suspended'],
  },
  {
    eventType: 'Goal closed',
    oldStatuses: ['Not Started', 'In Progress', 'Suspended'],
    newStatuses: ['Closed'],
  },
  {
    eventType: 'Goal reopened',
    oldStatuses: ['Closed', 'Suspended'],
    newStatuses: ['Not Started', 'In Progress'],
  },
];

// Reopening a standard creates a new goal. Share this predicate between the index and
// population query so event filters and titles agree, without fetching prior goals one at a time.
const PRIOR_CLOSED_GOAL_PREDICATE = `EXISTS (
  SELECT 1 FROM "Goals" AS "previousGoal"
  WHERE "previousGoal"."grantId" = "goal"."grantId"
    AND "previousGoal"."goalTemplateId" = "goal"."goalTemplateId"
    AND "previousGoal"."prestandard" = "goal"."prestandard"
    AND "previousGoal"."status" = 'Closed'
    AND "previousGoal"."deletedAt" IS NULL
    AND "previousGoal"."mapsToParentGoalId" IS NULL
    AND ("previousGoal"."createdAt", "previousGoal"."id") < ("goal"."createdAt", "goal"."id")
)`;

const buildGoalStatusChangeIndexQuery = (
  context: RecipientTimelineRequestParams,
  bindings: TimelineSourceBindings
): string => {
  const eventTypes = GOAL_STATUS_EVENT_RULES.map((rule, index) => {
    const oldStatuses = bindings.add(
      `oldStatuses_${index}`,
      rule.oldStatuses.filter((status) => status !== null)
    );
    const newStatuses = bindings.add(`newStatuses_${index}`, rule.newStatuses);
    const eventType = bindings.add(`eventType_${index}`, rule.eventType);
    return `WHEN ("change"."oldStatus" IN (${oldStatuses})
      ${rule.oldStatuses.includes(null) ? 'OR "change"."oldStatus" IS NULL' : ''})
      AND "change"."newStatus" IN (${newStatuses})
      ${rule.requiresPriorClosedGoal ? `AND ${PRIOR_CLOSED_GOAL_PREDICATE}` : ''}
      THEN ${eventType}`;
  });
  const standardPredicates = context.filters
    .filter(({ topic }) => topic === 'standard')
    .map((filter, index) => {
      if (!Array.isArray(filter.query) || filter.query.length === 0) {
        throw new Error('Timeline standard filters require at least one value');
      }
      const replacement = bindings.add(`standard_${index}`, filter.query);
      return `${filter.condition === 'is not' ? 'NOT ' : ''}EXISTS (
        SELECT 1 FROM "GoalTemplates" AS "template"
        WHERE "template"."id" = "goal"."goalTemplateId"
          AND "template"."deletedAt" IS NULL
          AND "template"."standard" IN (${replacement})
      )`;
    });

  return `
    SELECT
      "change"."id" AS "sourceId",
      COALESCE("change"."performedAt", "change"."createdAt") AS "date",
      CASE ${eventTypes.join('\n        ')} END AS "eventType",
      "grant"."recipientId",
      "grant"."regionId"
    FROM "GoalStatusChanges" AS "change"
    INNER JOIN "Goals" AS "goal"
      ON "goal"."id" = "change"."goalId"
      AND "goal"."deletedAt" IS NULL
      AND "goal"."mapsToParentGoalId" IS NULL
      AND "goal"."status" <> 'Draft'
    INNER JOIN "Grants" AS "grant"
      ON "grant"."id" = "goal"."grantId"
    ${standardPredicates.length ? `WHERE ${standardPredicates.join('\n      AND ')}` : ''}`;
};

async function populateGoalStatusChanges(
  sourceIds: readonly number[],
  context: RecipientTimelineRequestParams
): Promise<Map<number, RecipientTimelineEventPresentation>> {
  if (sourceIds.length === 0) return new Map();

  const changes = await GoalStatusChange.unscoped().findAll({
    attributes: [
      'id',
      'userName',
      'userRoles',
      'oldStatus',
      'newStatus',
      'reason',
      'context',
      [literal(PRIOR_CLOSED_GOAL_PREDICATE), 'hasPriorClosedGoal'],
    ],
    where: { id: { [Op.in]: [...new Set(sourceIds)] } },
    include: [
      { model: User, as: 'user', attributes: ['name'], required: false },
      {
        model: Goal.unscoped(),
        as: 'goal',
        attributes: ['id', 'name'],
        // Eligibility belongs to the index, even if the goal changes before population.
        paranoid: false,
        required: false,
        include: [
          { model: GoalTemplate, as: 'goalTemplate', attributes: ['standard'], required: false },
          { model: Grant.unscoped(), as: 'grant', attributes: ['number'], required: false },
        ],
      },
    ],
  });

  return new Map(
    changes.map((change) => {
      const title = GOAL_STATUS_EVENT_RULES.find(
        (rule) =>
          rule.oldStatuses.includes(change.oldStatus) &&
          rule.newStatuses.includes(change.newStatus) &&
          (!rule.requiresPriorClosedGoal || change.get('hasPriorClosedGoal'))
      )?.eventType;
      if (!title) throw new Error(`Unsupported timeline goal status change ${change.id}`);

      const author = nameWithRoles(
        change.userName?.trim() || change.user?.name || null,
        change.userRoles ?? []
      );
      const standard = change.goal?.goalTemplate?.standard?.trim();
      const details = [
        ['Previous status', change.oldStatus],
        ['New status', change.newStatus],
        ['Reason', change.reason],
        ['Context', change.context],
        ['Grant number', change.goal?.grant?.number],
      ]
        .filter(([, value]) => value?.trim())
        .map(([label, value]) => ({ label, items: [{ text: value.trim() }] }));
      const presentation: RecipientTimelineEventPresentation = {
        durationHours: null,
        title,
        subtitle: change.goal?.name?.trim() || null,
        byline: author ? { label: 'Author', values: [author] } : null,
        indicators: [],
        tags: standard ? [{ label: standard, flagged: standard === 'Monitoring' }] : [],
        details,
        links: change.goal
          ? [
              {
                label: 'View goal',
                to: `/recipient-tta-records/${context.recipientId}/region/${context.regionId}/goals/standard?goalId=${change.goal.id}`,
              },
            ]
          : [],
      };
      return [change.id, presentation];
    })
  );
}

export const GOAL_STATUS_CHANGE_TIMELINE_SOURCE: TimelineEventSource = Object.freeze({
  name: 'goalStatusChange',
  supportedFilterTopics: ['standard'] as const,
  buildIndexQuery: buildGoalStatusChangeIndexQuery,
  populate: populateGoalStatusChanges,
});

// One mapping drives both index event types and presentation titles.
const COMMUNICATION_EVENT_TYPES: ReadonlyArray<{
  method: string;
  eventType: RecipientTimelineEventType;
}> = [
  { method: 'Email', eventType: 'Email communication' },
  { method: 'Phone', eventType: 'Phone communication' },
  { method: 'In person', eventType: 'In person communication' },
  { method: 'Virtual', eventType: 'Virtual communication' },
];

const communicationText = (value: unknown): string | null =>
  typeof value === 'string' ? value.trim() || null : null;

const buildCommunicationLogIndexQuery = (
  context: RecipientTimelineRequestParams,
  bindings: TimelineSourceBindings
): string => {
  const eventTypes = COMMUNICATION_EVENT_TYPES.map(
    ({ method, eventType }, index) =>
      `WHEN ${bindings.add(`method_${index}`, method)} THEN ${bindings.add(`eventType_${index}`, eventType)}`
  );
  const predicates = context.filters
    .filter(({ topic }) => topic === 'standard')
    .map((filter, index) => {
      if (
        !Array.isArray(filter.query) ||
        filter.query.length === 0 ||
        filter.query.some((value) => typeof value !== 'string' || !value.trim())
      ) {
        throw new Error('Timeline standard filters require non-empty strings');
      }
      const replacement = bindings.add(
        `standard_${index}`,
        filter.query.map((value) => value.trim())
      );
      return `${filter.condition === 'is not' ? 'NOT ' : ''}EXISTS (
        SELECT 1
        FROM jsonb_array_elements(CASE
          WHEN jsonb_typeof("log"."data"->'goals') = 'array' THEN "log"."data"->'goals'
          ELSE '[]'::jsonb
        END) AS "goal"
        WHERE jsonb_typeof("goal"->'label') = 'string'
          AND BTRIM("goal"->>'label') IN (${replacement})
      )`;
    });
  if (context.excludeMultiRecipientCommunications) {
    predicates.push(`NOT EXISTS (
      SELECT 1 FROM "CommunicationLogRecipients" AS "otherRecipient"
      WHERE "otherRecipient"."communicationLogId" = "log"."id"
        AND "otherRecipient"."recipientId" <> :recipientId
    )`);
  }

  // Region IDs may be numbers or zero-padded strings from route params. Strip leading zeros
  // without casting stored JSON so malformed or oversized values remain harmless nonmatches.
  // Undated logs have no event date; the shared index excludes them without a createdAt fallback.
  return `
    SELECT
      "log"."id" AS "sourceId",
      safe_to_date(NULLIF(BTRIM("log"."data"->>'communicationDate', E' \\t\\r\\n'), ''), 'MM/DD/YYYY') AS "date",
      CASE BTRIM("log"."data"->>'method') ${eventTypes.join('\n        ')} END AS "eventType",
      "recipient"."recipientId",
      CAST(:regionId AS INTEGER) AS "regionId"
    FROM "CommunicationLogs" AS "log"
    INNER JOIN "CommunicationLogRecipients" AS "recipient"
      ON "recipient"."communicationLogId" = "log"."id"
      AND "recipient"."recipientId" = :recipientId
    WHERE LTRIM("log"."data"->>'regionId', '0') = CAST(:regionId AS TEXT)
      ${predicates.map((predicate) => `AND ${predicate}`).join('\n      ')}`;
};

async function populateCommunicationLogs(
  sourceIds: readonly number[],
  context: RecipientTimelineRequestParams
): Promise<Map<number, RecipientTimelineEventPresentation>> {
  if (sourceIds.length === 0) return new Map();
  const logIds = [...new Set(sourceIds)];
  const [logs, recipients, attachments] = await Promise.all([
    CommunicationLog.findAll({
      attributes: ['id', 'data'],
      where: { id: { [Op.in]: logIds } },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['name'],
          required: false,
          include: [
            {
              model: Role,
              as: 'roles',
              attributes: ['name'],
              through: { attributes: [] },
              where: { deletedAt: null },
              required: false,
            },
          ],
        },
      ],
    }),
    CommunicationLogRecipient.findAll({
      attributes: ['communicationLogId', 'recipientId'],
      // Count all distinct recipients, not just the recipient whose Timeline is being viewed.
      where: { communicationLogId: { [Op.in]: logIds } },
    }),
    CommunicationLogFile.findAll({
      attributes: ['communicationLogId', 'fileId'],
      where: { communicationLogId: { [Op.in]: logIds } },
      include: [
        {
          model: File,
          as: 'file',
          attributes: ['id', 'originalFileName', 'key'],
          where: { status: 'APPROVED' },
          required: true,
        },
      ],
      order: [['fileId', 'ASC']],
    }),
  ]);

  const recipientsByLog = new Map<number, Set<number>>();
  recipients.forEach(({ communicationLogId, recipientId }) => {
    const ids = recipientsByLog.get(communicationLogId) ?? new Set<number>();
    ids.add(recipientId);
    recipientsByLog.set(communicationLogId, ids);
  });
  const attachmentsByLog = new Map<number, Map<number, { text: string; link?: string }>>();
  const itemByFile = new Map<number, { text: string; link?: string }>();
  attachments.forEach(({ communicationLogId, file }) => {
    const text = communicationText(file?.originalFileName);
    if (!text) return;
    let item = itemByFile.get(file.id);
    if (!item) {
      const { url } = getSignedDownloadUrl(file.key);
      item = { text, ...(url ? { link: url } : {}) };
      itemByFile.set(file.id, item);
    }
    const items = attachmentsByLog.get(communicationLogId) ?? new Map();
    items.set(file.id, item);
    attachmentsByLog.set(communicationLogId, items);
  });

  return new Map(
    logs.map((log) => {
      const data = log.data ?? {};
      const title = COMMUNICATION_EVENT_TYPES.find(
        ({ method }) => method === communicationText(data.method)
      )?.eventType;
      if (!title) throw new Error(`Unsupported timeline communication method for log ${log.id}`);
      const author = nameWithRoles(
        log.author?.name ?? null,
        (log.author?.roles ?? []).map(({ name }) => name)
      );
      const rawDuration =
        typeof data.duration === 'number' ? data.duration : communicationText(data.duration);
      const duration = rawDuration === null ? null : Number(rawDuration);
      const notes = convert(communicationText(data.notes) ?? '', { wordwrap: false }).trim();
      const result = communicationText(data.result);
      const standards = uniqueSorted(
        Array.isArray(data.goals) ? data.goals.map((goal) => communicationText(goal?.label)) : []
      );
      const files = [...(attachmentsByLog.get(log.id)?.values() ?? [])].sort((left, right) =>
        left.text.localeCompare(right.text)
      );
      const presentation: RecipientTimelineEventPresentation = {
        title,
        subtitle: communicationText(data.purpose),
        durationHours:
          duration !== null && Number.isFinite(duration) && duration >= 0 ? duration : null,
        byline: author ? { label: 'By', values: [author] } : null,
        indicators: (recipientsByLog.get(log.id)?.size ?? 0) > 1 ? ['multiRecipient'] : [],
        tags: standards.map((label) => ({ label, flagged: label === 'Monitoring' })),
        details: [
          ...(notes ? [{ label: 'Notes', items: [{ text: notes }] }] : []),
          ...(result ? [{ label: 'Result', items: [{ text: result }] }] : []),
          ...(files.length ? [{ label: 'Supporting attachments', items: files }] : []),
        ],
        links: [
          {
            label: 'View communication log',
            to: `/recipient-tta-records/${context.recipientId}/region/${context.regionId}/communication/${log.id}/view`,
          },
        ],
      };
      return [log.id, presentation];
    })
  );
}

export const COMMUNICATION_LOG_TIMELINE_SOURCE: TimelineEventSource = Object.freeze({
  name: 'communicationLog',
  supportedFilterTopics: ['standard'] as const,
  buildIndexQuery: buildCommunicationLogIndexQuery,
  populate: populateCommunicationLogs,
});

const sessionReportStandardPredicate = (replacement: string, negate: boolean) => `
  ${negate ? 'NOT ' : ''}EXISTS (
    SELECT 1
    FROM "SessionReportPilotGoalTemplates" AS "filteredSessionGoalTemplate"
    INNER JOIN "GoalTemplates" AS "filteredGoalTemplate"
      ON "filteredGoalTemplate"."id" = "filteredSessionGoalTemplate"."goalTemplateId"
      AND "filteredGoalTemplate"."deletedAt" IS NULL
    WHERE "filteredSessionGoalTemplate"."sessionReportPilotId" = "session"."id"
      AND "filteredGoalTemplate"."standard" IN (${replacement})
  )`;

// The recipients captured on a session are only ever stored in this JSONB array; the
// SessionReportPilotGrant join table is never written to and cannot be trusted for eligibility.
// This intentionally diverges from recipientGrantFilter in sessionReports.ts, which casts the
// JSONB value straight to ::integer and can overflow on an oversized digit string. Here the
// digit-only guard rules out negatives/decimals, and grant.id is widened to ::numeric (which
// cannot overflow) instead of narrowing the untrusted value to ::integer, so an oversized or
// malformed value is always a harmless nonmatch rather than a runtime error.
const buildSessionReportIndexQuery = (
  context: RecipientTimelineRequestParams,
  bindings: TimelineSourceBindings
): string => {
  const status = bindings.add('status', TRAINING_REPORT_STATUSES.COMPLETE);
  const standardPredicates = context.filters
    .filter(({ topic }) => topic === 'standard')
    .map((filter, index) => {
      if (!Array.isArray(filter.query) || filter.query.length === 0) {
        throw new Error('Timeline standard filters require at least one value');
      }

      const replacement = bindings.add(`standard_${index}`, filter.query);
      return sessionReportStandardPredicate(replacement, filter.condition === 'is not');
    });

  return `
    SELECT
      "session"."id" AS "sourceId",
      "session"."startDate" AS "date",
      'Training session' AS "eventType",
      "grant"."recipientId",
      "grant"."regionId"
    FROM "SessionReportPilots" AS "session"
    INNER JOIN jsonb_array_elements(CASE
      WHEN jsonb_typeof("session"."data"->'recipients') = 'array' THEN "session"."data"->'recipients'
      ELSE '[]'::jsonb
    END) AS "recipient" ON TRUE
    INNER JOIN "Grants" AS "grant"
      ON (
        (jsonb_typeof("recipient"->'value') = 'number'
          OR jsonb_typeof("recipient"->'value') = 'string')
        -- Postgres doesn't guarantee AND operands are evaluated left-to-right, so a bare
        -- AND ... ::numeric cast alongside the digit/length guards can still be reached on
        -- malformed text and abort the whole query. A CASE expression is evaluated in order,
        -- so the cast is only ever reached once the guards have confirmed it is safe.
        AND CASE
          WHEN
            -- Digits only: excludes decimals (e.g. 4.5) and negatives before any numeric comparison.
            "recipient"->>'value' ~ '^[0-9]+$'
            -- Bound the digit count (int4 max, 2147483647, is 10 digits) before ever casting.
            -- ::numeric doesn't overflow the way ::integer would, but it is still bounded (up to
            -- ~131,072 digits), so this keeps the check airtight regardless, and matches the
            -- MAX_INT4 bound parseSessionGrantIds applies on the population side.
            AND length("recipient"->>'value') <= 10
          THEN "grant"."id"::numeric = ("recipient"->>'value')::numeric
          ELSE FALSE
        END
      )
    WHERE "session"."data"->>'status' = ${status}
      ${standardPredicates.map((predicate) => `AND ${predicate}`).join('\n      ')}`;
};

// Grant.id is a Postgres int4 column. An out-of-range value here would otherwise reach
// Grant.findAll's `id: { [Op.in]: [...] }` and error binding an out-of-range integer parameter,
// the same failure class the index query's numeric comparison guards against.
const MAX_INT4 = 2147483647;

const parseSessionGrantIds = (data: { recipients?: unknown }): number[] => {
  if (!Array.isArray(data?.recipients)) return [];
  return data.recipients
    .map((recipient) => {
      const value = (recipient as { value?: unknown })?.value;
      if (typeof value === 'number') {
        return Number.isInteger(value) && value > 0 && value <= MAX_INT4 ? value : null;
      }
      if (typeof value === 'string' && /^\d+$/.test(value)) {
        const parsed = Number.parseInt(value, 10);
        return parsed > 0 && parsed <= MAX_INT4 ? parsed : null;
      }
      return null;
    })
    .filter((grantId): grantId is number => grantId !== null);
};

async function populateSessionReports(
  sourceIds: readonly number[],
  context: RecipientTimelineRequestParams
): Promise<Map<number, RecipientTimelineEventPresentation>> {
  if (sourceIds.length === 0) return new Map();

  const sessionIds = [...new Set(sourceIds)];
  const sessions = await SessionReportPilot.findAll({
    attributes: ['id', 'data'],
    where: { id: { [Op.in]: sessionIds } },
    include: [
      { model: EventReportPilot, as: 'event', attributes: ['eventId'], required: false },
      {
        model: User,
        as: 'trainers',
        attributes: ['name'],
        required: false,
        include: [
          {
            model: Role,
            as: 'roles',
            attributes: ['name'],
            through: { attributes: [] },
            where: { deletedAt: null },
            required: false,
          },
        ],
      },
      {
        model: GoalTemplate,
        as: 'goalTemplates',
        attributes: ['standard'],
        through: { attributes: [] },
        required: false,
      },
    ],
  });

  const referencedGrantIds = [
    ...new Set(sessions.flatMap((session) => parseSessionGrantIds(session.data ?? {}))),
  ];
  const recipientGrants = referencedGrantIds.length
    ? await Grant.unscoped().findAll({
        attributes: ['id', 'number'],
        where: {
          id: { [Op.in]: referencedGrantIds },
          recipientId: context.recipientId,
          regionId: context.regionId,
        },
        include: [{ model: Program, as: 'programs', attributes: ['programType'], required: false }],
      })
    : [];
  const grantById = new Map<number, any>(recipientGrants.map((grant) => [grant.id, grant]));

  const presentations = new Map<number, RecipientTimelineEventPresentation>();
  sessions.forEach((session) => {
    const data = session.data ?? {};
    const trainers = (session.trainers ?? [])
      .map((trainer) =>
        nameWithRoles(
          trainer.name,
          (trainer.roles ?? []).map(({ name }) => name)
        )
      )
      .filter((name): name is string => !!name)
      .sort((left, right) => left.localeCompare(right));
    const otherTrainers = communicationText(data.otherTrainers);
    const trainerNames = trainers.length ? trainers : otherTrainers ? [otherTrainers] : [];

    const standards = uniqueSorted(
      (session.goalTemplates ?? []).map((goalTemplate) => goalTemplate.standard)
    );
    const topics = uniqueSorted(
      Array.isArray(data.objectiveTopics)
        ? data.objectiveTopics.map((topic) => communicationText(topic))
        : []
    );
    const objective = convert(communicationText(data.objective) ?? '', { wordwrap: false }).trim();
    const supportType = communicationText(data.objectiveSupportType);
    const grantNumbers = uniqueSorted(
      parseSessionGrantIds(data)
        .map((grantId) => grantById.get(grantId))
        .filter((grant): grant is any => !!grant)
        .map((grant) => grant.numberWithProgramTypes)
    );
    const rawDuration =
      typeof data.duration === 'number' ? data.duration : communicationText(data.duration);
    const duration = rawDuration === null ? null : Number(rawDuration);

    const presentation: RecipientTimelineEventPresentation = {
      durationHours:
        duration !== null && Number.isFinite(duration) && duration >= 0 ? duration : null,
      title: 'Training session',
      subtitle: communicationText(data.sessionName),
      byline: trainerNames.length ? { label: 'Trainers', values: trainerNames } : null,
      indicators: [],
      tags: standards.map((label) => ({ label, flagged: label === 'Monitoring' })),
      details: [
        ...(objective ? [{ label: 'Session objective', items: [{ text: objective }] }] : []),
        ...(topics.length ? [{ label: 'Topics', items: [{ text: topics.join(', ') }] }] : []),
        ...(supportType ? [{ label: 'Support type', items: [{ text: supportType }] }] : []),
        ...(grantNumbers.length
          ? [{ label: 'Participating grants', items: grantNumbers.map((text) => ({ text })) }]
          : []),
      ],
      links: session.event?.eventId
        ? [
            {
              label: 'View training report',
              to: `/training-report/${session.event.eventId}/session/${session.id}`,
            },
          ]
        : [],
    };
    presentations.set(session.id, presentation);
  });

  return presentations;
}

export const SESSION_REPORT_TIMELINE_SOURCE: TimelineEventSource = Object.freeze({
  name: 'sessionReport',
  supportedFilterTopics: ['standard'] as const,
  buildIndexQuery: buildSessionReportIndexQuery,
  populate: populateSessionReports,
});

/** Code-owned source registry; request data cannot select or inject source SQL. */
export const RECIPIENT_TIMELINE_SOURCES: readonly TimelineEventSource[] = Object.freeze([
  ACTIVITY_REPORT_TIMELINE_SOURCE,
  GOAL_STATUS_CHANGE_TIMELINE_SOURCE,
  COMMUNICATION_LOG_TIMELINE_SOURCE,
  SESSION_REPORT_TIMELINE_SOURCE,
]);

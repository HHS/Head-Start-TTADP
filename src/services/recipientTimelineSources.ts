import type {
  RecipientTimelineEventPresentation,
  RecipientTimelineFilterTopic,
  RecipientTimelineRequestParams,
} from '@ttahub/common/src/recipientTimeline';
import { Op } from 'sequelize';
import formatMonitoringCitationName from '../lib/formatMonitoringCitationName';
import db from '../models';

const {
  ActivityRecipient,
  ActivityReport,
  ActivityReportCollaborator,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  ActivityReportObjectiveTopic,
  Goal,
  GoalTemplate,
  Grant,
  Objective,
  Program,
  Role,
  Topic,
  User,
} = db;

export interface TimelineSourceBindings {
  /** Add a source-owned replacement and return its SQL placeholder. */
  add(name: string, value: unknown): string;
}

export interface TimelineEventSource {
  /** Stable discriminator that, together with sourceId, identifies an event globally. */
  readonly name: string;
  readonly supportedFilterTopics: readonly RecipientTimelineFilterTopic[];
  /** Return only trusted SQL. URL-derived values must be added through bindings. */
  buildIndexQuery(
    context: RecipientTimelineRequestParams,
    bindings: TimelineSourceBindings
  ): string;
  /** Hydrate exact page IDs without reapplying index eligibility or filter predicates. */
  hydrate(
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

async function hydrateActivityReports(
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
  const hydrationResults = await Promise.all([
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
  const [reports, collaborators, recipientGrants, reportGoals, reportObjectives] = hydrationResults;

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
  hydrate: hydrateActivityReports,
});

/** Code-owned source registry; request data cannot select or inject source SQL. */
export const RECIPIENT_TIMELINE_SOURCES: readonly TimelineEventSource[] = Object.freeze([
  ACTIVITY_REPORT_TIMELINE_SOURCE,
]);

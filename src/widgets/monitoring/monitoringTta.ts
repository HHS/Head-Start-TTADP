/* eslint-disable max-len */

import { REPORT_STATUSES } from '@ttahub/common';
import moment from 'moment';
import { type FindAttributeOptions, Op, type OrderItem } from 'sequelize';
import { formatDate, uniqueStrings } from '../../lib/utils';
import db from '../../models';
import type {
  ITTAByCitationResponse,
  ITTAByCitationReview,
  ITTAByReviewObjective,
} from '../../services/types/monitoring';
import type { IScopes } from '../types';

const {
  ActivityReport,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  ActivityReportObjectiveTopic,
  ActivityReportCollaborator,
  Citation,
  DeliveredReviewCitation,
  DeliveredReview,
  Grant,
  GrantCitation,
  GrantDeliveredReview,
  Program,
  Objective,
  User,
  Role,
  Topic,
} = db;

type MonitoringTTAData = ITTAByCitationResponse & {
  id: string;
  recipientName: string;
  recipientId: number;
  regionId: number;
};

type MonitoringTtaCsvResponse = {
  recipientId: number;
  recipientName: string;
  citation: string; // citation.citation
  status: string; // citation.calculated_status
  findingType: string; // citation.calculated_finding_type
  category: string; // citation.guidance_category
  grantNumbers: string; // separated by newline
  lastTTADate: string | null;
};

type MonitoringTtaSortBy = 'recipient_finding' | 'recipient_citation' | 'finding' | 'citation';
type MonitoringTtaDirection = 'asc' | 'desc';

type Specialist = {
  name: string;
  roles: string[];
};

const PAGE_SIZE = 10;
const DEFAULT_SORT_BY: MonitoringTtaSortBy = 'recipient_finding';
const DEFAULT_DIRECTION: MonitoringTtaDirection = 'asc';

type CitationQueryResult = {
  id: number;
  citation: string | null;
  calculated_status: string | null;
  calculated_finding_type: string | null;
  guidance_category: string | null;
  grantCitations: {
    grantId: number;
    recipient_id: number | null;
    recipient_name: string | null;
    grant: {
      id: number;
      number: string | null;
      numberWithProgramTypes: string | null;
      programs:
        | {
            id: number;
            programType: string | null;
          }[]
        | null;
    };
  }[];
  deliveredReviewCitations: {
    deliveredReview: {
      id: number;
      review_name: string | null;
      review_type: string | null;
      outcome: string | null;
      report_delivery_date: string | null;
      review_status: string | null;
      grantDeliveredReviews: {
        grantId: number;
        recipient_id: number;
        recipient_name: string;
        region_id: number;
      }[];
    };
  }[];
  activityReportObjectiveCitations: {
    grantId: number;
    grantNumber: string;
    reviewName: string;
    activityReportObjective?: {
      id: number;
      activityReportObjectiveTopics?: {
        topic?: {
          name: string | null;
        } | null;
      }[];
      activityReport?: {
        id: number;
        displayId: string | null;
        endDate: string | null;
        participants: string[] | null;
        author?: {
          fullName: string | null;
          roles?: {
            name: string | null;
          }[];
        } | null;
        activityReportCollaborators?: {
          user?: {
            fullName: string | null;
            roles?: {
              name: string | null;
            }[];
          } | null;
        }[];
      } | null;
      objective?: {
        title: string;
        status: string;
        id: number;
      } | null;
    } | null;
  }[];
};

type RecipientCitationCard = {
  id: string;
  citationId: number;
  recipientId: number;
  recipientName: string;
  regionId: number;
};

type CardDeliveredReview = {
  review_name?: string | null;
  review_type: string | null;
  outcome: string | null;
  report_delivery_date: string | null;
  review_status: string | null;
};

export function mergeSpecialists(specialists: Specialist[]): Specialist[] {
  const specialistsByName = new Map<string, Set<string>>();

  specialists.forEach(({ name, roles }) => {
    if (!name) {
      return;
    }

    const existingRoles = specialistsByName.get(name) || new Set<string>();
    roles.forEach((role) => {
      if (role) {
        existingRoles.add(role);
      }
    });
    specialistsByName.set(name, existingRoles);
  });

  return [...specialistsByName.entries()]
    .map(([name, roles]) => ({
      name,
      roles: [...roles].sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const CITATION_NUMBER_MAJOR_SQL = `
  COALESCE(
    NULLIF(regexp_replace(split_part(COALESCE("citation"."citation", ''), '.', 1), '\\D', '', 'g'), ''),
    '0'
  )::bigint
`;

const CITATION_NUMBER_MINOR_SQL = `
  COALESCE(
    NULLIF((regexp_match(split_part(COALESCE("citation"."citation", ''), '.', 2), '^\\d+'))[1], ''),
    '0'
  )::bigint
`;

const RECIPIENT_SORT_KEY_SQL = `
  MIN(COALESCE("GrantCitation"."recipient_name", ''))
`;

const RECIPIENT_SORT_TEXT_SQL = `
  LOWER(regexp_replace(${RECIPIENT_SORT_KEY_SQL}, '\\d+', '', 'g'))
`;

const RECIPIENT_SORT_NUMBER_SQL = `
  COALESCE(NULLIF((regexp_match(${RECIPIENT_SORT_KEY_SQL}, '\\d+'))[1], ''), '0')::bigint
`;

const RECIPIENT_SORT_FALLBACK_SQL = `
  LOWER(${RECIPIENT_SORT_KEY_SQL})
`;

const FINDING_SORT_SQL = `
  LOWER(COALESCE("citation"."calculated_finding_type", ''))
`;

const CATEGORY_SORT_SQL = `
  LOWER(COALESCE("citation"."guidance_category", ''))
`;

const CITATION_SORT_FALLBACK_SQL = `
  LOWER(COALESCE("citation"."citation", ''))
`;

function compareFormattedDatesDesc(aDate: string, bDate: string): number {
  const aMoment = moment(aDate, 'MM/DD/YYYY', true);
  const bMoment = moment(bDate, 'MM/DD/YYYY', true);
  const aValid = aMoment.isValid();
  const bValid = bMoment.isValid();

  if (aValid && bValid) {
    return bMoment.diff(aMoment);
  }

  if (aValid !== bValid) {
    return aValid ? -1 : 1;
  }

  return 0;
}

export function specialistsFromCitation(citation: CitationQueryResult): Specialist[] {
  const specialists = citation.activityReportObjectiveCitations.flatMap((reference) => {
    const activityReport = reference.activityReportObjective?.activityReport;
    if (!activityReport) {
      return [];
    }

    const author = activityReport.author?.fullName
      ? [
          {
            name: activityReport.author.fullName,
            roles: uniqueStrings(activityReport.author.roles?.map((role) => role.name) || []),
          },
        ]
      : [];

    const collaborators = (activityReport.activityReportCollaborators || []).flatMap(
      (collaborator) => {
        const collaboratorName = collaborator.user?.fullName;
        if (!collaboratorName) {
          return [];
        }

        return [
          {
            name: collaboratorName,
            roles: uniqueStrings(collaborator.user?.roles?.map((role) => role.name) || []),
          },
        ];
      }
    );

    return [...author, ...collaborators];
  });

  return mergeSpecialists(specialists);
}

export function objectivesFromCitation(citation: CitationQueryResult): ITTAByReviewObjective[] {
  type ObjectiveEntry = ITTAByReviewObjective & { arEndDates: Map<number, string> };
  const objectivesByObjectiveId = new Map<number | string, ObjectiveEntry>();

  citation.activityReportObjectiveCitations.forEach((reference) => {
    const { activityReportObjective } = reference;
    const activityReport = activityReportObjective?.activityReport;
    const objective = activityReportObjective?.objective;

    if (!activityReportObjective || !activityReport || !objective) {
      return;
    }

    const newTopics = uniqueStrings(
      (activityReportObjective.activityReportObjectiveTopics || []).map(
        (topicReference) => topicReference.topic?.name
      )
    );

    const newParticipants = uniqueStrings(activityReport.participants || []);
    const formattedEndDate = formatDate(activityReport.endDate) || '';
    const arEntry = { id: activityReport.id, displayId: activityReport.displayId || '' };

    // When objective.id is present, deduplicate by it; otherwise use ARO id as a unique key.
    const mapKey: number | string =
      objective.id != null ? objective.id : `aro:${activityReportObjective.id}`;

    const existing = objectivesByObjectiveId.get(mapKey);

    if (existing) {
      // Merge activity reports, deduplicating by AR id
      const arIds = new Set(existing.activityReports.map((ar) => ar.id));
      if (!arIds.has(activityReport.id)) {
        existing.activityReports.push(arEntry);
        existing.arEndDates.set(activityReport.id, formattedEndDate);
      }

      // Keep the most recent endDate at the objective level
      if (compareFormattedDatesDesc(formattedEndDate, existing.endDate) < 0) {
        existing.endDate = formattedEndDate;
      }

      // Union topics and participants
      existing.topics = uniqueStrings([...existing.topics, ...newTopics]).sort((a, b) =>
        a.localeCompare(b)
      );
      const mergedParticipants = uniqueStrings([
        ...(existing.participants || []),
        ...newParticipants,
      ]);
      if (mergedParticipants.length > 0) {
        existing.participants = mergedParticipants;
      }
    } else {
      const entryArEndDates = new Map<number, string>();
      entryArEndDates.set(activityReport.id, formattedEndDate);
      objectivesByObjectiveId.set(mapKey, {
        id: objective.id,
        title: objective.title || '',
        activityReports: [arEntry],
        endDate: formattedEndDate,
        topics: newTopics.sort((a, b) => a.localeCompare(b)),
        status: objective.status || '',
        ...(newParticipants.length > 0 ? { participants: newParticipants } : {}),
        arEndDates: entryArEndDates,
      });
    }
  });

  return [...objectivesByObjectiveId.values()]
    .map(({ arEndDates: endDateMap, ...obj }) => {
      // Sort activity reports within this objective by endDate descending
      const sortedReports = [...obj.activityReports].sort((a, b) =>
        compareFormattedDatesDesc(endDateMap.get(a.id) || '', endDateMap.get(b.id) || '')
      );
      return { ...obj, activityReports: sortedReports };
    })
    .sort((a, b) => {
      const endDateComparison = compareFormattedDatesDesc(a.endDate, b.endDate);
      if (endDateComparison !== 0) {
        return endDateComparison;
      }

      return a.title.localeCompare(b.title);
    });
}

export function compareReviews(a: ITTAByCitationReview, b: ITTAByCitationReview): number {
  const dateComparison = compareFormattedDatesDesc(a.reviewReceived, b.reviewReceived);
  if (dateComparison !== 0) {
    return dateComparison;
  }

  return a.reviewType.localeCompare(b.reviewType);
}

export function lastTtaDateMomentForReviews(
  objectives: ITTAByReviewObjective[]
): moment.Moment | null {
  return objectives.reduce<moment.Moment | null>((latestObjectiveEndDate, { endDate }) => {
    const objectiveEndDate = moment(endDate, 'MM/DD/YYYY', true);
    if (!objectiveEndDate.isValid()) {
      return latestObjectiveEndDate;
    }

    if (!latestObjectiveEndDate || objectiveEndDate.isAfter(latestObjectiveEndDate)) {
      return objectiveEndDate;
    }

    return latestObjectiveEndDate;
  }, null);
}

function compareText(a: string | null | undefined, b: string | null | undefined): number {
  return (a || '').localeCompare(b || '', undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function sortDirection(direction: MonitoringTtaDirection): 'ASC' | 'DESC' {
  return direction === 'desc' ? 'DESC' : 'ASC';
}

export function compareMonitoringTta(
  a: MonitoringTTAData,
  b: MonitoringTTAData,
  sortBy: MonitoringTtaSortBy,
  direction: MonitoringTtaDirection
): number {
  const recipientComparison = compareText(a.recipientName, b.recipientName);
  const findingTypeComparison = compareText(a.findingType, b.findingType);
  const citationComparison = compareText(a.citationNumber, b.citationNumber);
  const categoryComparison = compareText(a.category, b.category);

  switch (sortBy) {
    case 'recipient_citation':
      return (
        (direction === 'desc' ? recipientComparison * -1 : recipientComparison) ||
        citationComparison ||
        findingTypeComparison ||
        categoryComparison
      );
    case 'finding':
      return (
        (direction === 'desc' ? categoryComparison * -1 : categoryComparison) ||
        citationComparison ||
        recipientComparison ||
        findingTypeComparison
      );
    case 'citation':
      return (
        (direction === 'desc' ? citationComparison * -1 : citationComparison) ||
        recipientComparison ||
        findingTypeComparison ||
        categoryComparison
      );
    case 'recipient_finding':
    default:
      return (
        (direction === 'desc' ? recipientComparison * -1 : recipientComparison) ||
        findingTypeComparison ||
        citationComparison ||
        categoryComparison
      );
  }
}

function literalOrder(expression: string, direction: 'ASC' | 'DESC'): OrderItem {
  return [db.sequelize.literal(expression), direction];
}

function recipientOrder(direction: 'ASC' | 'DESC'): OrderItem[] {
  return [
    literalOrder(RECIPIENT_SORT_TEXT_SQL, direction),
    literalOrder(RECIPIENT_SORT_NUMBER_SQL, direction),
    literalOrder(RECIPIENT_SORT_FALLBACK_SQL, direction),
  ];
}

function citationOrder(direction: 'ASC' | 'DESC'): OrderItem[] {
  return [
    literalOrder(CITATION_NUMBER_MAJOR_SQL, direction),
    literalOrder(CITATION_NUMBER_MINOR_SQL, direction),
    literalOrder(CITATION_SORT_FALLBACK_SQL, direction),
  ];
}

function monitoringTtaOrder(
  sortBy: MonitoringTtaSortBy,
  direction: MonitoringTtaDirection
): OrderItem[] {
  const primaryDirection = sortDirection(direction);
  const ascending = 'ASC' as const;

  switch (sortBy) {
    case 'recipient_citation':
      return [
        ...recipientOrder(primaryDirection),
        ...citationOrder(ascending),
        literalOrder(FINDING_SORT_SQL, ascending),
        literalOrder(CATEGORY_SORT_SQL, ascending),
        literalOrder('"citation"."id"', ascending),
      ];
    case 'finding':
      return [
        literalOrder(CATEGORY_SORT_SQL, primaryDirection),
        ...citationOrder(ascending),
        ...recipientOrder(ascending),
        literalOrder(FINDING_SORT_SQL, ascending),
        literalOrder('"citation"."id"', ascending),
      ];
    case 'citation':
      return [
        ...citationOrder(primaryDirection),
        ...recipientOrder(ascending),
        literalOrder(FINDING_SORT_SQL, ascending),
        literalOrder(CATEGORY_SORT_SQL, ascending),
        literalOrder('"citation"."id"', ascending),
      ];
    case 'recipient_finding':
    default:
      return [
        ...recipientOrder(primaryDirection),
        literalOrder(FINDING_SORT_SQL, ascending),
        ...citationOrder(ascending),
        literalOrder(CATEGORY_SORT_SQL, ascending),
        literalOrder('"citation"."id"', ascending),
      ];
  }
}

const PAGED_RECIPIENT_CITATION_ATTRIBUTES = [
  [db.sequelize.col('GrantCitation.citationId'), 'citationId'],
  [db.sequelize.col('GrantCitation.recipient_id'), 'recipientId'],
  [db.sequelize.col('GrantCitation.region_id'), 'regionId'],
  [db.sequelize.col('GrantCitation.recipient_name'), 'recipientName'],
] as FindAttributeOptions[];

type PagedRecipientCitationCardsResult = {
  cards: RecipientCitationCard[];
  total: number;
};

async function findPagedRecipientCitationCards(
  scopes: IScopes,
  sortBy: MonitoringTtaSortBy,
  direction: MonitoringTtaDirection,
  offset: number,
  perPage: number = PAGE_SIZE
): Promise<PagedRecipientCitationCardsResult> {
  const { rows, count } = (await GrantCitation.findAndCountAll({
    attributes: PAGED_RECIPIENT_CITATION_ATTRIBUTES,
    logging: false,
    where: scopes.grantCitation,
    include: [
      {
        model: Grant.unscoped(),
        as: 'grant',
        required: true,
        where: scopes.grant.where,
        attributes: [],
      },
      {
        model: Citation,
        as: 'citation',
        required: true,
        where: {
          [Op.and]: scopes.citation,
        },
        attributes: [],
        include: [
          {
            model: DeliveredReviewCitation,
            as: 'deliveredReviewCitations',
            required: true,
            attributes: [],
            include: [
              {
                model: DeliveredReview,
                as: 'deliveredReview',
                required: true,
                attributes: [],
                where: {
                  [Op.and]: scopes.deliveredReview,
                },
                include: [
                  {
                    model: GrantDeliveredReview,
                    as: 'grantDeliveredReviews',
                    required: true,
                    attributes: [],
                    where: {
                      grantId: {
                        [Op.eq]: db.sequelize.col('GrantCitation.grantId'),
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    group: [
      'GrantCitation.citationId',
      'GrantCitation.recipient_id',
      'GrantCitation.recipient_name',
      'GrantCitation.region_id',
      'citation.id',
      'citation.citation',
      'citation.calculated_finding_type',
      'citation.guidance_category',
    ],
    order: monitoringTtaOrder(sortBy, direction),
    limit: perPage,
    offset,
    raw: true,
    subQuery: false,
  })) as {
    count:
      | {
          citationId: number;
          recipient_id: number;
          region_id: number;
          id: number;
          citation: string;
          calculated_finding_type: string;
          guidance_category: string;
          count: number;
        }[]
      | number;
    rows: {
      citationId: number;
      recipientId: number;
      recipientName: string;
      regionId: number;
    }[];
  };

  const cards = rows.map((row) => ({
    id: `${row.citationId}:${row.recipientId}`,
    citationId: row.citationId,
    recipientId: row.recipientId,
    recipientName: row.recipientName,
    regionId: row.regionId,
  }));

  // With GROUP BY, Sequelize returns count as an array of per-group counts.
  // count.length is the total number of distinct (citationId, recipientId) groups before paging.
  const total = Array.isArray(count) ? count.length : count;

  return { cards, total };
}

async function findCitationsByIds(
  scopes: IScopes,
  citationIds: number[]
): Promise<CitationQueryResult[]> {
  if (citationIds.length === 0) {
    return [];
  }

  return Citation.findAll({
    where: {
      [Op.and]: [
        ...scopes.citation,
        {
          id: {
            [Op.in]: citationIds,
          },
        },
      ],
    },
    attributes: [
      'id',
      'citation',
      'calculated_status',
      'calculated_finding_type',
      'guidance_category',
    ],
    include: [
      {
        model: GrantCitation,
        as: 'grantCitations',
        required: true,
        attributes: ['grantId', 'recipient_id', 'recipient_name', 'region_id'],
        include: [
          {
            model: Grant,
            required: true,
            as: 'grant',
            where: scopes.grant.where,
            attributes: ['id', 'number', 'numberWithProgramTypes'],
            include: [
              {
                model: Program,
                attributes: ['id', 'programType'],
                as: 'programs',
              },
            ],
          },
        ],
      },
      {
        model: DeliveredReviewCitation,
        as: 'deliveredReviewCitations',
        required: true,
        attributes: ['citationId', 'deliveredReviewId'],
        include: [
          {
            model: DeliveredReview,
            as: 'deliveredReview',
            required: true,
            where: {
              [Op.and]: scopes.deliveredReview,
            },
            attributes: [
              'id',
              'review_name',
              'review_type',
              'outcome',
              'report_delivery_date',
              'review_status',
            ],
            include: [
              {
                model: GrantDeliveredReview,
                as: 'grantDeliveredReviews',
                required: true,
                attributes: ['grantId', 'recipient_id'],
                include: [
                  {
                    model: Grant,
                    as: 'grant',
                    required: true,
                    attributes: [],
                    where: scopes.grant.where,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        model: ActivityReportObjectiveCitation,
        as: 'activityReportObjectiveCitations',
        required: false,
        attributes: ['id', 'grantId', 'grantNumber', 'reviewName'],
        include: [
          {
            model: ActivityReportObjective,
            as: 'activityReportObjective',
            required: true,
            attributes: ['id'],
            include: [
              {
                model: ActivityReportObjectiveTopic,
                as: 'activityReportObjectiveTopics',
                attributes: ['activityReportObjectiveId', 'topicId'],
                include: [
                  {
                    attributes: ['id', 'name'],
                    model: Topic,
                    as: 'topic',
                  },
                ],
              },
              {
                model: ActivityReport,
                as: 'activityReport',
                required: true,
                attributes: ['id', 'displayId', 'endDate', 'participants'],
                where: {
                  [Op.and]: [
                    ...scopes.activityReport,
                    { calculatedStatus: REPORT_STATUSES.APPROVED },
                  ],
                },
                include: [
                  {
                    model: ActivityReportCollaborator,
                    as: 'activityReportCollaborators',
                    attributes: ['id', 'activityReportId', 'userId'],
                    include: [
                      {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'fullName'],
                        include: [
                          {
                            model: Role,
                            as: 'roles',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    model: User,
                    attributes: ['id', 'name', 'fullName'],
                    as: 'author',
                    include: [
                      {
                        model: Role,
                        as: 'roles',
                      },
                    ],
                  },
                ],
              },
              {
                model: Objective,
                as: 'objective',
                attributes: ['title', 'status', 'id'],
              },
            ],
          },
        ],
      },
    ],
  }) as Promise<CitationQueryResult[]>;
}

function grantsForRecipientCitationCard(
  citation: CitationQueryResult,
  card: RecipientCitationCard
) {
  const grantsById = new Map<number, CitationQueryResult['grantCitations'][number]['grant']>();

  citation.grantCitations.forEach((grantCitation) => {
    if (grantCitation.recipient_id !== card.recipientId) {
      return;
    }

    grantsById.set(grantCitation.grant.id, grantCitation.grant);
  });

  return [...grantsById.values()];
}

function deliveredReviewsForRecipientCitationCard(
  citation: CitationQueryResult,
  grantIds: Set<number>
): CardDeliveredReview[] {
  const reviewsById = new Map<number, CardDeliveredReview>();

  citation.deliveredReviewCitations.forEach(({ deliveredReview }) => {
    const appliesToRecipient = deliveredReview.grantDeliveredReviews.some(
      ({ grantId }) => grantId !== null && grantIds.has(grantId)
    );

    if (!appliesToRecipient) {
      return;
    }

    reviewsById.set(deliveredReview.id, {
      review_name: deliveredReview.review_name,
      review_type: deliveredReview.review_type,
      outcome: deliveredReview.outcome,
      report_delivery_date: deliveredReview.report_delivery_date,
      review_status: deliveredReview.review_status,
    });
  });

  return [...reviewsById.values()];
}

function referencesForRecipientCitationCard(
  citation: CitationQueryResult,
  grantIds: Set<number>
): CitationQueryResult['activityReportObjectiveCitations'] {
  return citation.activityReportObjectiveCitations.filter((reference) =>
    grantIds.has(reference.grantId)
  );
}

function monitoringTtaDataForRecipientCitationCard(
  citation: CitationQueryResult,
  card: RecipientCitationCard
): MonitoringTTAData | null {
  const grants = grantsForRecipientCitationCard(citation, card);
  const grantIds = new Set(grants.map((grant) => grant.id));
  if (grantIds.size === 0) {
    return null;
  }

  const recipientName = card.recipientName || '';
  const activityReportObjectiveCitations = referencesForRecipientCitationCard(citation, grantIds);
  const scopedCitation = {
    ...citation,
    activityReportObjectiveCitations,
  };
  const objectives = objectivesFromCitation(scopedCitation);
  const specialists = specialistsFromCitation(scopedCitation);
  const deliveredReviews = deliveredReviewsForRecipientCitationCard(citation, grantIds);
  if (deliveredReviews.length === 0) {
    return null;
  }

  const lastTTADateMoment = lastTtaDateMomentForReviews(objectives);

  const reviews = deliveredReviews
    .map((review) => {
      const reviewReceived = formatDate(review.report_delivery_date) || '';

      return {
        name: review.review_name || '',
        reviewType: review.review_type || '',
        reviewReceived,
        outcome: review.outcome || '',
        findingStatus: review.review_status || undefined,
        specialists,
        objectives,
      };
    })
    .sort(compareReviews);

  return {
    id: card.id,
    recipientName,
    recipientId: card.recipientId,
    regionId: card.regionId,
    citationId: card.citationId,
    citationNumber: citation.citation || '',
    findingType: citation.calculated_finding_type || '',
    status: citation.calculated_status || '',
    category: citation.guidance_category || '',
    grantNumbers: uniqueStrings(grants.map((grant) => grant.numberWithProgramTypes)).sort(),
    lastTTADate: lastTTADateMoment ? lastTTADateMoment.format('MM/DD/YYYY') : null,
    reviews,
  };
}

const MAX_PAGE_SIZE = 500;

const parseQuery = (
  query: {
    sortBy?: MonitoringTtaSortBy;
    direction?: MonitoringTtaDirection;
    offset?: number;
    perPage?: number;
  } = {}
) => {
  const sortBy = query.sortBy || DEFAULT_SORT_BY;
  const direction = query.direction || DEFAULT_DIRECTION;
  const parsedPerPage = Number(query.perPage);
  const perPage =
    Number.isInteger(parsedPerPage) && parsedPerPage > 0
      ? Math.min(parsedPerPage, MAX_PAGE_SIZE)
      : PAGE_SIZE;

  const offset = Number(query.offset) || 0;

  return { sortBy, direction, perPage, offset };
};

export async function* monitoringTtaCsvGenerator(
  scopes: IScopes,
  query: {
    sortBy?: MonitoringTtaSortBy;
    direction?: MonitoringTtaDirection;
  } = {}
): AsyncGenerator<MonitoringTtaCsvResponse> {
  const { sortBy, direction } = parseQuery(query);
  let offset = 0;

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { data, total } = await monitoringTta(scopes, {
      sortBy,
      direction,
      offset,
      perPage: MAX_PAGE_SIZE,
    });

    for (const item of data) {
      yield {
        recipientId: item.recipientId,
        recipientName: item.recipientName,
        citation: item.citationNumber,
        status: item.status,
        findingType: item.findingType,
        category: item.category,
        grantNumbers: item.grantNumbers.join('\n'),
        lastTTADate: item.lastTTADate,
      };
    }

    offset += MAX_PAGE_SIZE;
    if (offset >= total) {
      break;
    }
  }
}

export default async function monitoringTta(
  scopes: IScopes,
  query: {
    sortBy?: MonitoringTtaSortBy;
    direction?: MonitoringTtaDirection;
    offset?: number;
    perPage?: number;
  } = {}
): Promise<{ data: MonitoringTTAData[]; total: number }> {
  const { sortBy, direction, perPage, offset } = parseQuery(query);
  const { cards, total } = await findPagedRecipientCitationCards(
    scopes,
    sortBy,
    direction,
    offset,
    perPage
  );

  const citationIds = uniqueStrings(cards.map(({ citationId }) => String(citationId))).map(
    (citationId) => Number(citationId)
  );
  const citations = await findCitationsByIds(scopes, citationIds);
  const citationsById = new Map(citations.map((citation) => [citation.id, citation]));

  const data = cards
    .map((card) => {
      const citation = citationsById.get(card.citationId);
      if (!citation) {
        return null;
      }
      return monitoringTtaDataForRecipientCitationCard(citation, card);
    })
    .filter((d): d is MonitoringTTAData => d !== null);

  return { data, total };
}

/* eslint-disable max-len */
import moment from 'moment';
import {
  FindAttributeOptions,
  OrderItem,
  Op,
} from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import db from '../../models';
import { IScopes } from '../types';
import {
  ITTAByCitationResponse,
  ITTAByCitationReview,
  ITTAByReviewObjective,
} from '../../services/types/monitoring';
import { formatDate, uniqueStrings } from '../../lib/utils';

const {
  ActivityReport,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  ActivityReportObjectiveTopic,
  ActivityReportCollaborator,
  Citation,
  DeliveredReview,
  Grant,
  Objective,
  Recipient,
  Program,
  User,
  Role,
  Topic,
} = db;

type MonitoringTTAData = ITTAByCitationResponse & { recipientName: string };
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
  grants: {
    number: string | null;
    recipient?: {
      name: string | null;
    } | null;
    programs?: {
      programType: string | null;
    }[];
  }[];
  deliveredReviews: {
    name: string;
    review_type: string | null;
    outcome: string | null;
    report_delivery_date: string | null;
    review_status: string | null;
  }[];
  activityReportObjectiveCitations: {
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
        title: string | null;
        status: string | null;
      } | null;
    } | null;
  }[];
};

type CitationPageRow = {
  id: number;
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
    NULLIF(regexp_replace(split_part(COALESCE("Citation"."citation", ''), '.', 1), '\\D', '', 'g'), ''),
    '0'
  )::bigint
`;

const CITATION_NUMBER_MINOR_SQL = `
  COALESCE(
    NULLIF(regexp_replace(split_part(COALESCE("Citation"."citation", ''), '.', 2), '\\D', '', 'g'), ''),
    '0'
  )::bigint
`;

const RECIPIENT_SORT_KEY_SQL = `
  MIN(COALESCE("grants->recipient"."name", ''))
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
  LOWER(COALESCE("Citation"."calculated_finding_type", ''))
`;

const CATEGORY_SORT_SQL = `
  LOWER(COALESCE("Citation"."guidance_category", ''))
`;

const CITATION_SORT_FALLBACK_SQL = `
  LOWER(COALESCE("Citation"."citation", ''))
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
      ? [{
        name: activityReport.author.fullName,
        roles: uniqueStrings(activityReport.author.roles?.map((role) => role.name) || []),
      }]
      : [];

    const collaborators = (activityReport.activityReportCollaborators || [])
      .flatMap((collaborator) => {
        const collaboratorName = collaborator.user?.fullName;
        if (!collaboratorName) {
          return [];
        }

        return [{
          name: collaboratorName,
          roles: uniqueStrings(collaborator.user?.roles?.map((role) => role.name) || []),
        }];
      });

    return [...author, ...collaborators];
  });

  return mergeSpecialists(specialists);
}

export function objectivesFromCitation(citation: CitationQueryResult): ITTAByReviewObjective[] {
  const objectivesByAroId = new Map<number, ITTAByReviewObjective>();

  citation.activityReportObjectiveCitations.forEach((reference) => {
    const { activityReportObjective } = reference;
    const activityReport = activityReportObjective?.activityReport;
    const objective = activityReportObjective?.objective;

    if (!activityReportObjective || !activityReport || !objective) {
      return;
    }

    const topics = uniqueStrings(
      (activityReportObjective.activityReportObjectiveTopics || [])
        .map((topicReference) => topicReference.topic?.name),
    ).sort((a, b) => a.localeCompare(b));

    const participants = uniqueStrings(activityReport.participants || []);

    objectivesByAroId.set(activityReportObjective.id, {
      title: objective.title || '',
      activityReports: [{
        id: activityReport.id,
        displayId: activityReport.displayId || '',
      }],
      endDate: formatDate(activityReport.endDate) || '',
      topics,
      status: objective.status || '',
      ...(participants.length > 0 ? { participants } : {}),
    });
  });

  return [...objectivesByAroId.values()]
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
  objectives: ITTAByReviewObjective[],
  deliveredReviews: CitationQueryResult['deliveredReviews'],
): moment.Moment | null {
  return deliveredReviews.reduce<moment.Moment | null>((lastTTADateMoment, review) => {
    const reportDeliveryMoment = review.report_delivery_date
      ? moment(review.report_delivery_date)
      : null;
    const validReportDeliveryMoment = reportDeliveryMoment?.isValid()
      ? reportDeliveryMoment
      : null;

    return objectives.reduce<moment.Moment | null>((latestObjectiveEndDate, { endDate }) => {
      const objectiveEndDate = moment(endDate, 'MM/DD/YYYY', true);
      if (!objectiveEndDate.isValid()) {
        return latestObjectiveEndDate;
      }

      if (validReportDeliveryMoment && objectiveEndDate.isAfter(validReportDeliveryMoment)) {
        return latestObjectiveEndDate;
      }

      if (!latestObjectiveEndDate || objectiveEndDate.isAfter(latestObjectiveEndDate)) {
        return objectiveEndDate;
      }

      return latestObjectiveEndDate;
    }, lastTTADateMoment);
  }, null);
}

function compareText(a: string | null | undefined, b: string | null | undefined): number {
  return (a || '').localeCompare((b || ''), undefined, {
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
  direction: MonitoringTtaDirection,
): number {
  const recipientComparison = compareText(a.recipientName, b.recipientName);
  const findingTypeComparison = compareText(a.findingType, b.findingType);
  const citationComparison = compareText(a.citationNumber, b.citationNumber);
  const categoryComparison = compareText(a.category, b.category);

  switch (sortBy) {
    case 'recipient_citation':
      return (direction === 'desc' ? recipientComparison * -1 : recipientComparison)
        || citationComparison
        || findingTypeComparison
        || categoryComparison;
    case 'finding':
      return (direction === 'desc' ? categoryComparison * -1 : categoryComparison)
        || citationComparison
        || recipientComparison
        || findingTypeComparison;
    case 'citation':
      return (direction === 'desc' ? citationComparison * -1 : citationComparison)
        || recipientComparison
        || findingTypeComparison
        || categoryComparison;
    case 'recipient_finding':
    default:
      return (direction === 'desc' ? recipientComparison * -1 : recipientComparison)
        || findingTypeComparison
        || citationComparison
        || categoryComparison;
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
  direction: MonitoringTtaDirection,
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
        literalOrder('"Citation"."id"', ascending),
      ];
    case 'finding':
      return [
        literalOrder(CATEGORY_SORT_SQL, primaryDirection),
        ...citationOrder(ascending),
        ...recipientOrder(ascending),
        literalOrder(FINDING_SORT_SQL, ascending),
        literalOrder('"Citation"."id"', ascending),
      ];
    case 'citation':
      return [
        ...citationOrder(primaryDirection),
        ...recipientOrder(ascending),
        literalOrder(FINDING_SORT_SQL, ascending),
        literalOrder(CATEGORY_SORT_SQL, ascending),
        literalOrder('"Citation"."id"', ascending),
      ];
    case 'recipient_finding':
    default:
      return [
        ...recipientOrder(primaryDirection),
        literalOrder(FINDING_SORT_SQL, ascending),
        ...citationOrder(ascending),
        literalOrder(CATEGORY_SORT_SQL, ascending),
        literalOrder('"Citation"."id"', ascending),
      ];
  }
}

function pagedCitationAttributes(): FindAttributeOptions {
  return [
    'id',
    'citation',
    'calculated_finding_type',
    'guidance_category',
    [
      db.sequelize.fn(
        'MIN',
        db.sequelize.fn('COALESCE', db.sequelize.col('grants.recipient.name'), ''),
      ),
      'recipientNameSortKey',
    ],
  ];
}

async function findPagedCitationIds(
  scopes: IScopes,
  sortBy: MonitoringTtaSortBy,
  direction: MonitoringTtaDirection,
  offset: number,
): Promise<number[]> {
  const rows = await Citation.findAll({
    where: {
      [Op.and]: scopes.citation,
    },
    attributes: pagedCitationAttributes(),
    include: [
      {
        model: DeliveredReview,
        as: 'deliveredReviews',
        required: true,
        through: {
          attributes: [],
        },
        where: {
          [Op.and]: scopes.deliveredReview,
        },
        attributes: [],
      },
      {
        model: Grant,
        as: 'grants',
        required: true,
        where: scopes.grant.where,
        through: {
          attributes: [],
        },
        attributes: [],
        include: [
          {
            model: Recipient,
            as: 'recipient',
            attributes: [],
          },
        ],
      },
    ],
    group: [
      'Citation.id',
      'Citation.citation',
      'Citation.calculated_finding_type',
      'Citation.guidance_category',
    ],
    order: monitoringTtaOrder(sortBy, direction),
    limit: PAGE_SIZE,
    offset,
    raw: true,
    subQuery: false,
  }) as CitationPageRow[];

  return rows.map((row) => row.id);
}

async function findCitationsByIds(
  scopes: IScopes,
  citationIds: number[],
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
        model: DeliveredReview,
        as: 'deliveredReviews',
        required: true,
        through: {
          attributes: [],
        },
        where: {
          [Op.and]: scopes.deliveredReview,
        },
        attributes: [
          ['review_name', 'name'],
          'review_type',
          'outcome',
          'report_delivery_date',
          'review_status',
        ],
      },
      {
        model: Grant,
        as: 'grants',
        required: true,
        where: scopes.grant.where,
        through: {
          attributes: [],
        },
        attributes: ['number', 'numberWithProgramTypes'],
        include: [
          {
            model: Program,
            as: 'programs',
            attributes: ['programType'],
          },
          {
            model: Recipient,
            as: 'recipient',
            attributes: ['name'],
          },
        ],
      },
      {
        model: ActivityReportObjectiveCitation,
        as: 'activityReportObjectiveCitations',
        required: false,
        attributes: ['id'],
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
                attributes: [
                  'activityReportObjectiveId',
                  'topicId',
                ],
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
                attributes: ['title', 'status'],
              },
            ],
          },
        ],
      },
    ],
  }) as Promise<CitationQueryResult[]>;
}

function recipientNameFromCitation(citation: CitationQueryResult): string {
  return uniqueStrings(citation.grants.map((grant) => grant.recipient?.name))
    .sort(compareText)[0] || '';
}

export default async function monitoringTta(
  scopes: IScopes,
  query: {
    sortBy?: MonitoringTtaSortBy;
    direction?: MonitoringTtaDirection;
    offset?: number;
  } = {},
): Promise<MonitoringTTAData[]> {
  const sortBy = query.sortBy || DEFAULT_SORT_BY;
  const direction = query.direction || DEFAULT_DIRECTION;
  const offset = Number.isInteger(query.offset) && Number(query.offset) > 0
    ? Number(query.offset)
    : 0;

  const citationIds = await findPagedCitationIds(scopes, sortBy, direction, offset);
  const citations = await findCitationsByIds(scopes, citationIds);
  const citationsById = new Map(citations.map((citation) => [citation.id, citation]));
  const orderedCitations = citationIds
    .map((citationId) => citationsById.get(citationId))
    .filter((citation): citation is CitationQueryResult => Boolean(citation));

  return orderedCitations
    .map((citation) => {
      const objectives = objectivesFromCitation(citation);
      const specialists = specialistsFromCitation(citation);
      const lastTTADateMoment = lastTtaDateMomentForReviews(
        objectives,
        citation.deliveredReviews,
      );

      const reviews = citation.deliveredReviews
        .map((review) => {
          const reviewReceived = formatDate(review.report_delivery_date) || '';

          return {
            name: review.name || '',
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
        recipientName: recipientNameFromCitation(citation),
        citationNumber: citation.citation || '',
        findingType: citation.calculated_finding_type || '',
        status: citation.calculated_status || '',
        category: citation.guidance_category || '',
        grantNumbers: uniqueStrings(citation.grants.map((grant) => grant.number)).sort(),
        lastTTADate: lastTTADateMoment ? lastTTADateMoment.format('MM/DD/YYYY') : null,
        reviews,
      };
    });
}

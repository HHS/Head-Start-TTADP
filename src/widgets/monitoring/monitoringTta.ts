/* eslint-disable max-len */
import moment from 'moment';
import { Op } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import db from '../../models';
import { IScopes } from '../types';
import {
  ITTAByCitationResponse,
  ITTAByCitationReview,
  ITTAByReviewObjective,
} from '../../services/types/monitoring';
import { formatDate, uniqueStrings } from '../../lib/utils';

// TODO Add sort options:
// -- Recipient (A to Z), then Finding type (default)
// -- Recipient (Z to A), then Finding type
// -- Recipient (A to Z), then Citation number
// -- Recipient (Z to A), then Citation number
// -- Finding category (A to Z), then Citation number
// -- Finding category (Z to A), then Citation number
// -- Citation number (low  to high), then Recipient
// -- Citation number (high  to low), then Recipient

// TODO Add pagination (limit of 10 per page)

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

type Specialist = {
  name: string;
  roles: string[];
};

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
    name?: string | null;
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

function mergeSpecialists(specialists: Specialist[]): Specialist[] {
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

function specialistsFromCitation(citation: CitationQueryResult): Specialist[] {
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

function objectivesFromCitation(citation: CitationQueryResult): ITTAByReviewObjective[] {
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
    );

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
      const endDateComparison = moment(b.endDate, 'MM/DD/YYYY')
        .diff(moment(a.endDate, 'MM/DD/YYYY'));
      if (endDateComparison !== 0) {
        return endDateComparison;
      }

      return a.title.localeCompare(b.title);
    });
}

function compareReviews(a: ITTAByCitationReview, b: ITTAByCitationReview): number {
  const dateComparison = moment(b.reviewReceived, 'MM/DD/YYYY')
    .diff(moment(a.reviewReceived, 'MM/DD/YYYY'));
  if (dateComparison !== 0) {
    return dateComparison;
  }

  return a.reviewType.localeCompare(b.reviewType);
}

export default async function monitoringTta(
  scopes: IScopes,
  query: {
    sortBy?: 'recipient_finding' | 'recipient_citation' | 'finding' | 'citation';
    direction?: 'asc' | 'desc';
    offset?: number;
  },
): Promise<MonitoringTTAData[]> {
  const citations = await Citation.findAll({
    where: {
      [Op.and]: scopes.citation,
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
        where: scopes.deliveredReview?.length
          ? {
            [Op.and]: scopes.deliveredReview,
          }
          : undefined,
        attributes: [
          [db.sequelize.literal("''"), 'name'],
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
        where: scopes.grant?.where,
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
                    ...(scopes.activityReport || []),
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
  }) as CitationQueryResult[];

  return citations
    .map((citation) => {
      const objectives = objectivesFromCitation(citation);
      const specialists = specialistsFromCitation(citation);
      let lastTTADateMoment: moment.Moment | null = null;

      const reviews = citation.deliveredReviews
        .map((review) => {
          const reviewReceived = formatDate(review.report_delivery_date) || '';
          const reportDeliveryMoment = review.report_delivery_date
            ? moment(review.report_delivery_date)
            : null;

          objectives.forEach(({ endDate }) => {
            const objectiveEndDate = moment(endDate, 'MM/DD/YYYY');
            if (!objectiveEndDate.isValid()) {
              return;
            }

            if (!reportDeliveryMoment || !reportDeliveryMoment.isValid() || !objectiveEndDate.isAfter(reportDeliveryMoment)) {
              if (!lastTTADateMoment || objectiveEndDate.isAfter(lastTTADateMoment)) {
                lastTTADateMoment = objectiveEndDate;
              }
            }
          });

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
        recipientName: citation.grants.find((grant) => grant.recipient?.name)?.recipient?.name || '',
        citationNumber: citation.citation || '',
        findingType: citation.calculated_finding_type || '',
        status: citation.calculated_status || '',
        category: citation.guidance_category || '',
        grantNumbers: uniqueStrings(citation.grants.map((grant) => grant.number)).sort(),
        lastTTADate: lastTTADateMoment ? lastTTADateMoment.format('MM/DD/YYYY') : null,
        reviews,
      };
    })
    .sort((a, b) => a.citationNumber.localeCompare(b.citationNumber));
}

import { REPORT_STATUSES } from '@ttahub/common';
import db, { sequelize } from '../../models';
import { IScopes } from '../types';
import { ITTAByCitationResponse } from '../../services/types/monitoring';

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

/**
 *
 * @param scopes
 *
 *
 * @returns
 */
export default async function monitoringTta(
  scopes: IScopes,
) : Promise<MonitoringTTAData[]> {
  const reviews = await DeliveredReview.findAll({
    attributes: [
      sequelize.literal("'' as name"),
      'review_type',
      'outcome',
      'report_delivery_date',
    ],
    include: [
      {
        model: Citation,
        as: 'citations',
        where: scopes.citation,
        through: {
          attributes: [],
        },
        attributes: ['id', 'citation', 'calculated_status', 'calculated_finding_type'],
        include: [
          {},
          {
            model: Grant,
            as: 'grants',
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
            attributes: [],
            include: [
              {
                model: ActivityReportObjective,
                as: 'activityReportObjectives',
                attributes: [],
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
                        attributes: ['name'],
                        model: Topic,
                        as: 'topic',
                      },
                    ],
                  },
                  {
                    model: ActivityReport,
                    as: 'activityReport',
                    attributes: ['endDate', 'participants'],
                    where: { calculatedStatus: REPORT_STATUSES.APPROVED },
                    include: [
                      {
                        model: ActivityReportCollaborator,
                        as: 'activityReportCollaborators',
                        include: [
                          {
                            model: User,
                            as: 'user',
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
                        attributes: ['fullName', 'name'],
                        as: 'author',
                        include: [
                          {
                            model: Role,
                            as: 'roles',
                            attributes: ['name'],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    model: Objective,
                    as: 'objective',
                    attributes: ['status'],
                  },
                ],
              },
            ],
          },
        ],
      }],
  }) as {
    outcome: string;
    review_type: string;
    report_delivery_date: string;
    name: string;
    citations: {

      id: number;
      citation: string;
      calculated_status: string;
      calculated_finding_type: string;
      grants: {
        number: string;
        numberWithProgramTypes: string;
        programs: {
          programType: string;
        }[];
        recipient: {
          name: string;
        }
      }[];
      activityReportObjectiveCitations: {
        activityReportObjectives: {
          activityReportObjectiveTopics: {
            activityReportObjectiveId: number;
            topicId: number;
            topic: {
              name: string;
            }
          }[];
          objective: {
            status: string;
          }[];
          activityReport: {
            endDate: string;
            participants: number;
            author: {
              fullName: string;
              name: string;
              roles: {
                name: string;
              }[];
            }
            activityReportCollaborators: {
              user: {
                fullName: string;
                name: string;
                roles: {
                  name: string;
                }[];
              }
            }[];
          }[]
        }[];
      }[];
    }[];
  }[];

  return [];
}

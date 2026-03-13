/* eslint-disable max-len */
import { Op } from 'sequelize';
import moment from 'moment';
import { uniq, uniqBy } from 'lodash';
import { REPORT_STATUSES } from '@ttahub/common';
import db from '../models';
import { auditLogger } from '../logger';
import {
  ITTAByReviewResponse,
  IMonitoringReview,
  IMonitoringReviewGrantee,
  IMonitoringResponse,
  ITTAByCitationResponse,
} from './types/monitoring';
import { MonitoringStandard as MonitoringStandardType } from './types/ttaByCitationTypes';
import { MonitoringReview as MonitoringReviewType } from './types/ttaByReviewTypes';
import {
  ActivityReportObjectiveCitationResponse,
  Objective as ObjectiveType,
} from './types/activityReportObjectiveCitations';

const {
  Grant,
  GrantNumberLink,
  MonitoringReviewGrantee,
  MonitoringReviewStatus,
  MonitoringReview,
  MonitoringReviewLink,
  MonitoringReviewStatusLink,
  MonitoringClassSummary,
  Citation,
  DeliveredReview,
  DeliveredReviewCitation,
  GrantCitation,
  MonitoringFindingLink,
  MonitoringFindingHistory,
  MonitoringFindingHistoryStatus,
  MonitoringFindingHistoryStatusLink,
  MonitoringFinding,
  MonitoringFindingGrant,
  MonitoringFindingStatusLink,
  MonitoringFindingStatus,
  MonitoringFindingStandard,
  MonitoringStandardLink,
  MonitoringStandard,
  ActivityReportObjectiveCitation,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  Topic,
  ActivityReport,
  ActivityReportCollaborator,
  User,
  Objective,
  Role,
} = db;

const MIN_DELIVERY_DATE = '2025-01-21';
const REVIEW_STATUS_COMPLETE = 'Complete';

/**
 * Map finding type based on determination and original type.
 * Also transforms 'Concern' to 'Area of Concern'.
 *
 * @param determination string
 * @param originalType string
 * @returns string
 */
export function mapFindingType(determination: string | null, originalType: string) {
  let findingType = originalType;
  if (determination) {
    findingType = determination;
  }

  if (findingType === 'Concern') {
    return 'Area of Concern';
  }

  return findingType;
}

async function grantNumbersByRecipientAndRegion(recipientId: number, regionId: number) {
  const grants = await Grant.findAll({
    attributes: ['number'],
    where: {
      recipientId,
      regionId,
    },
  }) as { number: string }[];

  return grants.map((gr) => gr.number);
}

async function aroCitationsByGrantNumbers(grantNumbers: string[]): Promise<ActivityReportObjectiveCitationResponse[]> {
  const objectives = await Objective.findAll({
    attributes: [
      'id',
      'title',
      'status',
    ],
    include: [
      {
        model: ActivityReportObjective,
        as: 'activityReportObjectives',
        attributes: [
          'activityReportId',
          'objectiveId',
        ],
        required: true,
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
            attributes: [
              'displayId',
              'endDate',
              'calculatedStatus',
              'id',
              'userId',
            ],
            where: {
              calculatedStatus: REPORT_STATUSES.APPROVED,
            },
            required: true,
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
            model: ActivityReportObjectiveCitation,
            as: 'activityReportObjectiveCitations',
            where: {
              [Op.or]: grantNumbers.map((grantNumber) => ({
                monitoringReferences: {
                  [Op.contains]: [{ grantNumber }],
                },
              })),
            },
            required: true,
          },
        ],
      },
    ],
  }) as ObjectiveType[];

  return objectives.map((objective) => {
    let findingIds = [];
    let reviewNames = [];
    let endDate = null;
    const grants = [];
    const activityReports = [];
    const specialists = [];
    const topics = [];

    const { activityReportObjectives } = objective;

    activityReportObjectives.forEach((activityReportObjective) => {
      const {
        activityReportObjectiveCitations,
        activityReport,
        activityReportObjectiveTopics,
      } = activityReportObjective;
      const { activityReportCollaborators, author } = activityReport;

      activityReportObjectiveCitations.forEach((citation) => {
        findingIds = findingIds.concat(citation.findingIds);
        grants.push(citation.grantNumber);
        reviewNames = reviewNames.concat(citation.reviewNames);
      });

      specialists.push({ name: author.fullName, roles: author.roles.map((role) => role.name) });
      activityReportCollaborators.forEach((collaborator) => {
        specialists.push({ name: collaborator.user.fullName, roles: collaborator.user.roles.map((role) => role.name) });
      });

      activityReportObjectiveTopics.forEach((topic) => {
        topics.push(topic.topic.name);
      });

      activityReports.push({
        id: activityReport.id,
        displayId: activityReport.displayId,
      });

      if (!endDate || moment(activityReport.endDate).isAfter(endDate)) {
        endDate = moment(activityReport.endDate);
      }
    });

    return {
      findingIds,
      grantNumber: grants.join('\n'),
      reviewNames,
      title: objective.title,
      activityReports,
      endDate: endDate ? endDate.format('MM/DD/YYYY') : null,
      topics: uniq(topics),
      status: objective.status,
      specialists,
    };
  });
}

async function extractExternalData(recipientId: number, regionId: number) {
  const grantNumbers = await grantNumbersByRecipientAndRegion(recipientId, regionId) as string[];
  const citationsOnActivityReports = await aroCitationsByGrantNumbers(grantNumbers);

  const monitoringReviewGrantees = await MonitoringReviewGrantee.findAll({
    attributes: [
      'granteeId',
    ],
    where: {
      grantNumber: grantNumbers,
    },
  }) as { granteeId: string }[];

  const granteeIds = monitoringReviewGrantees.map(({ granteeId }) => granteeId);

  return {
    grantNumbers,
    citationsOnActivityReports,
    granteeIds,
  };
}

export async function ttaByReviews(
  recipientId: number,
  regionId: number,
): Promise<ITTAByReviewResponse[]> {
  const {
    grantNumbers,
    citationsOnActivityReports,
    granteeIds,
  } = await extractExternalData(recipientId, regionId);

  const reviews = await MonitoringReview.findAll({
    order: [['reportDeliveryDate', 'DESC']],
    where: {
      reportDeliveryDate: {
        [Op.gte]: MIN_DELIVERY_DATE,
      },
    },
    include: [
      {
        model: MonitoringReviewStatusLink,
        as: 'statusLink',
        include: [
          {
            model: MonitoringReviewStatus,
            as: 'monitoringReviewStatuses',
            required: true,
            where: {
              name: REVIEW_STATUS_COMPLETE,
            },
          },
        ],
      },
      {
        model: MonitoringReviewLink,
        as: 'monitoringReviewLink',
        required: true,
        include: [
          {
            model: MonitoringReviewGrantee,
            as: 'monitoringReviewGrantees',
            required: true,
            where: {
              grantNumber: grantNumbers,
            },
          },
          {
            model: MonitoringFindingHistory,
            as: 'monitoringFindingHistories',
            required: true,
            include: [
              {
                model: MonitoringFindingLink,
                as: 'monitoringFindingLink',
                required: true,
                include: [
                  {
                    model: MonitoringFindingGrant,
                    as: 'monitoringFindingGrants',
                    where: {
                      granteeId: granteeIds,
                    },
                    required: true,
                  },
                  {
                    model: MonitoringFindingStandard,
                    as: 'monitoringFindingStandards',
                    include: [
                      {
                        model: MonitoringStandardLink,
                        as: 'standardLink',
                        include: [
                          {
                            model: MonitoringStandard,
                            as: 'monitoringStandards',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    model: MonitoringFinding,
                    as: 'monitoringFindings',
                    include: [
                      {
                        model: MonitoringFindingStatusLink,
                        as: 'statusLink',
                        include: [
                          {
                            model: MonitoringFindingStatus,
                            as: 'monitoringFindingStatuses',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }) as MonitoringReviewType[];

  return reviews.map((review) => {
    const { monitoringReviewGrantees, monitoringFindingHistories } = review.monitoringReviewLink;
    let lastTTADate = null;
    const findings = [];
    let specialists = [];

    monitoringFindingHistories.forEach((history) => {
      let citation = '';
      const [findingStandards] = history.monitoringFindingLink.monitoringFindingStandards;
      if (findingStandards) {
        const [standard] = findingStandards.standardLink.monitoringStandards;
        citation = standard.citation;
      }

      history.monitoringFindingLink.monitoringFindings.forEach((finding) => {
        const { findingId } = finding;
        const status = finding.statusLink.monitoringFindingStatuses[0].name;
        const objectives = citationsOnActivityReports.filter((c) => c.findingIds.includes(findingId));

        objectives.forEach(({ endDate }) => {
          if (!lastTTADate || moment(endDate, 'MM/DD/YYYY').isAfter(lastTTADate)) {
            lastTTADate = moment(endDate, 'MM/DD/YYYY');
          }
          specialists = specialists.concat(objectives.map((o) => o.specialists).flat());
        });

        findings.push({
          citation,
          status,
          findingType: mapFindingType(history.determination, finding.findingType),
          correctionDeadline: finding.correctionDeadLine ? moment(finding.correctionDeadLine).format('MM/DD/YYYY') : '',
          category: finding.source,
          objectives,
        });
      });
    });

    return {
      name: review.name,
      id: review.id,
      lastTTADate: lastTTADate ? lastTTADate.format('MM/DD/YYYY') : '',
      outcome: review.outcome,
      reviewType: review.reviewType,
      reviewReceived: moment(review.reportDeliveryDate).format('MM/DD/YYYY'),
      grants: monitoringReviewGrantees.map((grantee) => grantee.grantNumber),
      specialists: uniqBy(specialists, 'name'),
      findings,
    };
  });
}

interface IFactCitationAccumulator {
  citationId: number;
  findingUuid: string;
  citationNumber: string;
  status: string;
  findingType: string;
  category: string;
  grantNumbers: string[];
  grantNumbersSeen: Set<string>;
  lastTTADateMoment: moment.Moment | null;
  reviews: {
    name: string;
    reviewType: string;
    reviewReceived: string;
    outcome: string;
    specialists: {
      name: string;
      roles: string[];
    }[];
    objectives: ActivityReportObjectiveCitationResponse[];
    findingStatus: string;
  }[];
}

interface IFactCitationRow {
  id: number;
  finding_uuid: string;
  citation: string;
  raw_status: string | null;
  calculated_status: string | null;
  raw_finding_type: string | null;
  calculated_finding_type: string | null;
  source_category: string | null;
}

interface IGrantCitationRow {
  grantId: number;
  citationId: number;
  citation: IFactCitationRow;
}

interface IDeliveredReviewRow {
  id: number;
  review_uuid: string;
  review_type: string;
  report_delivery_date: string;
  review_status: string;
}

interface IDeliveredReviewCitationRow {
  citationId: number;
  deliveredReviewId: number;
  deliveredReview: IDeliveredReviewRow;
}

interface IFindingHistoryStatusRow {
  findingId: string;
  reviewId: string;
  monitoringFindingStatusLink?: {
    monitoringFindingHistoryStatuses?: { name: string }[];
  };
}

async function ttaByCitationsFromLegacyQuery(
  grantNumbers: string[],
  granteeIds: string[],
  citationsOnActivityReports: ActivityReportObjectiveCitationResponse[],
): Promise<ITTAByCitationResponse[]> {
  const citations = await MonitoringStandard.findAll({
    attributes: ['citation'],
    order: [['citation', 'ASC']],
    include: [
      {
        model: MonitoringStandardLink,
        as: 'standardLink',
        required: true,
        attributes: ['id'],
        include: [
          {
            model: MonitoringFindingStandard,
            as: 'monitoringFindingStandards',
            required: true,
            attributes: ['findingId'],
            include: [
              {
                model: MonitoringFindingLink,
                as: 'findingLink',
                required: true,
                attributes: ['findingId'],
                include: [
                  {
                    model: MonitoringFinding,
                    as: 'monitoringFindings',
                    required: true,
                    attributes: ['findingId', 'findingType', 'source'],
                    include: [
                      {
                        model: MonitoringFindingStatusLink,
                        as: 'statusLink',
                        required: true,
                        attributes: ['statusId'],
                        include: [
                          {
                            model: MonitoringFindingStatus,
                            as: 'monitoringFindingStatuses',
                            required: true,
                            attributes: ['name'],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    model: MonitoringFindingGrant,
                    as: 'monitoringFindingGrants',
                    where: {
                      granteeId: granteeIds,
                    },
                    required: true,
                    attributes: ['granteeId'],
                  },
                  {
                    model: MonitoringFindingHistory,
                    as: 'monitoringFindingHistories',
                    required: true,
                    attributes: ['reviewId', 'determination'],
                    include: [
                      {
                        model: MonitoringFindingHistoryStatusLink,
                        as: 'monitoringFindingStatusLink',
                        required: true,
                        attributes: ['statusId'],
                        include: [
                          {
                            model: MonitoringFindingHistoryStatus,
                            as: 'monitoringFindingHistoryStatuses',
                            required: true,
                            attributes: ['name'],
                          },
                        ],
                      },
                      {
                        model: MonitoringReviewLink,
                        as: 'monitoringReviewLink',
                        required: true,
                        attributes: ['reviewId'],
                        include: [
                          {
                            model: MonitoringReview,
                            as: 'monitoringReviews',
                            required: true,
                            attributes: ['name', 'reviewType', 'reportDeliveryDate', 'outcome'],
                            where: {
                              reportDeliveryDate: {
                                [Op.gte]: MIN_DELIVERY_DATE,
                              },
                            },
                            include: [
                              {
                                model: MonitoringReviewStatusLink,
                                as: 'statusLink',
                                required: true,
                                attributes: ['statusId'],
                                include: [
                                  {
                                    model: MonitoringReviewStatus,
                                    as: 'monitoringReviewStatuses',
                                    required: true,
                                    attributes: ['name'],
                                    where: {
                                      name: REVIEW_STATUS_COMPLETE,
                                    },
                                  },
                                ],
                              },
                            ],
                          },
                          {
                            model: MonitoringReviewGrantee,
                            as: 'monitoringReviewGrantees',
                            required: true,
                            attributes: ['grantNumber'],
                            where: {
                              grantNumber: grantNumbers,
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }) as MonitoringStandardType[];

  return citations.map((citation) => {
    const [findingStandard] = citation.standardLink.monitoringFindingStandards;
    const { findingLink } = findingStandard;

    let lastTTADate = null;

    const grants = [];
    const reviews = [];

    const { monitoringFindingHistories, monitoringFindings } = findingLink;
    const [finding] = monitoringFindings;
    const [status] = finding.statusLink.monitoringFindingStatuses;

    let { findingType } = finding;

    monitoringFindingHistories.forEach((history) => {
      const { determination } = history;

      if (determination) {
        findingType = determination;
      }

      const { monitoringReviewLink, monitoringFindingStatusLink } = history;
      const { monitoringReviews } = monitoringReviewLink;

      const [monitoringStatus] = monitoringFindingStatusLink.monitoringFindingHistoryStatuses;

      const objectives = citationsOnActivityReports.filter((c) => c.findingIds.includes(finding.findingId));
      objectives.forEach(({ endDate }) => {
        if (!lastTTADate || moment(endDate, 'MM/DD/YYYY').isAfter(lastTTADate)) {
          lastTTADate = moment(endDate, 'MM/DD/YYYY');
        }
      });

      monitoringReviews.forEach((review) => {
        const { monitoringReviewGrantees } = monitoringReviewLink;
        const gr = monitoringReviewGrantees.map((grantee) => grantee.grantNumber);

        grants.push(gr);

        reviews.push({
          name: review.name,
          reviewType: review.reviewType,
          reviewReceived: moment(review.reportDeliveryDate).format('MM/DD/YYYY'),
          outcome: review.outcome,
          specialists: uniqBy(objectives.map((o) => o.specialists).flat(), 'name'),
          objectives: objectives.filter((o) => o.reviewNames.includes(review.name)),
          findingStatus: monitoringStatus.name,
        });
      });
    });

    return {
      citationNumber: citation.citation,
      status: status.name,
      findingType: mapFindingType(findingType, finding.findingType),
      category: finding.source,
      grantNumbers: uniq(grants.flat()),
      lastTTADate: lastTTADate ? lastTTADate.format('MM/DD/YYYY') : '',
      reviews,
    };
  });
}

async function ttaByCitationsFromFactTables(
  recipientId: number,
  regionId: number,
  citationsOnActivityReports: ActivityReportObjectiveCitationResponse[],
): Promise<ITTAByCitationResponse[]> {
  const recipientGrants = await Grant.unscoped().findAll({
    attributes: ['id', 'number'],
    where: {
      recipientId,
      regionId,
    },
  }) as { id: number; number: string }[];

  if (recipientGrants.length === 0) {
    return [];
  }

  const grantNumberById = new Map<number, string>(recipientGrants.map((gr) => [gr.id, gr.number]));
  const grantIds = recipientGrants.map((gr) => gr.id);

  const grantCitations = await GrantCitation.findAll({
    attributes: ['grantId', 'citationId'],
    where: {
      grantId: grantIds,
    },
    include: [
      {
        model: Citation,
        as: 'citation',
        required: true,
        attributes: [
          'id',
          'finding_uuid',
          'citation',
          'raw_status',
          'calculated_status',
          'raw_finding_type',
          'calculated_finding_type',
          'source_category',
        ],
      },
    ],
  }) as unknown as IGrantCitationRow[];

  if (grantCitations.length === 0) {
    return [];
  }

  const citationsById = new Map<number, IFactCitationAccumulator>();

  grantCitations.forEach((grantCitation) => {
    const citationData = grantCitation.citation;
    const citationId = citationData.id;
    const grantNumber = grantNumberById.get(grantCitation.grantId);
    if (!grantNumber) {
      return;
    }

    if (!citationsById.has(citationId)) {
      citationsById.set(citationId, {
        citationId,
        findingUuid: citationData.finding_uuid,
        citationNumber: citationData.citation,
        status: citationData.raw_status || citationData.calculated_status || '',
        findingType: citationData.calculated_finding_type || citationData.raw_finding_type || '',
        category: citationData.source_category || '',
        grantNumbers: [],
        grantNumbersSeen: new Set<string>(),
        lastTTADateMoment: null,
        reviews: [],
      });
    }

    const existing = citationsById.get(citationId);
    if (existing && !existing.grantNumbersSeen.has(grantNumber)) {
      existing.grantNumbersSeen.add(grantNumber);
      existing.grantNumbers.push(grantNumber);
    }
  });

  const citationIds = [...citationsById.keys()];

  const deliveredReviewCitations = await DeliveredReviewCitation.findAll({
    attributes: ['citationId', 'deliveredReviewId'],
    where: {
      citationId: citationIds,
    },
    include: [
      {
        model: DeliveredReview,
        as: 'deliveredReview',
        required: true,
        attributes: [
          'id',
          'review_uuid',
          'review_type',
          'report_delivery_date',
          'review_status',
        ],
        where: {
          review_status: REVIEW_STATUS_COMPLETE,
          report_delivery_date: {
            [Op.gte]: MIN_DELIVERY_DATE,
          },
        },
      },
    ],
  }) as unknown as IDeliveredReviewCitationRow[];

  if (deliveredReviewCitations.length === 0) {
    return [];
  }

  const reviewUuids = uniq(deliveredReviewCitations
    .map((drc) => drc.deliveredReview?.review_uuid)
    .filter((reviewUuid) => !!reviewUuid));

  const reviewDetails = await MonitoringReview.findAll({
    attributes: [
      'reviewId',
      'name',
      'reviewType',
      'reportDeliveryDate',
      'outcome',
    ],
    where: {
      reviewId: reviewUuids,
    },
  }) as {
    reviewId: string;
    name: string;
    reviewType: string;
    reportDeliveryDate: Date;
    outcome: string;
  }[];

  const reviewByUuid = new Map<string, {
    name: string;
    reviewType: string;
    reportDeliveryDate: Date;
    outcome: string;
  }>(
    reviewDetails.map((review) => [review.reviewId, {
      name: review.name,
      reviewType: review.reviewType,
      reportDeliveryDate: review.reportDeliveryDate,
      outcome: review.outcome,
    }]),
  );

  const findingUuids = uniq([...citationsById.values()].map((c) => c.findingUuid));

  const findingHistoryStatuses = await MonitoringFindingHistory.findAll({
    attributes: [
      'findingId',
      'reviewId',
    ],
    where: {
      findingId: findingUuids,
      reviewId: reviewUuids,
    },
    include: [
      {
        model: MonitoringFindingHistoryStatusLink,
        as: 'monitoringFindingStatusLink',
        required: false,
        attributes: ['statusId'],
        include: [
          {
            model: MonitoringFindingHistoryStatus,
            as: 'monitoringFindingHistoryStatuses',
            required: false,
            attributes: ['name'],
          },
        ],
      },
    ],
  }) as unknown as IFindingHistoryStatusRow[];

  const findingStatusByFindingAndReview = new Map<string, string>();
  findingHistoryStatuses.forEach((history) => {
    const statusName = history.monitoringFindingStatusLink
      ?.monitoringFindingHistoryStatuses?.[0]?.name;
    if (statusName) {
      findingStatusByFindingAndReview.set(`${history.findingId}::${history.reviewId}`, statusName);
    }
  });

  deliveredReviewCitations.forEach((deliveredReviewCitation) => {
    const citationData = citationsById.get(deliveredReviewCitation.citationId);
    const { deliveredReview } = deliveredReviewCitation;
    if (!citationData || !deliveredReview || !deliveredReview.review_uuid) {
      return;
    }

    const reviewDetailsForUuid = reviewByUuid.get(deliveredReview.review_uuid);
    if (!reviewDetailsForUuid) {
      auditLogger.warn(`ttaByCitationsFromFactTables: skipping delivered review with no MonitoringReview match (recipientId=${recipientId}, regionId=${regionId}, citationId=${deliveredReviewCitation.citationId}, reviewUuid=${deliveredReview.review_uuid})`);
      return;
    }

    const reviewName = reviewDetailsForUuid.name;

    const objectives = citationsOnActivityReports.filter(
      (objective) => objective.findingIds.includes(citationData.findingUuid)
        && objective.reviewNames.includes(reviewName),
    );

    const specialists = uniqBy(objectives.map((objective) => objective.specialists).flat(), 'name');

    objectives.forEach(({ endDate }) => {
      const date = moment(endDate, 'MM/DD/YYYY');
      if (!citationData.lastTTADateMoment || date.isAfter(citationData.lastTTADateMoment)) {
        citationData.lastTTADateMoment = date;
      }
    });

    citationData.reviews.push({
      name: reviewName,
      reviewType: reviewDetailsForUuid.reviewType,
      reviewReceived: moment(
        reviewDetailsForUuid.reportDeliveryDate,
      ).format('MM/DD/YYYY'),
      outcome: reviewDetailsForUuid.outcome || '',
      specialists,
      objectives,
      findingStatus: findingStatusByFindingAndReview.get(
        `${citationData.findingUuid}::${deliveredReview.review_uuid}`,
      ) || citationData.status,
    });
  });

  return [...citationsById.values()]
    .sort((a, b) => a.citationNumber.localeCompare(b.citationNumber))
    .map((citationData) => ({
      citationNumber: citationData.citationNumber,
      status: citationData.status,
      findingType: citationData.findingType,
      category: citationData.category,
      grantNumbers: citationData.grantNumbers,
      lastTTADate: citationData.lastTTADateMoment
        ? citationData.lastTTADateMoment.format('MM/DD/YYYY')
        : '',
      reviews: citationData.reviews,
    }));
}

export async function ttaByCitations(
  recipientId: number,
  regionId: number,
): Promise<ITTAByCitationResponse[]> {
  const {
    grantNumbers,
    citationsOnActivityReports,
    granteeIds,
  } = await extractExternalData(recipientId, regionId);

  const factTableData = await ttaByCitationsFromFactTables(
    recipientId,
    regionId,
    citationsOnActivityReports,
  );

  if (factTableData.length > 0) {
    return factTableData;
  }

  return ttaByCitationsFromLegacyQuery(
    grantNumbers,
    granteeIds,
    citationsOnActivityReports,
  );
}

export async function monitoringData({
  recipientId,
  regionId,
  grantNumber,
}: {
  recipientId: number;
  regionId: number;
  grantNumber: string;
}): Promise<IMonitoringResponse> {
  /**
   *
   *
   * because of the way these tables were linked,
   * we cannot use a findOne here, although it is what we really want
   */
  const grants = await Grant.findAll({
    attributes: ['id', 'recipientId', 'regionId', 'number'],
    where: {
      regionId,
      recipientId,
      number: grantNumber, // since we query by grant number, there can only be one anyways
    },
    include: [
      {
        model: GrantNumberLink,
        as: 'grantNumberLink',
        required: true,
        include: [
          {
            model: MonitoringReviewGrantee,
            attributes: ['id', 'grantNumber', 'reviewId'],
            required: true,
            as: 'monitoringReviewGrantees',
            include: [
              {
                model: MonitoringReviewLink,
                as: 'monitoringReviewLink',
                required: true,
                include: [
                  {
                    model: MonitoringReview,
                    as: 'monitoringReviews',
                    attributes: [
                      'reportDeliveryDate',
                      'id',
                      'reviewType',
                      'reviewId',
                      'statusId',
                      'outcome',
                    ],
                    required: true,
                    include: [
                      {
                        attributes: ['id', 'statusId'],
                        model: MonitoringReviewStatusLink,
                        as: 'statusLink',
                        required: true,
                        include: [
                          {
                            attributes: ['id', 'name', 'statusId'],
                            model: MonitoringReviewStatus,
                            as: 'monitoringReviewStatuses',
                            required: true,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  // get the first grant (remember, there can only be one)
  const grant = (grants[0]?.toJSON() || null);

  if (!grant) {
    // not an error, it's valid for there to be no findings for a grant
    // @ts-ignore
    return null;
  }

  // since all the joins made in the query above are inner joins
  // we can count on the rest of this data being present
  const { monitoringReviewGrantees } = grant.grantNumberLink;

  // get the most recent review
  // - 1) first extract from the join tables
  const monitoringReviews = monitoringReviewGrantees.map(
    (review: IMonitoringReviewGrantee) => review.monitoringReviewLink.monitoringReviews,
  ).flat();

  // - 2) then sort to get the most recent
  const monitoringReview = monitoringReviews.reduce((
    a: IMonitoringReview,
    b: IMonitoringReview,
  ) => {
    if (a.reportDeliveryDate > b.reportDeliveryDate) {
      return a;
    }
    return b;
  }, monitoringReviews[0]);

  return {
    recipientId: grant.recipientId,
    regionId: grant.regionId,
    reviewStatus: monitoringReview.outcome,
    reviewDate: moment(monitoringReview.reportDeliveryDate).format('MM/DD/YYYY'),
    reviewType: monitoringReview.reviewType,
    grant: grant.number,
  };
}

export async function classScore({ recipientId, grantNumber, regionId }: {
  recipientId: number;
  grantNumber: string;
  regionId: number;
}) {
  const score = await MonitoringClassSummary.findOne({
    where: {
      grantNumber,
    },
    attributes: [
      'emotionalSupport',
      'classroomOrganization',
      'instructionalSupport',
      'reportDeliveryDate',
    ],
  }, {
    raw: true,
  });

  if (!score) {
    return {};
  }

  const received = moment(score.reportDeliveryDate);

  // Do not show scores that are before Nov 9, 2020.
  if (received.isBefore('2020-11-09')) {
    return {};
  }

  // Do not show scores for CDI grants.
  const isCDIGrant = await Grant.findOne({
    where: {
      number: grantNumber,
      cdi: true,
    },
  });

  if (isCDIGrant) {
    return {};
  }

  return {
    recipientId,
    regionId,
    grantNumber,
    received: received.format('MM/DD/YYYY'),
    ES: score.emotionalSupport,
    CO: score.classroomOrganization,
    IS: score.instructionalSupport,
  };
}

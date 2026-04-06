/* eslint-disable max-len */

import { REPORT_STATUSES } from '@ttahub/common';
import { uniq, uniqBy } from 'lodash';
import moment from 'moment';
import { Op } from 'sequelize';
import { auditLogger } from '../logger';
import db from '../models';
import type {
  ActivityReportObjectiveCitationResponse,
  Objective as ObjectiveType,
} from './types/activityReportObjectiveCitations';
import type {
  IMonitoringResponse,
  IMonitoringReview,
  IMonitoringReviewGrantee,
  ITTAByCitationResponse,
  ITTAByReviewResponse,
} from './types/monitoring';
import type { MonitoringReview as MonitoringReviewType } from './types/ttaByReviewTypes';

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
  GrantDeliveredReview,
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
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
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
  const grants = (await Grant.findAll({
    attributes: ['number'],
    where: {
      recipientId,
      regionId,
    },
  })) as { number: string }[];

  return grants.map((gr) => gr.number);
}

async function recipientGrantsByRecipientAndRegion(recipientId: number, regionId: number) {
  return Grant.unscoped().findAll({
    attributes: ['id', 'number'],
    where: {
      recipientId,
      regionId,
    },
  }) as Promise<{ id: number; number: string }[]>;
}

async function aroCitationsByGrantNumbers(
  grantNumbers: string[]
): Promise<ActivityReportObjectiveCitationResponse[]> {
  if (grantNumbers.length === 0) {
    return [];
  }

  const objectives = (await Objective.findAll({
    attributes: ['id', 'title', 'status'],
    include: [
      {
        model: ActivityReportObjective,
        as: 'activityReportObjectives',
        attributes: ['id', 'activityReportId', 'objectiveId'],
        required: true,
        include: [
          {
            model: ActivityReportObjectiveTopic,
            as: 'activityReportObjectiveTopics',
            attributes: ['activityReportObjectiveId', 'topicId'],
            include: [
              {
                attributes: ['name'],
                model: Topic,
                as: 'topic',
              },
            ],
          },
          {
            model: ActivityReportObjectiveCitation,
            as: 'activityReportObjectiveCitations',
            attributes: ['id', 'grantNumber', 'findingId', 'reviewName'],
            where: {
              grantNumber: grantNumbers,
            },
            required: true,
          },
          {
            model: ActivityReport,
            as: 'activityReport',
            attributes: ['displayId', 'endDate', 'calculatedStatus', 'id', 'userId'],
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
        ],
      },
    ],
  })) as ObjectiveType[];

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
      const { activityReportObjectiveCitations, activityReport, activityReportObjectiveTopics } =
        activityReportObjective;
      const { activityReportCollaborators, author } = activityReport;

      activityReportObjectiveCitations.forEach((citation) => {
        let rowFindingIds = [];
        if (Array.isArray(citation.findingIds)) {
          rowFindingIds = citation.findingIds;
        } else if (citation.findingId) {
          rowFindingIds = [citation.findingId];
        }
        findingIds = findingIds.concat(rowFindingIds);

        if (citation.grantNumber) {
          grants.push(citation.grantNumber);
        }

        let rowReviewNames = [];
        if (Array.isArray(citation.reviewNames)) {
          rowReviewNames = citation.reviewNames;
        } else if (citation.reviewName) {
          rowReviewNames = [citation.reviewName];
        }
        reviewNames = reviewNames.concat(rowReviewNames);
      });

      specialists.push({ name: author.fullName, roles: author.roles.map((role) => role.name) });
      activityReportCollaborators.forEach((collaborator) => {
        specialists.push({
          name: collaborator.user.fullName,
          roles: collaborator.user.roles.map((role) => role.name),
        });
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
  const grantNumbers = (await grantNumbersByRecipientAndRegion(recipientId, regionId)) as string[];
  const citationsOnActivityReports = await aroCitationsByGrantNumbers(grantNumbers);

  const monitoringReviewGrantees = (await MonitoringReviewGrantee.findAll({
    attributes: ['granteeId'],
    where: {
      grantNumber: grantNumbers,
    },
  })) as { granteeId: string }[];

  const granteeIds = monitoringReviewGrantees.map(({ granteeId }) => granteeId);

  return {
    grantNumbers,
    citationsOnActivityReports,
    granteeIds,
  };
}

export async function ttaByReviews(
  recipientId: number,
  regionId: number
): Promise<ITTAByReviewResponse[]> {
  const { grantNumbers, citationsOnActivityReports, granteeIds } = await extractExternalData(
    recipientId,
    regionId
  );

  const reviews = (await MonitoringReview.findAll({
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
  })) as MonitoringReviewType[];

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
        const objectives = citationsOnActivityReports.filter((c) =>
          c.findingIds.includes(findingId)
        );

        objectives.forEach(({ endDate }) => {
          if (!lastTTADate || moment(endDate, 'MM/DD/YYYY').isAfter(lastTTADate)) {
            lastTTADate = moment(endDate, 'MM/DD/YYYY');
          }
          specialists = specialists.concat(objectives.flatMap((o) => o.specialists));
        });

        findings.push({
          citation,
          status,
          findingType: mapFindingType(history.determination, finding.findingType),
          correctionDeadline: finding.correctionDeadLine
            ? moment(finding.correctionDeadLine).format('MM/DD/YYYY')
            : '',
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
  grantDeliveredReviews?: { grantId: number }[];
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

interface IReviewDetailRow {
  reviewId: string;
  name: string;
  reviewType: string;
  reportDeliveryDate: Date | string;
  outcome: string | null;
}

interface IGrantCitationRowRaw {
  grantId?: number;
  citationId?: number;
  citation?: Partial<IFactCitationRow> | IPlainable<Partial<IFactCitationRow>> | null;
}

interface IGrantDeliveredReviewRowRaw {
  grantId?: number;
}

interface IDeliveredReviewRowRaw {
  id?: number;
  review_uuid?: string;
  review_type?: string;
  report_delivery_date?: string;
  review_status?: string;
  grantDeliveredReviews?: (
    | IGrantDeliveredReviewRowRaw
    | IPlainable<IGrantDeliveredReviewRowRaw>
    | null
  )[];
}

interface IDeliveredReviewCitationRowRaw {
  citationId?: number;
  deliveredReviewId?: number;
  deliveredReview?: IDeliveredReviewRowRaw | IPlainable<IDeliveredReviewRowRaw> | null;
}

interface IReviewDetailRowRaw {
  reviewId?: string;
  name?: string;
  reviewType?: string;
  reportDeliveryDate?: Date | string;
  outcome?: string | null;
}

interface IFindingHistoryStatusNameRaw {
  name?: string;
}

interface IFindingHistoryStatusLinkRaw {
  monitoringFindingHistoryStatuses?: (
    | IFindingHistoryStatusNameRaw
    | IPlainable<IFindingHistoryStatusNameRaw>
    | null
  )[];
}

interface IFindingHistoryStatusRowRaw {
  findingId?: string;
  reviewId?: string;
  monitoringFindingStatusLink?:
    | IFindingHistoryStatusLinkRaw
    | IPlainable<IFindingHistoryStatusLinkRaw>
    | null;
}

interface IPlainable<T extends object> {
  get(options?: { plain?: boolean }): T;
}

type PlainableOrRecord<T extends object> = T | IPlainable<T> | null | undefined;

function hasPlainGetter<T extends object>(value: PlainableOrRecord<T>): value is IPlainable<T> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'get' in value &&
    typeof value.get === 'function'
  );
}

function toPlainRecord<T extends object>(value: PlainableOrRecord<T>): T | null {
  if (hasPlainGetter(value)) {
    return value.get({ plain: true });
  }

  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function optionalString(value: string | null | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function toGrantCitationRow(
  value: IGrantCitationRowRaw | IPlainable<IGrantCitationRowRaw> | null | undefined
): IGrantCitationRow | null {
  const row = toPlainRecord<IGrantCitationRowRaw>(value);
  const citation = toPlainRecord<Partial<IFactCitationRow>>(row?.citation ?? null);

  if (
    !row ||
    !citation ||
    typeof row.grantId !== 'number' ||
    typeof row.citationId !== 'number' ||
    typeof citation.id !== 'number' ||
    typeof citation.finding_uuid !== 'string' ||
    typeof citation.citation !== 'string'
  ) {
    return null;
  }

  return {
    grantId: row.grantId,
    citationId: row.citationId,
    citation: {
      id: citation.id,
      finding_uuid: citation.finding_uuid,
      citation: citation.citation,
      raw_status: optionalString(citation.raw_status),
      calculated_status: optionalString(citation.calculated_status),
      raw_finding_type: optionalString(citation.raw_finding_type),
      calculated_finding_type: optionalString(citation.calculated_finding_type),
      source_category: optionalString(citation.source_category),
    },
  };
}

function toDeliveredReviewCitationRow(
  value:
    | IDeliveredReviewCitationRowRaw
    | IPlainable<IDeliveredReviewCitationRowRaw>
    | null
    | undefined
): IDeliveredReviewCitationRow | null {
  const row = toPlainRecord<IDeliveredReviewCitationRowRaw>(value);
  const deliveredReview = toPlainRecord<IDeliveredReviewRowRaw>(row?.deliveredReview ?? null);
  const grantDeliveredReviews = Array.isArray(deliveredReview?.grantDeliveredReviews)
    ? deliveredReview.grantDeliveredReviews
        .map((grantDeliveredReview) =>
          toPlainRecord<IGrantDeliveredReviewRowRaw>(grantDeliveredReview)
        )
        .filter(
          (grantDeliveredReview): grantDeliveredReview is { grantId: number } =>
            !!grantDeliveredReview && typeof grantDeliveredReview.grantId === 'number'
        )
        .map((grantDeliveredReview) => ({ grantId: grantDeliveredReview.grantId }))
    : [];

  if (
    !row ||
    !deliveredReview ||
    typeof row.citationId !== 'number' ||
    typeof row.deliveredReviewId !== 'number' ||
    typeof deliveredReview.id !== 'number' ||
    typeof deliveredReview.review_uuid !== 'string' ||
    typeof deliveredReview.review_type !== 'string' ||
    typeof deliveredReview.report_delivery_date !== 'string' ||
    typeof deliveredReview.review_status !== 'string' ||
    grantDeliveredReviews.length === 0
  ) {
    return null;
  }

  return {
    citationId: row.citationId,
    deliveredReviewId: row.deliveredReviewId,
    deliveredReview: {
      id: deliveredReview.id,
      review_uuid: deliveredReview.review_uuid,
      review_type: deliveredReview.review_type,
      report_delivery_date: deliveredReview.report_delivery_date,
      review_status: deliveredReview.review_status,
      grantDeliveredReviews,
    },
  };
}

function toReviewDetailRow(
  value: IReviewDetailRowRaw | IPlainable<IReviewDetailRowRaw> | null | undefined
): IReviewDetailRow | null {
  const row = toPlainRecord<IReviewDetailRowRaw>(value);
  const reportDeliveryDate = row?.reportDeliveryDate;

  if (
    !row ||
    typeof row.reviewId !== 'string' ||
    typeof row.name !== 'string' ||
    typeof row.reviewType !== 'string' ||
    !(reportDeliveryDate instanceof Date || typeof reportDeliveryDate === 'string')
  ) {
    return null;
  }

  return {
    reviewId: row.reviewId,
    name: row.name,
    reviewType: row.reviewType,
    reportDeliveryDate,
    outcome: optionalString(row.outcome),
  };
}

function toFindingHistoryStatusRow(
  value: IFindingHistoryStatusRowRaw | IPlainable<IFindingHistoryStatusRowRaw> | null | undefined
): IFindingHistoryStatusRow | null {
  const row = toPlainRecord<IFindingHistoryStatusRowRaw>(value);
  const statusLink = toPlainRecord<IFindingHistoryStatusLinkRaw>(
    row?.monitoringFindingStatusLink ?? null
  );
  const monitoringFindingHistoryStatuses = Array.isArray(
    statusLink?.monitoringFindingHistoryStatuses
  )
    ? statusLink.monitoringFindingHistoryStatuses
        .map((status) => toPlainRecord<IFindingHistoryStatusNameRaw>(status))
        .filter((status): status is { name: string } => !!status && typeof status.name === 'string')
        .map((status) => ({ name: status.name }))
    : [];

  if (!row || typeof row.findingId !== 'string' || typeof row.reviewId !== 'string') {
    return null;
  }

  return {
    findingId: row.findingId,
    reviewId: row.reviewId,
    monitoringFindingStatusLink: statusLink ? { monitoringFindingHistoryStatuses } : undefined,
  };
}

async function ttaByCitationsFromFactTables(
  recipientId: number,
  regionId: number,
  recipientGrants: { id: number; number: string }[],
  citationsOnActivityReports: ActivityReportObjectiveCitationResponse[]
): Promise<ITTAByCitationResponse[]> {
  if (recipientGrants.length === 0) {
    return [];
  }

  const grantNumberById = new Map<number, string>(recipientGrants.map((gr) => [gr.id, gr.number]));
  const grantIds = recipientGrants.map((gr) => gr.id);

  const grantCitationModels = await GrantCitation.findAll({
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
  });

  const grantCitations = grantCitationModels
    .map((grantCitation) => toGrantCitationRow(grantCitation))
    .filter((grantCitation): grantCitation is IGrantCitationRow => !!grantCitation);

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
        status: citationData.calculated_status || citationData.raw_status || '',
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

  const deliveredReviewCitationModels = await DeliveredReviewCitation.findAll({
    attributes: ['citationId', 'deliveredReviewId'],
    where: {
      citationId: citationIds,
    },
    include: [
      {
        model: DeliveredReview,
        as: 'deliveredReview',
        required: true,
        attributes: ['id', 'review_uuid', 'review_type', 'report_delivery_date', 'review_status'],
        where: {
          review_status: REVIEW_STATUS_COMPLETE,
          report_delivery_date: {
            [Op.gte]: MIN_DELIVERY_DATE,
          },
        },
        include: [
          {
            model: GrantDeliveredReview,
            as: 'grantDeliveredReviews',
            required: true,
            attributes: ['grantId'],
            where: {
              grantId: grantIds,
            },
          },
        ],
      },
    ],
  });

  const deliveredReviewCitations = deliveredReviewCitationModels
    .map((deliveredReviewCitation) => toDeliveredReviewCitationRow(deliveredReviewCitation))
    .filter(
      (deliveredReviewCitation): deliveredReviewCitation is IDeliveredReviewCitationRow =>
        !!deliveredReviewCitation
    );

  if (deliveredReviewCitations.length === 0) {
    return [];
  }

  const reviewUuids = uniq(
    deliveredReviewCitations
      .map((drc) => drc.deliveredReview?.review_uuid)
      .filter((reviewUuid) => !!reviewUuid)
  );

  const reviewDetailModels = await MonitoringReview.findAll({
    attributes: ['reviewId', 'name', 'reviewType', 'reportDeliveryDate', 'outcome'],
    where: {
      reviewId: reviewUuids,
    },
  });

  const reviewDetails = reviewDetailModels
    .map((review) => toReviewDetailRow(review))
    .filter((review): review is IReviewDetailRow => !!review);

  const reviewByUuid = new Map<string, IReviewDetailRow>(
    reviewDetails.map((review) => [
      review.reviewId,
      {
        reviewId: review.reviewId,
        name: review.name,
        reviewType: review.reviewType,
        reportDeliveryDate: review.reportDeliveryDate,
        outcome: review.outcome,
      },
    ])
  );

  const findingUuids = uniq([...citationsById.values()].map((c) => c.findingUuid));

  const findingHistoryStatusModels = await MonitoringFindingHistory.findAll({
    attributes: ['findingId', 'reviewId'],
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
  });

  const findingHistoryStatuses = findingHistoryStatusModels
    .map((history) => toFindingHistoryStatusRow(history))
    .filter((history): history is IFindingHistoryStatusRow => !!history);

  const findingStatusByFindingAndReview = new Map<string, string>();
  findingHistoryStatuses.forEach((history) => {
    const statusName =
      history.monitoringFindingStatusLink?.monitoringFindingHistoryStatuses?.[0]?.name;
    if (statusName) {
      findingStatusByFindingAndReview.set(`${history.findingId}::${history.reviewId}`, statusName);
    }
  });

  const objectivesByFindingAndReview = new Map<string, ActivityReportObjectiveCitationResponse[]>();
  citationsOnActivityReports.forEach((objective) => {
    uniq(objective.findingIds).forEach((findingId) => {
      uniq(objective.reviewNames).forEach((reviewName) => {
        const key = `${findingId}::${reviewName}`;
        const existingObjectives = objectivesByFindingAndReview.get(key) || [];
        existingObjectives.push(objective);
        objectivesByFindingAndReview.set(key, existingObjectives);
      });
    });
  });

  let unmatchedDeliveredReviewCount = 0;
  const unmatchedReviewUuids = new Set<string>();

  deliveredReviewCitations.forEach((deliveredReviewCitation) => {
    const citationData = citationsById.get(deliveredReviewCitation.citationId);
    const { deliveredReview } = deliveredReviewCitation;
    if (!citationData || !deliveredReview || !deliveredReview.review_uuid) {
      return;
    }

    const reviewDetailsForUuid = reviewByUuid.get(deliveredReview.review_uuid);
    if (!reviewDetailsForUuid) {
      unmatchedDeliveredReviewCount += 1;
      unmatchedReviewUuids.add(deliveredReview.review_uuid);
      return;
    }

    const reviewName = reviewDetailsForUuid.name;

    const objectives =
      objectivesByFindingAndReview.get(`${citationData.findingUuid}::${reviewName}`) || [];

    const specialists = uniqBy(
      objectives.flatMap((objective) => objective.specialists),
      'name'
    );

    objectives.forEach(({ endDate }) => {
      const date = moment(endDate, 'MM/DD/YYYY');
      if (!citationData.lastTTADateMoment || date.isAfter(citationData.lastTTADateMoment)) {
        citationData.lastTTADateMoment = date;
      }
    });

    citationData.reviews.push({
      name: reviewName,
      reviewType: reviewDetailsForUuid.reviewType,
      reviewReceived: moment(reviewDetailsForUuid.reportDeliveryDate).format('MM/DD/YYYY'),
      outcome: reviewDetailsForUuid.outcome || '',
      specialists,
      objectives,
      findingStatus:
        findingStatusByFindingAndReview.get(
          `${citationData.findingUuid}::${deliveredReview.review_uuid}`
        ) || '',
    });
  });

  if (unmatchedDeliveredReviewCount > 0) {
    auditLogger.warn(
      `ttaByCitationsFromFactTables: skipped ${unmatchedDeliveredReviewCount} delivered review citations with ${unmatchedReviewUuids.size} unmatched review UUIDs (recipientId=${recipientId}, regionId=${regionId})`
    );
  }

  return [...citationsById.values()]
    .filter((citationData) => citationData.reviews.length > 0)
    .sort((a, b) => a.citationNumber.localeCompare(b.citationNumber))
    .map((citationData) => ({
      citationNumber: citationData.citationNumber,
      status: citationData.status,
      findingType: citationData.findingType,
      category: citationData.category,
      grantNumbers: [...citationData.grantNumbers].sort(),
      lastTTADate: citationData.lastTTADateMoment
        ? citationData.lastTTADateMoment.format('MM/DD/YYYY')
        : '',
      reviews: [...citationData.reviews].sort((a, b) => {
        const dateComparison = moment(b.reviewReceived, 'MM/DD/YYYY').diff(
          moment(a.reviewReceived, 'MM/DD/YYYY')
        );
        if (dateComparison !== 0) {
          return dateComparison;
        }

        return a.name.localeCompare(b.name);
      }),
    }));
}

export async function ttaByCitations(
  recipientId: number,
  regionId: number
): Promise<ITTAByCitationResponse[]> {
  const recipientGrants = await recipientGrantsByRecipientAndRegion(recipientId, regionId);
  const grantNumbers = recipientGrants.map((grant) => grant.number);
  if (grantNumbers.length === 0) {
    return [];
  }

  const citationsOnActivityReports = await aroCitationsByGrantNumbers(grantNumbers);

  return ttaByCitationsFromFactTables(
    recipientId,
    regionId,
    recipientGrants,
    citationsOnActivityReports
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
  const grant = grants[0]?.toJSON() || null;

  if (!grant) {
    // not an error, it's valid for there to be no findings for a grant
    // @ts-expect-error
    return null;
  }

  // since all the joins made in the query above are inner joins
  // we can count on the rest of this data being present
  const { monitoringReviewGrantees } = grant.grantNumberLink;

  // get the most recent review
  // - 1) first extract from the join tables
  const monitoringReviews = monitoringReviewGrantees.flatMap(
    (review: IMonitoringReviewGrantee) => review.monitoringReviewLink.monitoringReviews
  );

  // - 2) then sort to get the most recent
  const monitoringReview = monitoringReviews.reduce(
    (a: IMonitoringReview, b: IMonitoringReview) => {
      if (a.reportDeliveryDate > b.reportDeliveryDate) {
        return a;
      }
      return b;
    },
    monitoringReviews[0]
  );

  return {
    recipientId: grant.recipientId,
    regionId: grant.regionId,
    reviewStatus: monitoringReview.outcome,
    reviewDate: moment(monitoringReview.reportDeliveryDate).format('MM/DD/YYYY'),
    reviewType: monitoringReview.reviewType,
    grant: grant.number,
  };
}

export async function classScore({
  recipientId,
  grantNumber,
  regionId,
}: {
  recipientId: number;
  grantNumber: string;
  regionId: number;
}) {
  const score = await MonitoringClassSummary.findOne(
    {
      where: {
        grantNumber,
      },
      attributes: [
        'emotionalSupport',
        'classroomOrganization',
        'instructionalSupport',
        'reportDeliveryDate',
      ],
    },
    {
      raw: true,
    }
  );

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

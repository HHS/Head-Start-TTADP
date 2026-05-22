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
  ITTAByCitationResponse,
  ITTAByReviewResponse,
} from './types/monitoring';

const {
  Grant,
  MonitoringClassSummary,
  Citation,
  DeliveredReview,
  DeliveredReviewCitation,
  GrantCitation,
  GrantDeliveredReview,
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

export async function ttaByReviews(
  recipientId: number,
  regionId: number
): Promise<ITTAByReviewResponse[]> {
  const recipientGrants = await recipientGrantsByRecipientAndRegion(recipientId, regionId);
  const grantNumbers = recipientGrants.map((grant) => grant.number);
  if (grantNumbers.length === 0) {
    return [];
  }

  const citationsOnActivityReports = await aroCitationsByGrantNumbers(grantNumbers);

  return ttaByReviewsFromFactTables(recipientGrants, citationsOnActivityReports);
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
  review_name: string | null;
  report_delivery_date: string;
  outcome: string | null;
  review_status: string;
  grantDeliveredReviews?: { grantId: number }[];
}

interface IDeliveredReviewCitationRow {
  citationId: number;
  deliveredReviewId: number;
  deliveredReview: IDeliveredReviewRow;
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
  review_name?: string | null;
  report_delivery_date?: string;
  outcome?: string | null;
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

interface IDeliveredReviewDataRaw {
  id?: number;
  mrid?: number;
  review_uuid?: string;
  review_type?: string;
  review_name?: string | null;
  report_delivery_date?: string;
  outcome?: string | null;
}

interface IDeliveredReviewData {
  id: number;
  mrid: number;
  review_uuid: string;
  review_type: string;
  review_name: string | null;
  report_delivery_date: string;
  outcome: string | null;
}

interface IGrantDeliveredReviewFullRowRaw {
  grantId?: number;
  deliveredReviewId?: number;
  deliveredReview?: IDeliveredReviewDataRaw | IPlainable<IDeliveredReviewDataRaw> | null;
}

interface IGrantDeliveredReviewFullRow {
  grantId: number;
  deliveredReviewId: number;
  deliveredReview: IDeliveredReviewData;
}

interface IFactCitationForReviewRow {
  id: number;
  finding_uuid: string;
  citation: string;
  raw_status: string | null;
  calculated_status: string | null;
  raw_finding_type: string | null;
  calculated_finding_type: string | null;
  source_category: string | null;
  finding_deadline: string | null;
}

interface IDeliveredReviewCitationWithCitationRowRaw {
  deliveredReviewId?: number;
  citationId?: number;
  calculated_review_finding_type?: string | null;
  citation?:
    | Partial<IFactCitationForReviewRow>
    | IPlainable<Partial<IFactCitationForReviewRow>>
    | null;
}

interface IDeliveredReviewCitationWithCitationRow {
  deliveredReviewId: number;
  citationId: number;
  calculated_review_finding_type: string | null;
  citation: IFactCitationForReviewRow;
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
      review_name: optionalString(deliveredReview.review_name),
      report_delivery_date: deliveredReview.report_delivery_date,
      outcome: optionalString(deliveredReview.outcome),
      review_status: deliveredReview.review_status,
      grantDeliveredReviews,
    },
  };
}

function toGrantDeliveredReviewFullRow(
  value:
    | IGrantDeliveredReviewFullRowRaw
    | IPlainable<IGrantDeliveredReviewFullRowRaw>
    | null
    | undefined
): IGrantDeliveredReviewFullRow | null {
  const row = toPlainRecord<IGrantDeliveredReviewFullRowRaw>(value);
  const deliveredReview = toPlainRecord<IDeliveredReviewDataRaw>(row?.deliveredReview ?? null);

  if (
    !row ||
    !deliveredReview ||
    typeof row.grantId !== 'number' ||
    typeof row.deliveredReviewId !== 'number' ||
    typeof deliveredReview.id !== 'number' ||
    typeof deliveredReview.mrid !== 'number' ||
    typeof deliveredReview.review_uuid !== 'string' ||
    typeof deliveredReview.review_type !== 'string' ||
    typeof deliveredReview.report_delivery_date !== 'string'
  ) {
    return null;
  }

  return {
    grantId: row.grantId,
    deliveredReviewId: row.deliveredReviewId,
    deliveredReview: {
      id: deliveredReview.id,
      mrid: deliveredReview.mrid,
      review_uuid: deliveredReview.review_uuid,
      review_type: deliveredReview.review_type,
      review_name: optionalString(deliveredReview.review_name),
      report_delivery_date: deliveredReview.report_delivery_date,
      outcome: optionalString(deliveredReview.outcome),
    },
  };
}

function toDeliveredReviewCitationWithCitationRow(
  value:
    | IDeliveredReviewCitationWithCitationRowRaw
    | IPlainable<IDeliveredReviewCitationWithCitationRowRaw>
    | null
    | undefined
): IDeliveredReviewCitationWithCitationRow | null {
  const row = toPlainRecord<IDeliveredReviewCitationWithCitationRowRaw>(value);
  const citation = toPlainRecord<Partial<IFactCitationForReviewRow>>(row?.citation ?? null);

  if (
    !row ||
    !citation ||
    typeof row.deliveredReviewId !== 'number' ||
    typeof row.citationId !== 'number' ||
    typeof citation.id !== 'number' ||
    typeof citation.finding_uuid !== 'string' ||
    typeof citation.citation !== 'string'
  ) {
    return null;
  }

  return {
    deliveredReviewId: row.deliveredReviewId,
    citationId: row.citationId,
    calculated_review_finding_type: optionalString(row.calculated_review_finding_type),
    citation: {
      id: citation.id,
      finding_uuid: citation.finding_uuid,
      citation: citation.citation,
      raw_status: optionalString(citation.raw_status),
      calculated_status: optionalString(citation.calculated_status),
      raw_finding_type: optionalString(citation.raw_finding_type),
      calculated_finding_type: optionalString(citation.calculated_finding_type),
      source_category: optionalString(citation.source_category),
      finding_deadline: optionalString(citation.finding_deadline),
    },
  };
}

async function ttaByCitationsFromFactTables(
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
        findingType: citationData.calculated_finding_type || '',
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

  const citationGrantIds = new Map<number, Set<number>>();
  grantCitations.forEach((gc) => {
    const existing = citationGrantIds.get(gc.citationId) || new Set<number>();
    existing.add(gc.grantId);
    citationGrantIds.set(gc.citationId, existing);
  });

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
        attributes: [
          'id',
          'review_uuid',
          'review_type',
          'review_name',
          'report_delivery_date',
          'outcome',
          'review_status',
        ],
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

  const reviewGrantsByDeliveredReviewId = new Map<number, Set<number>>();
  deliveredReviewCitations.forEach(({ deliveredReview }) => {
    if (!deliveredReview) return;
    if (!reviewGrantsByDeliveredReviewId.has(deliveredReview.id)) {
      reviewGrantsByDeliveredReviewId.set(
        deliveredReview.id,
        new Set((deliveredReview.grantDeliveredReviews || []).map((gdr) => gdr.grantId))
      );
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

  const citationGrantMismatches: string[] = [];

  deliveredReviewCitations.forEach((deliveredReviewCitation) => {
    const citationData = citationsById.get(deliveredReviewCitation.citationId);
    const { deliveredReview } = deliveredReviewCitation;
    if (!citationData || !deliveredReview) {
      return;
    }

    const citationGrants =
      citationGrantIds.get(deliveredReviewCitation.citationId) || new Set<number>();
    const reviewGrants =
      reviewGrantsByDeliveredReviewId.get(deliveredReview.id) || new Set<number>();
    if (![...citationGrants].some((grantId) => reviewGrants.has(grantId))) {
      citationGrantMismatches.push(
        `  citationId=${deliveredReviewCitation.citationId} (grants [${[...citationGrants].map((id) => grantNumberById.get(id) ?? String(id))}]) / review "${deliveredReview.review_name}" (grants [${[...reviewGrants].map((id) => grantNumberById.get(id) ?? String(id))}])`
      );
      return;
    }

    const reviewName = deliveredReview.review_name || '';

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
      reviewType: deliveredReview.review_type,
      reviewReceived: moment(deliveredReview.report_delivery_date, 'YYYY-MM-DD').format(
        'MM/DD/YYYY'
      ),
      outcome: deliveredReview.outcome || '',
      specialists,
      objectives,
    });
  });

  if (citationGrantMismatches.length > 0) {
    auditLogger.warn(
      `ttaByCitationsFromFactTables: ${citationGrantMismatches.length} citation/review pair(s) skipped — no grant overlap:\n${citationGrantMismatches.join('\n')}`
    );
  }

  return [...citationsById.values()]
    .filter((citationData) => citationData.reviews.length > 0)
    .sort((a, b) => a.citationNumber.localeCompare(b.citationNumber))
    .map((citationData) => ({
      citationId: citationData.citationId,
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

async function ttaByReviewsFromFactTables(
  recipientGrants: { id: number; number: string }[],
  citationsOnActivityReports: ActivityReportObjectiveCitationResponse[]
): Promise<ITTAByReviewResponse[]> {
  if (recipientGrants.length === 0) {
    return [];
  }

  const grantNumberById = new Map<number, string>(recipientGrants.map((gr) => [gr.id, gr.number]));
  const grantIds = recipientGrants.map((gr) => gr.id);

  const grantDeliveredReviewModels = await GrantDeliveredReview.findAll({
    attributes: ['grantId', 'deliveredReviewId'],
    where: {
      grantId: grantIds,
    },
    include: [
      {
        model: DeliveredReview,
        as: 'deliveredReview',
        required: true,
        attributes: [
          'id',
          'mrid',
          'review_uuid',
          'review_type',
          'review_name',
          'report_delivery_date',
          'outcome',
        ],
        where: {
          review_status: REVIEW_STATUS_COMPLETE,
          report_delivery_date: {
            [Op.gte]: MIN_DELIVERY_DATE,
          },
        },
      },
    ],
  });

  const grantDeliveredReviews = grantDeliveredReviewModels
    .map((gdr) => toGrantDeliveredReviewFullRow(gdr))
    .filter((gdr): gdr is IGrantDeliveredReviewFullRow => !!gdr);

  if (grantDeliveredReviews.length === 0) {
    return [];
  }

  const deliveredReviewById = new Map<number, IDeliveredReviewData>();
  const grantNumbersByDeliveredReviewId = new Map<number, string[]>();

  grantDeliveredReviews.forEach((gdr) => {
    const grantNumber = grantNumberById.get(gdr.grantId);
    if (!grantNumber) {
      return;
    }
    const { id } = gdr.deliveredReview;
    if (!deliveredReviewById.has(id)) {
      deliveredReviewById.set(id, gdr.deliveredReview);
      grantNumbersByDeliveredReviewId.set(id, []);
    }
    const grants = grantNumbersByDeliveredReviewId.get(id);
    if (grants && !grants.includes(grantNumber)) {
      grants.push(grantNumber);
    }
  });

  const deliveredReviewIds = [...deliveredReviewById.keys()];

  const deliveredReviewCitationModels = await DeliveredReviewCitation.findAll({
    attributes: ['deliveredReviewId', 'citationId', 'calculated_review_finding_type'],
    where: {
      deliveredReviewId: deliveredReviewIds,
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
          'finding_deadline',
        ],
      },
    ],
  });

  const citationsByDeliveredReviewId = new Map<number, IDeliveredReviewCitationWithCitationRow[]>();
  deliveredReviewCitationModels.forEach((model) => {
    const row = toDeliveredReviewCitationWithCitationRow(model);
    if (!row) {
      return;
    }
    const existing = citationsByDeliveredReviewId.get(row.deliveredReviewId) || [];
    existing.push(row);
    citationsByDeliveredReviewId.set(row.deliveredReviewId, existing);
  });

  const reviewGrantIdMap = new Map<number, Set<number>>();
  grantDeliveredReviews.forEach((gdr) => {
    const existing = reviewGrantIdMap.get(gdr.deliveredReviewId) || new Set<number>();
    existing.add(gdr.grantId);
    reviewGrantIdMap.set(gdr.deliveredReviewId, existing);
  });

  const allCitationIds = uniq(
    [...citationsByDeliveredReviewId.values()].flatMap((rows) => rows.map((r) => r.citationId))
  );
  const citationGrantIdMap = new Map<number, Set<number>>();
  if (allCitationIds.length > 0) {
    const grantCitationModels = await GrantCitation.findAll({
      attributes: ['grantId', 'citationId'],
      where: { citationId: allCitationIds, grantId: grantIds },
    });
    grantCitationModels.forEach((model: any) => {
      const row = toPlainRecord<{ grantId?: number; citationId?: number }>(model);
      if (row && typeof row.citationId === 'number' && typeof row.grantId === 'number') {
        const existing = citationGrantIdMap.get(row.citationId) || new Set<number>();
        existing.add(row.grantId);
        citationGrantIdMap.set(row.citationId, existing);
      }
    });
  }

  const objectivesByFindingId = new Map<string, ActivityReportObjectiveCitationResponse[]>();
  citationsOnActivityReports.forEach((objective) => {
    uniq(objective.findingIds).forEach((findingId) => {
      const existing = objectivesByFindingId.get(findingId) || [];
      existing.push(objective);
      objectivesByFindingId.set(findingId, existing);
    });
  });

  const reviews: ITTAByReviewResponse[] = [];
  const reviewGrantMismatches: string[] = [];

  for (const [deliveredReviewId, deliveredReview] of deliveredReviewById.entries()) {
    const grants = grantNumbersByDeliveredReviewId.get(deliveredReviewId) || [];
    const drcRows = citationsByDeliveredReviewId.get(deliveredReviewId) || [];

    let lastTTADateMoment: moment.Moment | null = null;
    const allSpecialists: { name: string; roles: string[] }[] = [];

    const findings = drcRows.flatMap((drc) => {
      const citationGrants = citationGrantIdMap.get(drc.citationId) || new Set<number>();
      const reviewGrants = reviewGrantIdMap.get(deliveredReviewId) || new Set<number>();
      if (![...citationGrants].some((grantId) => reviewGrants.has(grantId))) {
        reviewGrantMismatches.push(
          `  citationId=${drc.citationId} (grants [${[...citationGrants].map((id) => grantNumberById.get(id) ?? id)}]) / review "${deliveredReview.review_name}" (grants [${grants}])`
        );
        return [];
      }

      const { citation } = drc;
      const objectives = objectivesByFindingId.get(citation.finding_uuid) || [];

      objectives.forEach(({ endDate, specialists }) => {
        const date = moment(endDate, 'MM/DD/YYYY');
        if (!lastTTADateMoment || date.isAfter(lastTTADateMoment)) {
          lastTTADateMoment = date;
        }
        allSpecialists.push(...specialists);
      });

      return [
        {
          citation: citation.citation,
          status: citation.calculated_status || citation.raw_status || '',
          findingType: drc.calculated_review_finding_type || citation.raw_finding_type || '',
          correctionDeadline: citation.finding_deadline
            ? moment(citation.finding_deadline, 'YYYY-MM-DD').format('MM/DD/YYYY')
            : '',
          category: citation.source_category || '',
          objectives,
        },
      ];
    });

    reviews.push({
      id: deliveredReview.mrid,
      name: deliveredReview.review_name || '',
      reviewType: deliveredReview.review_type,
      reviewReceived: moment(deliveredReview.report_delivery_date, 'YYYY-MM-DD').format(
        'MM/DD/YYYY'
      ),
      outcome: deliveredReview.outcome || '',
      grants: [...grants].sort(),
      lastTTADate: lastTTADateMoment
        ? (lastTTADateMoment as moment.Moment).format('MM/DD/YYYY')
        : '',
      specialists: uniqBy(allSpecialists, 'name'),
      findings,
    });
  }

  if (reviewGrantMismatches.length > 0) {
    auditLogger.warn(
      `ttaByReviewsFromFactTables: ${reviewGrantMismatches.length} citation/review pair(s) skipped — no grant overlap:\n${reviewGrantMismatches.join('\n')}`
    );
  }

  return reviews.sort((a, b) =>
    moment(b.reviewReceived, 'MM/DD/YYYY').diff(moment(a.reviewReceived, 'MM/DD/YYYY'))
  );
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

  return ttaByCitationsFromFactTables(recipientGrants, citationsOnActivityReports);
}

export async function monitoringData({
  recipientId,
  regionId,
  grantNumber,
}: {
  recipientId: number;
  regionId: number;
  grantNumber: string;
}): Promise<IMonitoringResponse | null> {
  const grant = await Grant.unscoped().findOne({
    subQuery: false,
    attributes: ['id', 'recipientId', 'regionId', 'number'],
    where: { number: grantNumber, recipientId, regionId },
    include: [
      {
        model: GrantDeliveredReview,
        as: 'grantDeliveredReviews',
        required: true,
        include: [
          {
            model: DeliveredReview,
            as: 'deliveredReview',
            required: true,
            attributes: ['review_type', 'outcome', 'report_delivery_date'],
          },
        ],
      },
    ],
  });

  if (!grant) {
    // not an error, it's valid for there to be no findings for a grant
    return null;
  }

  const grantJson = grant.toJSON();

  // Pick the most recent delivered review across all GrantDeliveredReview rows
  const deliveredReviews = grantJson.grantDeliveredReviews.map(
    (gdr: {
      deliveredReview: { review_type: string; outcome: string; report_delivery_date: string };
    }) => gdr.deliveredReview
  );

  const latestReview = deliveredReviews.reduce(
    (
      a: { review_type: string; outcome: string; report_delivery_date: string },
      b: { review_type: string; outcome: string; report_delivery_date: string }
    ) => (a.report_delivery_date >= b.report_delivery_date ? a : b)
  );

  return {
    recipientId: grantJson.recipientId,
    regionId: grantJson.regionId,
    reviewStatus: latestReview.outcome,
    reviewDate: moment(latestReview.report_delivery_date).format('MM/DD/YYYY'),
    reviewType: latestReview.review_type,
    grant: grantJson.number,
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

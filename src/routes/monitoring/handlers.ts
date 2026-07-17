import { Stringifier } from 'csv-stringify';
import type { Request, Response } from 'express';
import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';
import { setReadRegions } from '../../services/accessValidation';
import compliantFollowUpReviewsDetails from '../../services/compliantFollowUpReviewsDetails';
import { currentUserId } from '../../services/currentUser';
import {
  classScore,
  monitoringData,
  ttaByCitations,
  ttaByReviews,
} from '../../services/monitoring';
import { monitoringTtaCsvGenerator } from '../../widgets/monitoring/monitoringTta';
import { checkRecipientAccessAndExistence } from '../utils';
import { onlyAllowedKeys } from '../widgets/utils';

const namespace = 'SERVICE:MONITORING';

const logContext = {
  namespace,
};

const COMPLIANT_FOLLOW_UP_CSV_COLUMNS = [
  { key: 'compliantFollowUpReview', header: 'Compliant follow-up review' },
  { key: 'recipient', header: 'Recipient' },
  { key: 'grantsOnReview', header: 'Grants on review' },
  { key: 'citationNumber', header: 'Citation number' },
  { key: 'hadTta', header: 'Had TTA' },
  { key: 'lastTta', header: 'Last TTA' },
  { key: 'activityReports', header: 'Activity reports' },
  {
    key: 'compliantFollowUpReviewReceivedDate',
    header: 'Compliant follow-up review received date',
  },
  { key: 'initialReviewReceivedDate', header: 'Initial review received date' },
  { key: 'initialReview', header: 'Initial review' },
];

function isCsvFormatRequest(format: unknown) {
  if (Array.isArray(format)) {
    return format.some((value) => String(value).toLowerCase() === 'csv');
  }

  return String(format || '').toLowerCase() === 'csv';
}

function formatArrayValue(value: unknown) {
  if (!Array.isArray(value) || !value.length) {
    return '';
  }

  return value.join(', ');
}

function formatActivityReportsForCsv(activityReports: unknown, regionId: unknown) {
  if (!Array.isArray(activityReports) || !activityReports.length) {
    return '';
  }

  const formattedRegionId =
    regionId !== undefined && regionId !== null && String(regionId) !== ''
      ? String(regionId).padStart(2, '0')
      : '';

  return activityReports
    .map((report) => {
      const reportId =
        report && typeof report === 'object' ? (report as { id?: unknown }).id : report;

      if (reportId === undefined || reportId === null || String(reportId) === '') {
        return null;
      }

      return formattedRegionId ? `R${formattedRegionId}-AR-${reportId}` : String(reportId);
    })
    .filter(Boolean)
    .join(', ');
}

function toCompliantFollowUpCsvRow(detail: Record<string, unknown>) {
  return {
    compliantFollowUpReview: detail.id || '',
    recipient: detail.recipientName || '',
    grantsOnReview: formatArrayValue(detail.grantsOnReview),
    citationNumber: formatArrayValue(detail.citationNumbers),
    hadTta: detail.hasTta ? 'Yes' : 'No',
    lastTta: detail.lastTtaDate || '',
    activityReports: formatActivityReportsForCsv(detail.associatedActivityReports, detail.regionId),
    compliantFollowUpReviewReceivedDate: detail.compliantFollowUpReviewReceivedDate || '',
    initialReviewReceivedDate: detail.initialReviewReceivedDate || '',
    initialReview: detail.initialReviewName || detail.initialReviewId || '',
  };
}

export async function getMonitoringRelatedTtaCsv(req: Request, res: Response) {
  try {
    // This block filters down the query to only the user's allowed regions
    const userId = await currentUserId(req, res);
    const query = await setReadRegions(req.query, userId);

    const scopes = await filtersToScopes(query, {
      grant: { subset: true },
      userId,
    });
    // filter out any disallowed keys
    const queryWithFilteredKeys = onlyAllowedKeys(query);

    const columns = [
      { key: 'recipientName', header: 'Recipient Name' },
      { key: 'citation', header: 'Citation number' },
      { key: 'status', header: 'Current status' },
      { key: 'findingType', header: 'Finding type' },
      { key: 'category', header: 'Finding category' },
      { key: 'grantNumbers', header: 'Grants cited' },
      { key: 'lastTTADate', header: 'Last TTA' },
    ];

    const stringifier = new Stringifier({
      header: true,
      quoted: true,
      quoted_empty: true,
      columns,
    });

    res.attachment('monitoring-related-tta.csv');
    stringifier.pipe(res);

    try {
      for await (const row of monitoringTtaCsvGenerator(scopes, queryWithFilteredKeys)) {
        stringifier.write(row);
      }
      stringifier.end();
    } catch (streamError) {
      stringifier.destroy(streamError as Error);
      if (!res.headersSent) {
        await handleErrors(req, res, streamError, logContext);
      }
    }
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getCompliantFollowUpReviewsDetails(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    const query = await setReadRegions(req.query, userId);
    const queryWithFilteredKeys = onlyAllowedKeys(query);

    const scopes = await filtersToScopes(queryWithFilteredKeys, {
      grant: { subset: true },
      userId,
    });

    const details = await compliantFollowUpReviewsDetails(scopes);

    if (isCsvFormatRequest(req.query.format)) {
      const stringifier = new Stringifier({
        header: true,
        quoted: true,
        quoted_empty: true,
        columns: COMPLIANT_FOLLOW_UP_CSV_COLUMNS,
      });

      res.attachment('compliant-follow-up-reviews.csv');
      stringifier.pipe(res);

      details.forEach((detail) => {
        stringifier.write(toCompliantFollowUpCsvRow(detail as Record<string, unknown>));
      });

      stringifier.end();
      return;
    }

    res.status(200).json(details);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getTtaByReview(req: Request, res: Response) {
  const { recipientId, regionId } = req.params;

  try {
    await checkRecipientAccessAndExistence(req, res);
    const data = await ttaByReviews(Number(recipientId), Number(regionId));

    res.status(200).json(data);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getTtaByCitation(req: Request, res: Response) {
  const { recipientId, regionId } = req.params;

  try {
    await checkRecipientAccessAndExistence(req, res);
    const data = await ttaByCitations(Number(recipientId), Number(regionId));

    res.status(200).json(data);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getMonitoringData(req: Request, res: Response) {
  const { recipientId, grantNumber, regionId } = req.params;

  try {
    await checkRecipientAccessAndExistence(req, res);
    const data = await monitoringData({
      recipientId: Number(recipientId),
      grantNumber: String(grantNumber),
      regionId: Number(regionId),
    });

    res.status(200).json(data);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getClassScore(req: Request, res: Response) {
  const { recipientId, grantNumber, regionId } = req.params;

  try {
    await checkRecipientAccessAndExistence(req, res);
    const data = await classScore({
      recipientId: Number(recipientId),
      grantNumber: String(grantNumber),
      regionId: Number(regionId),
    });

    res.status(200).json(data);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

import { Stringifier } from 'csv-stringify';
import type { Request, Response } from 'express';
import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';
import { setReadRegions } from '../../services/accessValidation';
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

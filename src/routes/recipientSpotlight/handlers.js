/* eslint-disable import/prefer-default-export */
import { DECIMAL_BASE } from '@ttahub/common';
import stringify from 'csv-stringify/lib/sync';
import moment from 'moment';
import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';
import { setReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import { getRecipientSpotlightIndicators } from '../../services/recipientSpotlight';
import { extractFilterArray } from './helpers';

const namespace = 'SERVICE:RECIPIENT_SPOTLIGHT';

const logContext = {
  namespace,
};

// CSV export column definitions. The first three are the recipient identity
// columns, followed by the seven priority indicators (DRS is intentionally
// excluded — it is hidden in the UI and only returned as a placeholder).
const CSV_COLUMNS = [
  { key: 'recipientName', header: 'Recipient name' },
  { key: 'regionId', header: 'Region' },
  { key: 'lastTTA', header: 'Last TTA' },
  { key: 'childIncidents', header: 'Child incidents' },
  { key: 'deficiency', header: 'Deficiency' },
  { key: 'FEI', header: 'FEI' },
  { key: 'newRecipients', header: 'New recipient' },
  { key: 'newStaff', header: 'New staff' },
  { key: 'noTTA', header: 'No TTA' },
  { key: 'underenrolled', header: 'Underenrolled' },
];

const INDICATOR_KEYS = [
  'childIncidents',
  'deficiency',
  'FEI',
  'newRecipients',
  'newStaff',
  'noTTA',
  'underenrolled',
];

// Prevent CSV formula injection by prefixing values that Excel/Sheets would
// otherwise evaluate as a formula with a single quote.
function sanitizeCsvValue(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function formatLastTTAForCsv(lastTTA) {
  if (!lastTTA) {
    return '';
  }
  const date = moment(lastTTA, 'YYYY-MM-DD', true);
  return date.isValid() ? date.format('MM/DD/YYYY') : '';
}

function recipientToCsvRecord(recipient) {
  const record = {
    recipientName: sanitizeCsvValue(recipient.recipientName || ''),
    regionId: recipient.regionId,
    lastTTA: formatLastTTAForCsv(recipient.lastTTA),
  };
  INDICATOR_KEYS.forEach((key) => {
    record[key] = recipient[key] ? 'Yes' : 'No';
  });
  return record;
}

/*
getRecipientSpotLight():
 Get the recipient spotlights (indicators) for a region,
 the recipient param is optional and if not defined will return all
 recipients in that region.
 When `format=csv` is supplied, the full (unpaginated) result set is
 returned as a downloadable CSV file instead of JSON.
*/
export async function getRecipientSpotLight(req, res) {
  try {
    const {
      sortBy,
      direction,
      offset,
      limit,
      format,
      mustHaveIndicators: rawMustHaveIndicators,
    } = req.query;
    const mustHaveIndicators = rawMustHaveIndicators === 'true';
    const isCsv = format === 'csv';

    // Parse pagination params to integers. For CSV exports we return every row
    // that matches the current filters/sort, so pagination is bypassed.
    const parsedOffset = isCsv || !offset ? 0 : parseInt(offset, DECIMAL_BASE);
    let parsedLimit = null;
    if (!isCsv) {
      parsedLimit = limit ? parseInt(limit, DECIMAL_BASE) : 10;
    }

    // Parse and validate parsedGrantId to prevent SQL injection;
    // treat missing or non-numeric values as null
    const rawGrantId = req.query.parsedGrantId;
    const parsedGrantId = rawGrantId ? parseInt(rawGrantId, DECIMAL_BASE) : null;

    const userId = await currentUserId(req, res);

    // Normalize region.in[] to region.in for setReadRegions compatibility
    const regionValues = extractFilterArray(req.query, 'region', 'in');
    const normalizedQuery = {
      ...req.query,
      'region.in': regionValues.length > 0 ? regionValues : undefined,
    };
    // Remove bracket key to avoid confusion
    delete normalizedQuery['region.in[]'];

    // Use setReadRegions to filter/default regions (matches widgets pattern)
    const updatedQuery = await setReadRegions(normalizedQuery, userId);
    const regionsArray = updatedQuery['region.in'].map((r) => r.toString());

    const scopes = await filtersToScopes(updatedQuery, { userId });

    const indicatorsToInclude = extractFilterArray(req.query, 'priorityIndicator', 'in');
    const indicatorsToExclude = extractFilterArray(req.query, 'priorityIndicator', 'nin');
    const recipientSpotlightData = await getRecipientSpotlightIndicators(
      scopes,
      sortBy,
      direction,
      parsedOffset,
      parsedLimit,
      regionsArray,
      indicatorsToInclude,
      indicatorsToExclude,
      parsedGrantId,
      mustHaveIndicators
    );
    if (!recipientSpotlightData) {
      res.sendStatus(404);
      return;
    }

    if (isCsv) {
      const records = (recipientSpotlightData.recipients || []).map(recipientToCsvRecord);
      const csv = stringify(records, {
        header: true,
        columns: CSV_COLUMNS,
        quoted: true,
        quoted_empty: true,
      });
      res.attachment('recipient-spotlight.csv');
      res.type('text/csv');
      // Prepend a BOM so Excel opens UTF-8 content correctly.
      res.send(`\ufeff${csv}`);
      return;
    }

    res.json(recipientSpotlightData);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

import parse from 'csv-parse/lib/sync';
import fs from 'fs';
import path from 'path';

import { logger } from '../logger';
import { Grant, ActivityRecipient } from '../models';

const PRIMARY_COLUMN = 'Primary Column';
const REPORT_ID_COLUMN = 'Report ID';
const GRANTEE_NAME_COLUMN = 'Grantee Name';

function missingActivityRecipientsFromCSV(filename, grantsByNumber) {
  const csv = fs.readFileSync(path.resolve(__dirname, filename));
  const parsedCSV = parse(csv, { skipEmptyLines: true, columns: true });

  const activityRecipients = [];

  parsedCSV.forEach((row) => {
    const activityReportId = row[PRIMARY_COLUMN];
    const reportDisplayId = row[REPORT_ID_COLUMN];
    const grantee = row[GRANTEE_NAME_COLUMN];

    const grantNumber = grantee.split('|')[1].trim();
    const grantId = grantsByNumber[grantNumber];

    if (!grantId) {
      logger.warn(`Unable to find grant ${grantee} (number ${grantNumber}) for report ${reportDisplayId} (id ${activityReportId})`);
    } else {
      activityRecipients.push({
        activityReportId,
        grantId,
      });
    }
  });

  return activityRecipients;
}

export default async function addMissingGrantsToReports(filename) {
  const grants = await Grant.findAll({
    attributes: ['number', 'id'],
    raw: true,
  });
  const grantsByNumber = {};
  grants.forEach((grant) => {
    grantsByNumber[grant.number] = grant.id;
  });

  const missingRecipients = missingActivityRecipientsFromCSV(filename, grantsByNumber);
  return ActivityRecipient.bulkCreate(missingRecipients, { ignoreDuplicates: true });
}

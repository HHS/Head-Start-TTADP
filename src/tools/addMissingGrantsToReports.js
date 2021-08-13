import parse from 'csv-parse/lib/sync';
import fs from 'fs';
import path from 'path';
import { union } from 'lodash';

import { ActivityReport } from '../models';

const PRIMARY_COLUMN = 'Primary Column';
const GRANTEE_NAME_COLUMN = 'Grantee Name';

function missingActivityRecipientsFromCSV(filename) {
  const csv = fs.readFileSync(path.resolve(__dirname, filename));
  const parsedCSV = parse(csv, { skipEmptyLines: true, columns: true });

  const activityRecipients = {};

  parsedCSV.forEach((row) => {
    const activityReportId = row[PRIMARY_COLUMN];
    const grantee = row[GRANTEE_NAME_COLUMN];

    if (!(activityReportId in activityRecipients)) {
      activityRecipients[activityReportId] = [];
    }

    activityRecipients[activityReportId].push(grantee);
  });

  return activityRecipients;
}

export default async function addMissingGrantsToReports(filename) {
  const missingRecipients = missingActivityRecipientsFromCSV(filename);
  const reportIds = Object.keys(missingRecipients);
  const reports = await ActivityReport.findAll({
    where: { id: reportIds },
  });

  const updates = reports.map((report) => {
    const { granteeName = '' } = report.imported;
    const oldNames = granteeName.split('\n');

    const newGranteeNames = missingRecipients[report.id.toString()];
    // filter removes empty strings
    const allNames = union(oldNames, newGranteeNames).filter((name) => name);
    const updatedGranteeName = allNames.join('\n');
    return report.update({ imported: { ...report.imported, granteeName: updatedGranteeName } });
  });

  await Promise.all(updates);
}

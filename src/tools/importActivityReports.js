/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import { readFileSync } from 'fs';
import path from 'path';
import parse from 'csv-parse/lib/sync';
import moment from 'moment';
import {
  ActivityReport,
} from '../models';
import { REPORT_STATUSES } from '../constants';

/*
## Import Notes

- replace R14 with the proper region (R14 was a test region)

## SS Field Notes

- additional-notes-for-this-activity:
- cdi-grantee-name: Empty/Unused?
- context-for-this-activity:
- created:
- created-by:
- duration:
- end-date:
- format:
- goal-1:
- goal-2:
- grantee-follow-up-tasks-&-objectives:
- grantee-name:
- grantee-participants:
- grantees-learning-level-goal-1:
- grantees-learning-level-goal-2:
- grantees-learning-level-goal2: R5 has a typo
- manager:
- manager-approval:
- modified:
- modified-by:
- multi-grantee-activities:
- multi-program-activities:
- non-grantee:
- non-grantee-activity:
- non-grantee-participants:
- non-ohs-resources: 'nonECLKCResourcesUsed'
- number-of-participants:
- objective-1.1:
- objective-1.1-status:
- objective-1.2-status:
- objective-2.1:
- objective-2.1-status:
- objective-2.2:
- objective-2.2-status:
- objectve-1.2:
- other-specialists:
- other-topics:
- override-created-by : Only exists in R5
- participants : Only exists in R6
- program-type:
- reason/s:
- reportid:
- resources-used:
- source-of-request: 'requester'
- specialist-follow-up-tasks-&-objectives:
- start-date:
- t-ta:
- target-populations:
- topics:
- tta-provided-and-grantee-progress-made:

## Relational Fields

### Fields that would map to Users
- created-by: 'author'
- modified-by: 'lastUpdatedBy'
- manager: 'approvingManager'
- null: 'collaborators' // NOTE: "Other specialists"?
// NOTE: "Grantee Name", but maybe also "Non-Grantee Activity"
- grantee-name: 'activityRecipients'

### Other relational fields
- null: 'regionId' // NOTE: Take number from sheet name. R14 should be remapped
- null: 'attachments' // FIXME: How to get attachments from smarthub?
- 'specialist-follow-up-tasks-&-objectives': 'specialistNextSteps'
- 'grantee-follow-up-tasks-&-objectives': 'granteeNextSteps'
- 'goal-1': 'goals'
- 'goal-2': 'goals'

 */

const wordSeperatorRE = /-?\s+-?/g;
const columnCleanupRE = /(\s?\(.*\)|:|')+/g;
const decimalRE = /^\d+(\.\d*)?$/;
const invalidRegionRE = /R14/;
const regionRE = /^R(?<regionId>\d{1,2})/i; // Used against filepaths
const mdyDateRE = /^\d{1,2}\/\d{1,2}\/(\d{2}|\d{4})$/;
const mdyFormat = 'MM/DD/YYYY';

function readCsv(file) {
  const csv = readFileSync(file);
  return parse(csv, { skipEmptyLines: true, columns: true });
}

// Headers need to be uniform across sheets if we are to import
function normalizeKey(k) {
  let value = k.trim();
  // Remove parentheticals, colons
  value = value.replace(columnCleanupRE, '');
  // Replace spaces or spaces plus hyphens with single hyphens
  value = value.replace(wordSeperatorRE, '-');
  // lowercase values
  value = value.toLowerCase();

  return value;
}

function getValue(data, key) {
  if (({}).hasOwnProperty.call(data, key)) {
    return data[key];
  }
  return null;
}

function normalizeData(row) {
  const data = Object.create(null);
  Object.entries(row).forEach(([key, value]) => {
    const lookupKey = normalizeKey(key);
    data[lookupKey] = value;
  });
  return data;
}

function coerceDuration(value) {
  if (!value) return null;
  const match = value.trim().match(decimalRE);
  if (match) {
    return match[0].trim();
  }
  return null;
}

function coerceToArray(value) {
  if (!value) return [];
  return value.split('\n').filter((x) => x);
}

function coerceStatus(value) {
  if (!value) return null;
  const status = value.toLowerCase()
    .trim()
    .replace(/\s/g, '_');
  const statusMatch = Object.values(REPORT_STATUSES).includes(status);
  if (statusMatch) {
    return status;
  }
  return null;
}

function coerceDate(value) {
  if (!value) return null;
  let fmt;
  if (mdyDateRE.test(value.trim())) {
    fmt = mdyFormat;
  }
  return moment(value, fmt);
}

function coerceInt(value) {
  if (!value) return null;
  if (decimalRE.test(value)) {
    return parseInt(value, 10);
  }
  return null;
}

function coerceReportId(value, region) {
  if (!value) return null;
  // R14 is a test region, and shouldn't be used in actual reportIds
  return value.replace(invalidRegionRE, `R${region}`);
}

export default async function importActivityReports(file) {
  const csvFile = readCsv(file);
  const { name: fileName } = path.parse(file);
  const regionMatch = regionRE.exec(fileName);
  const { groups: { regionId: fileRegion } } = regionMatch;
  const fileRegionId = coerceInt(fileRegion);

  const activityReportRecords = [];
  for await (const row of csvFile) {
    const data = normalizeData(row);

    console.log(Object.keys(data));

    const reportId = coerceReportId(getValue(data, 'reportid'), fileRegionId);
    // Ignore rows with no reportid
    if (reportId) {
      const granteeActivity = getValue(data, 'grantee-activity');
      const activityRecipientType = granteeActivity ? 'grantee' : 'non-grantee';

      // Coerce values into appropriate data type
      const status = coerceStatus(getValue(data, 'manager-approval'));
      const duration = coerceDuration(getValue(data, 'duration'));
      const numberOfParticipants = coerceInt(getValue(data, 'number-of-participants'));

      const programTypes = coerceToArray(getValue(data, 'program-type')); // FIXME: Check this key
      const targetPopulations = coerceToArray(getValue(data, 'target-populations'));
      const reason = coerceToArray(getValue(data, 'reason/s'));
      const participants = coerceToArray(getValue(data, 'grantee-participants'))
        .concat(coerceToArray(getValue(data, 'non-grantee-participants')));
      const topics = coerceToArray(getValue(data, 'topics'));
      const ttaType = coerceToArray(getValue(data, 't-ta'));

      const startDate = coerceDate(getValue(data, 'start-date'));
      const endDate = coerceDate(getValue(data, 'end-date'));

      const arRecord = {
        imported: data, // Store all the data in `imported` for later reuse
        legacyId: reportId,
        regionId: fileRegionId,
        deliveryMethod: getValue(data, 'format'), // FIXME: Check records like 'R01-AR-000135'
        ECLKCResourcesUsed: coerceToArray(getValue(data, 'resources-used')),
        nonECLKCResourcesUsed: coerceToArray(getValue(data, 'non-ohs-resources')),
        duration, // Decimal
        startDate,
        endDate,
        activityRecipientType,
        requester: getValue(data, 'source-of-request'), // 'Grantee' or 'Regional Office'
        programTypes, // Array of strings
        targetPopulations, // Array of strings
        reason, // Array of strings
        numberOfParticipants, // Integer
        participants, // Array of strings
        topics, // Array of strings
        context: getValue(data, 'context-for-this-activity'),
        // managerNotes: ??? // TODO: Are these smartsheet comments (which appear in a separate sheet and don't get converted)
        additionalNotes: getValue(data, 'additional-notes-for-this-activity'),
        status, // Enum restriction: REPORT_STATUSES
        ttaType, // Array of strings
        createdAt: getValue(data, 'created'), // DATE
        updatedAt: getValue(data, 'modified'), // DATE
      };
      activityReportRecords.push(arRecord);
    }
  }

  ActivityReport.bulkCreate(activityReportRecords, { validate: false });
}

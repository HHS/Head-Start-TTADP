/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import { readFileSync } from 'fs';
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
- non-ohs-resources:
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
- source-of-request: ???
- specialist-follow-up-tasks-&-objectives:
- start-date:
- t-ta:
- target-populations:
- topics:
- tta-provided-and-grantee-progress-made:

const relationalFieldMap = new Map([
  ['created-by', 'author'],
  ['modified-by', 'lastUpdatedBy'],
  ['manager', 'approvingManager'],
  [null, 'activityRecipients'], // FIXME: "Grantee Name"?
  [null, 'collaborators'], // FIXME: "Other specialists"? Those are names/emails, many with '.org' addresses
  [null, 'region'], // NOTE: Take number from reportID and/or sheet name. R14 should be remapped
  [null, 'attachments'], // FIXME: How to get attachments from smarthub?
  ['non-ohs-resources', 'otherResources'],
  ['specialist-follow-up-tasks-&-objectives', 'specialistNextSteps'],
  ['grantee-follow-up-tasks-&-objectives', 'granteeNextSteps'],
  ['goal-1', 'goals'],
  ['goal-2', 'goals'],
]);

 */

function readCsv(file) {
  const csv = readFileSync(file);
  return parse(csv, { skipEmptyLines: true, columns: true });
}

// Headers need to be uniform across sheets if we are to import
function normalizeKey(k) {
  let value = k.trim();
  // Remove parentheticals, colons
  value = value.replace(/(\s?\(.*\)|:|')+/g, '');
  // Replace spaces or spaces plus hyphens with single hyphens
  value = value.replace(/-?\s+-?/g, '-');
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
  const match = /\d+(\.\d+)?/g.exec(value);
  if (match) {
    return match[0].trim();
  }
  return null;
}

function coerceToArray(value) {
  if (!value) return [];
  return value.split('\n');
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
  return moment(value, 'MM/DD/YY');
}

function coerceReportId(value, region) {
  if (!value) return null;
  // R14 is a test region, and shouldn't be used in actual reportIds
  return value.replace(/R14/, `R${region}`);
}

export default async function importActivityReports(file) {
  const csvFile = readCsv(file);
  const regionMatch = file.match(/R(\d+)/);
  const fileRegion = regionMatch ? regionMatch[1] : null;

  const recordResults = [];
  for await (const row of csvFile) {
    const data = normalizeData(row);

    const reportId = coerceReportId(getValue(data, 'reportid'));
    // Ignore rows with no reportid
    if (reportId) {
      const granteeActivity = getValue(data, 'grantee-activity');
      const activityRecipientType = granteeActivity ? 'grantee' : 'non-grantee';

      // Coerce values into appropriate data type
      const status = coerceStatus(getValue(data, 'manager-approval'));
      const duration = coerceDuration(getValue(data, 'duration'));
      const programTypes = coerceToArray(getValue(data, 'program-types'));
      const targetPopulations = coerceToArray(getValue(data, 'target-populations'));
      const reason = coerceToArray(getValue(data, 'reason/s'));
      const participants = coerceToArray(getValue(data, 'grantee-participants'))
        .concat(coerceToArray(getValue(data, 'non-grantee-participants')));
      const topics = coerceToArray(getValue(data, 'topics'));
      const ttaType = coerceToArray(getValue(data, 't-ta'));
      const startDate = coerceDate(getValue(data, 'start-date'));
      const endDate = coerceDate(getValue(data, 'end-date'));

      const ar = ActivityReport.build({
        imported: data, // Store all the data in `imported` for later reuse
        legacyId: reportId,
        regionId: fileRegion,
        deliveryMethod: getValue(data, 'format'),
        // approvingManagerId: ,
        // resourcesUsed: getValue(data, 'resources-used'), // FIXME: Data model likely to change, per adhocteam#205
        duration,
        startDate,
        endDate,
        activityRecipientType,
        requester: getValue(data, 'source-of-request'),
        programTypes, // Array of strings
        targetPopulations, // Array of strings
        reason, // Array of strings
        numberOfParticipants: getValue(data, 'number-of-participants'),
        participants, // Array of strings
        topics, // Array of strings
        context: getValue(data, 'context-for-this-activity'),
        managerNotes: getValue(data, 'additional-notes-for-this-activity'),
        status, // Enum restriction: REPORT_STATUSES
        ttaType, // Array of strings
        createdAt: getValue(data, 'created'), // DATE
        updatedAt: getValue(data, 'modified'), // DATE
      });
      recordResults.push(ar);
    }
  }
}

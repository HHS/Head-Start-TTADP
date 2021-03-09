/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import { readFileSync } from 'fs';
import parse from 'csv-parse/lib/sync';
import {
  ActivityReport,
} from '../models';

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

function normalizeData(row) {
  const dataMap = new Map();
  Object.entries(row).forEach(([key, value]) => {
    const lookupKey = normalizeKey(key);
    dataMap.set(lookupKey, value);
  });
  return dataMap;
}

export default async function importActivityReports(file) {
  const csvFile = readCsv(file);
  const regionMatch = file.match(/R(\d+)/);
  const fileRegion = regionMatch ? regionMatch[1] : null;

  const recordResults = [];
  for (const row of csvFile) {
    const data = normalizeData(row);
    const reportId = data.get('reportid');
    // if (reportId) {
    //   console.log('Report ID: ', data.get('reportid'))
    //   console.log('TTA Type : ', data.get('t-ta'))
    // }

    const skipValidations = ['status'];

    const granteeParticipants = data.get('grantee-participants');
    // const nonGranteeParticipants = data.get('non-grantee-participants');
    const activityRecipientType = granteeParticipants ? 'Grantee' : 'Non-Grantee';

    const ar = ActivityReport.build({
      legacyId: reportId,
      regionId: fileRegion,
      deliveryMethod: data.get('format'),
      // approvingManagerId: ,
      // resourcesUsed: data.get('resources-used'), // FIXME: Data model likely to change, per adhocteam#205
      duration: data.get('duration'),
      startDate: data.get('start-date'),
      endDate: data.get('end-data'),
      activityRecipientType: activityRecipientType,
      requester: data.get('source-of-request'),
      programTypes: data.get('program-types'), // Array of strings
      targetPopulations: data.get('targetPopulations'), // Array of strings
      reason: data.get('reason/s'), // Array of strings
      numberOfParticipants: data.get('number-of-participants'),
      participants: data.get('grantee-participants'), // Array of strings
      topics: data.get('topics'), // Array of strings
      context: data.get('context-for-this-activity'),
      managerNotes: data.get('additional-notes-for-this-activity'),
      status: data.get('manager-approval'), // enum restrictions?
      ttaType: data.get('t-ta'), // Array of strings
      createdAt: data.get('created'), // DATE
      updatedAt: data.get('modified'), // DATE
    });
    recordResults.push(ar);
    console.log(ar.validate({ skip: skipValidations }));
  }
}

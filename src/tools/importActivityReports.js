/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
/* eslint-disable no-console */
import { readFileSync } from 'fs';
import path from 'path';
import parse from 'csv-parse/lib/sync';
import moment from 'moment';
import {
  ActivityReport,
  ActivityRecipient,
  Grant,
} from '../models';
import { REPORT_STATUSES } from '../constants';

/*
## Import Notes

- replace R14 with the proper region (R14 was a test region)

## SS Field Notes

- reportId
- granteeName // activityRecipients
- cdiGranteeName // Empty/Unused?
- multiGranteeActivities
- programType
- nonGranteeActivity
- sourceOfRequest
- reasons
- tTa
- topics
- otherTopics
- granteeParticipants
- nonGranteeParticipants
- numberOfParticipants
- startDate
- endDate
- duration
- otherSpecialists // 'collaborators'?
- targetPopulations
- resourcesUsed
- contextForThisActivity
- nonOhsResources
- goal1
- granteesLearningLevelGoal1
- objective11
- objective11Status
- objective12
- objective12Status
- goal2
- granteesLearningLevelGoal2
- objective21
- objective21Status
- objective22
- objective22Status
- ttaProvidedAndGranteeProgressMade
- granteeFollowUpTasksObjectives
- specialistFollowUpTasksObjectives
- format
- additionalNotesForThisActivity
- manager
- managerApproval
- created
- createdBy
- overrideCreatedBy
- modified
- modifiedBy

## Relational Fields

### Fields that would map to Users
- createdBy: 'author'
- modifiedBy: 'lastUpdatedBy'
- manager: 'approvingManager'
- null: 'collaborators' // NOTE: "Other specialists"?
// NOTE: "Grantee Name", but maybe also "Non-Grantee Activity"
- granteeName: 'activityRecipients'

### Other relational fields
- null: 'regionId' // NOTE: Take number from sheet name. R14 should be remapped
- null: 'attachments' // FIXME: How to get attachments from smarthub?
- 'specialistFollowUpTasksObjectives': 'specialistNextSteps'
- 'granteeFollowUpTasksObjectives': 'granteeNextSteps'
- 'goal1': 'goals'
- 'goal2': 'goals'
 */

const columnCleanupRE = /(\s?\(.*\)|:|\.|\/|&|')+/g;
const decimalRE = /^\d+(\.\d*)?$/;
const invalidRegionRE = /R14/;
const regionRE = /^R(?<regionId>\d{1,2})/i; // Used against filepaths
const grantNumRE = /\|\s+(?<grantNumber>[0-9A-Z]+)\n/g;
const mdyDateRE = /^\d{1,2}\/\d{1,2}\/(\d{2}|\d{4})$/;
const mdyFormat = 'MM/DD/YYYY';

function readCsv(file) {
  const csv = readFileSync(file);
  return parse(csv, { skipEmptyLines: true, columns: true });
}

// helper for mapping to camelCase
const hyphensToSpaces = (x) => (x === '-' ? ' ' : x);

// Map to camelCase. will not respect acronyms, other unusual capitalization
function mapToCamelCase(char, index, word) {
  if (index === 0) return char.toLowerCase();
  if (char === ' ') return '';
  const prevChar = word[index - 1];
  if (prevChar === ' ') return char.toUpperCase();
  return char.toLowerCase();
}

// Headers need to be uniform across sheets if we are to import
// NOTE: Doing this once per file would be an enchancement
function normalizeKey(k) {
  let value = k.trim();
  // Manual fix for reportID
  if (value.toLowerCase() === 'reportid') return 'reportId';
  // Remove parentheticals, other non-alphanumeric chars
  value = value.replace(columnCleanupRE, '').trim();
  // Replace hyphens with spaces, then map to camelCase
  value = value.split('')
    .map(hyphensToSpaces)
    .map(mapToCamelCase)
    .join('');

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

function parseGrantNumbers(value) {
  const matchIter = value.matchAll(grantNumRE);
  const results = [];
  for (const m of matchIter) {
    const { groups: { grantNumber } } = m;
    if (grantNumber) {
      results.push(grantNumber);
    }
  }
  return results;
}

export default async function importActivityReports(file) {
  const csvFile = readCsv(file);
  const { name: fileName } = path.parse(file);
  const regionMatch = regionRE.exec(fileName);
  const { groups: { regionId: fileRegion } } = regionMatch;
  const fileRegionId = coerceInt(fileRegion);

  // const activityReportRecords = [];
  for await (const row of csvFile) {
    const data = normalizeData(row);

    // console.log(Object.keys(data));

    const legacyId = coerceReportId(getValue(data, 'reportId'), fileRegionId);
    // Ignore rows with no reportid
    if (legacyId) {
      const granteeActivity = getValue(data, 'granteeActivity');
      const activityRecipientType = granteeActivity ? 'grantee' : 'nonGrantee';

      // Coerce values into appropriate data type
      const status = coerceStatus(getValue(data, 'managerApproval'));
      const duration = coerceDuration(getValue(data, 'duration'));
      const numberOfParticipants = coerceInt(getValue(data, 'numberOfParticipants'));

      const programTypes = coerceToArray(getValue(data, 'programType')); // FIXME: Check this key
      const targetPopulations = coerceToArray(getValue(data, 'targetPopulations'));
      const reason = coerceToArray(getValue(data, 'reasons'));
      const participants = coerceToArray(getValue(data, 'granteeParticipants'))
        .concat(coerceToArray(getValue(data, 'nonGranteeParticipants')));
      const topics = coerceToArray(getValue(data, 'topics'));
      const ttaType = coerceToArray(getValue(data, 'tTa'));

      const startDate = coerceDate(getValue(data, 'startDate'));
      const endDate = coerceDate(getValue(data, 'endDate'));

      const arRecord = {
        imported: data, // Store all the data in `imported` for later reuse
        legacyId,
        regionId: fileRegionId,
        deliveryMethod: getValue(data, 'format'), // FIXME: Check records like 'R01-AR-000135'
        ECLKCResourcesUsed: coerceToArray(getValue(data, 'resourcesUsed')),
        nonECLKCResourcesUsed: coerceToArray(getValue(data, 'nonOhsResources')),
        duration, // Decimal
        startDate,
        endDate,
        activityRecipientType,
        requester: getValue(data, 'sourceOfRequest'), // 'Grantee' or 'Regional Office'
        programTypes, // Array of strings
        targetPopulations, // Array of strings
        reason, // Array of strings
        numberOfParticipants, // Integer
        participants, // Array of strings
        topics, // Array of strings
        context: getValue(data, 'contextForThisActivity'),
        // TODO: Are 'managerNotes' the smartsheet comments (which are a separate sheet in Excel)
        // managerNotes: ???
        additionalNotes: getValue(data, 'additionalNotesForThisActivity'),
        status, // Enum restriction: REPORT_STATUSES
        ttaType, // Array of strings
        createdAt: getValue(data, 'created'), // DATE
        updatedAt: getValue(data, 'modified'), // DATE
      };
      // Ideally this would be an upsert, but sequelize v5 upsert doesn't return the instance?!?
      try {
        // Imported ARs won't pass `checkRequiredForSubmission`,
        // because `approvingManagerId`, `requester`, etc. may be null
        // so we build, then save without validating;
        const [ar] = await ActivityReport.findOrBuild(
          { where: { legacyId }, defaults: arRecord },
        );
        ar.save({ validate: false });

        // ActivityRecipients: connect Grants to ActivityReports
        const grantNumbers = parseGrantNumbers(getValue(data, 'granteeName'));
        for await (const n of grantNumbers) {
          const grant = await Grant.findOne({ where: { number: n } });
          if (grant) {
            ActivityRecipient.findOrCreate(
              { where: { activityReportId: ar.id, grantId: grant.id } },
            );
          }
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      console.warn('ActivityReport with no reportId, skipping');
    }
  }
}

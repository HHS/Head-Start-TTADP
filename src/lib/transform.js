import moment from 'moment';
import { DATE_FORMAT } from '../constants';

function transformDate(field) {
  async function transformer(instance) {
    let value = '';
    const date = instance[field];
    if (date) {
      value = moment(date).format(DATE_FORMAT);
    }
    const obj = {};
    Object.defineProperty(obj, field, {
      value,
      enumerable: true,
    });
    return Promise.resolve(obj);
  }
  return transformer;
}

/**
 * @param {string} field name to be retrieved
 * @returns {function} Function that will return a simple value wrapped in a Promise
 */
function transformSimpleValue(instance, field) {
  let value = instance[field];
  if (value && Array.isArray(value)) {
    // sort the values
    value = value.sort().join('\n');
  }
  const obj = {};
  Object.defineProperty(obj, field, {
    value,
    enumerable: true,
  });
  return Promise.resolve(obj);
}

/*
 * Generates a function that can transform values of a related model
 * @param {string} field The field of the related model
 * @param {string} prop The key on the related model to transform
 * @returns {function} A function that will perform the transformation
 */
function transformRelatedModel(field, prop) {
  async function transformer(instance) {
    const obj = {};
    let records = await instance[field];
    if (records) {
      if (!Array.isArray(records)) {
        records = [records];
      }
      // we sort the values
      const value = records.map((r) => (r[prop] || '')).sort().join('\n');
      Object.defineProperty(obj, field, {
        value,
        enumerable: true,
      });
    }
    return Promise.resolve(obj);
  }
  return transformer;
}

function transformGrantModel(field) {
  async function transformer(instance) {
    const obj = {};
    const activityRecipients = await instance.activityRecipients;
    if (activityRecipients) {
      const distinctPS = [...new Set(activityRecipients.map((recipient) => (recipient.grant && recipient.grant[field] !== null ? recipient.grant[field] : '')))];
      const programSpecialistNames = distinctPS.sort().join('\n');
      Object.defineProperty(obj, field, {
        value: programSpecialistNames,
        enumerable: true,
      });
    }
    return Promise.resolve(obj);
  }
  return transformer;
}

/*
 * Helper function for transformGoalsAndObjectives
 */
function sortObjectives(a, b) {
  if (!b.goal || !a.goal) {
    return 1;
  }
  if (b.goal.id < a.goal.id) {
    return 1;
  }
  if (b.id < a.id) {
    return 1;
  }
  return -1;
}

/*
 * Create an object with goals and objectives. Used by transformGoalsAndObjectives
 * @param {Array<Objectives>} objectiveRecords
 */
function makeGoalsAndObjectivesObject(objectiveRecords) {
  objectiveRecords.sort(sortObjectives);
  let objectiveNum = 0;
  let goalNum = 0;

  return objectiveRecords.reduce((accum, objective) => {
    const {
      goal, title, status, ttaProvided,
    } = objective;
    const goalName = goal ? goal.name : null;
    const newGoal = goalName && !Object.values(accum).includes(goalName);

    if (newGoal) {
      goalNum += 1;
      Object.defineProperty(accum, `goal-${goalNum}`, {
        value: goalName,
        enumerable: true,
      });
      // Object.defineProperty(accum, `goal-${goalNum}-status`, {
      //   value: goal.status,
      //   enumerable: true,
      // });
      objectiveNum = 1;
    }

    // goal number should be at least 1
    if (!goalNum) {
      goalNum = 1;
    }

    // same with objective num

    /**
     * this will start non-grantee objectives at 1.1, which will prevent the creation
     * of columns that don't fit the current schema (for example, objective-1.0)
     */
    if (!objectiveNum) {
      objectiveNum = 1;
    }

    const objectiveId = `${goalNum}.${objectiveNum}`;

    Object.defineProperty(accum, `objective-${objectiveId}`, {
      value: title,
      enumerable: true,
    });
    Object.defineProperty(accum, `objective-${objectiveId}-status`, {
      value: status,
      enumerable: true,
    });
    Object.defineProperty(accum, `objective-${objectiveId}-ttaProvided`, {
      value: ttaProvided,
      enumerable: true,
    });
    objectiveNum += 1;

    return accum;
  }, {});
}

/*
 * Transform goals and objectives into a format suitable for a CSV
 * @param {ActivityReport} ActivityReport instance
 * @returns {Promise<object>} Object with key-values for goals and objectives
 */
async function transformGoalsAndObjectives(report) {
  let obj = {};

  const objectiveRecords = await report.objectives;
  if (objectiveRecords) {
    obj = makeGoalsAndObjectivesObject(objectiveRecords);
  }

  return obj;
}

const arTransformers = [
  'displayId',
  transformRelatedModel('author', 'fullName'),
  transformRelatedModel('lastUpdatedBy', 'name'),
  'requester',
  transformRelatedModel('collaborators', 'fullName'),
  'programTypes',
  'targetPopulations',
  'virtualDeliveryType',
  'reason',
  'participants',
  'topics',
  'ttaType',
  'numberOfParticipants',
  'deliveryMethod',
  'duration',
  'endDate',
  'startDate',
  transformRelatedModel('activityRecipients', 'name'),
  'activityRecipientType',
  'ECLKCResourcesUsed',
  'nonECLKCResourcesUsed',
  transformRelatedModel('attachments', 'originalFileName'),
  transformGoalsAndObjectives,
  transformRelatedModel('granteeNextSteps', 'note'),
  transformRelatedModel('specialistNextSteps', 'note'),
  'context',
  'additionalNotes',
  'lastSaved',
  transformDate('createdAt'),
  transformDate('approvedAt'),
  transformGrantModel('programSpecialistName'),
];

/**
 * csvRows is an array of objects representing csv data. Sometimes,
 * some objects can have keys that other objects will not.
 * We also want the goals and objectives to appear at the end
 * of the report. This extracts a list of all the goals and objectives.
 *
 * @param {object[]} csvRows
 * @returns object[]
 */
function extractListOfGoalsAndObjectives(csvRows) {
  // an empty array to hold our keys
  let keys = [];

  // remove all the keys and get em in an array
  csvRows.forEach((row) => keys.push(Object.keys(row)));

  // flatten arrays of keys and dedupe
  keys = Array.from(new Set(keys.flat()));

  const goals = [];
  const objectives = [];

  keys.forEach((key) => {
    if (key.match(/^(goal)/)) {
      goals.push(key);
    }

    if (key.match(/^(objective)/)) {
      objectives.push(key);
    }
  });

  if (goals.length === 0) {
    return objectives;
  }

  let goalsAndObjectives = [];

  goals.forEach((goal, index, goalsArray) => {
    // push the goal to our array
    goalsAndObjectives.push(goal);

    // get the goal number
    const goalNumberNeedle = goal.split('-')[1];

    // check to see if the next goal is from the same set of goal fields
    if (goalsArray[index + 1] && goalsArray[index + 1].match(`^(goal-${goalNumberNeedle})`)) {
      return;
    }

    // find any associated objectives
    const associatedObjectives = objectives.filter((objective) => objective.match(new RegExp(`^(objective-${goalNumberNeedle})`)));

    // make em friends
    goalsAndObjectives = [...goalsAndObjectives, ...associatedObjectives];
  });

  return goalsAndObjectives;
}

async function activityReportToCsvRecord(report, transformers = arTransformers) {
  const callFunctionOrValueGetter = (x) => {
    if (typeof x === 'function') {
      return x(report);
    }
    if (typeof x === 'string') {
      return transformSimpleValue(report, x);
    }
    return {};
  };
  const recordObjects = await Promise.all(transformers.map(callFunctionOrValueGetter));
  const record = recordObjects.reduce((obj, value) => Object.assign(obj, value), {});

  return record;
}

export {
  activityReportToCsvRecord,
  arTransformers,
  makeGoalsAndObjectivesObject,
  extractListOfGoalsAndObjectives,
};

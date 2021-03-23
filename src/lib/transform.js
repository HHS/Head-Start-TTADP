/**
 * @param {string} field name to be retrieved
 * @returns {function} Function that will return a simple value wrapped in a Promise
 */
function transformSimpleValue(instance, field) {
  let value = instance.get(field);
  if (value && Array.isArray(value)) {
    value = value.join('\n');
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
 * @param {string} key The key on the related model to transform
 * @returns {function} A function that will perform the transformation
 */
function transformRelatedModel(field, prop) {
  async function transformer(instance) {
    const obj = {};
    let records = await instance.get(field);
    if (records) {
      if (!Array.isArray(records)) {
        records = [records];
      }
      const value = records.map((r) => (r[prop] || '')).join('\n');
      Object.defineProperty(obj, field, {
        value,
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
  let objectiveNum = 1;
  let goalNum = 0;

  return objectiveRecords.reduce((accum, objective) => {
    const {
      goal, title, status, ttaProvided,
    } = objective;
    const goalName = goal.get('name') || null;
    const newGoal = goalName && !Object.values(accum).includes(goalName);

    if (newGoal) {
      goalNum += 1;
      Object.defineProperty(accum, `goal-${goalNum}`, {
        value: goalName,
        enumerable: true,
      });
      Object.defineProperty(accum, `goal-${goalNum}-status`, {
        value: goal.get('status'),
        enumerable: true,
      });
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
  const objectiveRecords = await report.get('objectives');
  if (objectiveRecords) {
    obj = makeGoalsAndObjectivesObject(objectiveRecords);
  }
  return obj;
}

const arBuilders = [
  'displayId',
  transformRelatedModel('author', 'name'),
  transformRelatedModel('approvingManager', 'name'),
  transformRelatedModel('lastUpdatedBy', 'name'),
  'requester',
  transformRelatedModel('collaborators', 'name'),
  'programTypes',
  'targetPopulations',
  'virtualDeliveryType',
  'reason',
  'participants',
  'topics',
  'status',
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
  'managerNotes',
  'additionalNotes',
  'lastSaved',
];

async function activityReportToCsvRecord(report) {
  const callFunctionOrValueGetter = (x) => {
    if (typeof x === 'function') {
      return x(report);
    }
    if (typeof x === 'string') {
      return transformSimpleValue(report, x);
    }
    return {};
  };
  const recordObjects = await Promise.all(arBuilders.map(callFunctionOrValueGetter));
  const record = recordObjects.reduce((obj, value) => Object.assign(obj, value), {});
  return record;
}

export {
  activityReportToCsvRecord as default,
};

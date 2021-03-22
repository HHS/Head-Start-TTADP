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
 * @param {ActivityReport} ActivityReport instance
 * @returns {Promise<object>} author email
 */
async function transformAuthorEmail(report) {
  const authorRecord = await report.getAuthor();
  const author = authorRecord ? authorRecord.get('email') : '';
  return { author };
}

/*
 * @param {ActivityReport} ActivityReport instance
 * @returns {Promise<object>} approving manager name
 */
async function transformApprovingManagerName(report) {
  const managerRecord = await report.getApprovingManager();
  const approvingManager = managerRecord ? managerRecord.get('name') : '';
  return { approvingManager };
}

/*
 * @param {ActivityReport} ActivityReport instance
 * @returns {Promise<object>} Name of user who last updated report
 */
async function transformLastUpdatedBy(report) {
  const lastUpdatedByRecord = await report.getLastUpdatedBy();
  const lastUpdatedBy = lastUpdatedByRecord ? lastUpdatedByRecord.get('name') : '';
  return { lastUpdatedBy };
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
 * Transform goals and objectives into a format suitable for a CSV
 * @param {ActivityReport} ActivityReport instance
 * @returns {Promise<object>} Object with key-values for goals and objectives
 */
async function transformGoalsAndObjectives(report) {
  const objectiveRecords = await report.get('objectives');
  objectiveRecords.sort(sortObjectives);
  let objectiveNum = 1;
  let goalNum = 0;

  const goalsAndObjectives = objectiveRecords.reduce((accum, objective) => {
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

  return goalsAndObjectives;
}

// function transformManyModel(field, prop) {
//   async function transformer(instance) {
//     const records = await instance.get(field);
//     const value = records.map((r) => (({}).hasOwnProperty.call(r, prop) ? r[prop] : '')).join('\n');
//     const obj = {};
//     Object.defineProperty(obj, field, {
//       value,
//       enumerable: true,
//     });
//     return Promise.resolve(obj);
//   }
//   return transformer;
// }

async function transformActivityRecipients(report) {
  const records = await report.get('activityRecipients');
  const activityRecipients = records.map((r) => r.name || '').join('\n');
  return { activityRecipients };
}

async function transformCollaborators(report) {
  const records = await report.get('collaborators');
  const collaborators = records.map((r) => r.name || '').join('\n');
  return { collaborators };
}

// 'attachments\n' +
// 'specialistNextSteps\n' +
// 'granteeNextSteps\n' +
const arBuilders = [
  'displayId',
  transformAuthorEmail,
  transformApprovingManagerName,
  transformLastUpdatedBy,
  'requester',
  transformCollaborators,
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
  transformActivityRecipients,
  'activityRecipientType',
  'ECLKCResourcesUsed',
  'nonECLKCResourcesUsed',
  transformGoalsAndObjectives,
  // transformManyModel('granteeNextSteps', 'note'),
  // transformManyModel('specialistNextSteps', 'note'),
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
  activityReportToCsvRecord,
};

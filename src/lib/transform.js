import { format, parseISO, isValid } from 'date-fns';
import md5 from 'md5';
import { uniq } from 'lodash';
import { convert } from 'html-to-text';
import { DATE_FORMAT } from '../constants';

const HTML_TO_TEXT_OPTIONS = { selectors: [{ selector: 'table', format: 'dataTable' }] };

function transformDate(field) {
  function transformer(instance) {
    let value = '';
    const date = instance[field];
    if (date) {
      const d = typeof date === 'string' ? parseISO(date) : date;
      if (isValid(d)) {
        value = format(d, DATE_FORMAT);
      }
    }
    const obj = {};
    Object.defineProperty(obj, field, {
      value,
      enumerable: true,
    });
    return obj;
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
  return obj;
}

/*
 * Generates a function that can transform values of a related model
 * @param {string} field The field of the related model
 * @param {string} prop The key on the related model to transform
 * @returns {function} A function that will perform the transformation
 */
function transformRelatedModelProp(field, prop) {
  function transformer(instance) {
    const obj = {};
    let records = instance[field];
    if (records) {
      if (!Array.isArray(records)) {
        records = [records];
      }
      // we sort the values
      const value = records.map((r) => (r[prop] || '')).sort().join('\n');
      Object.defineProperty(obj, prop, {
        value,
        enumerable: true,
      });
    }
    return obj;
  }
  return transformer;
}

function transformRelatedModelPropHTML(field, prop) {
  function transformer(instance) {
    const obj = {};
    let records = instance[field];
    if (records) {
      if (!Array.isArray(records)) {
        records = [records];
      }
      const value = records.map((r) => convert(r[prop] || '', HTML_TO_TEXT_OPTIONS)).sort().join('\n');
      Object.defineProperty(obj, prop, {
        value,
        enumerable: true,
      });
    }
    return obj;
  }
  return transformer;
}

/*
 * Generates a function that can transform values of a related model
 * @param {string} field The field of the related model
 * @param {string} prop The key on the related model to transform
 * @param {string} nestedProp The key on the related model to transform
 * @returns {function} A function that will perform the transformation
 */
function transformRelatedModelPropNested(field, prop, nestedProp = 'label') {
  function transformer(instance) {
    const obj = {};
    let records = instance[field];
    if (records) {
      if (!Array.isArray(records)) {
        records = [records];
      }
      const value = records.map((r) => {
        if (!r[prop]) {
          return '';
        }
        return r[prop].map((p) => (p[nestedProp] || '')).sort().join('\n');
      }).sort().join('\n');
      Object.defineProperty(obj, prop, {
        value,
        enumerable: true,
      });
    }
    return obj;
  }
  return transformer;
}

/*
 * Generates a function that can transform values of a related model
 * @param {string} field The field of the related model
 * @param {string} prop The key on the related model to transform
 * @returns {function} A function that will perform the transformation
 */
function transformRelatedModel(field, prop) {
  function transformer(instance) {
    const obj = {};
    let records = instance[field];
    if (records) {
      if (!Array.isArray(records)) {
        records = [records];
      }
      // we sort the values
      const value = records.map((r) => (r[prop] || '')).sort().join('\n');
      Object.defineProperty(obj, `${field}`, {
        value,
        enumerable: true,
      });
    }
    return obj;
  }
  return transformer;
}

/**
 *
 * @param {string} field
 * @param {Array} fieldDefs expected [{ subfield: string, label: string }]
 * @param {*} prop
 * @returns () => ({})
 */
function transformRelatedModelWithMultiFields(field, fieldDefs) {
  function transformer(instance) {
    const obj = {};
    fieldDefs.forEach((fieldDef) => {
      let records = instance[field];
      if (records) {
        if (!Array.isArray(records)) {
          records = [records];
        }
        const value = records.map((r) => r[fieldDef.subfield]).join('\n');
        Object.defineProperty(obj, fieldDef.label, {
          value,
          enumerable: true,
        });
      }
    });
    return obj;
  }

  return transformer;
}

function transformCollaborators(joinTable, field, fieldName) {
  function transformer(instance) {
    const obj = {};
    let records = instance[joinTable];
    if (records) {
      if (!Array.isArray(records)) {
        records = [records];
      }
      const value = records.map((r) => r[field]).sort().join('\n');
      Object.defineProperty(obj, fieldName, {
        value,
        enumerable: true,
      });
    }
    return obj;
  }
  return transformer;
}

function transformHTML(field) {
  function transformer(instance) {
    const html = instance[field] || '';
    const value = convert(html, HTML_TO_TEXT_OPTIONS);
    const obj = {};
    Object.defineProperty(obj, field, {
      value,
      enumerable: true,
    });
    return obj;
  }
  return transformer;
}

function transformApproversModel(prop) {
  function transformer(instance) {
    const obj = {};
    const values = instance.approvers;
    if (values) {
      const distinctValues = [
        ...new Set(
          values.filter(
            (approver) => approver.user && approver.user[prop] !== null,
          ).map((r) => r.user[prop]).flat(),
        ),
      ];
      const approversList = distinctValues.sort().join('\n');
      Object.defineProperty(obj, 'approvers', {
        value: approversList,
        enumerable: true,
      });
    }
    return obj;
  }
  return transformer;
}

function transformGrantModel(prop, sortBy = null) {
  // If 'sortBy' is set we will no longer return a distinct list.
  function transformer(instance) {
    const obj = {};
    const values = instance.activityRecipients;
    if (values) {
      let grantValueList;
      if (!sortBy) {
        const distinctValues = [
          ...new Set(
            values.filter(
              (recipient) => recipient.grant && recipient.grant[prop] !== null,
            ).map((r) => r.grant[prop]).flat(),
          ),
        ];
        grantValueList = distinctValues.sort().join('\n');
      } else {
        const grantValues = [
          ...values.filter(
            (recipient) => recipient.grant && recipient.grant[prop] !== null,
          ).map((r) => ({ value: r.grant[prop], sortValue: r.grant[sortBy] })).flat(),
        ];
        grantValueList = grantValues.sort((a, b) => ((a.sortValue > b.sortValue) ? 1 : -1)).map((r) => r.value).join('\n');
      }
      Object.defineProperty(obj, prop, {
        value: grantValueList,
        enumerable: true,
      });
    }
    return obj;
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

/**
 *
 * @param {Object[]} goalRecords
 * @returns {Object} { goals: [], objectives: []}
 */
function makeGoalsObjectFromActivityReportGoals(goalRecords) {
  let goalCsvRecordNumber = 1;
  const goals = {};
  goalRecords.forEach((goal) => {
    const {
      id = null,
      name = null,
      status = null,
      createdVia = null,
      source = null,
    } = goal || {};
    const goalNameIndex = Object.values(goals).findIndex((n) => n === name);
    if (goalNameIndex === -1) {
      goals[`goal-${goalCsvRecordNumber}-id`] = `${id}`;
      goals[`goal-${goalCsvRecordNumber}`] = name;
      goals[`goal-${goalCsvRecordNumber}-status`] = status;
      goals[`goal-${goalCsvRecordNumber}-created-from`] = createdVia;
      goals[`goal-${goalCsvRecordNumber}-source`] = source;
      goalCsvRecordNumber += 1;
      return;
    }
    const goalNameKey = Object.keys(goals)[goalNameIndex];
    const goalNumber = goalNameKey.match(/goal-(\d+)/)[1];
    const field = `goal-${goalNumber}-id`;
    goals[field] = `${goals[field]}\n${id}`;
  });
  return goals;
}

function updateObjectiveWithRelatedModelData(
  relation,
  relationLabel,
  relationKey,
  accum,
  objectiveId,
) {
  const relatedSimple = (relation || []).map((t) => t[relationKey]);
  Object.defineProperty(accum, `objective-${objectiveId}-${relationLabel}`, {
    value: relatedSimple.join('\n'),
    enumerable: true,
  });
}

/*
   * Create an object with goals and objectives. Used by transformGoalsAndObjectives
   * @param {Array<Objectives>} objectiveRecords
   */
function makeGoalsAndObjectivesObject(objectiveRecords) {
  objectiveRecords.sort(sortObjectives);
  let objectiveNum = 0;
  let goalNum = 0;
  const goalIds = {};
  let objectiveId;
  const processedObjectivesTitles = new Map();

  return objectiveRecords.reduce((prevAccum, objective) => {
    const accum = { ...prevAccum };
    const {
      goal,
      title,
      status,
      ttaProvided,
      topics,
      files,
      resources,
      courses,
      supportType,
    } = objective;
    const goalId = goal ? goal.id : null;
    const titleMd5 = md5(title);

    const existingObjectiveTitle = processedObjectivesTitles.get(titleMd5);
    const goalName = goal ? goal.name : null;
    const newGoal = goalName && !Object.values(accum).includes(goalName);

    if (newGoal) {
      goalNum += 1;
      processedObjectivesTitles.set(titleMd5, goalNum);
      // Goal Id.
      Object.defineProperty(accum, `goal-${goalNum}-id`, {
        value: `${goalId}`,
        writable: true,
        enumerable: true,
      });

      // Add goal id to list.
      goalIds[goalName] = [goalId];

      // Goal Name.
      Object.defineProperty(accum, `goal-${goalNum}`, {
        value: goalName,
        enumerable: true,
      });
      Object.defineProperty(accum, `goal-${goalNum}-status`, {
        value: goal.status,
        enumerable: true,
      });

      Object.defineProperty(accum, `goal-${goalNum}-source`, {
        value: goal.source,
        enumerable: true,
      });

      Object.defineProperty(accum, `goal-${goalNum}-standard-ohs-goal`, {
        value: goal.isCurated ? 'Yes' : 'No',
        enumerable: true,
      });

      Object.defineProperty(accum, `goal-${goalNum}-fei-root-causes`, {
        value: goal.responses.map((response) => response.response).join('\n'),
        enumerable: true,
      });

      // Created From.
      Object.defineProperty(accum, `goal-${goalNum}-created-from`, {
        value: goal.createdVia,
        enumerable: true,
      });

      objectiveNum = 1;
    } else if (existingObjectiveTitle) {
      // Make sure its not another objective for the same goal.
      if (goalIds[goalName] && !goalIds[goalName].includes(goalId)) {
        accum[`goal-${existingObjectiveTitle}-id`] = `${accum[`goal-${existingObjectiveTitle}-id`]}\n${goalId}`;
        if (accum[`goal-${goalNum}-source`]) {
          accum[`goal-${goalNum}-source`] = uniq([...(accum[`goal-${goalNum}-source`]).split('\n'), goal.source]).join('\n');
        } else {
          accum[`goal-${goalNum}-source`] = goal.source;
        }
        if (goal.isCurated) {
          accum[`goal-${goalNum}-fei-root-causes`] = uniq([...accum[`goal-${goalNum}-fei-root-causes`].split('\n'), ...goal.responses.map((response) => response.response)]).join('\n');
        }
        goalIds[goalName].push(goalId);
      }
      return accum;
    }

    // goal number should be at least 1
    if (!goalNum) {
      goalNum = 1;
    }

    /**
     * this will start other entity objectives at 1.1, which will prevent the creation
     * of columns that don't fit the current schema (for example, objective-1.0)
     */
    if (!objectiveNum) {
      objectiveNum = 1;
    }

    objectiveId = `${goalNum}.${objectiveNum}`;

    Object.defineProperty(accum, `objective-${objectiveId}`, {
      value: title,
      enumerable: true,
    });

    updateObjectiveWithRelatedModelData(
      topics,
      'topics',
      'name',
      accum,
      objectiveId,
    );

    updateObjectiveWithRelatedModelData(
      courses,
      'courses',
      'name',
      accum,
      objectiveId,
    );

    updateObjectiveWithRelatedModelData(
      resources,
      'resourcesLinks',
      'url',
      accum,
      objectiveId,
    );

    updateObjectiveWithRelatedModelData(
      files,
      'nonResourceLinks',
      'originalFileName',
      accum,
      objectiveId,
    );

    Object.defineProperty(accum, `objective-${objectiveId}-ttaProvided`, {
      value: convert(ttaProvided),
      enumerable: true,
    });

    Object.defineProperty(accum, `objective-${objectiveId}-supportType`, {
      value: supportType,
      enumerable: true,
    });

    Object.defineProperty(accum, `objective-${objectiveId}-status`, {
      value: status,
      enumerable: true,
    });

    // Add this objective to the tracked list.
    processedObjectivesTitles.set(titleMd5, goalNum);

    objectiveNum += 1;

    return accum;
  }, {});
}

/*
* Transform goals and objectives into a format suitable for a CSV
* @param {ActivityReport} ActivityReport instance
* @returns {Promise<object>} Object with key-values for goals and objectives
*/
function transformGoalsAndObjectives(report) {
  let obj = {};
  const { activityReportObjectives, activityReportGoals } = report;

  if (activityReportObjectives && activityReportObjectives.length) {
    const objectiveRecords = activityReportObjectives.filter((aro) => aro.objective).map((aro) => (
      {
        ...aro.objective,
        ttaProvided: aro.ttaProvided,
        topics: aro.topics,
        files: aro.files,
        resources: aro.resources,
        courses: aro.courses,
        supportType: aro.supportType,
      }
    ));
    if (objectiveRecords) {
      obj = makeGoalsAndObjectivesObject(objectiveRecords);
    }
  } else if (activityReportGoals && activityReportGoals.length) {
    const goals = activityReportGoals.map((arg) => (
      { ...(arg.goal.dataValues || arg.goal), status: arg.status }
    ));
    obj = makeGoalsObjectFromActivityReportGoals(goals);
  }

  return obj;
}

const arTransformers = [
  'displayId',
  'creatorName',
  transformRelatedModel('lastUpdatedBy', 'name'),
  'requester',
  transformCollaborators('activityReportCollaborators', 'fullName', 'collaborators'),
  transformApproversModel('name'),
  'targetPopulations',
  'virtualDeliveryType',
  'reason',
  'participants',
  'topics',
  'ttaType',
  'language',
  'numberOfParticipants',
  'deliveryMethod',
  'duration',
  'endDate',
  'startDate',
  transformRelatedModel('activityRecipients', 'name'),
  transformGrantModel('programTypes'),
  'activityRecipientType',
  'ECLKCResourcesUsed',
  'nonECLKCResourcesUsed',
  transformRelatedModel('files', 'originalFileName'),
  transformGoalsAndObjectives,
  transformRelatedModelWithMultiFields('recipientNextSteps', [{
    subfield: 'note',
    label: 'recipientNextSteps',
  }, {
    subfield: 'completeDate',
    label: 'recipientNextStepsCompleteDate',
  }]),
  transformRelatedModelWithMultiFields('specialistNextSteps', [{
    subfield: 'note',
    label: 'specialistNextSteps',
  }, {
    subfield: 'completeDate',
    label: 'specialistNextStepsCompleteDate',
  }]),
  transformHTML('context'),
  transformHTML('additionalNotes'),
  'lastSaved',
  transformDate('createdAt'),
  transformDate('submittedDate'),
  transformDate('approvedAt'),
  transformGrantModel('programSpecialistName'),
  transformGrantModel('recipientInfo'),
  transformGrantModel('stateCode', 'recipientInfo'),
];

const logTransformers = [
  'id',
  transformRelatedModelProp('data', 'regionId'),
  transformRelatedModel('recipients', 'name'),
  transformRelatedModel('author', 'name'),
  transformRelatedModelProp('data', 'communicationDate'),
  transformRelatedModelProp('data', 'duration'),
  transformRelatedModelProp('data', 'method'),
  transformRelatedModelProp('data', 'purpose'),
  transformRelatedModelPropHTML('data', 'notes'),
  transformRelatedModelProp('data', 'result'),
  transformRelatedModelPropNested('data', 'goals'),
  transformRelatedModelPropNested('data', 'otherStaff'),
  transformRelatedModel('files', 'originalFileName'),
  transformRelatedModelPropNested('data', 'recipientNextSteps', 'note'),
  transformRelatedModelPropNested('data', 'specialistNextSteps', 'note'),
];

const collabReportTransformers = [
  'displayId',
  'regionId',
  'name',
  'description',
  'conductMethod',
  'isStateActivity',
  'duration',
  'startDate',
  'endDate',
  'status',
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

function toCSVRecord(report, transformers) {
  const callFunctionOrValueGetter = (x) => {
    if (typeof x === 'function') {
      return x(report);
    }
    if (typeof x === 'string') {
      return transformSimpleValue(report, x);
    }
    return {};
  };
  const recordObjects = transformers.map(callFunctionOrValueGetter);
  const record = recordObjects.reduce((obj, value) => Object.assign(obj, value), {});

  return record;
}

function activityReportToCsvRecord(report, transformers = arTransformers) {
  return toCSVRecord(report, transformers);
}

function communicationLogToCsvRecord(log) {
  return toCSVRecord(log, logTransformers);
}

function collabReportToCsvRecord(report) {
  return toCSVRecord(report, collabReportTransformers);
}

export {
  communicationLogToCsvRecord,
  activityReportToCsvRecord,
  collabReportToCsvRecord,
  arTransformers,
  makeGoalsAndObjectivesObject,
  extractListOfGoalsAndObjectives,
};

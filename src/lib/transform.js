async function getAuthorEmail(report) {
  const authorRecord = await report.getAuthor();
  const author = authorRecord ? authorRecord.get('email') : '';
  return { author };
}

async function getApprovingManagerName(report) {
  const managerRecord = await report.getApprovingManager();
  const approvingManager = managerRecord ? managerRecord.get('name') : '';
  return { approvingManager };
}

async function getLastUpdatedBy(report) {
  const lastUpdatedByRecord = await report.getLastUpdatedBy();
  const lastUpdatedBy = lastUpdatedByRecord ? lastUpdatedByRecord.get('name') : '';
  return { lastUpdatedBy };
}

function sortObjectives(a, b) {
  if (b.goal.id < a.goal.id) {
    return 1;
  }
  if (b.id < a.id) {
    return 1;
  }
  return -1;
}

async function getGoalsAndObjectives(report) {
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

const arBuilders = [
  getAuthorEmail,
  getApprovingManagerName,
  getLastUpdatedBy,
  getGoalsAndObjectives,
];

async function activityReportToCsvRecord(report) {
  const recordObjects = await Promise.all(arBuilders.map((f) => f(report)));
  const record = recordObjects.reduce((obj, value) => Object.assign(obj, value), {});
  return record;
}

export {
  activityReportToCsvRecord,
};

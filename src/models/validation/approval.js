const { REPORT_STATUSES, ENTITY_TYPES } = require('../../constants');

const requiredForSubmissionReport = (report) => [
  report.numberOfParticipants,
  report.deliveryMethod,
  report.duration,
  report.endDate,
  report.startDate,
  report.activityRecipientType,
  report.requester,
  report.targetPopulations,
  report.reason,
  report.participants,
  report.topics,
  report.ttaType,
];

const requiredForSubmissionReportGoal = (reportGoal) => [
  reportGoal.name,
];

const requiredForSubmissionReportObjective = (reportObjective) => [
  reportObjective.title,
];

const requiredForSubmissionGoal = (goal) => [
  goal.name,
];

const requiredForSubmissionGoalTemplate = (goalTemplate) => [
  goalTemplate.name,
];

const requiredForSubmissionObjective = (objective) => [
  objective.title,
];

const requiredForSubmissionObjectiveTemplate = (objectiveTemplate) => [
  objectiveTemplate.title,
];

const validateSubmissionStatus = (approval) => {
  let requiredForSubmission;
  switch (approval.entityType) {
    case ENTITY_TYPES.REPORT:
      requiredForSubmission = requiredForSubmissionReport(approval.report);
      break;
    case ENTITY_TYPES.REPORTGOAL:
      requiredForSubmission = requiredForSubmissionReportGoal(approval.reportGoal);
      break;
    case ENTITY_TYPES.REPORTOBJECTIVE:
      requiredForSubmission = requiredForSubmissionReportObjective(approval.reportObjective);
      break;
    case ENTITY_TYPES.GOAL:
      requiredForSubmission = requiredForSubmissionGoal(approval.goal);
      break;
    case ENTITY_TYPES.GOALTEMPLATE:
      requiredForSubmission = requiredForSubmissionGoalTemplate(approval.goalTemplate);
      break;
    case ENTITY_TYPES.OBJECTIVE:
      requiredForSubmission = requiredForSubmissionObjective(approval.objective);
      break;
    case ENTITY_TYPES.OBJECTIVETEMPLATE:
      requiredForSubmission = requiredForSubmissionObjectiveTemplate(approval.objectiveTemplate);
      break;
    default:
      requiredForSubmission = [];
  }
  const draftStatuses = [REPORT_STATUSES.DRAFT, REPORT_STATUSES.DELETED];
  if (!draftStatuses.includes(this.submissionStatus)) {
    // Require fields when entity is not a draft
    if (requiredForSubmission.includes(null)) {
      throw new Error('Missing required field(s)');
    }
  }
};

export {
  requiredForSubmissionReport,
  requiredForSubmissionReportGoal,
  requiredForSubmissionReportObjective,
  requiredForSubmissionGoal,
  requiredForSubmissionGoalTemplate,
  requiredForSubmissionObjective,
  requiredForSubmissionObjectiveTemplate,
  validateSubmissionStatus,
};

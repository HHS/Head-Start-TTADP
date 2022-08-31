const { REPORT_STATUSES, ENTITY_TYPES } = require('../../constants');

const requiredForSubmissionReport = () => [
  this.report.numberOfParticipants,
  this.report.deliveryMethod,
  this.report.duration,
  this.report.endDate,
  this.report.startDate,
  this.report.activityRecipientType,
  this.report.requester,
  this.report.targetPopulations,
  this.report.reason,
  this.report.participants,
  this.report.topics,
  this.report.ttaType,
  this.report.creatorRole,
];

const requiredForSubmissionReportGoal = () => [
  this.reportGoal.name,
];

const requiredForSubmissionReportObjective = () => [
  this.reportObjective.title,
];

const requiredForSubmissionGoal = () => [
  this.goal.name,
];

const requiredForSubmissionGoalTemplate = () => [
  this.goalTemplate.name,
];

const requiredForSubmissionObjective = () => [
  this.objective.title,
];

const requiredForSubmissionObjectiveTemplate = () => [
  this.objectiveTemplate.title,
];

const validateSubmissionStatus = () => {
  let requiredForSubmission;
  switch (this.entityType) {
    case ENTITY_TYPES.REPORT:
      requiredForSubmission = requiredForSubmissionReport();
      break;
    case ENTITY_TYPES.REPORTGOAL:
      requiredForSubmission = requiredForSubmissionReportGoal();
      break;
    case ENTITY_TYPES.REPORTOBJECTIVE:
      requiredForSubmission = requiredForSubmissionReportObjective();
      break;
    case ENTITY_TYPES.GOAL:
      requiredForSubmission = requiredForSubmissionGoal();
      break;
    case ENTITY_TYPES.GOALTEMPLATE:
      requiredForSubmission = requiredForSubmissionGoalTemplate();
      break;
    case ENTITY_TYPES.OBJECTIVE:
      requiredForSubmission = requiredForSubmissionObjective();
      break;
    case ENTITY_TYPES.OBJECTIVETEMPLATE:
      requiredForSubmission = requiredForSubmissionObjectiveTemplate();
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

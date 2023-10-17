import { createFiltersToScopes } from '../utils';
import { REPORT_TYPE, COLLABORATOR_TYPES } from '../../constants';
import { topicToQuery as report } from './report';
import { topicToQuery as reportTrainingEvent } from './reportTrainingEvent';
import { topicToQuery as reportTrainingSession } from './reportTrainingSession';
import { filterCollaboratorUsersByType } from './reportCollaborator';

const topicToQueryForReportType = (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => {
  switch (reportType) {
    case REPORT_TYPE.REPORT_TRAINING_EVENT:
      return {
        ...report([reportType]),
        ...reportTrainingEvent,
        creator: filterCollaboratorUsersByType(COLLABORATOR_TYPES.INSTANTIATOR),
        owner: filterCollaboratorUsersByType(COLLABORATOR_TYPES.OWNER),
        collaborators: filterCollaboratorUsersByType(COLLABORATOR_TYPES.EDITOR),
        pocs: filterCollaboratorUsersByType(COLLABORATOR_TYPES.POC),
      };
      break;
    case REPORT_TYPE.REPORT_TRAINING_SESSION:
      return {
        ...report,
        ...reportTrainingSession,
        creator: filterCollaboratorUsersByType(COLLABORATOR_TYPES.INSTANTIATOR),
        owner: filterCollaboratorUsersByType(COLLABORATOR_TYPES.OWNER),
      };
      break;
    default:
      throw new Error(`Unknown report type of '${reportType}'`);
  }
};

const reportsFiltersToScopes = (
  filters,
  options,
  userId,
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => {
  const y = createFiltersToScopes(
    filters,
    topicToQueryForReportType(reportType),
    options,
    userId,
  );
  console.log('^^^^^', y[0], Object.values(y[1]), y[2], y[3], '^^^^^^');
  return y;
};

export {
  topicToQueryForReportType,
  reportsFiltersToScopes,
};

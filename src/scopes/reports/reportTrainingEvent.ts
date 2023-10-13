import { filterTableEnums, filterValueEnums } from '../helpers/enum';
import { filterNumerics } from '../helpers/numeric';

const topicToQuery = {
  region: filterNumerics('reportTraningEvent', 'reportId'),
  eventId: undefined, // TODO
  name: undefined, // TODO
  organizer: filterTableEnums('organizer'),
  trainingType: filterValueEnums('reportTrainingEvent', 'trainingType'),
  vision: undefined, // TODO
};

export {
  topicToQuery,
};

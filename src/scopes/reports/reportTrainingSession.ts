import { filterTableEnums, filterValueEnums } from '../helpers/enum';
import { filterNumerics } from '../helpers/numeric';

const topicToQuery = {
  region: filterNumerics('reportTraningEvent', 'reportId'),
  name: undefined, // TODO
};

export {
  // eslint-disable-next-line import/prefer-default-export
  topicToQuery,
};

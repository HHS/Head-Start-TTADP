import approvalRateByDeadline from './approvalRateByDeadline';
import dashboardOverview from './dashboardOverview';
import frequencyGraph from './frequencyGraph';
import goalStatusByGoalName from './goalStatusByGoalName';
import activeDeficientCitationsWithTtaSupport from './monitoring/activeDeficientCitationsWithTtaSupport';
import monitoringOverview from './monitoring/monitoringOverview';
import monitoringTta from './monitoring/monitoringTta';
import reportCountByFindingCategory from './monitoring/reportCountByFindingCategory';
import overview from './overview';
import standardGoalsList from './standardGoalsList';
import targetPopulationTable from './targetPopulationTable';
import { topicFrequencyGraph } from './topicFrequencyGraph';
import totalHrsAndRecipientGraph from './totalHrsAndRecipientGraph';
import trHoursOfTrainingByNationalCenter from './trHoursOfTrainingByNationalCenter';
import trOverview from './trOverview';
import trSessionsByTopic from './trSessionsByTopic';
import trStandardGoalList from './trStandardGoalList';

/*
  All widgets need to be added to this object
*/
export default {
  overview,
  dashboardOverview,
  totalHrsAndRecipientGraph,
  standardGoalsList,

  topicFrequencyGraph,
  targetPopulationTable,
  frequencyGraph,
  goalStatusByGoalName,

  trOverview,
  trStandardGoalList,
  trSessionsByTopic,
  trHoursOfTrainingByNationalCenter,
  approvalRateByDeadline,

  // Monitoring widgets
  activeDeficientCitationsWithTtaSupport,
  monitoringOverview,
  reportCountByFindingCategory,
  monitoringTta,
};

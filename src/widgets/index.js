import overview from './overview';
import dashboardOverview from './dashboardOverview';
import totalHrsAndRecipientGraph from './totalHrsAndRecipientGraph';
import reasonList from './reasonList';
import { topicFrequencyGraph } from './topicFrequencyGraph';
import targetPopulationTable from './targetPopulationTable';
import frequencyGraph from './frequencyGraph';
import goalStatusByGoalName from './goalStatusByGoalName';
// ----
// regional goal dashboard
import goalsByStatus from './regionalGoalDashboard/goalsByStatus';
import goalsPercentage from './regionalGoalDashboard/goalsPercentage';
import topicsByGoalStatus from './regionalGoalDashboard/topicsByGoalStatus';
import trOverview from './trOverview';

/*
  All widgets need to be added to this object
*/
export default {
  overview,
  trOverview,
  dashboardOverview,
  totalHrsAndRecipientGraph,
  reasonList,
  topicFrequencyGraph,
  targetPopulationTable,
  frequencyGraph,
  goalStatusByGoalName,

  goalsByStatus,
  goalsPercentage,
  topicsByGoalStatus,
};

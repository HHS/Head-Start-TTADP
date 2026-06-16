import approvalRateByDeadline from './approvalRateByDeadline';
import approvedARAndTRByGoalCategory from './approvedARAndTRByGoalCategory';
import dashboardOverview from './dashboardOverview';
import frequencyGraph from './frequencyGraph';
import goalDashboard from './goalDashboard';
import goalDashboardGoals from './goalDashboardGoals';
import goalStatusByGoalName from './goalStatusByGoalName';
import activeDeficientCitationsWithTtaSupport from './monitoring/activeDeficientCitationsWithTtaSupport';
import activeNoncompliantCitationsWithTtaSupport from './monitoring/activeNoncompliantCitationsWithTtaSupport';
import compliantFollowUpReviewsWithTtaSupport from './monitoring/compliantFollowUpReviewsWithTtaSupport';
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
import trSessionsForRecipient from './trSessionsForRecipient';
import trStandardGoalList from './trStandardGoalList';
import ttaHistoryOverview from './ttaHistoryOverview';

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
  trSessionsForRecipient,
  ttaHistoryOverview,
  trHoursOfTrainingByNationalCenter,
  approvalRateByDeadline,

  // Monitoring widgets
  activeDeficientCitationsWithTtaSupport,
  activeNoncompliantCitationsWithTtaSupport,
  compliantFollowUpReviewsWithTtaSupport,
  monitoringOverview,
  reportCountByFindingCategory,
  monitoringTta,

  goalDashboard,
  goalDashboardGoals,
  approvedARAndTRByGoalCategory,
};

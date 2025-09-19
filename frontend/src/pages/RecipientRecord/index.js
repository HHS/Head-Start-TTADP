import React, { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Switch, Route, useHistory } from 'react-router';
import { DECIMAL_BASE } from '@ttahub/common';
import { getRecipient } from '../../fetchers/recipient';
import RecipientTabs from './components/RecipientTabs';
import './index.scss';
import Profile from './pages/Profile';
import TTAHistory from './pages/TTAHistory';
import GoalsObjectives from './pages/GoalsObjectives';
import PrintGoals from './pages/PrintGoals';
import FilterContext from '../../FilterContext';
import { GOALS_OBJECTIVES_FILTER_KEY } from './pages/constants';
import CommunicationLog from './pages/CommunicationLog';
import CommunicationLogForm from './pages/CommunicationLogForm';
import ViewCommunicationLog from './pages/ViewCommunicationLog';
import { GrantDataProvider } from './pages/GrantDataContext';
import ViewGoalDetails from './pages/ViewStandardGoals';
import Monitoring from './pages/Monitoring';
import FeatureFlag from '../../components/FeatureFlag';
import AppLoadingContext from '../../AppLoadingContext';
import StandardGoalForm from '../StandardGoalForm';
import UpdateStandardGoal from '../StandardGoalForm/UpdateStandardGoal';
import RestartStandardGoal from '../StandardGoalForm/RestartStandardGoal';
import NewReportButton from '../../components/NewReportButton';

export function PageWithHeading({
  children,
  regionId,
  recipientId,
  error,
  recipientNameWithRegion,
  backLink,
  slug,
  inlineHeadingChildren,
}) {
  const headerMargin = backLink.props.children ? 'margin-top-0' : 'margin-top-5';
  return (
    <div>
      <RecipientTabs region={regionId} recipientId={recipientId} backLink={backLink} />
      {
            error ? (
              <div className="usa-alert usa-alert--error" role="alert">
                <div className="usa-alert__body">
                  <p className="usa-alert__text">
                    {error}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="display-flex">
                  <h1 className={`ttahub-recipient-record--heading ${slug} page-heading ${headerMargin} margin-bottom-3`}>
                    {recipientNameWithRegion}
                  </h1>
                  <div>
                    {inlineHeadingChildren}
                  </div>
                </div>
                {children}
              </>
            )
          }
    </div>
  );
}

PageWithHeading.propTypes = {
  children: PropTypes.node.isRequired,
  regionId: PropTypes.string.isRequired,
  recipientId: PropTypes.string.isRequired,
  error: PropTypes.string,
  recipientNameWithRegion: PropTypes.string.isRequired,
  backLink: PropTypes.node,
  slug: PropTypes.string,
  inlineHeadingChildren: PropTypes.node,
};

PageWithHeading.defaultProps = {
  error: '',
  backLink: <Link className="ttahub-recipient-record--tabs_back-to-search margin-bottom-2 display-inline-block" to="/recipient-tta-records">Back to search</Link>,
  slug: '',
  inlineHeadingChildren: null,
};

export default function RecipientRecord({ match, hasAlerts }) {
  const history = useHistory();
  const { recipientId, regionId } = match.params;

  const { setIsAppLoading } = useContext(AppLoadingContext);
  const [recipientData, setRecipientData] = useState({
    'grants.programSpecialistName': '',
    'grants.id': '',
    'grants.startDate': '',
    'grants.endDate': '',
    'grants.number': '',
    'grants.annualFundingMonth': '',
    recipientId,
    regionId,
    recipientName: '',
    missingStandardGoals: [],
  });

  useDeepCompareEffect(() => {
    async function fetchRecipient() {
      try {
        setIsAppLoading(true);
        const recipient = await getRecipient(recipientId, regionId);
        if (recipient) {
          setRecipientData({
            ...recipient, recipientId, regionId, recipientName: recipient.name,
          });
        }
      } catch (e) {
        history.push(`/something-went-wrong/${e.status}`);
      } finally {
        setIsAppLoading(false);
      }
    }

    // if this isn't here, then we refetch each time the URL changes (i.e., going from tab to tab)
    if (recipientData.recipientName) {
      return;
    }

    const id = parseInt(recipientId, DECIMAL_BASE);
    const region = parseInt(regionId, DECIMAL_BASE);
    fetchRecipient(id, region);
  }, [recipientData.recipientName, recipientId, match.params, regionId]);

  const { recipientName } = recipientData;
  const recipientNameWithRegion = `${recipientName} - Region ${regionId}`;

  return (
    <>
      <Helmet titleTemplate={`%s - ${recipientName} | TTA Hub`} defaultTitle="Recipient TTA Record | TTA Hub" />

      <Switch>
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/tta-history"
          render={() => (
            <PageWithHeading
              regionId={regionId}
              recipientId={recipientId}
              recipientNameWithRegion={recipientNameWithRegion}
              slug="tta-history"
              hasAlerts={hasAlerts}
            >
              <TTAHistory
                recipientId={recipientId}
                regionId={regionId}
                recipientName={recipientName}
              />
            </PageWithHeading>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/profile"
          render={() => (
            <PageWithHeading
              regionId={regionId}
              recipientId={recipientId}
              recipientNameWithRegion={recipientNameWithRegion}
              hasAlerts={hasAlerts}
            >
              <GrantDataProvider>
                <Profile
                  recipientName={recipientName}
                  regionId={regionId}
                  recipientId={recipientId}
                  recipientSummary={recipientData}
                />
              </GrantDataProvider>
            </PageWithHeading>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/rttapa/print"
          render={({ location }) => (
            <PageWithHeading
              regionId={regionId}
              recipientId={recipientId}
              recipientNameWithRegion={`TTA goals for ${recipientNameWithRegion}`}
              slug="print-goals"
              hasAlerts={hasAlerts}
              backLink={(
                <Link
                  className="ttahub-recipient-record--tabs_back-to-search margin-top-2 margin-bottom-2 display-inline-block"
                  to={`/recipient-tta-records/${recipientId}/region/${regionId}/rttapa${window.location.search}`}
                >
                  Back to goals table
                </Link>
              )}
            >
              <FilterContext.Provider value={{
                filterKey: GOALS_OBJECTIVES_FILTER_KEY(recipientId),
              }}
              >
                <PrintGoals
                  recipientId={recipientId}
                  regionId={regionId}
                  location={location}
                />
              </FilterContext.Provider>

            </PageWithHeading>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/rttapa"
          render={({ location }) => (
            <PageWithHeading
              regionId={regionId}
              recipientId={recipientId}
              recipientNameWithRegion={recipientNameWithRegion}
              hasAlerts={hasAlerts}
            >
              <GoalsObjectives
                location={location}
                recipientId={recipientId}
                regionId={regionId}
                recipient={recipientData}
                recipientName={recipientName}
              />
            </PageWithHeading>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/goals/new"
          render={() => (
            <>
              <Helmet>
                <title>Create a New Goal</title>
              </Helmet>
              <StandardGoalForm
                recipient={recipientData}
              />
            </>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/goals/standard"
          render={() => (
            <ViewGoalDetails
              regionId={regionId}
              recipient={recipientData}
            />
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/standard-goals/:goalTemplateId/grant/:grantId/restart"
          render={() => (
            <RestartStandardGoal
              recipient={recipientData}
            />
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/standard-goals/:goalTemplateId/grant/:grantId"
          render={() => (
            <UpdateStandardGoal
              recipient={recipientData}
            />
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/communication/:communicationLogId([0-9]*)/view"
          render={({ match: routerMatch }) => (
            <ViewCommunicationLog
              recipientName={recipientName}
              match={routerMatch}
            />
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/communication/:communicationLogId(new|[0-9]*)/:currentPage([a-z\-]*)?"
          render={({ match: routerMatch }) => (
            <CommunicationLogForm
              recipientName={recipientName}
              match={routerMatch}
            />
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/communication"
          render={() => (
            <>
              <RecipientTabs region={regionId} recipientId={recipientId} />
              <div className="recipient-comm-log-header">
                <h1 className="page-heading">{recipientNameWithRegion}</h1>
                <div>
                  <NewReportButton to={`/recipient-tta-records/${recipientId}/region/${regionId}/communication/new`}>
                    Add communication
                  </NewReportButton>
                </div>
              </div>
              <CommunicationLog
                regionId={regionId}
                recipientName={recipientName}
                recipientId={recipientId}
              />
            </>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/monitoring/:currentPage([a-z\-]*)?"
          render={({ match: routerMatch }) => (
            <FeatureFlag flag="monitoring_integration">
              <PageWithHeading
                regionId={regionId}
                recipientId={recipientId}
                recipientNameWithRegion={recipientNameWithRegion}
                hasAlerts={hasAlerts}
                backLink={<></>}
              >
                <Monitoring
                  match={routerMatch}
                />
              </PageWithHeading>
            </FeatureFlag>
          )}
        />
        <Route
          render={() => (
            <PageWithHeading
              regionId={regionId}
              recipientId={recipientId}
              recipientNameWithRegion={recipientNameWithRegion}
              hasAlerts={hasAlerts}
            >
              <Profile
                recipientName={recipientName}
                regionId={regionId}
                recipientSummary={recipientData}
              />
            </PageWithHeading>
          )}
        />
      </Switch>
    </>
  );
}

RecipientRecord.propTypes = {
  hasAlerts: PropTypes.bool.isRequired,
  match: ReactRouterPropTypes.match.isRequired,
};

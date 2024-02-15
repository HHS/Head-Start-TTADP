import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Switch, Route } from 'react-router';
import { DECIMAL_BASE } from '@ttahub/common';
import { getMergeGoalPermissions, getRecipient } from '../../fetchers/recipient';
import RecipientTabs from './components/RecipientTabs';
import { HTTPError } from '../../fetchers';
import './index.scss';
import Profile from './pages/Profile';
import TTAHistory from './pages/TTAHistory';
import GoalsObjectives from './pages/GoalsObjectives';
import GoalForm from '../../components/GoalForm';
import PrintGoals from './pages/PrintGoals';
import FilterContext from '../../FilterContext';
import { GOALS_OBJECTIVES_FILTER_KEY } from './pages/constants';
import MergeGoals from './pages/MergeGoals';
import CommunicationLog from './pages/CommunicationLog';
import CommunicationLogForm from './pages/CommunicationLogForm';
import ViewCommunicationLog from './pages/ViewCommunicationLog';

export function PageWithHeading({
  children,
  regionId,
  recipientId,
  error,
  recipientNameWithRegion,
  backLink,
  slug,
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
                <h1 className={`ttahub-recipient-record--heading ${slug} page-heading ${headerMargin} margin-bottom-3`}>
                  {recipientNameWithRegion}
                </h1>
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
};

PageWithHeading.defaultProps = {
  error: '',
  backLink: <Link className="ttahub-recipient-record--tabs_back-to-search margin-bottom-2 display-inline-block" to="/recipient-tta-records">Back to search</Link>,
  slug: '',
};

export default function RecipientRecord({ match, hasAlerts }) {
  const { recipientId, regionId } = match.params;

  const [loading, setLoading] = useState(true);
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
  });

  const [error, setError] = useState();
  const [canMergeGoals, setCanMergeGoals] = useState(false);

  useEffect(() => {
    async function fetchMergePermissions() {
      try {
        const { canMergeGoalsForRecipient } = await getMergeGoalPermissions(
          String(recipientId),
          String(regionId),
        );
        setCanMergeGoals(canMergeGoalsForRecipient);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setCanMergeGoals(false);
      }
    }

    fetchMergePermissions();
  }, [recipientId, regionId]);

  useDeepCompareEffect(() => {
    async function fetchRecipient() {
      try {
        setLoading(true);
        const recipient = await getRecipient(recipientId, regionId);
        if (recipient) {
          setRecipientData({
            ...recipient, recipientId, regionId, recipientName: recipient.name,
          });
        }
      } catch (e) {
        if (e instanceof HTTPError && e.status === 404) {
          setError('Recipient record not found');
        } else {
          setError('There was an error fetching recipient data');
        }
      } finally {
        setLoading(false);
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

  if (loading) {
    return <div>loading...</div>;
  }

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
              error={error}
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
              error={error}
              recipientNameWithRegion={recipientNameWithRegion}
              hasAlerts={hasAlerts}
            >
              <Profile
                recipientName={recipientName}
                regionId={regionId}
                recipientId={recipientId}
                recipientSummary={recipientData}
              />
            </PageWithHeading>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/rttapa/print"
          render={({ location }) => (
            <PageWithHeading
              regionId={regionId}
              recipientId={recipientId}
              error={error}
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
              error={error}
              recipientNameWithRegion={recipientNameWithRegion}
              hasAlerts={hasAlerts}
            >
              <GoalsObjectives
                location={location}
                recipientId={recipientId}
                regionId={regionId}
                recipient={recipientData}
                recipientName={recipientName}
                canMergeGoals={canMergeGoals}
              />
            </PageWithHeading>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/goals/merge/:goalGroupId"
          render={({ location, match: routeMatch }) => (
            <>
              <Helmet>
                <title>These Goals Might Be Duplicates</title>
              </Helmet>
              <MergeGoals
                regionId={regionId}
                recipientId={recipientId}
                match={routeMatch}
                location={location}
                recipientNameWithRegion={recipientNameWithRegion}
                canMergeGoals={canMergeGoals}
              />
            </>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/goals/new"
          render={() => (
            <>
              <Helmet>
                <title>Create a New Goal</title>
              </Helmet>
              <GoalForm
                regionId={regionId}
                recipient={recipientData}
                showRTRnavigation
                isNew
              />
            </>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/goals"
          render={() => (
            <GoalForm
              regionId={regionId}
              recipient={recipientData}
              showRTRnavigation
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
            <PageWithHeading
              regionId={regionId}
              recipientId={recipientId}
              error={error}
              recipientNameWithRegion={recipientNameWithRegion}
              hasAlerts={hasAlerts}
            >
              <CommunicationLog
                regionId={regionId}
                recipientName={recipientName}
                recipientId={recipientId}
              />
            </PageWithHeading>
          )}
        />

        <Route
          render={() => (
            <PageWithHeading
              regionId={regionId}
              recipientId={recipientId}
              error={error}
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

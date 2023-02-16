import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Switch, Route } from 'react-router';
import { DECIMAL_BASE } from '../../Constants';
import { getRecipient } from '../../fetchers/recipient';
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
import RTTAPA from './pages/RTTAPA';

function PageWithHeading({
  children,
  regionId,
  recipientId,
  error,
  recipientNameWithRegion,
  backLink,
  slug,
}) {
  return (
    <>
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
                <h1 className={`ttahub-recipient-record--heading ${slug} page-heading margin-top-0 margin-bottom-1 margin-left-2`}>
                  {recipientNameWithRegion}
                </h1>
                {children}
              </>
            )
          }
    </>
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
  backLink: <Link className="ttahub-recipient-record--tabs_back-to-search margin-top-2 margin-bottom-3 display-inline-block" to="/recipient-tta-records">Back to search</Link>,
  slug: '',
};

export default function RecipientRecord({ match }) {
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

  useEffect(() => {
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
      <Helmet>
        <title>
          Recipient Profile -
          {' '}
          {recipientNameWithRegion}
        </title>
      </Helmet>

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
            >
              <Profile
                recipientName={recipientName}
                regionId={regionId}
                recipientSummary={recipientData}
              />
            </PageWithHeading>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/goals-objectives/print"
          render={({ location }) => (
            <PageWithHeading
              regionId={regionId}
              recipientId={recipientId}
              error={error}
              recipientNameWithRegion={`TTA goals for ${recipientNameWithRegion}`}
              slug="print-goals"
              backLink={(
                <Link
                  className="ttahub-recipient-record--tabs_back-to-search margin-top-2 margin-bottom-3 display-inline-block"
                  to={`/recipient-tta-records/${recipientId}/region/${regionId}/goals-objectives${window.location.search}`}
                >
                  Back to goals table
                </Link>
              )}
            >
              <FilterContext.Provider value={{ filterKey: GOALS_OBJECTIVES_FILTER_KEY }}>
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
          path="/recipient-tta-records/:recipientId/region/:regionId/goals-objectives"
          render={({ location }) => (
            <PageWithHeading
              regionId={regionId}
              recipientId={recipientId}
              error={error}
              recipientNameWithRegion={recipientNameWithRegion}
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
                <title>
                  Create a goal for
                  {' '}
                  {recipientName}
                </title>
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
          path="/recipient-tta-records/:recipientId/region/:regionId/rttapa"
          render={({ location }) => (
            <RTTAPA location={location} />
          )}
        />
        <Route
          render={() => (
            <PageWithHeading
              regionId={regionId}
              recipientId={recipientId}
              error={error}
              recipientNameWithRegion={recipientNameWithRegion}
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
  match: ReactRouterPropTypes.match.isRequired,
};

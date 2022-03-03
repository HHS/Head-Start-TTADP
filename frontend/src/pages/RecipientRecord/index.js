import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Switch, Route } from 'react-router';
import { DECIMAL_BASE } from '../../Constants';
import { getRecipient } from '../../fetchers/recipient';
import RecipientTabs from './components/RecipientTabs';
import FeatureFlag from '../../components/FeatureFlag';
import { HTTPError } from '../../fetchers';
import './index.css';
import Profile from './pages/Profile';
import TTAHistory from './pages/TTAHistory';
import GoalsObjectives from './pages/GoalsObjectives';
import CreateGoal from '../../components/CreateGoal';

function PageWithHeading({
  children,
  regionId,
  recipientId,
  error,
  recipientNameWithRegion,
}) {
  return (
    <>
      <RecipientTabs region={regionId} recipientId={recipientId} />
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
                <h1 className="ttahub-recipient-record--heading margin-top-0 margin-bottom-1 margin-left-2">
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
};

PageWithHeading.defaultProps = {
  error: '',
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
          path="/recipient-tta-records/:recipientId/region/:regionId/goals-objectives"
          render={() => (
            <PageWithHeading
              regionId={regionId}
              recipientId={recipientId}
              error={error}
              recipientNameWithRegion={recipientNameWithRegion}
            >
              <FeatureFlag flag="recipient_goals_objectives" renderNotFound>
                <GoalsObjectives
                  recipientId={recipientId}
                  regionId={regionId}
                  recipient={recipientData}
                />
              </FeatureFlag>
            </PageWithHeading>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId/region/:regionId/goal/:goalId"
          render={() => (
            <FeatureFlag flag="recipient_goals_objectives" renderNotFound>
              <CreateGoal recipient={recipientData} />
            </FeatureFlag>
          )}
        />
      </Switch>
    </>
  );
}

RecipientRecord.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

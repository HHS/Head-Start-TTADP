import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';

import { Switch, Route } from 'react-router';
import { Helmet } from 'react-helmet';
import { DECIMAL_BASE } from '../../Constants';
import { getRecipient } from '../../fetchers/recipient';
import RecipientTabs from './components/RecipientTabs';
import FeatureFlag from '../../components/FeatureFlag';
import { HTTPError } from '../../fetchers';
import './index.css';
import Profile from './pages/Profile';
import TTAHistory from './pages/TTAHistory';
import GoalsObjectives from './pages/GoalsObjectives';

export default function RecipientRecord({ match, location }) {
  const { recipientId } = match.params;
  const regionId = new URLSearchParams(location.search).get('region');

  const [recipientData, setRecipientData] = useState({
    'grants.programSpecialistName': '',
    'grants.id': '',
    'grants.startDate': '',
    'grants.endDate': '',
    'grants.number': '',
    recipientId,
    regionId,
    recipientName: '',
  });

  const [error, setError] = useState();

  useEffect(() => {
    async function fetchRecipient() {
      try {
        const recipient = await getRecipient(recipientId, regionId);
        if (recipient) {
          setRecipientData({
            ...recipient, recipientId, regionId, recipientName: recipient.name,
          });
        }
      } catch (e) {
        if (e instanceof HTTPError) {
          if (e.status === 404) {
            setError('Recipient record not found');
          } else {
            setError('There was an error fetching recipient data');
          }
        }
      }
    }

    // if this isn't here, then we refetch each time the URL changes (i.e., going from tab to tab)
    if (recipientData.recipientName) {
      return;
    }

    try {
      const id = parseInt(recipientId, DECIMAL_BASE);
      const region = parseInt(regionId, DECIMAL_BASE);
      fetchRecipient(id, region);
    } catch (err) {
      setError('There was an error fetching recipient data');
    }
  }, [recipientData.recipientName, recipientId, match.params, regionId]);

  const { recipientName } = recipientData;
  const recipientNameWithRegion = `${recipientName} - Region ${regionId}`;

  return (
    <>
      <Helmet>
        <title>
          Recipient Profile -
          {' '}
          {recipientNameWithRegion}
        </title>
      </Helmet>
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
            <Switch>
              <Route
                path="/recipient-tta-records/:recipientId/tta-history"
                render={() => (
                  <TTAHistory
                    recipientId={recipientId}
                    regionId={regionId}
                    recipientName={recipientName}
                  />
                )}
              />
              <Route
                path="/recipient-tta-records/:recipientId/profile"
                render={() => (
                  <Profile
                    recipientName={recipientName}
                    regionId={regionId}
                    recipientSummary={recipientData}
                  />
                )}
              />
              <FeatureFlag flag="recipient_goals_objectives">
                <Route
                  path="/recipient-tta-records/:recipientId/goals-objectives"
                  render={() => (
                    <GoalsObjectives />
                  )}
                />
              </FeatureFlag>
            </Switch>
          </>
        )
      }
    </>
  );
}

RecipientRecord.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  location: ReactRouterPropTypes.location.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

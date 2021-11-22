import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';

import { Switch, Route } from 'react-router';
import { Helmet } from 'react-helmet';
import { DECIMAL_BASE } from '../../Constants';
import { getRecipient } from '../../fetchers/recipient';
import RecipientTabs from './components/RecipientTabs';

import { HTTPError } from '../../fetchers';
import './index.css';
import Profile from './pages/Profile';
import TTAHistory from './pages/TTAHistory';

export default function RecipientRecord({ match, location }) {
  const { recipientId } = match.params;
  const regionId = new URLSearchParams(location.search).get('region');
  const [recipientName, setRecipientName] = useState(` - Region ${regionId}`);
  const [recipientSummary, setRecipientSummary] = useState({
    'grants.programSpecialistName': '',
    'grants.id': '',
    'grants.startDate': '',
    'grants.endDate': '',
    'grants.number': '',
    recipientId,
  });

  const [error, setError] = useState();

  useEffect(() => {
    async function fetchRecipient(id, region) {
      try {
        const recipient = await getRecipient(id, region);
        if (recipient) {
          setRecipientName(`${recipient.name} - Region ${regionId}`);
          setRecipientSummary({ recipientId, ...recipient });
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

    try {
      const id = parseInt(recipientId, DECIMAL_BASE);
      const region = parseInt(regionId, DECIMAL_BASE);
      fetchRecipient(id, region);
    } catch (err) {
      setError('There was an error fetching recipient data');
    }
  }, [recipientId, match.params, regionId]);

  return (
    <>
      <Helmet>
        <title>
          Recipient Profile -
          {' '}
          {recipientName}
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
            <h1 className="ttahub-grantee-record--heading margin-top-0 margin-bottom-1 margin-left-2">{recipientName}</h1>
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
                    recipientSummary={recipientSummary}
                  />
                )}
              />
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

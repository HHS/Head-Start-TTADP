import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Switch, Route } from 'react-router';
import { DECIMAL_BASE } from '../../Constants';
import { getGrantee } from '../../fetchers/grantee';
import GranteeTabs from './components/GranteeTabs';
import { HTTPError } from '../../fetchers';
import './index.css';
import Profile from './pages/Profile';
import TTAHistory from './pages/TTAHistory';

export default function GranteeRecord({ match }) {
  const { granteeId, regionId } = match.params;
  const [granteeData, setGranteeData] = useState({
    'grants.programSpecialistName': '',
    'grants.id': '',
    'grants.startDate': '',
    'grants.endDate': '',
    'grants.number': '',
    granteeId,
    regionId,
    granteeName: '',
  });

  const [error, setError] = useState();

  useEffect(() => {
    async function fetchGrantee() {
      try {
        const grantee = await getGrantee(granteeId, regionId);
        if (grantee) {
          setGranteeData({
            ...grantee, granteeId, regionId, granteeName: grantee.name,
          });
        }
      } catch (e) {
        if (e instanceof HTTPError) {
          if (e.status === 404) {
            setError('Grantee record not found');
          } else {
            setError('There was an error fetching grantee data');
          }
        }
      }
    }

    // if this isn't here, then we refetch each time the URL changes (i.e., going from tab to tab)
    if (granteeData.granteeName) {
      return;
    }

    try {
      const id = parseInt(granteeId, DECIMAL_BASE);
      const region = parseInt(regionId, DECIMAL_BASE);
      fetchGrantee(id, region);
    } catch (err) {
      setError('There was an error fetching grantee data');
    }
  }, [granteeData.granteeName, granteeId, match.params, regionId]);

  const { granteeName } = granteeData;

  return (
    <>
      <Helmet>
        <title>
          Grantee Profile -
          {' '}
          {granteeName}
        </title>
      </Helmet>
      <GranteeTabs region={regionId} granteeId={granteeId} />
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
            <h1 className="ttahub-grantee-record--heading margin-top-0 margin-bottom-2 margin-left-2">
              {granteeName}
              - Region
              {' '}
              {regionId}
            </h1>
            <Switch>
              <Route
                path="/grantee/:granteeId/region/:regionId/tta-history"
                render={() => (
                  <TTAHistory
                    granteeId={granteeId}
                    regionId={regionId}
                    granteeName={granteeName}
                  />
                )}
              />
              <Route
                path="/grantee/:granteeId/region/:regionId/profile"
                render={() => (
                  <Profile
                    granteeName={granteeName}
                    regionId={regionId}
                    granteeSummary={granteeData}
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

GranteeRecord.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

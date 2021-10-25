import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { v4 as uuidv4 } from 'uuid';
import { Switch, Route } from 'react-router';
import { DECIMAL_BASE } from '../../Constants';
import { getGrantee } from '../../fetchers/grantee';
import GranteeTabs from './components/GranteeTabs';
import { HTTPError } from '../../fetchers';
import './index.css';
import Profile from './pages/Profile';
import TTAHistory from './pages/TTAHistory';

export default function GranteeRecord({ match, location }) {
  const { granteeId } = match.params;
  const regionId = new URLSearchParams(location.search).get('region');
  const [granteeName, setGranteeName] = useState(` - Region ${regionId}`);
  const [granteeSummary, setGranteeSummary] = useState({
    'grants.programSpecialistName': '',
    'grants.id': '',
    'grants.startDate': '',
    'grants.endDate': '',
    'grants.number': '',
    granteeId,
  });
  const [baseFilters, setBaseFilters] = useState([]);
  const [filters, setFilters] = useState([]);
  const [error, setError] = useState();

  useEffect(() => {
    const filtersToApply = [
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'Contains',
        query: regionId,
      },
      {
        id: uuidv4(),
        topic: 'granteeId',
        condition: 'Contains',
        query: granteeId,
      },
    ];

    setBaseFilters(filtersToApply);
  }, [granteeId, regionId]);

  const onApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  useEffect(() => {
    async function fetchGrantee(id, region) {
      try {
        const grantee = await getGrantee(id, region);
        if (grantee) {
          setGranteeName(`${grantee.name} - Region ${regionId}`);
          setGranteeSummary({ granteeId, ...grantee });
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

    try {
      const id = parseInt(granteeId, DECIMAL_BASE);
      const region = parseInt(regionId, DECIMAL_BASE);
      fetchGrantee(id, region);
    } catch (err) {
      setError('There was an error fetching grantee data');
    }
  }, [granteeId, match.params, regionId]);

  return (
    <>
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
        <h1 className="landing margin-top-0 margin-bottom-1 margin-left-2">{granteeName}</h1>
        <Switch>
          <Route
            path="/grantee/:granteeId/tta-history"
            render={() => (
              <TTAHistory
                baseFilters={baseFilters}
                filters={filters}
                onApplyFilters={onApplyFilters}
              />
            )}
          />
          <Route
            path="/grantee/:granteeId/profile"
            render={() => <Profile regionId={regionId} granteeSummary={granteeSummary} />}
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
  location: ReactRouterPropTypes.location.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

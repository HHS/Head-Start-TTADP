import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import ReactRouterPropTypes from 'react-router-prop-types';
import { DECIMAL_BASE } from '../../Constants';
import { getGrantee } from '../../fetchers/grantee';
import GranteeSummary from './components/GranteeSummary';
import './index.css';

export default function GranteeRecord({ match }) {
  const [granteeName, setGranteeName] = useState(` - Region ${match.params.regionId}`);
  const [granteeSummary, setGranteeSummary] = useState({
    'grants.programSpecialistName': '',
    'grants.id': '',
    'grants.startDate': '',
    'grants.endDate': '',
    'grants.number': '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchGrantee(granteeId, regionId) {
      const grantee = await getGrantee(granteeId, regionId);

      if (!grantee) {
        setError('Grantee record not found');
      }

      setGranteeName(`${grantee.name} - Region ${regionId}`);
      setGranteeSummary(grantee);
    }

    try {
      const granteeId = parseInt(match.params.granteeId, DECIMAL_BASE);
      const regionId = parseInt(match.params.regionId, DECIMAL_BASE);
      fetchGrantee(granteeId, regionId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
      setError('There was error ');
    }
  }, [match.params]);

  if (error) {
    return (
      <div className="usa-alert usa-alert--error" role="alert">
        <div className="usa-alert__body">
          <p className="usa-alert__text">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <span className="text-bold">Grantee TTA Record</span>
      <h1 className="landing margin-top-1">{granteeName}</h1>
      <Grid row>
        <Grid col={6}>
          <GranteeSummary summary={granteeSummary} />
        </Grid>
        <Grid col={6}>
          <GranteeSummary summary={granteeSummary} />
        </Grid>
      </Grid>
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

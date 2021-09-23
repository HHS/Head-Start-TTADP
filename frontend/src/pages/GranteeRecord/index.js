import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import ReactRouterPropTypes from 'react-router-prop-types';
import { v4 as uuidv4 } from 'uuid';
import { DECIMAL_BASE } from '../../Constants';
import { getGrantee } from '../../fetchers/grantee';
import GranteeSummary from './components/GranteeSummary';
import GranteeOverview from '../../widgets/GranteeOverview';
import './index.css';

export default function GranteeRecord({ match }) {
  const { regionId, granteeId } = match.params;
  const [granteeName, setGranteeName] = useState(` - Region ${regionId}`);
  const [granteeSummary, setGranteeSummary] = useState({
    'grants.programSpecialistName': '',
    'grants.id': '',
    'grants.startDate': '',
    'grants.endDate': '',
    'grants.number': '',
  });
  const [filters, setFilters] = useState([]);
  const [error, setError] = useState('');

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

    setFilters(filtersToApply);
  }, [granteeId, regionId]);

  useEffect(() => {
    async function fetchGrantee(id, region) {
      const grantee = await getGrantee(id, region);

      if (!grantee) {
        setError('Grantee record not found');
      }

      setGranteeName(`${grantee.name} - Region ${regionId}`);
      setGranteeSummary(grantee);
    }

    try {
      const id = parseInt(granteeId, DECIMAL_BASE);
      const region = parseInt(regionId, DECIMAL_BASE);
      fetchGrantee(id, region);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
      setError('There was error ');
    }
  }, [granteeId, match.params, regionId]);

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
      <GranteeOverview
        filters={filters}
      />
      <Grid row>
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

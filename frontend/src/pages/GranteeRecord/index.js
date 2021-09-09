import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { DECIMAL_BASE } from '../../Constants';
import { getGrantee } from '../../fetchers/grantee';

export default function GranteeRecord({ match }) {
  const [granteeName, setGranteeName] = useState(` - Region ${match.params.regionId}`);

  useEffect(() => {
    try {
      const granteeId = parseInt(match.params.granteeId, DECIMAL_BASE);
      const regionId = parseInt(match.params.regionId, DECIMAL_BASE);

      getGrantee(granteeId, regionId).then((grantee) => {
        setGranteeName(`${grantee.name} - Region ${regionId}`);
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
    }
  }, [match.params]);

  return (
    <>
      <span>Grantee TTA Record</span>
      <h1 className="landing margin-top-1">{granteeName}</h1>
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

import React, { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { DECIMAL_BASE } from '../../../Constants';
import Container from '../../../components/Container';

export default function RTTAPA({ location }) {
  /**
     * Get the initial goal ids from the query string
     */
  const initialGoalIds = useMemo(() => {
    const { search } = location;
    const params = new URLSearchParams(search);
    return params.getAll('goalId[]').map((id) => parseInt(id, DECIMAL_BASE));
  }, [location]);

  const [initialGoalsFetched] = useState(false);
  const [goalIds] = useState(initialGoalIds);

  useEffect(() => {
    if (!initialGoalsFetched) {
      if (goalIds && goalIds.length) {
      // fetch goals for rttapa
      }
    }
  }, [goalIds, initialGoalsFetched]);

  return (
    <Container className="margin-y-3 margin-left-2 width-tablet">
      <h1 className="page-heading">
        Regional TTA plan agreement
      </h1>

    </Container>
  );
}

RTTAPA.propTypes = {
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    search: PropTypes.string.isRequired,
    hash: PropTypes.string.isRequired,
    key: PropTypes.string,
  }).isRequired,
};

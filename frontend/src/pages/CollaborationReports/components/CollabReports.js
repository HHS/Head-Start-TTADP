import React, { useCallback } from 'react';
import {
  Alert,
  Grid,
} from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import CollabReportsTable from './CollabReportsTable';
import { getReports } from '../../../fetchers/collaborationReports';
import useFetch from '../../../hooks/useFetch';
import useSessionSort from '../../../hooks/useSessionSort';

// TODO: Add filters as a dependency/prop in future
const CollabReports = ({ title, emptyMsg, showCreateMsgOnEmpty }) => {
  const [sortConfig] = useSessionSort({
    sortBy: 'id',
    direction: 'desc',
    activePage: 1,
  }, 'collabReportsTable');

  const requestSort = useCallback(() => {}, []);

  const {
    data,
    setData,
    error,
    loading,
  } = useFetch({ rows: [], count: 0 }, getReports, [], true, 'Unable to fetch reports');

  return (
    <>
      <Grid row>
        {error && (
          <Alert type="error" role="alert">
            {error}
          </Alert>
        )}
      </Grid>
      <CollabReportsTable
        data={data}
        setData={setData}
        title={title}
        loading={loading}
        emptyMsg={emptyMsg}
        showCreateMsgOnEmpty={showCreateMsgOnEmpty}
        requestSort={requestSort}
        sortConfig={sortConfig}
      />
    </>
  );
};

CollabReports.defaultProps = {
  emptyMsg: 'You have no Collaboration Reports',
  showCreateMsgOnEmpty: false,
  title: 'Collaboration Reports',
};

CollabReports.propTypes = {
  emptyMsg: PropTypes.string,
  showCreateMsgOnEmpty: PropTypes.bool,
  title: PropTypes.string,
};

export default CollabReports;

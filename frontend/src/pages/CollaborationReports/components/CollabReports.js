import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  Grid,
} from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import CollabReportsTable from './CollabReportsTable';
import { getAlerts, getReports } from '../../../fetchers/collaborationReports';
import useFetch from '../../../hooks/useFetch';
import useSessionSort from '../../../hooks/useSessionSort';
import CollabReportAlertsTable from './CollabReportAlertsTable';

// TODO: Add filters as a dependency/prop in future
const CollabReports = ({
  title,
  emptyMsg,
  showCreateMsgOnEmpty,
  isAlerts,
}) => {
  const sortKey = useMemo(() => (isAlerts ? 'collabReportAlerts' : 'collabReportsTable'), [isAlerts]);
  const [sortConfig] = useSessionSort({
    sortBy: 'id',
    direction: 'desc',
    activePage: 1,
  }, sortKey);

  const requestSort = useCallback(() => {}, []);

  const Component = isAlerts ? CollabReportAlertsTable : CollabReportsTable;
  const fetcher = isAlerts ? getAlerts : getReports;

  const {
    data,
    setData,
    error,
    loading,
  } = useFetch({ rows: [], count: 0 }, fetcher, [], true, 'Unable to fetch reports');

  return (
    <>
      <Grid row>
        {error && (
          <Alert type="error" role="alert">
            {error}
          </Alert>
        )}
      </Grid>
      <Component
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
  isAlerts: false,
};

CollabReports.propTypes = {
  emptyMsg: PropTypes.string,
  showCreateMsgOnEmpty: PropTypes.bool,
  title: PropTypes.string,
  isAlerts: PropTypes.bool,
};

export default CollabReports;

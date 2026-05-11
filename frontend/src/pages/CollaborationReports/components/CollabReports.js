import { Alert, Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import { getAlerts, getReports } from '../../../fetchers/collaborationReports';
import useFetch from '../../../hooks/useFetch';
import useRequestSort from '../../../hooks/useRequestSort';
import useSessionSort from '../../../hooks/useSessionSort';
import CollabReportAlertsTable from './CollabReportAlertsTable';
import CollabReportsTable from './CollabReportsTable';

const CollabReports = ({ title, emptyMsg, showCreateMsgOnEmpty, isAlerts, filters }) => {
  const sortKey = useMemo(
    () => (isAlerts ? 'collabReportAlerts' : 'collabReportsTable'),
    [isAlerts]
  );
  const [sortConfig, setSortConfig] = useSessionSort(
    {
      sortBy: 'id',
      direction: 'desc',
      activePage: 1,
      offset: 0,
      perPage: 10,
    },
    sortKey
  );

  const requestSort = useRequestSort(setSortConfig);

  const Component = isAlerts ? CollabReportAlertsTable : CollabReportsTable;
  const fetcher = isAlerts
    ? () => getAlerts(sortConfig, filters)
    : () => getReports(sortConfig, filters);

  const { data, setData, error, loading } = useFetch(
    { rows: [], count: 0 },
    fetcher,
    [sortConfig, filters],
    'Unable to fetch reports'
  );

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
        setSortConfig={setSortConfig}
        filters={filters}
      />
    </>
  );
};

CollabReports.defaultProps = {
  emptyMsg: 'You have no Collaboration Reports',
  showCreateMsgOnEmpty: false,
  title: 'Collaboration Reports',
  isAlerts: false,
  filters: [],
};

CollabReports.propTypes = {
  emptyMsg: PropTypes.string,
  showCreateMsgOnEmpty: PropTypes.bool,
  title: PropTypes.string,
  isAlerts: PropTypes.bool,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      topic: PropTypes.string,
      condition: PropTypes.string,
      query: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]),
    })
  ),
};

export default CollabReports;

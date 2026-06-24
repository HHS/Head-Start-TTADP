import PropTypes from 'prop-types';
import React from 'react';
import { getSessionReportsTable } from '../../../../fetchers/session';
import useFetch from '../../../../hooks/useFetch';
import useRequestSort from '../../../../hooks/useRequestSort';
import useSessionSort from '../../../../hooks/useSessionSort';
import TrainingReportsTable from '../../../RegionalDashboard/components/TrainingReportsTable';

export default function RecipientTrainingReportsTable({ filters }) {
  const [sortConfig, setSortConfig] = useSessionSort(
    {
      sortBy: 'Event_ID',
      direction: 'desc',
      activePage: 1,
      offset: 0,
    },
    'recipientTrainingReportsTable'
  );

  const requestSort = useRequestSort(setSortConfig);

  const { data, error } = useFetch(
    { rows: [], count: 0 },
    () => getSessionReportsTable(sortConfig, filters),
    [sortConfig, filters],
    'Unable to fetch training reports'
  );

  return (
    <TrainingReportsTable
      data={data}
      error={error}
      title="Approved training reports"
      emptyMsg="No training reports found"
      requestSort={requestSort}
      sortConfig={sortConfig}
      setSortConfig={setSortConfig}
      filters={filters}
    />
  );
}

RecipientTrainingReportsTable.defaultProps = {
  filters: [],
};

RecipientTrainingReportsTable.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.shape({})),
};

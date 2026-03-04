import React, { useMemo } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { formatDateRange } from '../../../utils';
import ActiveDeficientCitationsWithTtaSupport from '../../../widgets/ActiveDeficientCitationsWithTtaSupport';

const todayMinus12Months = moment().subtract(12, 'months').format('YYYY/MM/DD');
const defaultDate = formatDateRange({
  forDateTime: true,
  string: `${todayMinus12Months}-${moment().format('YYYY/MM/DD')}`,
  withSpaces: false,
});

const DEFAULT_FILTERS = [
  {
    id: uuidv4(),
    topic: 'startDate',
    condition: 'is within',
    query: defaultDate,
  },
];

export default function MonitoringReportDashboard({
  filtersToApply,
}) {
  const filters = useMemo(() => ([
    ...filtersToApply,
    ...DEFAULT_FILTERS,
  ]), [filtersToApply]);

  return (
    <div>
      <ActiveDeficientCitationsWithTtaSupport filters={filters} />
    </div>
  );
}

MonitoringReportDashboard.propTypes = {
  filtersToApply: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};

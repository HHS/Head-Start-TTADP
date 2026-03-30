import React, { useMemo } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { Grid } from '@trussworks/react-uswds';
import { formatDateRange } from '../../../utils';
import ActiveDeficientCitationsWithTtaSupport from '../../../widgets/ActiveDeficientCitationsWithTtaSupport';
import MonitoringReportDashboardOverview from '../../../widgets/MonitoringReportDashboardOverview';

export default function MonitoringReportDashboard({
  filtersToApply,
}) {
  const defaultFilters = useMemo(() => {
    const todayMinus12Months = moment().subtract(12, 'months').format('YYYY/MM/DD');
    const defaultDate = formatDateRange({
      forDateTime: true,
      string: `${todayMinus12Months}-${moment().format('YYYY/MM/DD')}`,
      withSpaces: false,
    });

    return [
      {
        id: uuidv4(),
        topic: 'startDate',
        condition: 'is within',
        query: defaultDate,
      },
    ];
  }, []);

  const filters = useMemo(() => ([
    ...filtersToApply,
    ...defaultFilters,
  ]), [filtersToApply, defaultFilters]);

  return (
    <>
      <Grid row gap>
        <MonitoringReportDashboardOverview
          filters={filters}
          loading={false}
        />
      </Grid>
      <Grid row>
        <ActiveDeficientCitationsWithTtaSupport filters={filters} />
      </Grid>
    </>
  );
}

MonitoringReportDashboard.propTypes = {
  filtersToApply: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};

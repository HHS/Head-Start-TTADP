import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import { v4 as uuidv4 } from 'uuid';
import { formatDateRange } from '../../../components/DateRangeSelect';
import ActivityReportsTable from '../../../components/ActivityReportsTable';
import FrequencyGraph from '../../../widgets/FrequencyGraph';
import Overview from '../../../widgets/DashboardOverview';
import FilterPanel from '../../../components/filter/FilterPanel';
import TargetPopulationsTable from '../../../widgets/TargetPopulationsTable';
import { expandFilters, queryStringToFilters } from '../../../utils';

import './TTAHistory.css';
import useUrlFilters from '../../../hooks/useUrlFilters';

const defaultDate = formatDateRange({
  yearToDate: true,
  forDateTime: true,
});

export default function TTAHistory({
  recipientName, recipientId, regionId,
}) {
  const params = queryStringToFilters(new URL(window.location).search.substr(1));
  const [filters, setFilters] = useUrlFilters(params.length ? params : [
    {
      id: uuidv4(),
      topic: 'startDate',
      condition: 'Is within',
      query: defaultDate,
    },
  ]);

  if (!recipientName) {
    return null;
  }

  const filtersToApply = [
    ...expandFilters(filters),
    {
      topic: 'region',
      condition: 'Is',
      query: regionId,
    },
    {
      topic: 'recipientId',
      condition: 'Contains',
      query: recipientId,
    },
  ];

  const onRemoveFilter = (id) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    if (index !== -1) {
      newFilters.splice(index, 1);
      setFilters(newFilters);
    }
  };

  const onApply = (newFilters) => {
    setFilters([
      ...newFilters,
    ]);
  };

  // we don't want to double query the API
  if (!filtersToApply.length) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>
          Recipient TTA History -
          {' '}
          {recipientName}
        </title>
      </Helmet>
      <div className="margin-x-2 maxw-widescreen">
        <div className="display-flex flex-wrap margin-bottom-2" data-testid="filter-panel">
          <FilterPanel
            filters={filters}
            onApplyFilters={onApply}
            onRemoveFilter={onRemoveFilter}
            allowedFilters={['startDate', 'role']}
            applyButtonAria="Apply filters to recipient record data"
          />
        </div>
        <Overview
          fields={[
            'Activity reports',
            'Hours of TTA',
            'Participants',
            'In-person activities',
          ]}
          showTooltips
          filters={filtersToApply}
        />
        <Grid row gap={2}>
          <Grid desktop={{ col: 8 }} tabletLg={{ col: 12 }}>
            <FrequencyGraph filters={filtersToApply} />
          </Grid>
          <Grid desktop={{ col: 4 }} tabletLg={{ col: 12 }}>
            <TargetPopulationsTable
              filters={filtersToApply}
            />
          </Grid>
        </Grid>
        <ActivityReportsTable
          filters={filtersToApply}
          showFilter={false}
          tableCaption="Activity Reports"
        />
      </div>
    </>
  );
}

TTAHistory.propTypes = {
  recipientName: PropTypes.string,
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
};

TTAHistory.defaultProps = {
  recipientName: '',
};

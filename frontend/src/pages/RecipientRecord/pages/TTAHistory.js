import React, {
  useMemo, useContext, useState, useCallback,
} from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import { v4 as uuidv4 } from 'uuid';
import ActivityReportsTable from '../../../components/ActivityReportsTable';
import FrequencyGraph from '../../../widgets/FrequencyGraph';
import Overview from '../../../widgets/DashboardOverview';
import FilterPanel from '../../../components/filter/FilterPanel';
import TargetPopulationsTable from '../../../widgets/TargetPopulationsTable';
import { expandFilters, formatDateRange } from '../../../utils';
import FilterContext from '../../../FilterContext';
import { TTAHISTORY_FILTER_CONFIG } from './constants';
import UserContext from '../../../UserContext';
import { getUserRegions } from '../../../permissions';

import useSessionFiltersAndReflectInUrl from '../../../hooks/useSessionFiltersAndReflectInUrl';

const defaultDate = formatDateRange({
  yearToDate: true,
  forDateTime: true,
});
export default function TTAHistory({
  recipientName, recipientId, regionId,
}) {
  const [resetPagination, setResetPagination] = useState(false);
  const filterKey = `ttahistory-filters-${recipientId}`;
  const { user } = useContext(UserContext);
  const regions = useMemo(() => getUserRegions(user), [user]);

  const [filters, setFiltersInHook] = useSessionFiltersAndReflectInUrl(
    filterKey,
    [
      {
        id: uuidv4(),
        topic: 'startDate',
        condition: 'is within',
        query: defaultDate,
      },
    ],
  );

  const setFilters = useCallback((newFilters) => {
    setFiltersInHook(newFilters);
    setResetPagination(true);
  }, [setFiltersInHook]);

  if (!recipientName) {
    return null;
  }

  const filtersToApply = [
    ...expandFilters(filters),
    {
      topic: 'region',
      condition: 'is',
      query: regionId,
    },
    {
      topic: 'recipientId',
      condition: 'contains',
      query: recipientId,
    },
  ];

  const onRemoveFilter = (id) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    newFilters.splice(index, 1);
    setFilters(newFilters);
  };

  const onApply = (newFilters) => {
    setFilters([
      ...newFilters,
    ]);
  };

  return (
    <>
      <Helmet>
        <title>
          Recipient TTA History -
          {' '}
          {recipientName}
        </title>
      </Helmet>
      <div className="maxw-widescreen">
        <div className="display-flex flex-wrap margin-bottom-2" data-testid="filter-panel">
          <FilterPanel
            filters={filters}
            onApplyFilters={onApply}
            onRemoveFilter={onRemoveFilter}
            filterConfig={TTAHISTORY_FILTER_CONFIG}
            applyButtonAria="Apply filters to recipient record data"
            allUserRegions={regions}
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
        <FilterContext.Provider value={{ filterKey }}>
          <ActivityReportsTable
            filters={filtersToApply}
            showFilter={false}
            tableCaption="Approved activity reports"
            exportIdPrefix="tta-history-"
            resetPagination={resetPagination}
            setResetPagination={setResetPagination}
          />
        </FilterContext.Provider>
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

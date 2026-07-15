import { Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, {
  useCallback, useContext, useMemo, useRef, useState,
} from 'react';
import { Helmet } from 'react-helmet';
import { v4 as uuidv4 } from 'uuid';
import ActivityReportsTable from '../../../components/ActivityReportsTable';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import Drawer from '../../../components/Drawer';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import FilterPanel from '../../../components/filter/FilterPanel';
import FilterContext from '../../../FilterContext';
import useSanitizedFilters from '../../../hooks/useSanitizedFilters';
import { getUserRegions } from '../../../permissions';
import UserContext from '../../../UserContext';
import { expandFilters, formatDateRange } from '../../../utils';
import ApprovedARAndTRByGoalCategory from '../../../widgets/ApprovedARAndTRByGoalCategory';
import { TTAHistoryOverview } from '../../../widgets/DashboardOverview';
import FrequencyGraph from '../../../widgets/FrequencyGraph';
import TargetPopulationsTable from '../../../widgets/TargetPopulationsTable';
import { TTAHISTORY_FILTER_CONFIG } from './constants';

const defaultDate = formatDateRange({
  yearToDate: true,
  forDateTime: true,
});

const VALID_TOPICS = new Set(TTAHISTORY_FILTER_CONFIG.map((f) => f.id));

export default function TTAHistory({ recipientName, recipientId, regionId }) {
  const pageDrawerRef = useRef(null);
  const [resetPagination, setResetPagination] = useState(false);
  // Bump the version suffix whenever filters are added or removed from the
  // config so that stale filters saved in a browser tab's session storage are
  // ignored rather than sent to the API.
  const filterKey = `ttahistory-filters-v2-${recipientId}`;
  const { user } = useContext(UserContext);
  const regions = useMemo(() => getUserRegions(user), [user]);

  const [filters, setFiltersInHook] = useSanitizedFilters(
    filterKey,
    [
      {
        id: uuidv4(),
        topic: 'startDate',
        condition: 'is within',
        query: defaultDate,
      },
    ],
    VALID_TOPICS
  );

  const setFilters = useCallback(
    (newFilters) => {
      setFiltersInHook(newFilters);
      setResetPagination(true);
    },
    [setFiltersInHook]
  );

  const filtersToApply = useMemo(
    () => [
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
    ],
    [filters, regionId, recipientId]
  );

  if (!recipientName) {
    return null;
  }

  const onRemoveFilter = (id) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    newFilters.splice(index, 1);
    setFilters(newFilters);
  };

  const onApply = (newFilters) => {
    setFilters([...newFilters]);
  };

  return (
    <>
      <Helmet>
        <title>TTA History</title>
      </Helmet>
      <div className="maxw-widescreen">
        <div
          className="display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2"
          data-testid="filter-panel"
        >
          <FilterPanel
            filters={filters}
            onApplyFilters={onApply}
            onRemoveFilter={onRemoveFilter}
            filterConfig={TTAHISTORY_FILTER_CONFIG}
            applyButtonAria="Apply filters to recipient record data"
            allUserRegions={regions}
          />
        </div>
        <div className="margin-bottom-3">
          <DrawerTriggerButton drawerTriggerRef={pageDrawerRef}>
            Learn how filters impact the data displayed
          </DrawerTriggerButton>
          <Drawer title="Filter guidance" triggerRef={pageDrawerRef}>
            <ContentFromFeedByTag tagName="ttahub-tta-history-filters" />
          </Drawer>
        </div>
        <TTAHistoryOverview
          fields={[
            'Activity reports',
            'Training report sessions',
            'Hours of TTA',
            'Participants',
            'In person activities',
          ]}
          showTooltips
          filters={filtersToApply}
        />
        <Grid row gap={2}>
          <Grid desktop={{ col: 8 }} tabletLg={{ col: 12 }}>
            <FrequencyGraph filters={filtersToApply} />
          </Grid>
          <Grid desktop={{ col: 4 }} tabletLg={{ col: 12 }}>
            <TargetPopulationsTable filters={filtersToApply} />
          </Grid>
        </Grid>
        <ApprovedARAndTRByGoalCategory filters={filtersToApply} />
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

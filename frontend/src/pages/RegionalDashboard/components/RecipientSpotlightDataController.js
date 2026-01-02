import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { DECIMAL_BASE } from '@ttahub/common';
import { Grid } from '@trussworks/react-uswds';
import { filtersToQueryString } from '../../../utils';
import { RECIPIENTS_SPOTLIGHT_PER_PAGE } from '../../../Constants';
import { getRecipientSpotlight } from '../../../fetchers/recipientSpotlight';
import AppLoadingContext from '../../../AppLoadingContext';
import useFetch from '../../../hooks/useFetch';
import useSessionSort from '../../../hooks/useSessionSort';
import FilterContext from '../../../FilterContext';
import { DashboardOverviewWidget } from '../../../widgets/DashboardOverview';
import RecipientSpotlightDashboardCards from './RecipientSpotlightDashboardCards';

export default function RecipientSpotlightDataController({
  filters,
  regionId,
  userHasOnlyOneRegion,
}) {
  // Page Behavior
  const [recipientsPerPage, setRecipientsPerPage] = useState(RECIPIENTS_SPOTLIGHT_PER_PAGE);
  const { setIsAppLoading, isAppLoading } = useContext(AppLoadingContext);
  const [currentFilters, setCurrentFilters] = useState(filtersToQueryString(filters));

  const { filterKey } = useContext(FilterContext);

  const defaultSort = {
    sortBy: 'indicatorCount',
    direction: 'desc',
  };

  // Grid and Paging
  const [sortConfig, setSortConfig] = useSessionSort({
    ...defaultSort,
    activePage: 1,
    offset: 0,
  }, `${filterKey}/${regionId}`);

  const filterQuery = filtersToQueryString(filters);

  // If filters is different from currentFilters, then reset the activePage and Offset
  useEffect(() => {
    if (filterQuery !== currentFilters) {
      setSortConfig({
        ...sortConfig,
        activePage: 1,
        offset: 0,
      });
      setCurrentFilters(filterQuery);
    }
  }, [filterQuery, currentFilters, sortConfig, setSortConfig]);

  const fetcher = () => getRecipientSpotlight(
    sortConfig.sortBy,
    sortConfig.direction,
    sortConfig.offset,
    filterQuery,
    recipientsPerPage,
  );

  const {
    data,
    error,
    loading,
  } = useFetch(
    {
      recipients: [],
      count: 0,
      overview: {
        numRecipients: '0',
        totalRecipients: '0',
        recipientPercentage: '0%',
      },
    },
    fetcher,
    [sortConfig, filterQuery, recipientsPerPage],
    'Unable to fetch recipient spotlight data',
    true, // useAppLoading
  );

  useEffect(() => {
    if (!loading && isAppLoading) {
      setIsAppLoading(false);
    }
  }, [loading, setIsAppLoading, isAppLoading]);

  // Ensure data has fallback values
  const safeData = useMemo(() => ({
    recipients: data.recipients || [],
    count: data.count || 0,
    overview: data.overview || {
      numRecipients: '0',
      totalRecipients: '0',
      recipientPercentage: '0%',
    },
  }), [data]);

  const handlePageChange = (pageNumber) => {
    setSortConfig({
      ...sortConfig,
      activePage: pageNumber,
      offset: (pageNumber - 1) * recipientsPerPage,
    });
  };

  const requestSort = (sortBy, direction) => {
    setSortConfig({
      ...sortConfig,
      sortBy,
      direction,
      activePage: 1,
      offset: 0,
    });
  };

  const perPageChange = (e) => {
    const perPageValue = parseInt(e.target.value, DECIMAL_BASE);
    setSortConfig({
      ...sortConfig,
      activePage: 1,
      offset: 0,
    });
    setRecipientsPerPage(perPageValue);
  };

  return (
    <>
      {error && (
        <div className="usa-alert usa-alert--error margin-bottom-3">
          <div className="usa-alert__body">
            <p className="usa-alert__text">{error}</p>
          </div>
        </div>
      )}
      <Grid row gap>
        <Grid col={3}>
          <DashboardOverviewWidget
            data={safeData.overview}
            fields={['Recipients with priority indicators']}
            showTooltips
            maxToolTipWidth={220}
          />
        </Grid>
      </Grid>
      <Grid row>
        <Grid col={12}>
          <RecipientSpotlightDashboardCards
            recipients={safeData.recipients}
            count={safeData.count}
            sortConfig={sortConfig}
            requestSort={requestSort}
            handlePageChange={handlePageChange}
            perPage={recipientsPerPage}
            perPageChange={perPageChange}
            filters={filters}
            userHasOnlyOneRegion={userHasOnlyOneRegion}
          />
        </Grid>
      </Grid>
    </>
  );
}

RecipientSpotlightDataController.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    topic: PropTypes.string,
    condition: PropTypes.string,
    query: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.arrayOf(PropTypes.string),
    ]),
  })),
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  userHasOnlyOneRegion: PropTypes.bool.isRequired,
};

RecipientSpotlightDataController.defaultProps = {
  filters: [],
  regionId: undefined,
};

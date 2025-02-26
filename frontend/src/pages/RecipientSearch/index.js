/* eslint-disable react/jsx-no-bind */
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useContext,
} from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import RecipientResults from './components/RecipientResults';
import { getUserRegions } from '../../permissions';
import { searchRecipients } from '../../fetchers/recipient';
import { RECIPIENTS_PER_PAGE } from '../../Constants';
import './index.css';
import useSession from '../../hooks/useSession';
import FilterPanel from '../../components/filter/FilterPanel';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import { RECIPIENT_SEARCH_FILTER_CONFIG } from './constants';
import { expandFilters } from '../../utils';
import AppLoadingContext from '../../AppLoadingContext';

const DEFAULT_SORT = {
  sortBy: 'name',
  direction: 'asc',
};

const DEFAULT_CENTRAL_OFFICE_SORT = {
  sortBy: 'regionId',
  direction: 'asc',
};

export const determineDefaultSort = (userHasCentralOffice) => (
  userHasCentralOffice ? DEFAULT_CENTRAL_OFFICE_SORT : DEFAULT_SORT
);

function RecipientSearch({ user }) {
  const [filters, setFiltersInHook] = useSessionFiltersAndReflectInUrl('recipient-search-filters', []);

  const hasCentralOffice = user && user.homeRegionId && user.homeRegionId === 14;
  const regions = getUserRegions(user);
  const defaultSort = useMemo(() => determineDefaultSort(hasCentralOffice), [hasCentralOffice]);
  const [queryAndSort, setQueryAndSort] = useSession('rtr-search', {
    query: '',
    activePage: 1,
    sortConfig: defaultSort,
  });

  const [results, setResults] = useState({ count: 0, rows: [] });
  const { setIsAppLoading } = useContext(AppLoadingContext);

  const { query, activePage, sortConfig } = queryAndSort;

  const setFilters = (newFilters) => {
    const qAndS = {
      activePage: 1,
      sortConfig: defaultSort,
      query,
    };

    setQueryAndSort(qAndS);
    setFiltersInHook(newFilters);
  };

  const onRemoveFilter = (filterId) => {
    const newFilters = filters.map((f) => ({ ...f })).filter((f) => f.id !== filterId);
    setFilters(newFilters);
  };
  const applyButtonAria = 'Apply filters';

  const updateQueryAndSort = (key, value) => {
    const qAndS = { ...queryAndSort };
    setQueryAndSort({ ...qAndS, [key]: value });
  };

  const setSortConfig = (sc) => {
    updateQueryAndSort('sortConfig', sc);
  };

  const setActivePage = (ap) => {
    updateQueryAndSort('activePage', ap);
  };

  const inputRef = useRef();
  const offset = (activePage - 1) * RECIPIENTS_PER_PAGE;

  useEffect(() => {
    const updateQuery = (q) => {
      const qAndS = {
        activePage: 1,
        sortConfig: defaultSort,
        query: q,
      };

      setQueryAndSort(qAndS);
    };

    async function fetchRecipients() {
      /**
       * if the current query doesn't match the value of the input,
       * we need to handle that first. Changing that will trigger this hook again
       */
      if (query !== inputRef.current.value) {
        if (inputRef.current) {
          updateQuery(inputRef.current.value);
        }
        return;
      }

      setIsAppLoading(true);

      try {
        const response = await searchRecipients(
          query,
          expandFilters(filters),
          { ...sortConfig, offset },
        );
        setResults(response);
      } catch (err) {
        setResults({ count: 0, rows: [] });
      } finally {
        setIsAppLoading(false);
      }
    }

    fetchRecipients();
  }, [
    offset,
    sortConfig,
    user,
    queryAndSort,
    query,
    setQueryAndSort,
    filters,
    defaultSort,
    setIsAppLoading,
  ]);

  async function requestSort(sortBy) {
    const config = { ...sortConfig };
    if (config.sortBy === sortBy) {
      config.direction = config.direction === 'asc' ? 'desc' : 'asc';
      setSortConfig(config);
      return;
    }

    config.sortBy = sortBy;
    setSortConfig(config);
  }

  async function handlePageChange(pageNumber) {
    setActivePage(pageNumber);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (inputRef.current) {
      setQueryAndSort({
        sortConfig: defaultSort,
        activePage: 1,
        query: inputRef.current.value,
      });
    }
  }

  const { count, rows } = results;

  return (
    <>
      <Helmet>
        <title>Recipient TTA Records Search</title>
      </Helmet>
      <div className="ttahub-recipient-search">
        <h1 className="landing margin-top-0 margin-bottom-3">Recipient Records</h1>
        <Grid className="ttahub-recipient-search--filter-row flex-fill display-flex flex-align-center flex-align-self-center flex-row flex-wrap margin-bottom-3">
          <form role="search" className="ttahub-recipient-search--search-form display-flex" onSubmit={onSubmit}>
            { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */ }
            <label htmlFor="recipientRecordSearch" className="sr-only">Search recipient records by name or grant id</label>
            <input defaultValue={query} id="recipientRecordSearch" type="search" name="search" className="ttahub-recipient-search--search-input" ref={inputRef} />
            <button type="submit" className="ttahub-recipient-search--submit-button usa-button">
              <FontAwesomeIcon color="white" icon={faSearch} />
              {' '}
              <span className="sr-only">Search for matching recipients</span>
            </button>
          </form>
        </Grid>
        <Grid className="display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2">
          <FilterPanel
            filters={filters}
            filterConfig={RECIPIENT_SEARCH_FILTER_CONFIG}
            onRemoveFilter={onRemoveFilter}
            onApplyFilters={setFilters}
            applyButtonAria={applyButtonAria}
            allUserRegions={regions}
          />
        </Grid>
        <RecipientResults
          recipients={rows}
          activePage={activePage}
          offset={offset}
          perPage={RECIPIENTS_PER_PAGE}
          count={count}
          handlePageChange={handlePageChange}
          requestSort={requestSort}
          sortConfig={sortConfig}
        />
      </div>
    </>
  );
}

export default RecipientSearch;

RecipientSearch.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    homeRegionId: PropTypes.number,
    permissions: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
      scopeId: PropTypes.number,
      regionId: PropTypes.number,
    })),
  }),
};

RecipientSearch.defaultProps = {
  user: null,
};

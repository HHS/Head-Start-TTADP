/* eslint-disable react/jsx-no-bind */
import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import { v4 as uuidv4 } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import RegionalSelect from '../../components/RegionalSelect';
import RecipientResults from './components/RecipientResults';
import { getUserRegions } from '../../permissions';
import { searchRecipients } from '../../fetchers/recipient';
import { GRANTEES_PER_PAGE } from '../../Constants';
import './index.css';

const DEFAULT_SORT = {
  sortBy: 'name',
  direction: 'asc',
};

const DEFAULT_CENTRAL_OFFICE_SORT = {
  sortBy: 'regionId',
  direction: 'asc',
};

function RecipientSearch({ user }) {
  const hasCentralOffice = user && user.homeRegionId && user.homeRegionId === 14;
  const regions = getUserRegions(user);
  const [appliedRegion, setAppliedRegion] = useState(hasCentralOffice ? 14 : regions[0]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ count: 0, rows: [] });
  const [activePage, setActivePage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState(
    hasCentralOffice ? DEFAULT_CENTRAL_OFFICE_SORT : DEFAULT_SORT,
  );

  const inputRef = useRef();

  const offset = (activePage - 1) * GRANTEES_PER_PAGE;

  function setCurrentQuery() {
    if (inputRef.current) {
      setQuery(inputRef.current.value);
    }
  }

  useEffect(() => {
    async function fetchRecipients() {
      const filters = [];

      if (appliedRegion === 14) {
        getUserRegions(user).forEach((region) => {
          filters.push({
            id: uuidv4(),
            topic: 'region',
            condition: 'Contains',
            query: region,
          });
        });
      } else {
        filters.push({
          id: uuidv4(),
          topic: 'region',
          condition: 'Contains',
          query: appliedRegion,
        });
      }

      /**
       * if the current query doesn't match the value of the input,
       * we need to handle that first. Changing that will trigger this hook again
       */
      if (query !== inputRef.current.value) {
        setCurrentQuery();
        return;
      }

      setLoading(true);

      try {
        const response = await searchRecipients(
          query,
          filters,
          { ...sortConfig, offset },
        );
        setResults(response);
      } catch (err) {
        setResults({ count: 0, rows: [] });
      } finally {
        setLoading(false);
      }
    }

    fetchRecipients();
  }, [query, appliedRegion, offset, sortConfig, user]);

  function onApplyRegion(region) {
    setAppliedRegion(region.value);
  }

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
    setCurrentQuery();
  }

  const { count, rows } = results;

  return (
    <>
      <Helmet>
        <title>Recipient TTA Records Search</title>
      </Helmet>
      <div className="ttahub-recipient-search">
        <h1 className="landing">Recipient Records</h1>
        <Grid className="ttahub-recipient-search--filter-row flex-fill display-flex flex-align-center flex-align-self-center flex-row flex-wrap margin-bottom-2">
          {regions.length > 1
              && (
                <div className="margin-right-2">
                  <RegionalSelect
                    regions={regions}
                    onApply={onApplyRegion}
                    hasCentralOffice={hasCentralOffice}
                    appliedRegion={appliedRegion}
                    disabled={loading}
                  />
                </div>
              )}
          <form role="search" className="ttahub-recipient-search--search-form display-flex" onSubmit={onSubmit}>
            { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */ }
            <label htmlFor="recipientRecordSearch" className="sr-only">Search recipient records by name or grant id</label>
            <input id="recipientRecordSearch" type="search" name="search" className="ttahub-recipient-search--search-input" ref={inputRef} disabled={loading} />
            <button type="submit" className="ttahub-recipient-search--submit-button usa-button" disabled={loading}>
              <FontAwesomeIcon color="white" icon={faSearch} />
              {' '}
              <span className="sr-only">Search for matching recipients</span>
            </button>
          </form>
        </Grid>
        <main>
          <RecipientResults
            recipients={rows}
            loading={loading}
            activePage={activePage}
            offset={offset}
            perPage={GRANTEES_PER_PAGE}
            count={count}
            handlePageChange={handlePageChange}
            requestSort={requestSort}
            sortConfig={sortConfig}
          />
        </main>
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

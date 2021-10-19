/* eslint-disable react/jsx-no-bind */
import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import { v4 as uuidv4 } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import RegionalSelect from '../../components/RegionalSelect';
import GranteeResults from './components/GranteeResults';
import { getUserRegions } from '../../permissions';
import { searchGrantees } from '../../fetchers/grantee';
import { GRANTEES_PER_PAGE } from '../../Constants';
import './index.css';

function GranteeSearch({ user }) {
  const hasCentralOffice = user && user.homeRegionId && user.homeRegionId === 14;
  const regions = getUserRegions(user);
  const [appliedRegion, setAppliedRegion] = useState(hasCentralOffice ? 14 : regions[0]);
  const [granteeCount, setGranteeCount] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activePage, setActivePage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    sortBy: 'name',
    direction: 'asc',
  });

  const inputRef = useRef();

  const offset = (activePage - 1) * GRANTEES_PER_PAGE;

  useEffect(() => {
    async function fetchGrantees() {
      const filters = [];

      if (appliedRegion === 14) {
        getUserRegions(user).forEach((region) => {
          filters.push({
            id: uuidv4(),
            topic: 'region',
            condition: 'One of',
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

      setLoading(true);

      try {
        const {
          rows,
          count,
        } = await searchGrantees(query, filters, { ...sortConfig, offset });
        setResults(rows);
        setGranteeCount(count);
      } catch (err) {
        setResults([]);
        setGranteeCount(0);
      } finally {
        setLoading(false);
      }
    }

    fetchGrantees();
  }, [query, appliedRegion, offset, sortConfig, user]);

  function onApplyRegion(region) {
    setAppliedRegion(region.value);
  }

  async function requestSort(sortBy) {
    if (loading) {
      return;
    }

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
    if (!loading) {
      setActivePage(pageNumber);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (inputRef.current) {
      setQuery(inputRef.current.value);
    }
  }

  return (
    <>
      <Helmet>
        <title>Grantee Records Search</title>
      </Helmet>
      <div className="ttahub-grantee-search">
        <h1 className="landing">Grantee Records</h1>
        <Grid className="ttahub-grantee-search--filter-row flex-fill display-flex flex-align-center flex-align-self-center flex-row flex-wrap margin-bottom-2">
          {regions.length > 1
              && (
                <div className="margin-right-2">
                  <RegionalSelect
                    regions={regions}
                    onApply={onApplyRegion}
                    hasCentralOffice={hasCentralOffice}
                    appliedRegion={appliedRegion}
                  />
                </div>
              )}
          <form role="search" className="ttahub-grantee-search--search-form display-flex" onSubmit={onSubmit}>
            <input type="search" required name="search" className="ttahub-grantee-search--search-input" ref={inputRef} />
            <button type="submit" className="ttahub-grantee-search--submit-button usa-button" disabled={loading}>
              <FontAwesomeIcon color="white" icon={faSearch} />
              {' '}
              <span className="sr-only">Search for matching grantees</span>
            </button>
          </form>
        </Grid>
        <main>
          <GranteeResults
            grantees={results}
            loading={loading}
            activePage={activePage}
            offset={offset}
            perPage={GRANTEES_PER_PAGE}
            count={granteeCount}
            handlePageChange={handlePageChange}
            requestSort={requestSort}
            sortConfig={sortConfig}
          />
        </main>
      </div>
    </>
  );
}

export default GranteeSearch;

GranteeSearch.propTypes = {
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

GranteeSearch.defaultProps = {
  user: null,
};

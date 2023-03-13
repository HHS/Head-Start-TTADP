import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HorizontalTableWidget from './HorizontalTableWidget';
import WidgetContainer from '../components/WidgetContainer';
import useSessionSort from '../hooks/useSessionSort';
import { TOPICS_PER_PAGE } from '../Constants';
import fetchTopicResources from '../fetchers/Resources';
import { filtersToQueryString } from '../utils';

function ResourcesAssociatedWithTopics({ filters, resetPagination, setResetPagination }) {
  const [topicsWithResources, setTopicsWithResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [perPage] = useState(TOPICS_PER_PAGE);
  const [topicsCount, setTopicsCount] = useState(0);
  const [sortConfig, setSortConfig] = useSessionSort({
    sortBy: 'updatedAt',
    direction: 'desc',
    activePage: 1,
  }, 'activityReportsTable');

  const { activePage } = sortConfig;

  const [offset, setOffset] = useState((activePage - 1) * perPage);

  // a side effect that resets the pagination when the filters change
  useEffect(() => {
    if (resetPagination) {
      setSortConfig({ ...sortConfig, activePage: 1 });
      setOffset(0); // 0 times perpage = 0
      setResetPagination(false);
    }
  }, [activePage, perPage, resetPagination, setResetPagination, setSortConfig, sortConfig]);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      const filterQuery = filtersToQueryString(filters);
      try {
        // Fetch Topics.
        const { count, data } = await fetchTopicResources(
          sortConfig.sortBy,
          sortConfig.direction,
          offset,
          perPage,
          filterQuery,
        );
        setTopicsWithResources(data);
        setTopicsCount(count || 0);
        setError('');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        setError('Unable to fetch reports');
      } finally {
        setLoading(false);
      }
    }

    if (resetPagination) {
      return;
    }

    fetchReports();
  }, [sortConfig, offset, perPage, filters, resetPagination]);

  const handlePageChange = (pageNumber) => {
    if (!loading) {
      // copy state
      const sort = { ...sortConfig };

      // mutate
      sort.activePage = pageNumber;

      // store it
      setSortConfig(sort);
      setOffset((pageNumber - 1) * perPage);
    }
  };

  return (
    <WidgetContainer
      title="Resources associated with topics on Activity Reports"
      subtitle="Number of resources cited on Activity Reports with a given topic. If an activity report has more than one topic, resources count towards each topic."
      loading={loading}
      loadingLabel="Resource associated with topics loading"
      showPaging
      error={error}
      currentPage={activePage}
      totalCount={topicsCount}
      offset={offset}
      perPage={TOPICS_PER_PAGE}
      handlePageChange={handlePageChange}
    >
      <HorizontalTableWidget
        headers={topicsWithResources.headers || []}
        data={topicsWithResources.rows}
        firstHeading="Topic"
        showPaging
        enableSorting
      />
    </WidgetContainer>
  );
}

ResourcesAssociatedWithTopics.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      condition: PropTypes.string,
      id: PropTypes.string,
      query: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.arrayOf(PropTypes.string),
        PropTypes.arrayOf(PropTypes.number),
      ]),
      topic: PropTypes.string,
    }),
  ).isRequired,
  resetPagination: PropTypes.bool,
  setResetPagination: PropTypes.func,
};

ResourcesAssociatedWithTopics.defaultProps = {
  resetPagination: false,
  setResetPagination: () => {},
};

export default ResourcesAssociatedWithTopics;

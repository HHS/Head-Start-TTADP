import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HorizontalTableWidget from './HorizontalTableWidget';
import WidgetContainer from '../components/WidgetContainer';
import useSessionSort from '../hooks/useSessionSort';
import { TOPICS_PER_PAGE, DECIMAL_BASE } from '../Constants';

function ResourcesAssociatedWithTopics({
  data,
  loading,
  resetPagination,
  setResetPagination,
  perPageNumber,
}) {
  const [topicUse, setTopicUse] = useState([]);
  const [topicCount, setTopicCount] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);
  const [perPage] = useState(perPageNumber);
  const [sortConfig, setSortConfig] = useSessionSort({
    sortBy: '1',
    direction: 'desc',
    activePage: 1,
  }, 'activityReportsTable');

  const { activePage } = sortConfig;

  const [offset, setOffset] = useState((activePage - 1) * perPage);

  useEffect(() => {
    try {
      // Set local data.
      setLocalLoading(true);
      const topicsToUse = data.topics || [];
      setTopicUse(topicsToUse);
      setTopicCount(topicsToUse.length);
    } finally {
      setLocalLoading(false);
    }
  }, [data]);

  // a side effect that resets the pagination when the filters change
  useEffect(() => {
    if (resetPagination) {
      setSortConfig({ ...sortConfig, activePage: 1 });
      setOffset(0); // 0 times perpage = 0
      setResetPagination(false);
    }
  }, [activePage, perPage, resetPagination, setResetPagination, setSortConfig, sortConfig, data]);

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

  const parseValue = (value) => {
    const parsedValue = parseInt(value, DECIMAL_BASE);
    if (Number.isNaN(value)) {
      return value;
    }
    return parsedValue;
  };

  const requestSort = (sortBy) => {
    // Get sort direction.
    let direction = 'asc';
    if (
      sortConfig
      && sortConfig.sortBy === sortBy
      && sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }

    // Set the value we want to sort by.
    const valuesToSort = sortBy === 'Topic'
      ? topicUse.map((t) => ({
        ...t,
        sortBy: t.heading,
      }))
      : topicUse.map((t) => (
        {
          ...t,
          sortBy: parseValue(t.data.find((tp) => tp.title === sortBy).value),
        }));

    // Value sort.
    const sortValueA = direction === 'asc' ? 1 : -1;
    const sortValueB = direction === 'asc' ? -1 : -1;
    valuesToSort.sort(
      (a, b) => (
        // eslint-disable-next-line no-nested-ternary
        (a.sortBy > b.sortBy) ? sortValueA
          : ((b.sortBy > a.sortBy)
            ? sortValueB : 0)
      ),
    );
    setTopicUse(valuesToSort);
    setOffset(0);
    setSortConfig({ sortBy, direction, activePage: 1 });
  };

  return (
    <WidgetContainer
      title="Resources associated with topics on Activity Reports"
      subtitle="Number of resources cited on Activity Reports with a given topic. If an activity report has more than one topic, resources count towards each topic."
      loading={loading || localLoading}
      loadingLabel="Resource associated with topics loading"
      showPaging
      currentPage={activePage}
      totalCount={topicCount}
      offset={offset}
      perPage={perPageNumber}
      handlePageChange={handlePageChange}
    >
      <HorizontalTableWidget
        headers={data.headers || []}
        data={topicUse.slice(offset, offset + perPage)}
        firstHeading="Topic"
        enableSorting
        sortConfig={sortConfig}
        requestSort={requestSort}
      />
    </WidgetContainer>
  );
}

ResourcesAssociatedWithTopics.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.shape({
      headers: PropTypes.arrayOf(PropTypes.string),
      topics: PropTypes.arrayOf(
        PropTypes.shape({
          title: PropTypes.string,
          value: PropTypes.number,
        }),
      ),
    }),
    PropTypes.shape({}),
  ]),
  resetPagination: PropTypes.bool,
  setResetPagination: PropTypes.func,
  perPageNumber: PropTypes.number,
  loading: PropTypes.bool.isRequired,
};

ResourcesAssociatedWithTopics.defaultProps = {
  data: { headers: [], topicUse: [] },
  resetPagination: false,
  setResetPagination: () => {},
  perPageNumber: TOPICS_PER_PAGE,
};

export default ResourcesAssociatedWithTopics;

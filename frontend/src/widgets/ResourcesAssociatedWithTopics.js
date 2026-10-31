import { DECIMAL_BASE } from '@ttahub/common';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { TOPICS_PER_PAGE } from '../Constants';
import WidgetContainer from '../components/WidgetContainer';
import useSessionSort from '../hooks/useSessionSort';
import HorizontalTableWidget from './HorizontalTableWidget';

export const parseValue = (value) => {
  const noCommasValue = value.replaceAll(',', '');
  const parsedValue = parseInt(noCommasValue, DECIMAL_BASE);
  if (Number.isNaN(parsedValue)) {
    return value;
  }
  return parsedValue;
};

const sortTopics = (topics, sortBy, direction) => {
  const valuesToSort = topics.map((topic) => ({
    ...topic,
    sortBy:
      sortBy === 'Topic'
        ? topic.heading
        : parseValue(topic.data.find((item) => item.title === sortBy).value),
  }));
  const sortValueA = direction === 'asc' ? 1 : -1;
  const sortValueB = direction === 'asc' ? -1 : 1;

  return valuesToSort.sort((a, b) => {
    if (a.sortBy > b.sortBy) {
      return sortValueA;
    }
    if (b.sortBy > a.sortBy) {
      return sortValueB;
    }
    return 0;
  });
};

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
  const [sortConfig, setSortConfig] = useSessionSort(
    {
      sortBy: '1',
      direction: 'desc',
      activePage: 1,
    },
    'activityReportsTable'
  );

  const { activePage } = sortConfig;

  const [offset, setOffset] = useState((activePage - 1) * perPage);

  useEffect(() => {
    try {
      // Set local data.
      setLocalLoading(true);
      const topicsToUse = data.topics || [];
      const sortBy = sortConfig.sortBy;
      const hasSortKey =
        sortBy === 'Topic' ||
        topicsToUse.some((topic) => topic.data.some((item) => item.title === sortBy));
      setTopicUse(
        hasSortKey ? sortTopics(topicsToUse, sortBy, sortConfig.direction) : topicsToUse
      );
      setTopicCount(topicsToUse.length);
    } finally {
      setLocalLoading(false);
    }
  }, [data, sortConfig.direction, sortConfig.sortBy]);

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

  const requestSort = (sortBy) => {
    // Get sort direction.
    let direction = 'asc';
    if (sortConfig && sortConfig.sortBy === sortBy && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    // Set the value we want to sort by.
    setTopicUse(sortTopics(topicUse, sortBy, direction));
    setOffset(0);
    setSortConfig({ sortBy, direction, activePage: 1 });
  };

  return (
    <WidgetContainer
      title="Resources associated with topics on Activity Reports"
      subtitle="Number of resources cited on Activity Reports with a given topic. If an activity report has more than one topic, resources count towards each topic."
      loading={loading || localLoading}
      loadingLabel="Resource associated with topics loading"
      showPagingBottom
      currentPage={activePage}
      totalCount={topicCount}
      offset={offset}
      perPage={perPageNumber}
      handlePageChange={handlePageChange}
      titleMargin={{ bottom: 1 }}
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
        })
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

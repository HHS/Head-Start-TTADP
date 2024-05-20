import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { DECIMAL_BASE } from '@ttahub/common';
import HorizontalTableWidget from './HorizontalTableWidget';
import WidgetContainer from '../components/WidgetContainer';
import useSessionSort from '../hooks/useSessionSort';
import { COURSES_PER_PAGE } from '../Constants';

export const parseValue = (value) => {
  const noCommasValue = value.replaceAll(',', '');
  const parsedValue = parseInt(noCommasValue, DECIMAL_BASE);
  if (Number.isNaN(parsedValue)) {
    return value;
  }
  return parsedValue;
};
function CoursesAssociatedWithActivityReports({
  data,
  loading,
  resetPagination,
  setResetPagination,
  perPageNumber,
}) {
  const [courseUse, setCourseUse] = useState([]);
  const [courseCount, setCourseCount] = useState(0);
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
      const courseToUse = data.courses || [];
      setCourseUse(courseToUse);
      setCourseCount(courseToUse.length);
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
    const valuesToSort = sortBy === 'Course'
      ? courseUse.map((t) => ({
        ...t,
        sortBy: t.heading,
      }))
      : courseUse.map((t) => (
        {
          ...t,
          sortBy: parseValue(t.data.find((tp) => tp.title === sortBy).value),
        }));

    // Value sort.
    const sortValueA = direction === 'asc' ? 1 : -1;
    const sortValueB = direction === 'asc' ? -1 : 1;
    valuesToSort.sort((a, b) => {
      if (a.sortBy > b.sortBy) {
        return sortValueA;
      } if (b.sortBy > a.sortBy) {
        return sortValueB;
      }
      return 0;
    });

    setCourseUse(valuesToSort);
    setOffset(0);
    setSortConfig({ sortBy, direction, activePage: 1 });
  };

  return (
    <WidgetContainer
      title="iPD Courses cited on Activity Reports"
      subtitle="Unique iPD course links cited within Activity Reports."
      loading={loading || localLoading}
      loadingLabel="Courses associated with Activity Reports loading"
      showPagingBottom
      currentPage={activePage}
      totalCount={courseCount}
      offset={offset}
      perPage={perPageNumber}
      handlePageChange={handlePageChange}
    >
      <HorizontalTableWidget
        headers={data.headers || []}
        data={courseUse.slice(offset, offset + perPage)}
        firstHeading="Course"
        enableSorting
        sortConfig={sortConfig}
        requestSort={requestSort}
      />
    </WidgetContainer>
  );
}

CoursesAssociatedWithActivityReports.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.shape({
      headers: PropTypes.arrayOf(PropTypes.string),
      courses: PropTypes.arrayOf(
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

CoursesAssociatedWithActivityReports.defaultProps = {
  data: { headers: [], courseUse: [] },
  resetPagination: false,
  setResetPagination: () => {},
  perPageNumber: COURSES_PER_PAGE,
};

export default CoursesAssociatedWithActivityReports;

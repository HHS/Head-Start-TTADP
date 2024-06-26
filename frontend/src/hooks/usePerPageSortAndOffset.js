import { useState } from 'react';
import { DECIMAL_BASE } from '@ttahub/common';
import useSessionSort from './useSessionSort';

/**
 *
 * @param {string} sessionSortKey
 * Required: A unique key to store the sort configuration in the session storage.
 * @param {object} defaultSort
 * An example defaultSort is { sortBy: 'createdOn', direction: 'desc' }. It can also include offset.
 * @param {number} defaultPerPage
 * Default number of items to show per page.
 * @param {*} defaultOffset
 * Default offset value.
 */

export default function usePerPageSortAndOffset(
  sessionSortKey,
  defaultSort = {},
  defaultPerPage = 10,
  defaultOffset = 0,
) {
  const [perPage, setPerPage] = useState(defaultPerPage);
  const [sortConfig, setSortConfig] = useSessionSort({
    offset: defaultOffset,
    direction: 'desc',
    ...defaultSort,
    activePage: 1,
  }, sessionSortKey);

  const handlePageChange = (pageNumber) => {
    setSortConfig({
      ...sortConfig, activePage: pageNumber, offset: (pageNumber - 1) * defaultPerPage,
    });
  };

  const requestSort = (sortBy) => {
    let dir = 'asc';
    if (
      sortConfig.sortBy === sortBy
      && sortConfig.direction === 'asc'
    ) {
      dir = 'desc';
    }
    setSortConfig({
      ...sortConfig, sortBy, direction: dir, activePage: 1, offset: 0,
    });
  };

  const perPageChange = (e) => {
    const perPageValue = parseInt(e.target.value, DECIMAL_BASE);
    setSortConfig({
      ...sortConfig,
      activePage: 1,
      offset: 0,
    });
    setPerPage(perPageValue);
  };

  return {
    perPage,
    handlePageChange,
    requestSort,
    perPageChange,
    activePage: sortConfig.activePage,
    direction: sortConfig.direction,
    sortBy: sortConfig.sortBy,
  };
}

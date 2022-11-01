import React from 'react';
import PropTypes from 'prop-types';
import Pagination from 'react-js-pagination';

export function renderTotal(offset, perPage, activePage, count) {
  const from = offset >= count ? 0 : offset + 1;
  const offsetTo = perPage * activePage;
  let to;
  if (offsetTo > count) {
    to = count;
  } else {
    to = offsetTo;
  }
  return `${from}-${to} of ${count}`;
}

export const SelectPagination = ({
  title,
  offset,
  perPage,
  activePage,
  count,
  handlePageChange,
}) => (
  <span aria-label={`Pagination for ${title}`}>
    <span
      className="smart-hub--total-count display-flex flex-align-center height-full margin-2 desktop:margin-0 padding-right-1"
      aria-label={`Page ${activePage}, displaying ${title} ${renderTotal(
        offset,
        perPage,
        activePage,
        count,
      )}`}
    >
      <span>{renderTotal(offset, perPage, activePage, count)}</span>
      <Pagination
        innerClass="pagination desktop:margin-x-0 margin-top-0 margin-x-2"
        hideFirstLastPages
        prevPageText="<Prev"
        nextPageText="Next>"
        activePage={activePage}
        itemsCountPerPage={perPage}
        totalItemsCount={count}
        pageRangeDisplayed={4}
        onChange={handlePageChange}
        linkClassPrev="smart-hub--link-prev"
        linkClassNext="smart-hub--link-next"
        tabIndex={0}
      />
    </span>
  </span>
);

export default SelectPagination;

SelectPagination.propTypes = {
  offset: PropTypes.number,
  perPage: PropTypes.number,
  activePage: PropTypes.number,
  count: PropTypes.number,
  handlePageChange: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
};

SelectPagination.defaultProps = {
  count: 0,
  activePage: 0,
  offset: 0,
  perPage: 10,
};

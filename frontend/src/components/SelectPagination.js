import React from 'react';
import PropTypes from 'prop-types';
import Pagination from 'react-js-pagination';
import { Dropdown } from '@trussworks/react-uswds';

function SelectPagination({
  title,
  offset,
  activePage,
  count,
  handlePageChange,
  perPage,
  perPageChange,
}) {
  const renderTotal = () => {
    const from = offset >= count ? 0 : offset + 1;
    const offsetTo = perPage * activePage;
    let to;
    if (offsetTo > count) {
      to = count;
    } else {
      to = offsetTo;
    }
    return `Showing ${from}-${to} of ${count} ${title.toLowerCase()}`;
  };

  return (
    <span aria-label={`Pagination for ${title}`}>
      <span
        className="smart-hub--total-count display-flex flex-align-center height-full margin-2 desktop:margin-0 padding-right-1"
        aria-label={`Page ${activePage}, displaying ${title} ${renderTotal(
          title,
          offset,
          perPage,
          activePage,
          count,
        )}`}
      >
        <Dropdown
          className="margin-top-0 margin-right-1 width-auto"
          id="perPage"
          name="perPage"
          data-testid="perPage"
          onChange={perPageChange}
          aria-label={`Select ${title.toLowerCase()} per page`}
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value={count}>all</option>
        </Dropdown>
        <span>{renderTotal(title, offset, perPage, activePage, count)}</span>
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
}
SelectPagination.propTypes = {
  offset: PropTypes.number,
  activePage: PropTypes.number,
  count: PropTypes.number,
  handlePageChange: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  perPage: PropTypes.number,
  perPageChange: PropTypes.func.isRequired,
};

SelectPagination.defaultProps = {
  count: 0,
  activePage: 0,
  offset: 0,
  perPage: 10,
};
export default SelectPagination;

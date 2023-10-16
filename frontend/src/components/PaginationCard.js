import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, Pagination } from '@trussworks/react-uswds';

function PaginationCard({
  currentPage,
  totalCount,
  offset,
  perPage,
  handlePageChange,
  perPageChange,
}) {
  const getPageInfo = () => {
    const from = offset >= totalCount ? 0 : offset + 1;
    const offsetTo = perPage * currentPage;
    let to;
    if (offsetTo > totalCount) {
      to = totalCount;
    } else {
      to = offsetTo;
    }
    return `${from}-${to} of ${totalCount}`;
  };

  const getTotalPages = () => {
    const totalPages = Math.floor(totalCount / perPage);
    return totalCount % perPage > 0 ? totalPages + 1 : totalPages;
  };

  return (
    <div className="smart-hub--pagination-card display-flex bg-white">
      <div className="display-flex flex-1 flex-align-center margin-left-4">
        {perPageChange ? (
          <Dropdown
            className="margin-top-0 margin-right-1 width-auto"
            id="perPage"
            name="perPage"
            data-testid="perPage"
            onChange={perPageChange}
            aria-label="Select per page"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value={totalCount}>all</option>
          </Dropdown>
        ) : null }
        <span>{getPageInfo()}</span>
      </div>
      <Pagination
        className="padding-1"
        currentPage={currentPage}
        totalPages={getTotalPages()}
        onClickNext={() => handlePageChange(currentPage + 1)}
        onClickPrevious={() => handlePageChange(currentPage - 1)}
        onClickPageNumber={(_e, page) => handlePageChange(page)}
      />
    </div>
  );
}
PaginationCard.propTypes = {
  currentPage: PropTypes.number,
  totalCount: PropTypes.number,
  offset: PropTypes.number,
  perPage: PropTypes.number,
  handlePageChange: PropTypes.func.isRequired,
  perPageChange: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
};

PaginationCard.defaultProps = {
  totalCount: 0,
  currentPage: 0,
  offset: 0,
  perPage: 10,
  perPageChange: false,
};
export default PaginationCard;

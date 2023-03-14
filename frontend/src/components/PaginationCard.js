import React from 'react';
import PropTypes from 'prop-types';
import { Pagination } from '@trussworks/react-uswds';
import './PaginationCard.scss';

function PaginationCard({
  currentPage,
  totalCount,
  offset,
  perPage,
  handlePageChange,
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
      <div className="display-flex flex-1 flex-align-center margin-left-4">{getPageInfo()}</div>
      <Pagination
        className="margin-3"
        currentPage={currentPage}
        totalPages={getTotalPages()}
        onClickNext={(e, page) => handlePageChange(page)}
        onClickPrevious={() => handlePageChange(currentPage - 1)}
        onClickPageNumber={() => handlePageChange(currentPage + 1)}
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
};

PaginationCard.defaultProps = {
  totalCount: 0,
  currentPage: 0,
  offset: 0,
  perPage: 10,
};
export default PaginationCard;

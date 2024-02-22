import React from 'react';
import PropTypes from 'prop-types';
import { Pagination } from '@trussworks/react-uswds';

function PaginationCard({
  currentPage,
  totalCount,
  offset,
  perPage,
  handlePageChange,
  className,
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
    <div className={`smart-hub--pagination-card display-flex bg-white ${className}`}>
      <div className="display-flex flex-1 flex-align-center margin-left-4">{getPageInfo()}</div>
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
  className: PropTypes.string,
};

PaginationCard.defaultProps = {
  totalCount: 0,
  currentPage: 0,
  offset: 0,
  perPage: 10,
  className: '',
};
export default PaginationCard;

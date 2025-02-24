import React, { useRef, useLayoutEffect } from 'react';
import { useMediaQuery } from 'react-responsive';
import PropTypes from 'prop-types';
import { Dropdown, Pagination } from '@trussworks/react-uswds';
import './PaginationCard.css';

function PaginationCard({
  currentPage,
  totalCount,
  offset,
  perPage,
  handlePageChange,
  perPageChange,
  hideInfo,
  accessibleLandmarkName,
  paginationClassName,
}) {
  const el = useRef();
  const isMobile = useMediaQuery({ maxWidth: 500 });
  /**
   * there is an unlabeled svg that is used to render the chevron icons
   * within the pagination component
   *
   * this layout effect adds an id to the link text and adds an aria-labelledby
   * to the svg in order to clear up any confusion should the button text itself
   * not be sufficient for some reason
   */
  useLayoutEffect(() => {
    if (!el.current) {
      return;
    }

    // at the end of the DOM parsing we will add a classlist to the link so that
    // we do not need to traverse the DOM over and over again within this effect
    const paginationLinks = el.current.querySelectorAll('.usa-pagination__link:not(.usa-pagination__link--assigned)');

    Array.from(paginationLinks).forEach((link) => {
      const svg = link.querySelector('svg');
      if (svg) {
        svg.setAttribute('aria-hidden', 'true');
      }
    });
  });

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

  const totalPages = getTotalPages();

  if (hideInfo && totalPages < 2) {
    return null;
  }

  return (
    <div ref={el} className="smart-hub--pagination-card flex-align-self-end display-block">
      {!(hideInfo) && (
        <div className="smart-hub--pagination-card--contents--info display-flex flex-1 flex-align-center">
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
      )}
      <Pagination
        className={paginationClassName}
        currentPage={currentPage}
        totalPages={totalPages}
        onClickNext={() => handlePageChange(currentPage + 1)}
        onClickPrevious={() => handlePageChange(currentPage - 1)}
        onClickPageNumber={(_e, page) => handlePageChange(page)}
        aria-label={accessibleLandmarkName}
        maxSlots={isMobile ? 5 : 7}
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
  hideInfo: PropTypes.bool,
  accessibleLandmarkName: PropTypes.string,
  paginationClassName: PropTypes.string,
};

PaginationCard.defaultProps = {
  totalCount: 0,
  currentPage: 0,
  offset: 0,
  perPage: 10,
  perPageChange: false,
  hideInfo: false,
  accessibleLandmarkName: 'Pagination',
  paginationClassName: 'padding-1',
};

export default PaginationCard;

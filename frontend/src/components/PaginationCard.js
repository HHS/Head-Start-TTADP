import React, { useRef, useLayoutEffect } from 'react';
import { useMediaQuery } from 'react-responsive';
import PropTypes from 'prop-types';
import { Dropdown, Label, Pagination } from '@trussworks/react-uswds';
import './PaginationCard.css';
import { getPageInfo } from '../utils';

const MAX_WIDTH_MOBILE = 500;
const MIN_UNBOUNDED_PAGES = 25;
const MOBILE_MAX_SLOTS = 5;
const MAX_SLOTS = 7;

function PaginationCard({
  currentPage,
  totalCount,
  offset,
  perPage,
  handlePageChange,
  perPageChange,
  hideInfo,
  hideCountHeaderOnEmpty,
  accessibleLandmarkName,
  paginationClassName,
  noXofX,
}) {
  const el = useRef();
  const isMobile = useMediaQuery({ maxWidth: MAX_WIDTH_MOBILE });
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

    // Remove role="presentation" from list items
    // This code can be removed when we can upgrade to react-uswds to more recent versions
    // pending react, create react app updates
    const presenters = el.current.querySelectorAll('[role="presentation"]');
    Array.from(presenters).forEach((presenter) => {
      presenter.removeAttribute('role');
    });
  });

  const getTotalPages = () => {
    const totalPages = Math.floor(totalCount / perPage);
    return totalCount % perPage > 0 ? totalPages + 1 : totalPages;
  };

  const totalPages = getTotalPages();

  // leaving the 2 instead of using a magic number
  // because I think that clarifies the meaning/purpose
  if (hideInfo && totalPages < 2) {
    return null;
  }

  const shouldBeUnbounded = totalPages > MIN_UNBOUNDED_PAGES;

  return (
    <div ref={el} className="smart-hub--pagination-card flex-align-self-end display-block">
      {!hideInfo && (
        <div className="smart-hub--pagination-card--contents--info display-flex flex-1 flex-align-center">
          {perPageChange ? (
            <div className="display-flex flex-align-center flex-justify">
              <Label htmlFor="perPage" className={noXofX ? 'margin-top-0 margin-right-1 ' : 'usa-sr-only'}>
                Show
              </Label>
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
            </div>
          ) : null }
          { (!noXofX && (totalCount > 0 || !hideCountHeaderOnEmpty)) && (
            <span className={totalPages < 2 ? 'margin-right-1' : ''} data-testid="pagination-card-count-header">
              {getPageInfo(
                offset,
                totalCount,
                currentPage,
                perPage,
              )}
            </span>
          )}
        </div>
      )}
      {totalPages > 1 && (
      <Pagination
        className={paginationClassName}
        currentPage={currentPage}
        totalPages={shouldBeUnbounded ? null : totalPages}
        onClickNext={() => handlePageChange(currentPage + 1)}
        onClickPrevious={() => handlePageChange(currentPage - 1)}
        onClickPageNumber={(_e, page) => handlePageChange(page)}
        aria-label={accessibleLandmarkName}
        maxSlots={isMobile ? MOBILE_MAX_SLOTS : MAX_SLOTS}
      />
      )}
    </div>
  );
}
PaginationCard.propTypes = {
  currentPage: PropTypes.number,
  totalCount: PropTypes.number,
  offset: PropTypes.number,
  perPage: PropTypes.number,
  handlePageChange: PropTypes.func,
  perPageChange: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
  hideInfo: PropTypes.bool,
  accessibleLandmarkName: PropTypes.string,
  paginationClassName: PropTypes.string,
  hideCountHeaderOnEmpty: PropTypes.bool,
  noXofX: PropTypes.bool,
};

PaginationCard.defaultProps = {
  totalCount: 0,
  currentPage: 0,
  offset: 0,
  perPage: 10,
  handlePageChange: undefined,
  perPageChange: false,
  hideInfo: false,
  accessibleLandmarkName: 'Pagination',
  paginationClassName: 'margin-bottom-0 margin-top-0',
  hideCountHeaderOnEmpty: false,
  noXofX: false,
};

export default PaginationCard;

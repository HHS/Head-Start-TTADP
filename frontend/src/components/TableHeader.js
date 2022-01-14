import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import Pagination from 'react-js-pagination';
import Filter from './Filter';
import ReportMenu from '../pages/Landing/ReportMenu';

export function renderTotal(offset, perPage, activePage, reportsCount) {
  const from = offset >= reportsCount ? 0 : offset + 1;
  const offsetTo = perPage * activePage;
  let to;
  if (offsetTo > reportsCount) {
    to = reportsCount;
  } else {
    to = offsetTo;
  }
  return `${from}-${to} of ${reportsCount}`;
}

export default function TableHeader({
  title,
  numberOfSelected,
  toggleSelectAll,
  showFilter,
  hideMenu,
  menuAriaLabel,
  onUpdateFilters,
  handleDownloadAll,
  handleDownloadClick,
  count,
  activePage,
  offset,
  perPage,
  handlePageChange,
  hidePagination,
  forMyAlerts,
  downloadError,
  setDownloadError,
  isDownloading,
  downloadAllButtonRef,
  downloadSelectedButtonRef,
}) {
  return (
    <div className="desktop:display-flex">
      <div className="desktop:display-flex flex-1 desktop:padding-top-0 padding-top-2">
        <h2 className="font-body-lg margin-left-2 margin-right-1 margin-y-3">{title}</h2>
        <span className="smart-hub--table-controls desktop:margin-0 margin-2 display-flex flex-row flex-align-center">
          {numberOfSelected > 0
            && (
              <span className="padding-y-05 padding-left-105 padding-right-1 text-white smart-hub-bg-vivid radius-pill font-sans-xs text-middle margin-right-1 smart-hub--selected-tag">
                {numberOfSelected}
                {' '}
                selected
                {' '}
                <Button
                  className="smart-hub--select-tag__button"
                  unstyled
                  aria-label="deselect all reports"
                  onClick={() => {
                    toggleSelectAll({ target: { checked: false } });
                  }}
                >
                  <FontAwesomeIcon
                    color="blue"
                    inverse
                    icon={faTimesCircle}
                  />
                </Button>
              </span>
            )}
          {showFilter && <Filter applyFilters={onUpdateFilters} forMyAlerts={forMyAlerts} />}
          {!hideMenu && (
            <ReportMenu
              label={menuAriaLabel}
              hasSelectedReports={numberOfSelected > 0}
              onExportAll={handleDownloadAll}
              onExportSelected={handleDownloadClick}
              count={count}
              downloadError={downloadError}
              setDownloadError={setDownloadError}
              isDownloading={isDownloading}
              downloadAllButtonRef={downloadAllButtonRef}
              downloadSelectedButtonRef={downloadSelectedButtonRef}
            />
          )}
        </span>
      </div>
      {!hidePagination && (
        <span className="smart-hub--table-nav">
          <span aria-label="Pagination for activity reports">
            <span
              className="smart-hub--total-count display-flex flex-align-center height-full margin-2 desktop:margin-0 padding-right-1"
              aria-label={`Page ${activePage}, displaying rows ${renderTotal(
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
        </span>
      )}
    </div>
  );
}

TableHeader.propTypes = {
  title: PropTypes.string.isRequired,
  numberOfSelected: PropTypes.number,
  toggleSelectAll: PropTypes.func,
  showFilter: PropTypes.bool,
  onUpdateFilters: PropTypes.func,
  forMyAlerts: PropTypes.bool,
  handleDownloadAll: PropTypes.func,
  handleDownloadClick: PropTypes.func,
  hidePagination: PropTypes.bool,
  count: PropTypes.number,
  activePage: PropTypes.number,
  offset: PropTypes.number,
  perPage: PropTypes.number,
  handlePageChange: PropTypes.func,
  hideMenu: PropTypes.bool,
  menuAriaLabel: PropTypes.string,
  setDownloadError: PropTypes.func,
  downloadError: PropTypes.bool,
  isDownloading: PropTypes.bool,
  downloadAllButtonRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
  downloadSelectedButtonRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
};

TableHeader.defaultProps = {
  numberOfSelected: 0,
  toggleSelectAll: () => { },
  showFilter: false,
  forMyAlerts: false,
  hidePagination: false,
  onUpdateFilters: () => { },
  handleDownloadAll: () => { },
  handleDownloadClick: () => { },
  count: 0,
  activePage: 0,
  offset: 0,
  perPage: 10,
  handlePageChange: () => { },
  hideMenu: false,
  menuAriaLabel: 'Reports menu',
  downloadError: false,
  setDownloadError: () => {},
  isDownloading: false,
  downloadAllButtonRef: () => {},
  downloadSelectedButtonRef: () => {},
};

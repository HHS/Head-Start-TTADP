import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import ReportMenu from '../pages/Landing/ReportMenu';
import colors from '../colors';
import PaginationCard from './PaginationCard';

export default function TableHeader({
  title,
  numberOfSelected,
  toggleSelectAll,
  hideMenu,
  menuAriaLabel,
  handleDownloadAll,
  handleDownloadClick,
  count,
  downloadError,
  setDownloadError,
  isDownloading,
  downloadAllButtonRef,
  downloadSelectedButtonRef,
  exportIdPrefix,
  activePage,
  offset,
  perPage,
  handlePageChange,
}) {
  return (
    <div className="desktop:display-flex">
      <div className="desktop-lg:display-flex flex-1 flex-align-center desktop:padding-top-0 padding-top-2 flex-justify">
        <div className="desktop:display-flex flex-align-center">
          <h2 className="font-body-lg desktop-lg:margin-y-0 margin-left-2 margin-right-1">{title}</h2>
          <span className="smart-hub--table-controls desktop:margin-0 margin-2 display-flex flex-row">
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
                    color={colors.ttahubMediumBlue}
                    inverse
                    icon={faTimesCircle}
                  />
                </Button>
              </span>
            )}
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
              exportIdPrefix={exportIdPrefix}
            />
            )}
          </span>
        </div>
        <PaginationCard
          currentPage={activePage}
          totalCount={count}
          offset={offset}
          perPage={perPage}
          handlePageChange={handlePageChange}
          accessibleLandmarkName="Pagination, top"
          hideInfo
        />
      </div>
    </div>
  );
}

TableHeader.propTypes = {
  exportIdPrefix: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  numberOfSelected: PropTypes.number,
  toggleSelectAll: PropTypes.func,
  handleDownloadAll: PropTypes.func,
  handleDownloadClick: PropTypes.func,
  count: PropTypes.number,
  activePage: PropTypes.number.isRequired,
  offset: PropTypes.number.isRequired,
  perPage: PropTypes.number.isRequired,
  handlePageChange: PropTypes.func.isRequired,
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
  toggleSelectAll: null,
  handleDownloadAll: null,
  handleDownloadClick: null,
  count: 0,
  hideMenu: false,
  menuAriaLabel: 'Reports menu',
  downloadError: false,
  setDownloadError: null,
  isDownloading: false,
  downloadAllButtonRef: null,
  downloadSelectedButtonRef: null,
};

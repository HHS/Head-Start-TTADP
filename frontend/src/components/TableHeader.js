import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import ReportMenu from '../pages/Landing/ReportMenu';
import colors from '../colors';
import PaginationCard from './PaginationCard';
import './TableHeader.css';

export default function TableHeader({
  title,
  numberOfSelected,
  toggleSelectAll,
  hideMenu,
  hideCountHeaderOnEmpty,
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
  const tableHeaderClassNames = [
    'ttahub-table-header',
    'desktop:display-flex',
  ];

  if (hideMenu) {
    tableHeaderClassNames.push('ttahub-table-header--hide-menu');
  }

  const controlsWrapDisplay = hideMenu ? 'display-none' : 'display-flex';
  return (
    <div className={tableHeaderClassNames.join(' ')}>
      <div className="ttahub-table-header--contents padding-y-2">
        <div className="ttahub-table-header--contents-heading-section display-flex">
          <h2 className="font-body-lg margin-y-0 margin-left-2 margin-right-1">{title}</h2>
          <span className={`smart-hub--table-controls margin-x-0 ${controlsWrapDisplay} flex-row`}>
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
        <div className="display-flex flex-align-center">
          <PaginationCard
            currentPage={activePage}
            totalCount={count}
            offset={offset}
            perPage={perPage}
            hideCountHeaderOnEmpty={hideCountHeaderOnEmpty}
            handlePageChange={handlePageChange}
            accessibleLandmarkName="Pagination, top"
            paginationClassName="padding-x-1 margin-0"
          />
        </div>
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
  handlePageChange: PropTypes.func,
  hideMenu: PropTypes.bool,
  hideCountHeaderOnEmpty: PropTypes.bool,
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
  handlePageChange: undefined,
  hideMenu: false,
  hideCountHeaderOnEmpty: false,
  menuAriaLabel: 'Reports menu',
  downloadError: false,
  setDownloadError: null,
  isDownloading: false,
  downloadAllButtonRef: null,
  downloadSelectedButtonRef: null,
};

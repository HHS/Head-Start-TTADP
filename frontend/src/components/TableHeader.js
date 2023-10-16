import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import ReportMenu from '../pages/Landing/ReportMenu';
import colors from '../colors';

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

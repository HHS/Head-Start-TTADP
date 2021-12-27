import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { faSortDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert } from '@trussworks/react-uswds';
import Container from '../../components/Container';

export const MAXIMUM_EXPORTED_REPORTS = 2000;

function ReportMenu({
  onExportAll,
  onExportSelected,
  hasSelectedReports,
  label,
  count,
  downloadError,
  isDownloading,
}) {
  const [open, updateOpen] = useState(false);

  const menuRef = useRef();
  const menuButtonRef = useRef();

  let openClass = '';

  useEffect(() => {
    if (open === true) {
      menuRef.current.focus();
    }
  }, [open]);

  if (open) {
    openClass = 'smart-hub--menu-button__open';
  }

  const onMenuBlur = (e) => {
    // https://reactjs.org/docs/events.html#detecting-focus-entering-and-leaving
    if (!e.currentTarget.contains(e.relatedTarget)) {
      updateOpen(false);
    }
  };

  const onMenuKeyDown = (e) => {
    if (['Escape', 'Esc'].includes(e.key)) {
      updateOpen(false);
      menuButtonRef.current.focus();
    }
  };

  const menuClassNames = `tta-report-menu z-400 position-absolute left-0 ${downloadError ? 'width-tablet' : 'width-mobile'}`;
  return (
    <span className="position-relative">

      <button
        ref={menuButtonRef}
        type="button"
        aria-haspopup="menu"
        className={`usa-button usa-button--outline font-sans-xs margin-left-1 ${openClass}`}
        aria-label={label}
        onClick={() => updateOpen((current) => !current)}
      >
        Export reports
        {' '}
        <FontAwesomeIcon
          size="1x"
          className="margin-left-1"
          style={{ paddingBottom: '2px' }}
          color="#005ea2"
          icon={faSortDown}
        />
      </button>
      {open && (
        <div role="menu" tabIndex={-1} onBlur={onMenuBlur} onKeyDown={onMenuKeyDown} ref={menuRef} className={menuClassNames}>
          <Container padding={2} className="margin-bottom-0">
            {downloadError && (
              <Alert noIcon slim type="error" className="margin-bottom-3" role="alert">
                Sorry, something went wrong. Please try your request again.
                <br />
                You may export up to
                {' '}
                {MAXIMUM_EXPORTED_REPORTS.toLocaleString('en-us')}
                {' '}
                reports at a time.
                {' '}
                <br />
                For assistance, please
                  {' '}
                <a href="https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a">contact support</a>
                .

              </Alert>
            )}
            {count > MAXIMUM_EXPORTED_REPORTS ? (
              <>
                <div className="usa-hint" id="no-exports-please">
                  <p>
                    This export has
                    {' '}
                    {count.toLocaleString('en-US')}
                    {' '}
                    reports. You can only export
                    {' '}
                    {MAXIMUM_EXPORTED_REPORTS.toLocaleString('en-us')}
                    {' '}
                    reports at a time.
                  </p>
                  <p>
                    To export more than
                    {' '}
                    {MAXIMUM_EXPORTED_REPORTS.toLocaleString('en-us')}
                    {' '}
                    reports, please
                    {' '}
                    <a href="https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a">contact support</a>
                    {' '}
                    and specify the filters you need.
                  </p>
                </div>
              </>
            )
              : (
                <button
                  role="menuitem"
                  onClick={onExportAll}
                  type="button"
                  disabled={downloadError || isDownloading}
                  className="usa-button usa-button--unstyled display-block smart-hub--reports-button smart-hub--button__no-margin"
                >
                  Export table data
                </button>
              ) }
            {hasSelectedReports && onExportSelected && (
              <button
                role="menuitem"
                onClick={onExportSelected}
                type="button"
                disabled={isDownloading}
                className="usa-button usa-button--unstyled display-block smart-hub--reports-button smart-hub--button__no-margin margin-top-2"
              >
                Export selected reports
              </button>
            )}
          </Container>
        </div>
      )}
    </span>
  );
}

ReportMenu.propTypes = {
  onExportAll: PropTypes.func.isRequired,
  onExportSelected: PropTypes.func,
  hasSelectedReports: PropTypes.bool.isRequired,
  label: PropTypes.string,
  count: PropTypes.number,
  downloadError: PropTypes.bool,
  isDownloading: PropTypes.bool,
};

ReportMenu.defaultProps = {
  count: 0,
  downloadError: false,
  label: 'Reports menu',
  onExportSelected: null,
  isDownloading: false,
};

export default ReportMenu;

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { faSortDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Container from '../../components/Container';

import './ReportMenu.css';

const MAXIMUM_EXPORTED_REPORTS = 5000;

function ReportMenu({
  onExportAll,
  onExportSelected,
  hasSelectedReports,
  label,
  count,
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

  return (
    <span className="position-relative">
      <button
        ref={menuButtonRef}
        type="button"
        aria-haspopup="menu"
        className={`usa-button usa-button--outline font-sans-xs margin-left-1 smart-hub--table-controls__button ${openClass}`}
        aria-label={label}
        onClick={() => updateOpen((current) => !current)}
      >
        Reports
        {' '}
        <FontAwesomeIcon
          size="1x"
          className="margin-left-1"
          style={{ paddingBottom: '2px' }}
          color="black"
          icon={faSortDown}
        />
      </button>
      {open && (
        <div role="menu" tabIndex={-1} onBlur={onMenuBlur} onKeyDown={onMenuKeyDown} ref={menuRef} className="tta-report-menu z-400 position-absolute left-0 width-mobile">
          <Container padding={2} className="margin-bottom-0">
            {count > MAXIMUM_EXPORTED_REPORTS ? (
              <>
                <div className="display-flex">
                  <button
                    role="menuitem"
                    onClick={onExportAll}
                    type="button"
                    disabled
                    className="usa-button usa-button--unstyled smart-hub--reports-button margin-bottom-1"
                    aria-labelledby="no-exports-please"
                  >
                    Export table data
                  </button>
                  <span className="padding-left-1 font-family-sans">
                    (
                    {count.toLocaleString('en-US')}
                    {' '}
                    records
                    {' '}
                    )
                  </span>
                </div>
                <div className="usa-hint" id="no-exports-please">
                  There is a
                  {' '}
                  {MAXIMUM_EXPORTED_REPORTS.toLocaleString('en-US')}
                  {' '}
                  record maximum export limit. For assistance, please
                  {' '}
                  <a href="mailto:ttasupport@adhocteam.us">contact support</a>
                  .
                </div>
              </>
            )
              : (
                <button
                  role="menuitem"
                  onClick={onExportAll}
                  type="button"
                  className="usa-button usa-button--unstyled smart-hub--reports-button smart-hub--button__no-margin"
                >
                  Export table data...
                </button>
              ) }
            {hasSelectedReports && onExportSelected && (
              <button
                role="menuitem"
                onClick={onExportSelected}
                type="button"
                className="usa-button usa-button--unstyled smart-hub--reports-button smart-hub--button__no-margin margin-top-2"
              >
                Export selected reports...
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
};

ReportMenu.defaultProps = {
  count: 0,
  label: 'Reports menu',
  onExportSelected: null,
};

export default ReportMenu;

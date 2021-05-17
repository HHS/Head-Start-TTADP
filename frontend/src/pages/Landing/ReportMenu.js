import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { faSortDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Container from '../../components/Container';

function ReportMenu({
  onExportAll,
  onExportSelected,
  hasSelectedReports,
  label,
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
    <span>
      <button
        ref={menuButtonRef}
        type="button"
        aria-haspopup="menu"
        className={`usa-button usa-button--outline smart-hub--filter-button smart-hub--table-controls__button ${openClass}`}
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
        <div role="menu" tabIndex={-1} onBlur={onMenuBlur} onKeyDown={onMenuKeyDown} ref={menuRef} style={{ left: '85px' }} className="z-400 position-absolute width-card-lg">
          <Container padding={2} className="margin-bottom-0">
            <button
              role="menuitem"
              onClick={onExportAll}
              type="button"
              className="usa-button usa-button--unstyled smart-hub--reports-button smart-hub--button__no-margin"
            >
              Export Table Data...
            </button>
            {hasSelectedReports && (
              <button
                role="menuitem"
                onClick={onExportSelected}
                type="button"
                className="usa-button usa-button--unstyled smart-hub--reports-button smart-hub--button__no-margin margin-top-2"
              >
                Export Selected Reports...
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
  onExportSelected: PropTypes.func.isRequired,
  hasSelectedReports: PropTypes.bool.isRequired,
  label: PropTypes.string,
};

ReportMenu.defaultProps = {
  label: 'Reports menu',
};

export default ReportMenu;

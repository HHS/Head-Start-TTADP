import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { faSortDown } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@trussworks/react-uswds';
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

  return (
    <span>
      <Button
        type="button"
        role="menuitem"
        outline
        className={`smart-hub--filter-button smart-hub--table-controls__button ${openClass}`}
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
      </Button>
      {open && (
        <div role="menu" tabIndex={-1} onBlur={onMenuBlur} ref={menuRef} style={{ left: '85px' }} className="z-400 position-absolute width-card-lg">
          <Container padding={2} className="margin-bottom-0">
            <Button
              onClick={onExportAll}
              type="button"
              unstyled
              className="smart-hub--reports-button smart-hub--button__no-margin"
            >
              Export Table Data...
            </Button>
            {hasSelectedReports && (
              <Button
                onClick={onExportSelected}
                type="button"
                unstyled
                className="smart-hub--reports-button smart-hub--button__no-margin margin-top-2"
              >
                Export Selected Reports...
              </Button>
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
  label: 'Open report menu',
};

export default ReportMenu;

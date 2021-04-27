import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { faSortDown } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Container from '../../components/Container';

function ReportMenu({ onExportAll, onExportSelected, hasSelectedReports }) {
  const [open, updateOpen] = useState(false);
  let openClass = '';

  if (open) {
    openClass = 'smart-hub--menu-button__open';
  }

  return (
    <span>
      <Button
        type="button"
        outline
        className={`smart-hub--filter-button smart-hub--table-controls__button ${openClass}`}
        aria-label="Open report menu"
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
        <div style={{ left: '85px' }} className="z-400 position-absolute width-card-lg">
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
};

export default ReportMenu;

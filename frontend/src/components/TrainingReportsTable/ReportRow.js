import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@trussworks/react-uswds';
import { useHistory } from 'react-router-dom';
import moment from 'moment';
import ContextMenu from '../ContextMenu';
import { getSessionReportsDownloadURL } from '../../fetchers/helpers';
import TooltipWithCollection from '../TooltipWithCollection';
import Tooltip from '../Tooltip';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import './ReportRow.css';

function ReportRow({
  report,
  openMenuUp,
  handleReportSelect,
  isChecked,
  numberOfSelectedReports,
  exportSelected,
}) {
  const {
    id,
    eventId,
    eventName,
    sessionName,
    startDate,
    endDate,
    objectiveTopics,
  } = report;

  const [trClassname, setTrClassname] = useState('tta-smarthub--report-row');

  const history = useHistory();

  const menuItems = [
    {
      label: 'View Session',
      onClick: () => { history.push(`/session/${id}`); },
    },
  ];

  if (navigator.clipboard) {
    menuItems.push({
      label: 'Copy URL',
      onClick: async () => {
        await navigator.clipboard.writeText(`${window.location.origin}/session/${id}`);
      },
    });
  }

  const downloadMenuItem = {
    label: 'Download',
    onClick: () => {
      const downloadURL = getSessionReportsDownloadURL([id]);
      window.location.assign(downloadURL);
    },
  };
  menuItems.push(downloadMenuItem);

  const contextMenuLabel = `Actions for session ${eventId}`;

  const selectId = `report-${id}`;

  /**
   * we manage the class of the row as a sort of "focus-within" workaround
   * this is entirely to show/hide the export reports button to keyboard users but
   * not blast screen-reader only users with a bunch of redundant buttons
   */

  const onFocus = () => setTrClassname('tta-smarthub--report-row focused');

  const onBlur = (e) => {
    if (e.relatedTarget && e.relatedTarget.matches('.tta-smarthub--report-row *')) {
      return;
    }
    setTrClassname('tta-smarthub--report-row');
  };

  const topicsArray = objectiveTopics ? objectiveTopics.map((t) => t.name) : [];

  return (
    <tr onFocus={onFocus} onBlur={onBlur} className={trClassname} key={`landing_${id}`}>
      <td className="width-8" data-label="Select report">
        <Checkbox id={selectId} label="" value={id} checked={isChecked} onChange={handleReportSelect} aria-label={`Select ${eventId}`} />
        { numberOfSelectedReports > 0 && (
        <button
          type="button"
          className="usa-button usa-button--outline ttahub-export-reports"
          onClick={exportSelected}
        >
          Export
          {' '}
          {numberOfSelectedReports}
          {' '}
          selected reports
        </button>
        ) }
      </td>
      <th data-label="Event ID" scope="row" className="smart-hub--blue">
        {eventId || '--'}
      </th>
      <td data-label="Event title">
        {eventName ? (
          <Tooltip
            displayText={eventName}
            tooltipText={eventName}
            buttonLabel="click to reveal event name"
          />
        ) : '--'}
      </td>
      <td data-label="Session name">
        {sessionName ? (
          <Tooltip
            displayText={sessionName}
            tooltipText={sessionName}
            buttonLabel="click to reveal session name"
          />
        ) : ''}
      </td>
      <td data-label="Session start date">
        {startDate ? moment(startDate).format(DATE_DISPLAY_FORMAT) : '--'}
      </td>
      <td data-label="Session end date">
        {endDate ? moment(endDate).format(DATE_DISPLAY_FORMAT) : '--'}
      </td>
      <td data-label="Topics">
        <TooltipWithCollection collection={topicsArray} collectionTitle={`topics for ${eventId}`} position={openMenuUp ? 'top' : 'bottom'} />
      </td>
      <td data-label="Context menu">
        <ContextMenu label={contextMenuLabel} menuItems={menuItems} up={openMenuUp} fixed />
      </td>
    </tr>
  );
}

export const reportPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  eventId: PropTypes.string,
  eventName: PropTypes.string,
  sessionName: PropTypes.string,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  objectiveTopics: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
    }),
  ),
});

ReportRow.propTypes = {
  report: reportPropTypes.isRequired,
  openMenuUp: PropTypes.bool.isRequired,
  handleReportSelect: PropTypes.func.isRequired,
  isChecked: PropTypes.bool.isRequired,
  numberOfSelectedReports: PropTypes.number,
  exportSelected: PropTypes.func.isRequired,
};

ReportRow.defaultProps = {
  numberOfSelectedReports: 0,
};

export default ReportRow;

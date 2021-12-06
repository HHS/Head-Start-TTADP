import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@trussworks/react-uswds';
import { Link, useHistory } from 'react-router-dom';
import moment from 'moment';
import ContextMenu from '../ContextMenu';
import { getReportsDownloadURL } from '../../fetchers/helpers';
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
    displayId,
    activityRecipients,
    startDate,
    author,
    topics,
    collaborators,
    lastSaved,
    calculatedStatus,
    approvedAt,
    createdAt,
    legacyId,
  } = report;

  const [trClassname, setTrClassname] = useState('tta-smarthub--report-row');

  const history = useHistory();
  const authorName = author ? author.fullName : '';
  const recipients = activityRecipients && activityRecipients.map((ar) => (
    ar.grant ? ar.grant.recipient.name : ar.name
  ));

  const collaboratorNames = collaborators && collaborators.map((collaborator) => (
    collaborator.fullName));

  const viewOrEditLink = calculatedStatus === 'approved' ? `/activity-reports/view/${id}` : `/activity-reports/${id}`;
  const linkTarget = legacyId ? `/activity-reports/legacy/${legacyId}` : viewOrEditLink;

  const menuItems = [
    {
      label: 'View',
      onClick: () => { history.push(linkTarget); },
    },
  ];

  if (navigator.clipboard) {
    menuItems.push({
      label: 'Copy URL',
      onClick: async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${linkTarget}`);
      },
    });
  }

  if (!legacyId) {
    const downloadMenuItem = {
      label: 'Download',
      onClick: () => {
        const downloadURL = getReportsDownloadURL([id]);
        window.location.assign(downloadURL);
      },
    };
    menuItems.push(downloadMenuItem);
  }

  const contextMenuLabel = `Actions for activity report ${displayId}`;

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

  return (
    <tr onFocus={onFocus} onBlur={onBlur} className={trClassname} key={`landing_${id}`}>
      <td className="width-8">
        <Checkbox id={selectId} label="" value={id} checked={isChecked} onChange={handleReportSelect} aria-label={`Select ${displayId}`} />
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
      <th scope="row" className="smart-hub--blue">
        <Link
          to={linkTarget}
        >
          {displayId}
        </Link>
      </th>
      <td>
        <TooltipWithCollection collection={recipients} collectionTitle={`recipients for ${displayId}`} />
      </td>
      <td>{startDate}</td>
      <td>
        {authorName ? (
          <Tooltip
            displayText={authorName}
            tooltipText={authorName}
            buttonLabel="click to reveal author name"
          />
        ) : '' }
      </td>
      <td>{moment(createdAt).format(DATE_DISPLAY_FORMAT)}</td>
      <td>
        <TooltipWithCollection collection={topics} collectionTitle={`topics for ${displayId}`} />
      </td>
      <td>
        <TooltipWithCollection collection={collaboratorNames} collectionTitle={`collaborators for ${displayId}`} />
      </td>
      <td>{lastSaved}</td>
      <td>{approvedAt && moment(approvedAt).format(DATE_DISPLAY_FORMAT)}</td>
      <td>
        <ContextMenu label={contextMenuLabel} menuItems={menuItems} up={openMenuUp} />
      </td>
    </tr>
  );
}

export const reportPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  displayId: PropTypes.string.isRequired,
  activityRecipients: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    grant: PropTypes.shape({
      recipient: PropTypes.shape({
        name: PropTypes.string,
      }),
    }),
  })).isRequired,
  approvedAt: PropTypes.string,
  createdAt: PropTypes.string,
  startDate: PropTypes.string.isRequired,
  author: PropTypes.shape({
    fullName: PropTypes.string,
    homeRegionId: PropTypes.number,
    name: PropTypes.string,
  }).isRequired,
  topics: PropTypes.arrayOf(PropTypes.string).isRequired,
  collaborators: PropTypes.arrayOf(
    PropTypes.shape({
      fullName: PropTypes.string,
    }),
  ),
  lastSaved: PropTypes.string,
  calculatedStatus: PropTypes.instanceOf(moment),
  legacyId: PropTypes.string,
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

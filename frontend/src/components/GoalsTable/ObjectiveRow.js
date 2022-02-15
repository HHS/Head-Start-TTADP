import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock, faCheckCircle, faExclamationCircle, faMinusCircle, faFlag,
} from '@fortawesome/free-solid-svg-icons';
import { reasonsToMonitor } from '../../pages/ActivityReport/constants';
import './ObjectiveRow.css';

function ObjectiveRow({
  objective,
}) {
  const {
    title,
    arId,
    arNumber,
    arLegacyId,
    arStatus,
    endDate,
    reasons,
    status,
  } = objective;

  const viewOrEditLink = arStatus === 'approved' ? `/activity-reports/view/${arId}` : `/activity-reports/${arId}`;
  const linkToAr = arLegacyId ? `/activity-reports/legacy/${arLegacyId}` : viewOrEditLink;

  const determineReasonMonitorStatus = (reason) => {
    if (reasonsToMonitor.includes(reason)) {
      return (
        <>
          <FontAwesomeIcon className="margin-left-1" size="1x" color="#d42240" icon={faFlag} />
        </>
      );
    }
    return null;
  };

  const displayReasonsList = (sortedReasons) => (
    <ul className="padding-left-0 margin-0 tta-smarthub--objective-reasons-list">
      {
        sortedReasons.map((r) => (
          <li>
            {r}
            {determineReasonMonitorStatus(r)}
          </li>
        ))
      }
    </ul>
  );

  const mapStatusToDisplay = [
    {
      stored: 'In Progress',
      display: 'In progress',
    },
    {
      stored: 'Complete',
      display: 'Closed',
    },
    {
      stored: 'Not Started',
      display: 'Not started',
    },
    {
      stored: 'Needs Status',
      display: 'Needs status',
    },
  ];

  const getGoalDisplayStatusText = () => {
    let displayStatus = 'Needs status';
    if (status) {
      const matchingStatus = mapStatusToDisplay.find((m) => m.stored === status);
      if (matchingStatus) {
        displayStatus = matchingStatus.display;
      }
    }
    return displayStatus;
  };

  const displayObjStatus = getGoalDisplayStatusText();

  const getObjectiveStatusIcon = () => {
    if (displayObjStatus === 'In progress') {
      return <FontAwesomeIcon className="margin-right-1" size="1x" color="#0166ab" icon={faClock} />;
    } if (displayObjStatus === 'Closed') {
      return <FontAwesomeIcon className="margin-right-1" size="1x" color="#148439" icon={faCheckCircle} />;
    }
    if (displayObjStatus === 'Not started') {
      return <FontAwesomeIcon className="margin-right-1" size="1x" color="#e2a04d" icon={faMinusCircle} />;
    }
    return <FontAwesomeIcon className="margin-right-1" size="1x" color="#c5c5c5" icon={faExclamationCircle} />;
  };

  return (
    <>
      <tr className="tta-smarthub--objective-row">
        <td>{title}</td>
        <td>
          {' '}
          <Link
            to={linkToAr}
          >
            {arNumber}
          </Link>
        </td>
        <td>{endDate}</td>
        <td>
          {displayReasonsList(reasons.sort())}
        </td>
        <td>
          {getObjectiveStatusIcon()}
          {displayObjStatus}
        </td>
      </tr>
    </>
  );
}

export const objectivePropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  arId: PropTypes.number.isRequired,
  arLegacyId: PropTypes.string,
  arNumber: PropTypes.string.isRequired,
  arStatus: PropTypes.string.isRequired,
  ttaProvided: PropTypes.string.isRequired,
  endDate: PropTypes.arrayOf(PropTypes.string).isRequired,
  reasons: PropTypes.arrayOf(PropTypes.string),
  status: PropTypes.number.isRequired,
});

objectivePropTypes.defaultProps = {
  goalStatus: null,
  arLegacyId: null,
  reasons: [],
};
ObjectiveRow.propTypes = {
  objective: objectivePropTypes.isRequired,
};
export default ObjectiveRow;

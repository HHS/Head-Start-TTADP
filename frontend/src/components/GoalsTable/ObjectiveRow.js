import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag } from '@fortawesome/free-solid-svg-icons';
import { reasonsToMonitor } from '../../pages/ActivityReport/constants';
import './ObjectiveRow.scss';
import colors from '../../colors';
import {
  InProgress,
  Closed,
  NoStatus,
  NotStarted,
} from './icons';

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
    grantNumber,
  } = objective;

  const viewOrEditLink = arStatus === 'approved' ? `/activity-reports/view/${arId}` : `/activity-reports/${arId}`;
  const linkToAr = arLegacyId ? `/activity-reports/legacy/${arLegacyId}` : viewOrEditLink;

  const determineReasonMonitorStatus = (reason) => {
    if (reasonsToMonitor.includes(reason)) {
      return (
        <>
          <FontAwesomeIcon className="margin-left-1" size="1x" color={colors.error} icon={faFlag} />
        </>
      );
    }
    return null;
  };

  const displayReasonsList = (sortedReasons) => (
    <ul className="padding-left-0 margin-0 tta-smarthub--objective-reasons-list">
      {
        sortedReasons.map((r) => (
          <li key={`reason_${r}`}>
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
      display: 'Complete',
    },
    {
      stored: 'Completed',
      display: 'Completed',
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

  const getObjectiveStatusIcon = (() => {
    if (displayObjStatus === 'In progress') {
      return <InProgress />;
    } if (displayObjStatus === 'Complete' || displayObjStatus === 'Completed') {
      return <Closed />;
    }
    if (displayObjStatus === 'Not started') {
      return <NotStarted />;
    }
    return <NoStatus />;
  })();

  return (
    <>
      <ul className="usa-list usa-list--unstyled display-flex tta-smarthub--goal-row-obj-table-rows margin-bottom-1 padding-2">
        <li className="padding-x-105 padding-y-0 padding-left-0">
          <span className="sr-only">Objective </span>
          {title}
        </li>
        <li className="padding-x-105 padding-y-0">
          <span className="sr-only">Activity reports </span>
          {' '}
          <Link
            to={linkToAr}
          >
            {arNumber}
          </Link>
        </li>
        <li className="padding-x-105 padding-y-0">
          <span className="sr-only">Grant number </span>
          {grantNumber}
        </li>
        <li className="padding-x-105 padding-y-0">
          <span className="sr-only">End date </span>
          {endDate}
        </li>
        <li className="padding-x-105 padding-y-0">
          <span className="sr-only">Reasons </span>
          {reasons && displayReasonsList(reasons.sort())}
        </li>
        <li className="padding-x-105 padding-y-0 padding-right-0">
          <span className="sr-only">Objective status </span>
          {getObjectiveStatusIcon}
          {displayObjStatus}
        </li>
      </ul>
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
  endDate: PropTypes.string,
  reasons: PropTypes.arrayOf(PropTypes.string),
  status: PropTypes.string.isRequired,
  grantNumber: PropTypes.string,
});

objectivePropTypes.defaultProps = {
  goalStatus: null,
  arLegacyId: null,
  endDate: null,
  reasons: [],
};
ObjectiveRow.propTypes = {
  objective: objectivePropTypes.isRequired,
};
export default ObjectiveRow;

import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag } from '@fortawesome/free-solid-svg-icons';
import { reasonsToMonitor } from '../../pages/ActivityReport/constants';
import colors from '../../colors';
import {
  InProgress,
  Closed,
  NoStatus,
  NotStarted,
  Ceased,
} from './icons';
import './ObjectiveCard.scss';

function ObjectiveCard({
  objective,
  objectivesExpanded,
}) {
  const {
    title,
    endDate,
    reasons,
    status,
    grantNumbers,
    activityReports,
  } = objective;

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
    <ul className="usa-list usa-list--unstyled">
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
      stored: 'Not Started',
      display: 'Not started',
    },
    {
      stored: 'Needs Status',
      display: 'Needs status',
    },
    {
      stored: 'Suspended',
      display: 'Suspended',
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
    } if (displayObjStatus === 'Complete') {
      return <Closed />;
    }
    if (displayObjStatus === 'Not started') {
      return <NotStarted />;
    }
    if (displayObjStatus === 'Suspended') {
      return <Ceased />;
    }
    return <NoStatus />;
  })();

  return (
    <ul className="ttahub-goal-card__objective-list usa-list usa-list--unstyled padding-2 margin-top-2 bg-base-lightest radius-lg" hidden={!objectivesExpanded}>
      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Objective </span>
        <div>{title}</div>
      </li>
      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Activity reports </span>
        <ul className="usa-list usa-list--unstyled">
          {activityReports.map((report) => {
            const viewOrEditLink = `/activity-reports/view/${report.id}`;
            const linkToAr = report.legacyId ? `/activity-reports/legacy/${report.legacyId}` : viewOrEditLink;
            return (
              <li key={`AR-${report.id}`}>
                <Link
                  to={linkToAr}
                >
                  {report.displayId}
                </Link>
              </li>
            );
          })}
        </ul>
      </li>
      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Grant numbers </span>
        {grantNumbers.join(', ')}
      </li>
      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">End date </span>
        {endDate}
      </li>
      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Reasons</span>
        {reasons && displayReasonsList(reasons)}
      </li>
      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Objective status </span>
        {getObjectiveStatusIcon}
        {displayObjStatus}
      </li>
    </ul>
  );
}

export const objectivePropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  endDate: PropTypes.string,
  reasons: PropTypes.arrayOf(PropTypes.string),
  status: PropTypes.string.isRequired,
  grantNumbers: PropTypes.arrayOf(PropTypes.string),
  activityReports: PropTypes.arrayOf(PropTypes.shape({
    legacyId: PropTypes.string,
    number: PropTypes.string,
    id: PropTypes.number,
    endDate: PropTypes.string,
  })),
});

objectivePropTypes.defaultProps = {
  goalStatus: null,
  arLegacyId: null,
  endDate: null,
  reasons: [],
  grantNumbers: [],
  activityReports: [],
};
ObjectiveCard.propTypes = {
  objective: objectivePropTypes.isRequired,
  objectivesExpanded: PropTypes.bool.isRequired,
};
export default ObjectiveCard;

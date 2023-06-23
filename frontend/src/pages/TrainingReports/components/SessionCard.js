import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
  InProgress,
  Closed,
  NoStatus,
  NotStarted,
  Ceased,
  Pencil,
} from '../../../components/icons';
import './SessionReportCard.scss';

function SessionCard({
  eventId,
  session,
  expanded,
}) {
  const {
    sessionName,
    startDate,
    endDate,
    objective,
    objectiveSupportType,
    objectiveTopics,
    objectiveTrainers,
    status,
  } = session.data;

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
    <ul className="ttahub-goal-card__objective-list usa-list usa-list--unstyled padding-2 margin-top-2 bg-base-lightest radius-lg" hidden={!expanded}>
      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Session name </span>
        <div>
          {sessionName}
          <span className="margin-left-2">
            <Pencil />
            <Link to={`/training-report/${eventId}/session/${session.id}/session-summary`}>
              Edit session
            </Link>
          </span>
        </div>
      </li>
      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Session dates </span>
        {`${startDate || ''} - ${endDate || ''}`}
      </li>
      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Session objective </span>
        {objective}
      </li>

      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Support type </span>
        {objectiveSupportType}
      </li>

      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Topics </span>
        {objectiveTopics && objectiveTopics.length > 0 ? objectiveTopics.join(', ') : ''}
      </li>

      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Trainers </span>
        {objectiveTrainers && objectiveTrainers.length > 0 ? objectiveTrainers.join(', ') : ''}
      </li>

      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Status </span>
        {getObjectiveStatusIcon}
        {displayObjStatus}
      </li>
    </ul>
  );
}

export const sessionPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  data: PropTypes.shape({
    sessionName: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    objective: PropTypes.string.isRequired,
    objectiveSupportType: PropTypes.string.isRequired,
    objectiveTopics: PropTypes.arrayOf(PropTypes.string).isRequired,
    objectiveTrainers: PropTypes.arrayOf(PropTypes.string).isRequired,
    status: PropTypes.oneOf([
      'In Progress',
      'Complete',
      'Not Started',
      'Needs Status',
      'Suspended',
    ]),
  }).isRequired,
});
SessionCard.propTypes = {
  eventId: PropTypes.number.isRequired,
  session: sessionPropTypes.isRequired,
  expanded: PropTypes.bool.isRequired,
};
export default SessionCard;

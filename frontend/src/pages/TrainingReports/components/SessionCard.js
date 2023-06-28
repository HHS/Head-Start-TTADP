import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { TRAINING_REPORT_STATUSES, DECIMAL_BASE } from '@ttahub/common';
import { Link } from 'react-router-dom';
import UserContext from '../../../UserContext';
import {
  InProgress,
  Closed,
  NoStatus,
  Pencil,
} from '../../../components/icons';
import { canEditOrCreateSessionReports } from '../../../permissions';
import './SessionCard.scss';

function SessionCard({
  eventId,
  session,
  expanded,
  eventStatus,
}) {
  const { user } = useContext(UserContext);

  const {
    sessionName,
    startDate,
    endDate,
    objective,
    objectiveSupportType,
    objectiveTopics,
    objectiveTrainers,
    status,
    regionId,
  } = session.data;

  const hasEditPermissions = canEditOrCreateSessionReports(user, parseInt(regionId, DECIMAL_BASE));

  const getSessionDisplayStatusText = () => {
    switch (status) {
      case TRAINING_REPORT_STATUSES.IN_PROGRESS:
      case TRAINING_REPORT_STATUSES.COMPLETE:
        return status;
      default:
        return TRAINING_REPORT_STATUSES.NOT_STARTED;
    }
  };

  const displaySessionStatus = getSessionDisplayStatusText();

  const getSessionStatusIcon = (() => {
    if (displaySessionStatus === TRAINING_REPORT_STATUSES.IN_PROGRESS) {
      return <InProgress />;
    } if (displaySessionStatus === TRAINING_REPORT_STATUSES.COMPLETE) {
      return <Closed />;
    }
    return <NoStatus />;
  })();

  const showEditLink = hasEditPermissions && eventStatus !== TRAINING_REPORT_STATUSES.COMPLETE;

  return (
    <ul className="ttahub-session-card__session-list usa-list usa-list--unstyled padding-2 margin-top-2 bg-base-lightest radius-lg" hidden={!expanded}>
      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Session name </span>
        <div>
          <span className="margin-right-2">
            {sessionName}
          </span>
          {
            showEditLink
              ? (
                <span>
                  <Link key={`edit-session-key-${session.id}`} to={`/training-report/${eventId}/session/${session.id}/session-summary`}>
                    <Pencil />
                    Edit session
                  </Link>
                </span>
              )
              : null
      }
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
        {getSessionStatusIcon}
        {displaySessionStatus}
      </li>
    </ul>
  );
}

export const sessionPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  data: PropTypes.shape({
    regionId: PropTypes.number.isRequired,
    sessionName: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    objective: PropTypes.string.isRequired,
    objectiveSupportType: PropTypes.string.isRequired,
    objectiveTopics: PropTypes.arrayOf(PropTypes.string).isRequired,
    objectiveTrainers: PropTypes.arrayOf(PropTypes.string).isRequired,
    status: PropTypes.oneOf([
      'In progress',
      'Complete',
      'Needs status',
    ]),
  }).isRequired,
});
SessionCard.propTypes = {
  eventId: PropTypes.number.isRequired,
  session: sessionPropTypes.isRequired,
  expanded: PropTypes.bool.isRequired,
  eventStatus: PropTypes.string.isRequired,
};
export default SessionCard;

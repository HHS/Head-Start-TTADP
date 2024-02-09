import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './SessionObjectiveCard.css';

function SessionObjectiveCard({
  objective,
  objectivesExpanded,
}) {
  const {
    title,
    trainingReportId,
    grantNumbers,
    endDate,
    topics,
    sessionName,
  } = objective;

  const trainingReportUrl = `/training-report/${trainingReportId.substring(trainingReportId.lastIndexOf('-') + 1)}/event-summary`;

  return (
    <dl className="ttahub-goal-card__objective-list ttahub-goal-card__objective-list--session-objective usa-list usa-list--unstyled padding-2 margin-top-2 border radius-lg" hidden={!objectivesExpanded}>

      <dt className="desktop:text-normal text-bold">
        Session objective
      </dt>
      <dd className="margin-left-0 margin-bottom-1 desktop:margin-bottom-0">{title}</dd>

      <dt className="desktop:text-normal text-bold">
        Training report
      </dt>
      <dd className="margin-left-0 margin-bottom-1 desktop:margin-bottom-0">
        <Link to={trainingReportUrl}>
          {trainingReportId}
        </Link>
      </dd>

      <dt className="desktop:text-normal text-bold">
        Session
      </dt>
      <dd className="margin-left-0 margin-bottom-1 desktop:margin-bottom-0">{sessionName}</dd>

      <dt className="desktop:text-normal text-bold">
        Grant numbers
      </dt>
      <dd className="margin-left-0 margin-bottom-1 desktop:margin-bottom-0">{grantNumbers.join(', ')}</dd>

      <dt className="desktop:text-normal text-bold">End date </dt>
      <dd className="margin-left-0 margin-bottom-1 desktop:margin-bottom-0">{endDate}</dd>

      <dt className="desktop:text-normal text-bold">Topics</dt>
      <dd className="margin-left-0 margin-bottom-1 desktop:margin-bottom-0">
        {topics.join(', ')}
      </dd>

    </dl>
  );
}

SessionObjectiveCard.propTypes = {
  objective: PropTypes.shape({
    type: PropTypes.string,
    title: PropTypes.string,
    trainingReportId: PropTypes.string,
    sessionName: PropTypes.string,
    grantNumbers: PropTypes.arrayOf(PropTypes.string),
    endDate: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  objectivesExpanded: PropTypes.bool.isRequired,
};
export default SessionObjectiveCard;

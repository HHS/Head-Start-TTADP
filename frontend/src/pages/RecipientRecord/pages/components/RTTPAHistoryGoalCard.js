import React, { useState } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import GoalsToggle from './GoalsToggle';

const FULL_DATE_FORMAT = 'MMMM Do YYYY';

export default function RTTAPAHistoryGoalCard({ report, recipientId, regionId }) {
  const [showGoals, setShowGoals] = useState(false);
  return (
    <div className="ttahub-rttapa-list--item usa-card padding-3 radius-lg border smart-hub-border-base-lighter width-full" key={report.id}>
      <div>
        <h3>
          {report.user.name}
          {' '}
          reviewed
          {' '}
          {report.goals.length}
          {' '}
          goals on
          {' '}
          {moment(report.createdAt).format(FULL_DATE_FORMAT)}
          {' '}
        </h3>
        {report.notes && (
        <p className="usa-prose">{report.notes}</p>
        )}
      </div>
      <GoalsToggle
        goals={report.goals}
        showGoals={showGoals}
        setShowGoals={setShowGoals}
        goalIds={report.goals.map((goal) => goal.id)}
        onRemove={false}
        recipientId={recipientId}
        regionId={regionId}
      />
    </div>
  );
}

RTTAPAHistoryGoalCard.propTypes = {
  report: PropTypes.shape({
    id: PropTypes.number.isRequired,
    user: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }).isRequired,
    goals: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
    })).isRequired,
    notes: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
  }).isRequired,
  recipientId: PropTypes.number.isRequired,
  regionId: PropTypes.number.isRequired,
};

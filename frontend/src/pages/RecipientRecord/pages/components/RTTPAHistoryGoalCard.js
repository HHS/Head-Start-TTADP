import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Tag } from '@trussworks/react-uswds';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleUp,
  faAngleDown,
} from '@fortawesome/free-solid-svg-icons';
import colors from '../../../../colors';
import ObjectiveCard from '../../../../components/GoalCards/ObjectiveCard';
import StatusDropdown from '../../../../components/GoalCards/components/StatusDropdown';

const FULL_DATE_FORMAT = 'MMMM D, YYYY';

const GoalDataRow = ({ label, value }) => (
  <div className="ttahub-rttapa-report--goals--row tablet:display-flex margin-bottom-1">
    <p className="usa-prose text-bold tablet:width-15 margin-0">{label}</p>
    <div className="usa-prose margin-0 flex-1">{value}</div>
  </div>
);

GoalDataRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
};

export default function RTTAPAHistoryGoalCard({ report }) {
  const [showGoals, setShowGoals] = useState(false);
  return (
    <div className="ttahub-rttapa-list--item usa-card padding-3 radius-lg border smart-hub-border-base-lighter width-full" key={report.id}>
      <div>
        <h3 className="font-sans-lg margin-0">
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
      <Button
        type="button"
        className="usa-button--outline usa-button text-no-underline text-middle tta-smarthub--goal-row-objectives tta-smarthub--goal-row-objectives-enabled margin-bottom-2"
        onClick={() => {
          setShowGoals(!showGoals);
        }}
      >
        View goal
        {report.goals.length > 1 ? 's' : ''}
        <strong className="margin-left-1">
          (
          {report.goals.length}
          )
        </strong>
        <FontAwesomeIcon className="margin-left-1" size="1x" color={colors.ttahubMediumBlue} icon={showGoals ? faAngleUp : faAngleDown} />
      </Button>

      { showGoals && (
        report.goals.map((goal) => (
          <article className="ttahub-rttapa-report--goals padding-y-3" key={goal.id}>
            <h4 className="font-sans-lg margin-top-0 margin-bottom-2">
              Goal
              {' '}
              {goal.goalNumbers.join(', ')}
              { goal.isRttapa === 'Yes' ? <Tag className="margin-left-1 text-ink" background={colors.baseLighter}>RTTAPA</Tag> : null }
            </h4>
            <div className="ttahub-rttapa-report--goals--data margin-bottom-4">
              <GoalDataRow
                label="Goal status"
                value={(
                  <StatusDropdown
                    showReadOnlyStatus
                    onUpdateGoalStatus={() => {}}
                    status={goal.goalStatus}
                    regionId={report.regionId}
                    goalId={goal.id}
                  />
              )}
              />
              <GoalDataRow label="Goal" value={goal.goalText} />
              <GoalDataRow label="Topics" value={goal.goalTopics.join(', ')} />
            </div>
            {goal.objectives.length ? (
              <h5 className="font-serif-sm margin-top-0 margin-bottom-2">Objectives</h5>
            ) : null }
            {goal.objectives.map((objective) => (
              <ObjectiveCard objective={objective} objectivesExpanded key={objective.id} />
            ))}
          </article>
        ))
      )}

    </div>
  );
}

RTTAPAHistoryGoalCard.propTypes = {
  report: PropTypes.shape({
    regionId: PropTypes.number.isRequired,
    id: PropTypes.number.isRequired,
    user: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }).isRequired,
    goals: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      isRttapa: PropTypes.string,
      goalStatus: PropTypes.string,
      goalNumbers: PropTypes.arrayOf(PropTypes.string),
      goalText: PropTypes.string,
      goalTopics: PropTypes.arrayOf(PropTypes.string),
      objectives: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number,
      })),
    })).isRequired,
    notes: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
  }).isRequired,
};

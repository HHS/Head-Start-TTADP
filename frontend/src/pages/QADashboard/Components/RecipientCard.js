import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@trussworks/react-uswds';
// import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import { checkForDate } from '../../../utils';
import ExpanderButton from '../../../components/ExpanderButton';
import GoalCard, { goalPropTypes } from './GoalCard';
import { getScoreBadge } from '../../../components/ClassScoreBadge';

import './RecipientCard.scss';

function RecipientCard({
  recipient,
  handleGoalCheckboxSelect,
  isChecked,
  zIndex,
}) {
  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const closeOrOpenGoals = () => {
    setGoalsExpanded(!goalsExpanded);
  };
  return (
    <>
      <article
        className="ttahub-recipient-card usa-card padding-3 radius-lg border width-full maxw-full smart-hub-border-base-lighter position-relative"
        data-testid="recipientCard"
        style={{ zIndex }}
      >
        <div className="ttahub-recipient-card__row position-relative">
          <div className="ttahub-recipient-card__recipient-column__cb margin-top-1">
            <Checkbox
              id={`recipient-select-${recipient.name}`}
              label=""
              value={recipient.id}
              checked={isChecked}
              onChange={handleGoalCheckboxSelect}
              aria-label={`Select recipient ${recipient.name}`}
              className="margin-right-1"
              data-testid="selectRecipientTestId"
            />
          </div>
          <div className="ttahub-recipient-card__recipient-column__break" />
          <div className="ttahub-recipient-card__recipient-column ttahub-recipient-card__recipient-column__title padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Recipient</p>
            <p className="usa-prose margin-y-0">
              <Link to="../../recipient-tta-records/376/region/1/profile">
                {recipient.name}
              </Link>
            </p>
          </div>
          <div className="ttahub-recipient-card__recipient-column ttahub-recipient-card__recipient-column__date padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Last AR start date</p>
            <p className="usa-prose margin-y-0">
              {checkForDate(recipient.lastArStartDate)}
            </p>
          </div>
          <div className="ttahub-recipient-card__recipient-column ttahub-recipient-card__recipient-column__number padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Emotional support</p>
            <p className="usa-prose margin-y-0">{recipient.emotionalSupport}</p>
            <div className="margin-top-1">
              {getScoreBadge('ES', recipient.emotionalSupport, recipient.reportReceivedDate, 'font-sans-3xs')}
            </div>
          </div>
          <div className="ttahub-recipient-card__recipient-column ttahub-recipient-card__recipient-column__number padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Classroom organization</p>
            <p className="usa-prose margin-y-0">{recipient.classroomOrganization}</p>
            <div className="margin-top-1">
              {getScoreBadge('CO', recipient.classroomOrganization, recipient.reportReceivedDate, 'font-sans-3xs')}
            </div>
          </div>
          <div className="ttahub-recipient-card__recipient-column ttahub-recipient-card__recipient-column__number padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Instructional support</p>
            <p className="usa-prose margin-y-0">{recipient.instructionalSupport}</p>
            <div className="margin-top-1">
              {getScoreBadge('IS', recipient.instructionalSupport, recipient.reportReceivedDate, 'font-sans-3xs')}
            </div>
          </div>
          <div className="ttahub-recipient-card__recipient-column ttahub-recipient-card__recipient-column__date padding-right-3">
            <p className="usa-prose text-bold  margin-y-0">Report received date</p>
            <p className="usa-prose margin-y-0">{checkForDate(recipient.reportReceivedDate)}</p>
          </div>
        </div>

        <div className="margin-top-3">
          <ExpanderButton
            type="goal"
            ariaLabel={`goals for recipient ${recipient.name}`}
            closeOrOpen={closeOrOpenGoals}
            count={recipient.goals.length}
            expanded={goalsExpanded}
          />
        </div>

        {recipient.goals.map((goal) => (
          <GoalCard
            key={uuidv4()}
            goal={goal}
            zIndex={zIndex - 1}
            expanded={goalsExpanded}
          />
        ))}
      </article>

    </>
  );
}

RecipientCard.propTypes = {
  recipient: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    lastArStartDate: PropTypes.string.isRequired,
    emotionalSupport: PropTypes.number.isRequired,
    classroomOrganization: PropTypes.number.isRequired,
    instructionalSupport: PropTypes.number.isRequired,
    reportReceivedDate: PropTypes.string.isRequired,
    goals: PropTypes.arrayOf(goalPropTypes).isRequired,
  }).isRequired,
  handleGoalCheckboxSelect: PropTypes.func.isRequired,
  isChecked: PropTypes.bool.isRequired,
  zIndex: PropTypes.number.isRequired,
};

export default RecipientCard;

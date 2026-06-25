import { Checkbox } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getScoreBadge } from '../../../components/ClassScoreBadge';
import ExpanderButton from '../../../components/ExpanderButton';
import GoalCard, { goalPropTypes } from './GoalCard';

import './RecipientCard.scss';

function RecipientCard({ recipient, handleGoalCheckboxSelect, isChecked, zIndex }) {
  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const reportReceivedLabel = recipient.reportDeliveryDate || 'not available';
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
        <div>
          <Checkbox
            id={`recipient-select-${recipient.id}`}
            label=""
            value={recipient.id}
            checked={isChecked}
            onChange={handleGoalCheckboxSelect}
            aria-label={`Select recipient ${recipient.name} grant ${recipient.grantNumber} report received ${reportReceivedLabel}`}
            className="margin-right-1"
            data-testid="selectRecipientTestId"
          />
        </div>
        <div className="ttahub-recipient-card__row ttahub-recipient-card__summary-row position-relative margin-left-5">
          <div className="ttahub-recipient-card__recipient-column ttahub-recipient-card__recipient-column__title padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Recipient</p>
            <p className="usa-prose margin-y-0">
              <Link
                to={`../../recipient-tta-records/${recipient.recipientId}/region/${recipient.regionId}/profile`}
              >
                {recipient.name}
              </Link>
            </p>
          </div>
          <div className="ttahub-recipient-card__recipient-column ttahub-recipient-card__recipient-column__number padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Grant number</p>
            <p className="usa-prose margin-y-0">{recipient.grantNumber}</p>
          </div>
          <div className="ttahub-recipient-card__recipient-column ttahub-recipient-card__recipient-column__number padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Emotional support</p>
            <p className="usa-prose margin-y-0">{recipient.emotionalSupport}</p>
            <div className="margin-top-1">
              {getScoreBadge(
                'ES',
                recipient.emotionalSupport,
                recipient.reportDeliveryDate,
                'ttahub-recipient-card__recipient-column__badge'
              )}
            </div>
          </div>
          <div className="ttahub-recipient-card__recipient-column ttahub-recipient-card__recipient-classroom-organization padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Classroom organization</p>
            <p className="usa-prose margin-y-0">{recipient.classroomOrganization}</p>
            <div className="margin-top-1">
              {getScoreBadge(
                'CO',
                recipient.classroomOrganization,
                recipient.reportDeliveryDate,
                'ttahub-recipient-card__recipient-column__badge'
              )}
            </div>
          </div>
          <div className="ttahub-recipient-card__recipient-column ttahub-recipient-card__recipient-column__number padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Instructional support</p>
            <p className="usa-prose margin-y-0">{recipient.instructionalSupport}</p>
            <div className="margin-top-1">
              {getScoreBadge(
                'IS',
                recipient.instructionalSupport,
                recipient.reportDeliveryDate,
                'ttahub-recipient-card__recipient-column__badge'
              )}
            </div>
          </div>
          <div className="ttahub-recipient-card__recipient-column ttahub-recipient-card__recipient-column__date padding-right-3">
            <p className="usa-prose text-bold  margin-y-0">Report received date</p>
            <p className="usa-prose margin-y-0">{recipient.reportDeliveryDate}</p>
          </div>
          <div className="ttahub-recipient-card__goal-toggle-row margin-top-3">
            <ExpanderButton
              type="goal"
              ariaLabel={`goals for recipient ${recipient.name} grant ${recipient.grantNumber} report received ${reportReceivedLabel}`}
              closeOrOpen={closeOrOpenGoals}
              count={recipient.goals.length}
              expanded={goalsExpanded}
              showCount={false}
            />
          </div>
        </div>

        <div className="margin-left-4 margin-top-3" />

        {recipient.goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            zIndex={zIndex - 1}
            expanded={goalsExpanded}
            recipientId={recipient.recipientId}
            regionId={recipient.regionId}
          />
        ))}
      </article>
    </>
  );
}

RecipientCard.propTypes = {
  recipient: PropTypes.shape({
    id: PropTypes.string.isRequired,
    recipientId: PropTypes.number.isRequired,
    regionId: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    grantNumber: PropTypes.string.isRequired,
    lastARStartDate: PropTypes.string,
    emotionalSupport: PropTypes.number.isRequired,
    classroomOrganization: PropTypes.number.isRequired,
    instructionalSupport: PropTypes.number.isRequired,
    reportDeliveryDate: PropTypes.string,
    goals: PropTypes.arrayOf(goalPropTypes).isRequired,
  }).isRequired,
  handleGoalCheckboxSelect: PropTypes.func.isRequired,
  isChecked: PropTypes.bool.isRequired,
  zIndex: PropTypes.number.isRequired,
};

export default RecipientCard;

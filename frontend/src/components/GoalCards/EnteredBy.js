import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from '../Tooltip';

const EnteredBy = ({
  goalNumber, creatorRole, creatorName, moreThanOne,
}) => (
  <>
    <p key={goalNumber} className="usa-prose margin-top-0 margin-bottom-1 bg-base-lightest radius-md padding-x-1 display-inline-flex flex-align-center flex-justify-between text-decoration-underline">
      {moreThanOne && (
      <>
        <strong className="margin-right-1 text-no-wrap">{goalNumber}</strong>
        {' '}
      </>
      )}
      <Tooltip
        displayText={creatorRole}
        screenReadDisplayText={false}
        buttonLabel={`reveal the full name of the creator of this goal: ${goalNumber}`}
        tooltipText={creatorName}
        underlineStyle="solid"
        className="ttahub-goal-card__entered-by-tooltip"
      />
    </p>
  </>
);

EnteredBy.propTypes = {
  goalNumber: PropTypes.string.isRequired,
  creatorRole: PropTypes.string.isRequired,
  creatorName: PropTypes.string.isRequired,
  moreThanOne: PropTypes.bool.isRequired,
};

export default EnteredBy;

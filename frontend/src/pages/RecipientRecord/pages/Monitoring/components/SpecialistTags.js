import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from '../../../../../components/Tooltip';

export default function SpecialistTags({ specialists }) {
  return specialists.map((specialist) => {
    if (!specialist.name) return null;

    return (
      <p className="usa-prose margin-top-0 margin-bottom-1 margin-right-1 bg-base-lightest radius-md padding-x-1 display-inline-flex flex-align-center flex-justify-between text-decoration-underline">
        <Tooltip
          displayText={specialist.roles.join(', ')}
          screenReadDisplayText={false}
          buttonLabel="reveal the full name of this user"
          tooltipText={specialist.name}
          underlineStyle="solid"
          className="ttahub-goal-card__entered-by-tooltip"
        />
      </p>
    );
  });
}

SpecialistTags.propTypes = {
  specialists: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    roles: PropTypes.arrayOf(PropTypes.string),
  })).isRequired,
};

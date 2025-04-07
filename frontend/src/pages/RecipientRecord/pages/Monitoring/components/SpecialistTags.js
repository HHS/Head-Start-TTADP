import React from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import Tag from '../../../../../components/Tag';
import Tooltip from '../../../../../components/Tooltip';

export default function SpecialistTags({ specialists }) {
  return specialists.map((specialist) => {
    if (!specialist.name) return null;

    return (
      <Tag key={uniqueId('specialist-tag-')} clickable>
        <Tooltip
          displayText={specialist.roles.join(', ')}
          screenReadDisplayText={false}
          buttonLabel="reveal the full name of this user"
          tooltipText={specialist.name}
          hideUnderline
          buttonClassName="display-flex"
          className="ttahub-goal-card__entered-by-tooltip"
        />
      </Tag>
    );
  });
}

SpecialistTags.propTypes = {
  specialists: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      roles: PropTypes.arrayOf(PropTypes.string),
    }),
  ).isRequired,
};

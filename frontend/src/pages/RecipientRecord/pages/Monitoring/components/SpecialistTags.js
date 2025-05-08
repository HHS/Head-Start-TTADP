import React from 'react';
import PropTypes from 'prop-types';
import Tag from '../../../../../components/Tag';
import Tooltip from '../../../../../components/Tooltip';

export default function SpecialistTags({ specialists }) {
  const tags = [];

    const roleNames = specialist.roles.reduce((acc, role) => {
      if (role && role.role && role.role.name) {
        acc.push(role.role.name);
      }
      return acc;
    }, []).filter(Boolean);

    return (
      <Tag key={uniqueId('specialist-tag-')} clickable>
        <Tooltip
          displayText={roleNames.join(', ')}
          screenReadDisplayText={false}
          buttonLabel="reveal the full name of this user"
          tooltipText="Unknown"
          hideUnderline
          buttonClassName="display-flex"
          className="ttahub-goal-card__entered-by-tooltip"
        />
      </Tag>,
    );
  } else {
    specialists.forEach((specialist) => {
      if (!specialist.name) return;

      // monitoring goals: show a single "System-generated" tag with "OHS" role
      if (specialist.name === 'System-generated') {
        tags.push(
          <Tag key="system-generated-tag" clickable>
            <Tooltip
              displayText={specialist.roles[0] || 'Unavailable'}
              screenReadDisplayText={false}
              buttonLabel="reveal the full name of this user"
              tooltipText="System-generated"
              hideUnderline
              buttonClassName="display-flex"
              className="ttahub-goal-card__entered-by-tooltip"
            />
          </Tag>,
        );
        return;
      }

      // handle specialists with roles
      if (specialist.roles && specialist.roles.length > 0) {
        // separate tag for each role
        specialist.roles.forEach((role) => {
          tags.push(
            <Tag key={`${specialist.name}-${role}`} clickable>
              <Tooltip
                displayText={role}
                screenReadDisplayText={false}
                buttonLabel="reveal the full name of this user"
                tooltipText={specialist.name}
                hideUnderline
                buttonClassName="display-flex"
                className="ttahub-goal-card__entered-by-tooltip"
              />
            </Tag>,
          );
        });
      } else {
        // user has no roles
        tags.push(
          <Tag key={`${specialist.name}-unavailable`} clickable>
            <Tooltip
              displayText="Unavailable"
              screenReadDisplayText={false}
              buttonLabel="reveal the full name of this user"
              tooltipText={specialist.name}
              hideUnderline
              buttonClassName="display-flex"
              className="ttahub-goal-card__entered-by-tooltip"
            />
          </Tag>,
        );
      }
    });
  }

  return <>{tags}</>;
}

SpecialistTags.propTypes = {
  specialists: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      roles: PropTypes.arrayOf(PropTypes.string),
    }),
  ),
};

SpecialistTags.defaultProps = {
  specialists: [],
};

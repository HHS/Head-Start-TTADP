import React from 'react'
import PropTypes from 'prop-types'
import Tag from '../../../../../components/Tag'
import Tooltip from '../../../../../components/Tooltip'

export default function SpecialistTags({ specialists }) {
  const tags = []

  if (!specialists || specialists.length === 0) {
    // legacy goal, no collaborators data
    tags.push(
      <Tag key="unknown-unavailable" clickable>
        <Tooltip
          displayText="Unavailable"
          screenReadDisplayText={false}
          buttonLabel="reveal the full name of this user"
          tooltipText="Unknown"
          hideUnderline
          buttonClassName="display-flex"
          className="ttahub-goal-card__entered-by-tooltip"
        />
      </Tag>
    )
  } else {
    specialists.forEach((specialist) => {
      if (!specialist.name) return

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
          </Tag>
        )
        return
      }

      // handle specialists with roles
      if (specialist.roles && specialist.roles.length > 0) {
        // convert string roles to array if needed
        const roleArray = Array.isArray(specialist.roles)
          ? specialist.roles.flatMap((role) => {
              if (typeof role === 'string' && role.includes(',')) {
                return role.split(',').map((r) => r.trim())
              }
              return role
            })
          : specialist.roles.split(',').map((role) => role.trim())

        // separate tag for each role
        roleArray.forEach((r) => {
          if (!r) return
          const roleName = typeof r === 'string' ? r : r.role.name
          tags.push(
            <Tag key={`${specialist.name}-${roleName}`} clickable>
              <Tooltip
                displayText={roleName}
                screenReadDisplayText={false}
                buttonLabel="reveal the full name of this user"
                tooltipText={specialist.name}
                hideUnderline
                buttonClassName="display-flex"
                className="ttahub-goal-card__entered-by-tooltip"
              />
            </Tag>
          )
        })
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
          </Tag>
        )
      }
    })
  }

  return <>{tags}</>
}

SpecialistTags.propTypes = {
  specialists: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      roles: PropTypes.arrayOf(PropTypes.string),
    })
  ),
}

SpecialistTags.defaultProps = {
  specialists: [],
}

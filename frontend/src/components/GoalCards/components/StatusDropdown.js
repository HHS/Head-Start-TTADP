import React from 'react'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAngleDown } from '@fortawesome/free-solid-svg-icons'
import colors from '../../../colors'
import Menu from '../../Menu'
import './StatusDropdown.css'

export default function StatusDropdown({ label, options, className, icon, display }) {
  return (
    <Menu
      label={label}
      menuItems={options}
      left={false}
      up={false}
      className={`ttahub-status-select ${className}`}
      buttonText={
        <>
          {icon}
          {display}
          <FontAwesomeIcon className="margin-left-1" size="1x" color={colors.ttahubMediumBlue} icon={faAngleDown} />
        </>
      }
    />
  )
}

StatusDropdown.propTypes = {
  className: PropTypes.string,
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
    })
  ).isRequired,
  icon: PropTypes.node.isRequired,
  display: PropTypes.node.isRequired,
}

StatusDropdown.defaultProps = {
  className: '',
}

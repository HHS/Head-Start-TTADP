import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import './NewReportButton.scss'

export default function NewReportButton({ to, children, onClick }) {
  return (
    <Link to={to} className="usa-button smart-hub--new-report-btn" onClick={onClick}>
      <span className="smart-hub--plus">+</span>
      <span className="smart-hub--new-report">{children}</span>
    </Link>
  )
}

NewReportButton.propTypes = {
  to: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
}

NewReportButton.defaultProps = {
  onClick: null,
}

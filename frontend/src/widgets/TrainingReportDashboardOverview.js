import React from 'react'
import PropTypes from 'prop-types'
import withWidgetData from './withWidgetData'
import { DashboardOverviewWidget } from './DashboardOverview'

export function TrainingReportDashboardOverview({ filters, showTooltips, loading, data }) {
  return (
    <DashboardOverviewWidget
      data={data}
      filters={filters}
      fields={['Recipients served', 'Grants served', 'Training reports', 'Participants', 'Hours of TTA']}
      showTooltips={showTooltips}
      loading={loading}
    />
  )
}

TrainingReportDashboardOverview.propTypes = {
  data: PropTypes.shape({
    numReports: PropTypes.string,
    totalRecipients: PropTypes.string,
    recipientPercentage: PropTypes.string,
    numGrants: PropTypes.string,
    numRecipients: PropTypes.string,
    sumDuration: PropTypes.string,
    numParticipants: PropTypes.string,
  }),
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      topic: PropTypes.string,
      condition: PropTypes.string,
      query: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ).isRequired,
  loading: PropTypes.bool.isRequired,
  showTooltips: PropTypes.bool.isRequired,
}

TrainingReportDashboardOverview.defaultProps = {
  data: {
    numReports: '0',
    totalRecipients: '0',
    recipientPercentage: '0%',
    numGrants: '0',
    numRecipients: '0',
    sumDuration: '0',
    numParticipants: '0',
    numSessions: '0',
  },
}

export default withWidgetData(TrainingReportDashboardOverview, 'trOverview')

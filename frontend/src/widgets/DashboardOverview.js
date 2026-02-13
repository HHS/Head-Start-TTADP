import React from 'react'
import PropTypes from 'prop-types'
import { Grid } from '@trussworks/react-uswds'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartColumn, faUserFriends, faUser, faClock, faBuilding } from '@fortawesome/free-solid-svg-icons'
import withWidgetData from './withWidgetData'
import './DashboardOverview.css'
import colors from '../colors'
import { DashboardOverviewContainer } from './DashboardOverviewContainer'
import Tooltip from '../components/Tooltip'

export function Field({ label, data, icon, iconColor, backgroundColor, showTooltip, tooltipText }) {
  return (
    <Grid
      gap={4}
      desktop={{ col: 'fill' }}
      tablet={{ col: 5 }}
      mobileLg={{ col: 12 }}
      className="smart-hub--dashboard-overview-field margin-bottom-1 display-flex bg-white shadow-2 padding-y-2 padding-x-1"
    >
      <span className="smart-hub--dashboard-overview-field-icon flex-1 display-flex flex-justify-center flex-align-center">
        <span
          className="smart-hub--dashboard-overview-field-icon-background display-flex flex-justify-center flex-align-center"
          style={{ backgroundColor }}
        >
          <FontAwesomeIcon color={iconColor} icon={icon} />
        </span>
      </span>
      <span className="smart-hub--dashboard-overview-field-label display-flex flex-2 flex-column flex-justify-center">
        <span className="text-bold smart-hub--dashboard-overview-font-size">{data}</span>
        {showTooltip ? (
          <Tooltip
            displayText={label}
            screenReadDisplayText={false}
            buttonLabel={`${tooltipText} click to visually reveal this information`}
            tooltipText={tooltipText}
          />
        ) : (
          label
        )}
      </span>
    </Grid>
  )
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
  data: PropTypes.string.isRequired,
  icon: PropTypes.shape({
    prefix: PropTypes.string,
    iconName: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    icon: PropTypes.array,
  }).isRequired,
  iconColor: PropTypes.string.isRequired,
  backgroundColor: PropTypes.string.isRequired,
  tooltipText: PropTypes.string,
  showTooltip: PropTypes.bool,
}

Field.defaultProps = {
  tooltipText: '',
  showTooltip: false,
}

const getDashboardFields = (data, showTooltip) => [
  {
    lookUpKey: 'Activity reports',
    key: 'activity-reports',
    showTooltip,
    tooltipText: 'The number of approved activity reports.',
    icon: faChartColumn,
    iconColor: colors.success,
    backgroundColor: colors.successLighter,
    label1: 'Activity reports',
    data: data.numReports,
  },
  {
    lookUpKey: 'Training reports',
    key: 'training-reports',
    showTooltip,
    tooltipText: 'Training reports with a completed session',
    icon: faChartColumn,
    iconColor: colors.success,
    backgroundColor: colors.successLighter,
    label1: `across ${data.numReports} Training Reports`,
    data: `${data.numSessions} sessions`,
  },
  {
    lookUpKey: 'Grants served',
    key: 'grants-served',
    showTooltip,
    icon: faBuilding,
    iconColor: colors.ttahubMediumBlue,
    backgroundColor: colors.ttahubBlueLight,
    label1: 'Grants served',
    tooltipText: 'Each grant is only counted once',
    data: data.numGrants,
  },
  {
    lookUpKey: 'Participants',
    key: 'participants',
    showTooltip,
    tooltipText: 'The number of people in all activities',
    icon: faUserFriends,
    iconColor: colors.ttahubBlue,
    backgroundColor: colors.ttahubBlueLighter,
    label1: 'Participants',
    data: data.numParticipants,
  },
  {
    lookUpKey: 'Hours of TTA',
    key: 'hours-of-tta',
    showTooltip,
    tooltipText: 'Rounded to the nearest half hour',
    icon: faClock,
    iconColor: colors.ttahubOrange,
    backgroundColor: colors.ttahubOrangeLight,
    label1: 'Hours of TTA',
    data: data.sumDuration,
    decimalPlaces: 1,
  },
  {
    lookUpKey: 'In person activities',
    key: 'in-person-activities',
    icon: faUser,
    showTooltip,
    tooltipText: 'Excludes virtual activities',
    iconColor: colors.ttahubMagenta,
    backgroundColor: colors.ttahubMagentaLight,
    label1: 'In person activities',
    data: data.inPerson,
  },
  {
    lookUpKey: 'Recipients served',
    key: 'recipients-served',
    icon: faUser,
    showTooltip,
    label1: `${data.numRecipients} ${data.numRecipients === 1 ? 'Recipient' : 'Recipients'} of ${data.totalRecipients}`,
    iconColor: colors.ttahubMagenta,
    backgroundColor: colors.ttahubMagentaLight,
    tooltipText: 'Recipients have at least one active grant',
    data: data.recipientPercentage,
  },
]

export function DashboardOverviewWidget({ data, loading, fields, showTooltips }) {
  // Get the fields we need while maintaining the order.
  const fieldsToDisplay = fields.map((field) => getDashboardFields(data, showTooltips).find((f) => f.lookUpKey === field)).filter(Boolean)

  return <DashboardOverviewContainer fieldData={fieldsToDisplay} loading={loading} />
}

DashboardOverviewWidget.propTypes = {
  data: PropTypes.shape({
    numParticipants: PropTypes.string,
    numReports: PropTypes.string,
    numGrants: PropTypes.string,
    sumDuration: PropTypes.string,
    inPerson: PropTypes.string,
    recipientPercentage: PropTypes.string,
    totalRecipients: PropTypes.string,
  }),
  loading: PropTypes.bool,
  fields: PropTypes.arrayOf(PropTypes.string),
  showTooltips: PropTypes.bool,
}

DashboardOverviewWidget.defaultProps = {
  data: {
    numParticipants: '0',
    numReports: '0',
    numGrants: '0',
    sumDuration: '0',
    inPerson: '0',
    totalRecipients: '0',
    recipientPercentage: '0%',
    numRecipients: '0',
  },
  loading: false,
  showTooltips: false,
  fields: ['Activity reports', 'Grants served', 'Participants', 'Hours of TTA', 'In person activities'],
}

export default withWidgetData(DashboardOverviewWidget, 'overview')

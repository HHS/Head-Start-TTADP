import React from 'react'
import PropTypes from 'prop-types'
import { faLink, faCube, faUser, faUserFriends, faFolder } from '@fortawesome/free-solid-svg-icons'
import { DashboardOverviewContainer } from './DashboardOverviewContainer'
import colors from '../colors'

const createOverviewFieldArray = (data) => [
  {
    key: 'report-resources',
    icon: faLink,
    showTooltip: true,
    label1: 'Reports with resources',
    label2: `${data.report.numResources} of ${data.report.num}`,
    iconColor: colors.success,
    backgroundColor: colors.ttahubDeepTealLight,
    tooltipText: "AR's that cite at least one resource",
    data: data.report.percentResources,
  },
  {
    key: 'headstart-resources',
    icon: faCube,
    showTooltip: true,
    label1: 'HeadStart.gov resources',
    label2: `${data.resource.numHeadStart} of ${data.resource.num}`,
    iconColor: colors.ttahubBlue,
    backgroundColor: colors.ttahubBlueLight,
    tooltipText: 'Percentage of all cited resources that are from HeadStart.gov',
    data: data.resource.percentHeadStart,
  },
  {
    key: 'recipient-reached',
    icon: faUser,
    showTooltip: true,
    label1: 'Recipients reached',
    iconColor: colors.ttahubMagenta,
    backgroundColor: colors.ttahubMagentaLight,
    tooltipText: 'Total recipients of ARs that cite at least one resource',
    data: data.recipient.numResources,
  },
  {
    key: 'participants-reached',
    icon: faUserFriends,
    showTooltip: true,
    label1: 'Participants reached',
    iconColor: colors.ttahubOrange,
    backgroundColor: colors.ttahubOrangeLight,
    tooltipText: 'Total participants of ARs that cite at least one resource',
    data: data.participant.numParticipants,
  },
  {
    key: 'reports-citing-ipd-courses',
    icon: faFolder,
    showTooltip: false,
    label1: 'Reports citing iPD courses',
    iconColor: colors.baseDark,
    backgroundColor: colors.baseLightest,
    tooltipText: 'Total participants of ARs that cite at least one resource',
    data: data.ipdCourses.percentReports,
    route: 'ipd-courses',
  },
]

export function ResourcesDashboardOverviewWidget({ data, loading }) {
  return <DashboardOverviewContainer fieldData={createOverviewFieldArray(data)} loading={loading} />
}

ResourcesDashboardOverviewWidget.propTypes = {
  data: PropTypes.shape({
    report: PropTypes.shape({
      percentResources: PropTypes.string,
      numResources: PropTypes.string,
      num: PropTypes.string,
    }),
    resource: PropTypes.shape({
      count: PropTypes.string,
      total: PropTypes.string,
      percent: PropTypes.string,
    }),
    recipient: PropTypes.shape({
      numResources: PropTypes.string,
    }),
    participant: PropTypes.shape({
      numParticipants: PropTypes.string,
    }),
  }),
  loading: PropTypes.bool,
}

ResourcesDashboardOverviewWidget.defaultProps = {
  data: {
    report: {
      numResources: '0',
      num: '0',
      percentResources: '0%',
    },
    resource: {
      numHeadStart: '0',
      num: '0',
      percentHeadStart: '0%',
    },
    recipient: {
      numResources: '0',
    },
    participant: {
      numParticipants: '0',
    },
    ipdCourses: {
      percentReports: '0%',
    },
  },
  loading: false,
}

export default ResourcesDashboardOverviewWidget

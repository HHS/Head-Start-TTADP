import {
  faBuilding,
  faChartColumn,
  faClock,
  faFolder,
  faUser,
  faUserFriends,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';
import withWidgetData from './withWidgetData';
import './DashboardOverview.css';
import colors from '../colors';
import Tooltip from '../components/Tooltip';
import { DashboardOverviewContainer } from './DashboardOverviewContainer';

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
  );
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
};

Field.defaultProps = {
  tooltipText: '',
  showTooltip: false,
};

const getDashboardFields = (data, showTooltip) => ({
  'Activity reports': {
    key: 'activity-reports',
    showTooltip,
    tooltipText: 'The number of approved activity reports.',
    icon: faChartColumn,
    iconColor: colors.success,
    backgroundColor: colors.successLighter,
    label1: 'Activity reports',
    data: data.numReports,
  },
  'Training reports': {
    key: 'training-reports',
    showTooltip,
    tooltipText: 'Training reports with a completed session',
    icon: faChartColumn,
    iconColor: colors.success,
    backgroundColor: colors.successLighter,
    label1: `across ${data.numReports} Training Reports`,
    data: `${data.numSessions} sessions`,
  },
  'Grants served': {
    key: 'grants-served',
    showTooltip,
    icon: faBuilding,
    iconColor: colors.ttahubMediumBlue,
    backgroundColor: colors.ttahubBlueLight,
    label1: 'Grants served',
    tooltipText: 'Each grant is only counted once',
    data: data.numGrants,
  },
  Participants: {
    key: 'participants',
    showTooltip,
    tooltipText: 'The number of people in all activities',
    icon: faUserFriends,
    iconColor: colors.ttahubBlue,
    backgroundColor: colors.ttahubBlueLighter,
    label1: 'Participants',
    data: data.numParticipants,
  },
  'Hours of TTA': {
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
  'In person activities': {
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
  'Recipients served': {
    key: 'recipients-served',
    icon: faUser,
    showTooltip,
    label1: `${data.numRecipients} ${data.numRecipients === 1 ? 'Recipient' : 'Recipients'} of ${data.totalRecipients}`,
    iconColor: colors.ttahubMagenta,
    backgroundColor: colors.ttahubMagentaLight,
    tooltipText: 'Recipients have at least one active grant',
    data: data.recipientPercentage,
  },
  'Recipients with priority indicators': {
    key: 'recipients-with-priority-indicators',
    icon: faUser,
    label1: 'Recipients with priority indicators',
    label2: `${data.numRecipients} of ${data.totalRecipients}`,
    iconColor: colors.ttahubMediumBlue,
    backgroundColor: colors.ttahubBlueLight,
    tooltipText: 'Recipients with at least one priority indicator',
    data: data.recipientPercentage,
    drawerTagName: 'ttahub-spotlight-priority-indicators',
  },
  'Compliant follow-up reviews with TTA support': {
    key: 'compliant-follow-up-reviews-with-tta-support',
    label1: 'Compliant follow-up reviews with TTA support',
    label2: !Number(data.totalCompliantFollowUpReviews)
      ? ''
      : `${data.totalCompliantFollowUpReviewsWithTtaSupport} of ${data.totalCompliantFollowUpReviews}`,
    iconColor: colors.ttahubMediumBlue,
    icon: faFolder,
    backgroundColor: colors.ttahubBlueLight,
    data: data.percentCompliantFollowUpReviewsWithTtaSupport,
    drawerTagName: 'ttahub-compliant-follow-up-reviews-overview',
    showNoResults: !Number(data.totalCompliantFollowUpReviews),
    noResultsDrawerConfig: {
      title: 'Regional dashboard - Monitoring filters',
      tagName: 'ttahub-regional-dash-monitoring-filters',
    },
  },
  'Active deficient citations with TTA support': {
    key: 'active-deficient-citations-with-tta-support',
    label1: 'Active deficient citations with TTA support',
    iconColor: colors.ttahubMediumDeepTeal,
    backgroundColor: colors.ttahubDeepTealLight,
    icon: faChartColumn,
    label2: !Number(data.totalActiveDeficientCitations)
      ? ''
      : `${data.totalActiveDeficientCitationsWithTtaSupport} of ${data.totalActiveDeficientCitations}`,
    data: data.percentActiveDeficientCitationsWithTtaSupport,
    drawerTagName: 'ttahub-active-deficient-citation-overview',
    showNoResults: !Number(data.totalActiveDeficientCitations),
    noResultsDrawerConfig: {
      title: 'Regional dashboard - Monitoring filters',
      tagName: 'ttahub-regional-dash-monitoring-filters',
    },
  },
  'Active noncompliant citations with TTA support': {
    key: 'active-noncompliant-citations-with-tta-support',
    label1: 'Active noncompliant citations with TTA support',
    iconColor: colors.ttahubOrange,
    backgroundColor: colors.ttahubOrangeLight,
    icon: faChartColumn,
    data: data.percentActiveNoncompliantCitationsWithTtaSupport,
    label2: !Number(data.totalActiveNoncompliantCitations)
      ? ''
      : `${data.totalActiveNoncompliantCitationsWithTtaSupport} of ${data.totalActiveNoncompliantCitations}`,
    drawerTagName: 'ttahub-active-noncompliant-citation-overview',
    showNoResults: !Number(data.totalActiveNoncompliantCitations),
    noResultsDrawerConfig: {
      title: 'Regional dashboard - Monitoring filters',
      tagName: 'ttahub-regional-dash-monitoring-filters',
    },
  },
});

export function DashboardOverviewWidget({ data, loading, fields, showTooltips, maxToolTipWidth }) {
  const computedFields = getDashboardFields(data, showTooltips);
  const fieldsToDisplay = fields.map((field) => computedFields[field]).filter(Boolean);

  return (
    <DashboardOverviewContainer
      fieldData={fieldsToDisplay}
      loading={loading}
      maxToolTipWidth={maxToolTipWidth}
    />
  );
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
    numRecipients: PropTypes.string,
    percentCompliantFollowUpReviewsWithTtaSupport: PropTypes.string,
    totalCompliantFollowUpReviewsWithTtaSupport: PropTypes.string,
    totalCompliantFollowUpReviews: PropTypes.string,
    percentActiveDeficientCitationsWithTtaSupport: PropTypes.string,
    totalActiveDeficientCitationsWithTtaSupport: PropTypes.string,
    totalActiveDeficientCitations: PropTypes.string,
    percentActiveNoncompliantCitationsWithTtaSupport: PropTypes.string,
    totalActiveNoncompliantCitationsWithTtaSupport: PropTypes.string,
    totalActiveNoncompliantCitations: PropTypes.string,
  }),
  loading: PropTypes.bool,
  fields: PropTypes.arrayOf(PropTypes.string),
  showTooltips: PropTypes.bool,
  maxToolTipWidth: PropTypes.number,
};

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
    percentCompliantFollowUpReviewsWithTtaSupport: '0%',
    totalCompliantFollowUpReviewsWithTtaSupport: '0',
    totalCompliantFollowUpReviews: '0',
    percentActiveDeficientCitationsWithTtaSupport: '0%',
    totalActiveDeficientCitationsWithTtaSupport: '0',
    totalActiveDeficientCitations: '0',
    percentActiveNoncompliantCitationsWithTtaSupport: '0%',
    totalActiveNoncompliantCitationsWithTtaSupport: '0',
    totalActiveNoncompliantCitations: '0',
  },
  loading: false,
  showTooltips: false,
  fields: [
    'Activity reports',
    'Grants served',
    'Participants',
    'Hours of TTA',
    'In person activities',
  ],
  maxToolTipWidth: null,
};

export default withWidgetData(DashboardOverviewWidget, 'overview');

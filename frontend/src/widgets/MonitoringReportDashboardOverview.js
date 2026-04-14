import PropTypes from 'prop-types';
import { DashboardOverviewWidget } from './DashboardOverview';
import withWidgetData from './withWidgetData';

export function MonitoringReportDashboardOverviewWidget({ filters, loading, data }) {
  return (
    <DashboardOverviewWidget
      data={data}
      filters={filters}
      fields={[
        'Compliant follow-up reviews with TTA support',
        'Active deficient citations with TTA support',
        'Active noncompliant citations with TTA support',
      ]}
      showTooltips={false}
      loading={loading}
    />
  );
}

MonitoringReportDashboardOverviewWidget.propTypes = {
  data: PropTypes.shape({
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
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      topic: PropTypes.string,
      condition: PropTypes.string,
      query: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ).isRequired,
  loading: PropTypes.bool.isRequired,
};

MonitoringReportDashboardOverviewWidget.defaultProps = {
  data: {
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
};

export default withWidgetData(MonitoringReportDashboardOverviewWidget, 'monitoringOverview');

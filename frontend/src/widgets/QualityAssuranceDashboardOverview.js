import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import {
  faPersonChalkboard,
  faBus,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import './QualityAssuranceDashboardOverview.scss';
import Loader from '../components/Loader';
import colors from '../colors';
import { OverviewWidgetField } from './OverviewWidgetField';

const DASHBOARD_FIELDS = {
  'Recipients with no TTA': {
    render: (data) => (
      <OverviewWidgetField
        key="recipients-with-no-tta"
        icon={faUser}
        showTooltip={false}
        label1="Recipients with no TTA"
        iconColor={colors.ttahubBlue}
        backgroundColor={colors.ttahubBlueLight}
        data={data.recipientsWithNoTTA.pct}
        route={{
          to: '/dashboards',
          label: 'Display details',
        }}
        filterApplicable={data.recipientsWithNoTTA.filterApplicable}
        iconSize="lg"
      />
    ),
  },
  'Recipients with OHS standard FEI goal': {
    render: (data) => (
      <OverviewWidgetField
        key="recipients-with-ohs-standard-fei-goals"
        icon={faBus}
        showTooltip={false}
        label1="Recipients with OHS standard FEI goal"
        iconColor={colors.ttahubOrange}
        backgroundColor={colors.ttahubOrangeLight}
        data={data.recipientsWithOhsStandardFeiGoals.pct}
        route={{
          to: '/dashboards',
          label: 'Display details',
        }}
        filterApplicable={data.recipientsWithOhsStandardFeiGoals.filterApplicable}
        iconSize="lg"
      />
    ),
  },
  'Recipients with OHS standard CLASS goal': {
    render: (data) => (
      <OverviewWidgetField
        key="recipients-with-ohs-standard-class-goals"
        icon={faPersonChalkboard}
        showTooltip={false}
        label1="Recipients with OHS standard CLASS goal"
        iconColor={colors.success}
        backgroundColor={colors.ttahubDeepTealLight}
        data={data.recipientsWithOhsStandardClass.pct}
        route={{
          to: '/dashboards',
          label: 'Display details',
        }}
        filterApplicable={data.recipientsWithOhsStandardClass.filterApplicable}
        iconSize="lg"
      />
    ),
  },
};

export function QualityAssuranceDashboardOverview({
  data, loading, fields, showTooltips,
}) {
  return (
    <Grid row className="smart-hub--qa-dashboard-overview margin-bottom-3 position-relative">
      <Loader loading={loading} loadingLabel="Resources Overview loading" />
      { fields.map((field) => DASHBOARD_FIELDS[field].render(data, showTooltips, field)) }
    </Grid>
  );
}

QualityAssuranceDashboardOverview.propTypes = {
  data: PropTypes.shape({
    recipientsWithNoTTA: PropTypes.shape({
      pct: PropTypes.string,
    }),
    recipientsWithOhsStandardFeiGoals: PropTypes.shape({
      pct: PropTypes.string,
    }),
    recipientsWithOhsStandardClass: PropTypes.shape({
      pct: PropTypes.string,
    }),
  }),
  loading: PropTypes.bool,
  fields: PropTypes.arrayOf(PropTypes.string),
  showTooltips: PropTypes.bool,
};

QualityAssuranceDashboardOverview.defaultProps = {
  data: {
    recipientsWithNoTTA: {
      pct: '0%',
      filterApplicable: false,
    },
    recipientsWithOhsStandardFeiGoals: {
      pct: '0%',
      filterApplicable: false,
    },
    recipientsWithOhsStandardClass: {
      pct: '0%',
      filterApplicable: false,
    },
  },
  loading: false,
  showTooltips: false,
  fields: [
    'Recipients with no TTA',
    'Recipients with OHS standard FEI goal',
    'Recipients with OHS standard CLASS goal',
  ],
};

export default QualityAssuranceDashboardOverview;

import React from 'react';
import PropTypes from 'prop-types';
import {
  faPersonChalkboard,
  faBus,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';

import { DashboardOverviewContainer } from './DashboardOverviewContainer';

const createOverviewFieldArray = (data) => ([
  {
    key: 'recipients-with-no-tta',
    icon: faUser,
    showTooltip: false,
    label1: 'Recipients with no TTA',
    iconColor: colors.ttahubBlue,
    backgroundColor: colors.ttahubBlueLight,
    data: data && data.recipientsWithNoTTA ? `${data.recipientsWithNoTTA.pct}%` : '0%',
    route: 'qa-dashboard/recipients-with-no-tta',
    filterApplicable: data.recipientsWithNoTTA.filterApplicable,
    showNoResults: true,
    ariaLabel: 'Display details about recipients without TTA',
  },
  {
    key: 'recipients-with-standard-fei-goals',
    icon: faBus,
    showTooltip: false,
    label1: 'Recipients with OHS standard FEI goal',
    iconColor: colors.ttahubOrange,
    backgroundColor: colors.ttahubOrangeLight,
    data: data && data.recipientsWithOhsStandardFeiGoals
      ? `${data.recipientsWithOhsStandardFeiGoals.pct}%`
      : '0%',
    route: 'qa-dashboard/recipients-with-ohs-standard-fei-goal',
    filterApplicable: data.recipientsWithOhsStandardFeiGoals.filterApplicable,
    showNoResults: true,
    ariaLabel: 'Display details about recipients with OHS standard FEI goals',
  },
  {
    key: 'recipients-with-ohs-standard-class-goals',
    icon: faPersonChalkboard,
    showTooltip: false,
    label1: 'Recipients with OHS standard CLASS goal',
    iconColor: colors.success,
    backgroundColor: colors.ttahubDeepTealLight,
    data: data && data.recipientsWithOhsStandardClass
      ? `${data.recipientsWithOhsStandardClass.pct}%`
      : '0%',
    route: 'qa-dashboard/recipients-with-class-scores-and-goals',
    filterApplicable: data.recipientsWithOhsStandardClass.filterApplicable,
    showNoResults: true,
    ariaLabel: 'Display details about recipients with OHS standard CLASS goals',
  },
]);

export function QualityAssuranceDashboardOverview({
  data, loading,
}) {
  if (!data) {
    return null;
  }
  const DASHBOARD_FIELDS = createOverviewFieldArray(data);
  return (
    <DashboardOverviewContainer
      fieldData={DASHBOARD_FIELDS}
      loading={loading}
    />
  );
}

QualityAssuranceDashboardOverview.propTypes = {
  data: PropTypes.shape({
    recipientsWithNoTTA: PropTypes.shape({
      pct: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }),
    recipientsWithOhsStandardFeiGoals: PropTypes.shape({
      pct: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }),
    recipientsWithOhsStandardClass: PropTypes.shape({
      pct: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }),
  }),
  loading: PropTypes.bool,
};

QualityAssuranceDashboardOverview.defaultProps = {
  data: {
    recipientsWithNoTTA: {
      pct: 0,
      filterApplicable: false,
    },
    recipientsWithOhsStandardFeiGoals: {
      pct: 0,
      filterApplicable: false,
    },
    recipientsWithOhsStandardClass: {
      pct: 0,
      filterApplicable: false,
    },
  },
  loading: false,
};

export default QualityAssuranceDashboardOverview;

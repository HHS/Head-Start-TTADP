import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import LineGraphWidget from './LineGraphWidget';

const EXPORT_NAME = 'Active deficient citations with TTA support';

// TODO: publish in common
const TRACE_IDS = {
  ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT: 'active-deficiencies-with-tta-support',
  ALL_ACTIVE_DEFICIENCIES: 'all-active-deficiencies',
};

export function ActiveDeficientCitationsWithTtaSupportWidget({ data }) {
  return (
    <LineGraphWidget
      title="Active deficient citations with TTA support"
      exportName={EXPORT_NAME}
      data={data}
      xAxisTitle="Activity report start date"
      yAxisTitle="Number of deficient citations"
      tableTitle="Active deficient citations"
      tableFirstHeading="Active deficient citations"
      subtitle="Active deficient citations addressed in approved Activity Reports (AR)."
      legendConfig={[
        // TODO: Here and in TotalHrsAndRecipientGraph, we should be able to derive this
        // information from the backend data instead of hardcoding it in the frontend
        {
          label: 'Active Deficiencies with TTA support', selected: true, shape: 'circle', id: `${TRACE_IDS.ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT}-checkbox`, traceId: TRACE_IDS.ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT,
        },
        {
          label: 'All active Deficiencies', selected: true, shape: 'triangle', id: `${TRACE_IDS.ALL_ACTIVE_DEFICIENCIES}-checkbox`, traceId: TRACE_IDS.ALL_ACTIVE_DEFICIENCIES,
        },
      ]}
    />
  );
}

ActiveDeficientCitationsWithTtaSupportWidget.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        x: PropTypes.arrayOf(PropTypes.string),
        y: PropTypes.arrayOf(PropTypes.number),
      }),
    ), PropTypes.shape({}),
  ]),
};

ActiveDeficientCitationsWithTtaSupportWidget.defaultProps = {
  data: [
    {
      name: 'Active Deficiencies with TTA support', x: [], y: [], month: '',
    },
    {
      name: 'All active Deficiencies', x: [], y: [], month: '',
    },
  ],
};

export default withWidgetData(ActiveDeficientCitationsWithTtaSupportWidget, 'activeDeficientCitationsWithTtaSupport');

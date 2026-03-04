import React from 'react';
import PropTypes from 'prop-types';
import { TOTAL_HOURS_AND_RECIPIENT_GRAPH_TRACE_IDS as TRACE_IDS } from '@ttahub/common';
import withWidgetData from './withWidgetData';
import LineGraphWidget from './LineGraphWidget';

const EXPORT_NAME = 'Total TTA hours';

export function TotalHrsAndRecipientGraph({ data, hideYAxis }) {
  return (
    <LineGraphWidget
      title="Total TTA hours"
      exportName={EXPORT_NAME}
      data={data}
      hideYAxis={hideYAxis}
      xAxisTitle="Date range"
      yAxisTitle="Number of hours"
      legendConfig={[
        {
          label: 'Technical Assistance', selected: true, shape: 'circle', id: 'show-ta-checkbox', traceId: TRACE_IDS.TECHNICAL_ASSISTANCE,
        },
        {
          label: 'Training', selected: true, shape: 'square', id: 'show-training-checkbox', traceId: TRACE_IDS.TRAINING,
        },
        {
          label: 'Both', selected: true, shape: 'triangle', id: 'show-both-checkbox', traceId: TRACE_IDS.BOTH,
        },
      ]}
    />
  );
}

TotalHrsAndRecipientGraph.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        x: PropTypes.arrayOf(PropTypes.string),
        y: PropTypes.arrayOf(PropTypes.number),
      }),
    ), PropTypes.shape({}),
  ]),
  hideYAxis: PropTypes.bool,
};

TotalHrsAndRecipientGraph.defaultProps = {
  hideYAxis: false,
  data: [
    {
      name: 'Training', x: [], y: [], month: '',
    },
    {
      name: 'Technical Assistance', x: [], y: [], month: '',
    },
    {
      name: 'Both', x: [], y: [], month: '',
    },
  ],
};

export default withWidgetData(TotalHrsAndRecipientGraph, 'totalHrsAndRecipientGraph');

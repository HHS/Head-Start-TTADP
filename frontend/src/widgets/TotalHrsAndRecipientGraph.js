import React from 'react';
import PropTypes from 'prop-types';
import { TRACE_IDS } from '@ttahub/common';
import withWidgetData from './withWidgetData';
import LineGraphWidget from './LineGraphWidget';
import { deriveLineGraphLegendConfig } from './constants';

const EXPORT_NAME = 'Total TTA hours';
const HOURS_PREFIX = /^Hours of\s+/i;

const DEFAULT_LEGEND_CONFIG = [
  {
    label: 'Technical Assistance',
    selected: true,
    shape: 'circle',
    id: 'show-ta-checkbox',
    traceId: TRACE_IDS.TECHNICAL_ASSISTANCE,
  },
  {
    label: 'Training',
    selected: true,
    shape: 'square',
    id: 'show-training-checkbox',
    traceId: TRACE_IDS.TRAINING,
  },
  {
    label: 'Both',
    selected: true,
    shape: 'triangle',
    id: 'show-both-checkbox',
    traceId: TRACE_IDS.BOTH,
  },
];

const formatTotalHoursLegendLabel = (name) => name.replace(HOURS_PREFIX, '');

export function TotalHrsAndRecipientGraph({ data, hideYAxis }) {
  return (
    <LineGraphWidget
      title="Total TTA hours"
      exportName={EXPORT_NAME}
      data={data}
      hideYAxis={hideYAxis}
      xAxisTitle="Date range"
      yAxisTitle="Number of hours"
      legendConfig={deriveLineGraphLegendConfig(
        data,
        DEFAULT_LEGEND_CONFIG,
        formatTotalHoursLegendLabel,
      )}
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

import React from 'react';
import PropTypes from 'prop-types';
import { DECIMAL_BASE } from '@ttahub/common';
import createPlotlyComponent from 'react-plotly.js/factory';
import colors from '../colors';

let Graph = null;
import('plotly.js-basic-dist').then((Plotly) => {
  Graph = createPlotlyComponent(Plotly);
});

export default function ResourceUseSparkline({ dataPoints }) {
  const titles = [];
  const values = [];

  dataPoints.data.forEach((dataPoint) => {
    if (dataPoint.title !== 'Total') {
      titles.push(dataPoint.title);
      values.push(parseInt(dataPoint.value, DECIMAL_BASE));
    }
  });

  const width = 68 * titles.length;

  // the color of the bar with the highest value is orange, the other are blue
  const maxIndex = values.indexOf(Math.max(...values));
  // eslint-disable-next-line max-len
  const color = values.map((_v, i) => (i === maxIndex ? colors.ttahubOrange : colors.ttahubMediumBlue));

  const trace = {
    type: 'bar',
    x: titles,
    y: values,
    marker: {
      color,
    },
    hoverlabel: {
      font: { color: '#ffffff', size: '16' },
      bgcolor: colors.textInk,
    },
  };

  const layout = {
    bargap: 0.05,
    height: 37.75,
    width,
    barcornerradius: 2,
    margin: {
      l: 0,
      pad: 0,
      t: 12,
      b: 0,
      r: 0,
    },
    xaxis: {
      visible: false,
    },
    yaxis: {
      visible: false,
    },
  };

  const config = {
    responsive: true,
    displayModeBar: false,
    hovermode: 'none',
  };

  return (
    <div className="ttahub-resource-use-sparkline__graph border-bottom smart-hub-border-base-lighter">
      <Graph
        data={[trace]}
        layout={layout}
        config={config}
      />
    </div>
  );
}

ResourceUseSparkline.propTypes = {
  dataPoints: PropTypes.shape({
    data: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.string,
      value: PropTypes.string,
    })),
    heading: PropTypes.string,
    isUrl: PropTypes.bool,
    sortBy: PropTypes.string,
    title: PropTypes.string,
    total: PropTypes.string,
    url: PropTypes.string,
  }).isRequired,
};

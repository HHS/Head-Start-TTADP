import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
// https://github.com/plotly/react-plotly.js/issues/135#issuecomment-501398125
import createPlotlyComponent from 'react-plotly.js/factory';
import colors from '../colors';
import useSize from '../hooks/useSize';
import NoResultsFound from '../components/NoResultsFound';
import './VBarGraph.css';

let Plot = null;
import('plotly.js-basic-dist').then((Plotly) => {
  Plot = createPlotlyComponent(Plotly);
});

function VBarGraph({
  data,
  yAxisLabel,
  xAxisLabel,
  widgetRef,
  widthOffset,
}) {
  const [plot, updatePlot] = useState({});
  const size = useSize(data.length > 0 ? widgetRef : null);

  useEffect(() => {
    if (!data || !Array.isArray(data) || !size) {
      return;
    }

    const names = [];
    const counts = [];

    data.forEach((dataPoint) => {
      names.push(dataPoint.name);
      counts.push(dataPoint.count);
    });

    const trace = {
      type: 'bar',
      x: names,
      y: counts,
      hoverinfo: 'y',
      marker: {
        color: colors.ttahubMediumBlue,
      },
    };

    const layout = {
      bargap: 0.5,
      height: 350,
      width: (size.width - widthOffset),
      hoverlabel: {
        bgcolor: '#000',
        bordercolor: '#000',
        font: {
          color: '#fff',
          size: 16,
        },
      },
      font: {
        color: '#1b1b1b',
      },
      margin: {
        l: 80,
        pad: 20,
        t: 24,
      },
      xaxis: {
        automargin: true,
        autorange: true,
        tickangle: 0,
        title: {
          text: xAxisLabel,
          standoff: 40,
        },
        standoff: 20,
      },
      yaxis: {
        hoverformat: ',.2f',
        tickformat: ',.0d',
        autorange: true,
        title: {
          text: yAxisLabel,
          standoff: 20,
        },
      },
      hovermode: 'none',
    };

    updatePlot({
      data: [trace],
      layout,
      config: {
        responsive: true, displayModeBar: false, hovermode: 'none',
      },
    });
  }, [data, xAxisLabel, size, yAxisLabel, widthOffset]);

  if (!data || data.length === 0) {
    return (
      <div className="position-relative margin-bottom-3 display-flex flex-justify-center" ref={widgetRef}>
        <NoResultsFound />
      </div>
    );
  }

  return (
    <div className="display-flex flex-align-center position-relative" ref={widgetRef}>
      <Plot
        data={plot.data}
        layout={plot.layout}
        config={plot.config}
      />
    </div>
  );
}

VBarGraph.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string,
      count: PropTypes.number,
    }),
  ),
  yAxisLabel: PropTypes.string.isRequired,
  xAxisLabel: PropTypes.string.isRequired,
  widgetRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  widthOffset: PropTypes.number,
};

VBarGraph.defaultProps = {
  data: [],
  widthOffset: 40,
};

export default VBarGraph;

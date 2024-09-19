import React, { useRef, useLayoutEffect, useState } from 'react';
import PropTypes from 'prop-types';
// https://github.com/plotly/react-plotly.js/issues/135#issuecomment-501398125
import Plotly from 'plotly.js-basic-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import colors from '../colors';
import './BarGraph.css';

const Plot = createPlotlyComponent(Plotly);
const BottomAxis = createPlotlyComponent(Plotly);

function BarGraph({
  data,
  leftMargin,
  topMargin,
  barHeightMultiplier,
  barGraphTopHeight,
  widgetRef,
}) {
  const parentRef = useRef(null);
  const [width, setWidth] = useState(850);

  // more nightmarish stuff here
  // fires when screen is repainted
  useLayoutEffect(() => {
    function updateSize() {
      // if we have a parent DOM element, set the width to the width of that element
      // minus the padding
      if (parentRef.current) {
        setWidth(parentRef.current.offsetWidth - 24);
      }
    }
    // dispatches the updateSize function when the window is resized
    window.addEventListener('resize', updateSize);
    updateSize();

    // removes the event listener when the component is unmounted
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  if (!data || !Array.isArray(data)) {
    return null;
  }

  const categories = [];
  const counts = [];

  data.forEach((dataPoint) => {
    categories.push(dataPoint.category);
    counts.push(dataPoint.count);
  });

  const range = [Math.min(...counts), Math.max(...counts)];

  const trace = {
    type: 'bar',
    orientation: 'h',
    x: counts,
    y: categories,
    marker: {
      color: colors.ttahubMediumBlue,
    },
    width: 0.75,
    hovertemplate: '%{y}: %{x}<extra></extra>',
  };

  const layout = {
    bargap: 0.5,
    height: barHeightMultiplier * data.length,
    width,
    hoverlabel: {
      bgcolor: '#000',
      bordercolor: '#000',
      font: {
        color: '#fff',
        size: 16,
      },
    },
    font: {
      color: colors.textInk,
    },
    margin: {
      l: leftMargin,
      r: 0,
      t: topMargin,
      b: 0,
    },
    xaxis: {
      range,
    },
    yaxis: {
      zeroline: false,
      autotick: false,
      ticks: 'outside',
      tick0: 0,
      ticklen: 4,
      tickwidth: 1,
      tickcolor: 'transparent',
    },
  };

  const config = {
    responsive: true,
    displayModeBar: false,
    hovermode: 'none',
  };

  return (
    <div ref={widgetRef}>
      <div className="ttahub-bar-graph maxh-mobile-lg overflow-y-scroll" ref={parentRef}>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div className="ttahub-bar-graph--bars-top" style={{ height: barGraphTopHeight }} tabIndex={0}>
          <span className="sr-only">Use the arrow keys to scroll graph</span>
          <Plot
            data={[trace]}
            layout={layout}
            config={config}
          />
        </div>
      </div>
      <div className="height-5 width-full">
        <BottomAxis
          data={[{ mode: 'bar' }]}
          layout={{
            width,
            height: 40,
            margin: {
              l: leftMargin,
              t: 0,
              r: 0,
            },
            yaxis: { tickmode: 'array', tickvals: [] },
            xaxis: {
              range,
            },
          }}
          config={{
            displayModeBar: false,
            responsive: true,
          }}
        />
      </div>
    </div>
  );
}

BarGraph.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string,
      count: PropTypes.number,
    }),
  ),
  leftMargin: PropTypes.number,
  topMargin: PropTypes.number,
  barHeightMultiplier: PropTypes.number,
  barGraphTopHeight: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
  widgetRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
};

BarGraph.defaultProps = {
  data: [],
  leftMargin: 320,
  topMargin: 0,
  barHeightMultiplier: 25,
  barGraphTopHeight: 400,
  widgetRef: { current: null },
};

export default BarGraph;

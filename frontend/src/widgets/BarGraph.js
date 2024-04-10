import React, { useRef, useLayoutEffect, useState } from 'react';
import PropTypes from 'prop-types';
// https://github.com/plotly/react-plotly.js/issues/135#issuecomment-501398125
import Plotly from 'plotly.js-basic-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import colors from '../colors';
import './BarGraph.css';

const Plot = createPlotlyComponent(Plotly);
const BottomAxis = createPlotlyComponent(Plotly);

function BarGraph({ data }) {
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
    height: 25 * data.length,
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
      l: 320,
      r: 0,
      t: 0,
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
    <>
      <div className="ttahub-bar-graph maxh-mobile-lg overflow-y-scroll" ref={parentRef}>
        <div className="ttahub-bar-graph--bars-top">
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
              l: 320,
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
    </>
  );
}

BarGraph.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string,
      count: PropTypes.number,
    }),
  ),
};

BarGraph.defaultProps = {
  data: [],
};

export default BarGraph;

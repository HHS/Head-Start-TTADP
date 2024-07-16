import React, {
  useRef, useLayoutEffect, useState, useEffect,
} from 'react';
import PropTypes from 'prop-types';
import Plotly from 'plotly.js-strict-dist-min';
import colors from '../colors';
import './BarGraph.css';

function BarGraph({ data }) {
  const parentRef = useRef(null);
  const plot = useRef();
  const bottomAxis = useRef();
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

  useEffect(() => {
    if (!data || !Array.isArray(data)) {
      return;
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

    Plotly.newPlot(plot.current, [trace], layout, config);
    Plotly.newPlot(
      bottomAxis.current,
      [{ mode: 'bar' }],
      {
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
      },
      {
        displayModeBar: false,
        responsive: true,
      },
    );
  }, [data, width]);

  return (
    <>
      <div className="ttahub-bar-graph maxh-mobile-lg overflow-y-scroll" ref={parentRef}>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div className="ttahub-bar-graph--bars-top" tabIndex={0}>
          <span className="sr-only">Use the arrow keys to scroll graph</span>
          <div ref={plot} />
        </div>
      </div>
      <div className="height-5 width-full">
        <div ref={bottomAxis} />
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

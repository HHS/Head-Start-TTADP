import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import colors from '../colors';
import useSize from '../hooks/useSize';

let Plot = null;
import('plotly.js-basic-dist').then((Plotly) => {
  Plot = createPlotlyComponent(Plotly);
});

const SERIES_COLORS = [colors.ttahubMediumBlue, colors.ttahubOrange, colors.ttahubMediumDeepTeal];

export default function CompliantReviewsGrid({ data, widgetRef }) {
  const [plotData, setPlotData] = useState(null);
  const size = useSize(widgetRef);

  useEffect(() => {
    if (!data || !size) return;
    const { months, reviews } = data;
    // Exclude Total; put "with TTA" first so "without TTA" renders on top in stacked mode
    const filtered = (reviews || []).filter((s) => !/total/i.test(s.name));
    const withTta = filtered.filter((s) => /with tta/i.test(s.name));
    const withoutTta = filtered.filter((s) => !/with tta/i.test(s.name));
    const ordered = [...withTta, ...withoutTta];

    const traces = ordered.map((series, i) => ({
      type: 'bar',
      name: series.name,
      x: months,
      y: series.values,
      text: [],
      textposition: 'inside',
      insidetextanchor: 'middle',
      insidetextfont: { color: i === 0 ? '#fff' : colors.baseDarkest, size: 10 },
      marker: { color: SERIES_COLORS[i % SERIES_COLORS.length] },
      hovertemplate: '%{y}<extra></extra>',
      hoverlabel: {
        bgcolor: colors.baseDarkest,
        bordercolor: colors.baseDarkest,
        font: { color: '#fff', size: 16 },
      },
    }));

    setPlotData({
      traces,
      layout: {
        barmode: 'stack',
        height: 350,
        width: size.width,
        margin: { l: 90, r: 20, t: 28, b: 80 },
        font: { color: colors.baseDarkest },
        xaxis: {
          automargin: true,
          title: {
            text: 'Follow-up review received date',
            font: { family: 'Source Sans Pro, sans-serif', size: 16 },
          },
        },
        yaxis: {
          tickformat: ',.0d',
          autorange: true,
          title: {
            text: 'Compliant follow-up reviews',
            font: { family: 'Source Sans Pro, sans-serif', size: 16 },
          },
        },
        showlegend: false,
      },
      config: { responsive: true, displayModeBar: false },
    });
  }, [data, size]);

  return (
    <div ref={widgetRef} className="padding-3">
      {plotData && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              marginBottom: '8px',
              fontFamily: 'Source Sans Pro, sans-serif',
              fontSize: '16px',
            }}
          >
            {plotData.traces.map((trace) => (
              <div key={trace.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '4px',
                    backgroundColor: trace.marker.color,
                    flexShrink: 0,
                  }}
                />
                <span>{trace.name}</span>
              </div>
            ))}
          </div>
          <Plot data={plotData.traces} layout={plotData.layout} config={plotData.config} />
        </>
      )}
    </div>
  );
}

CompliantReviewsGrid.propTypes = {
  data: PropTypes.shape({
    months: PropTypes.arrayOf(PropTypes.string),
    reviews: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        values: PropTypes.arrayOf(PropTypes.number),
      })
    ),
  }).isRequired,
  widgetRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
};

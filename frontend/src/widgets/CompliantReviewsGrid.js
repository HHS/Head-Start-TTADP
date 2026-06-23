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

const SMALL_VALUE_LABEL_THRESHOLD = 2;
const MIN_INSIDE_LABEL_HEIGHT_PX = 14;

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
    const monthlyTotals = months.map((_, monthIndex) =>
      ordered.reduce((sum, series) => sum + Number(series.values?.[monthIndex] || 0), 0)
    );
    const maxMonthlyTotal = monthlyTotals.length ? Math.max(...monthlyTotals) : 0;
    const chartAreaHeight = 350 - 28 - 80;
    const dynamicSmallValueThreshold =
      maxMonthlyTotal > 0
        ? (MIN_INSIDE_LABEL_HEIGHT_PX / chartAreaHeight) * maxMonthlyTotal
        : SMALL_VALUE_LABEL_THRESHOLD;
    const annotationBaseOffset = Math.max(1, Math.ceil(maxMonthlyTotal * 0.02));
    const annotationStep = Math.max(1, Math.ceil(maxMonthlyTotal * 0.05));

    const outsideAnnotations = [];
    const outsideSeriesByMonth = [];

    months.forEach((month, monthIndex) => {
      const monthSeries = ordered.map((series, seriesIndex) => ({
        seriesIndex,
        name: series.name,
        value: Number(series.values?.[monthIndex] || 0),
      }));

      const smallValueSeries = monthSeries.filter(
        ({ value }) =>
          value === 0 || value <= SMALL_VALUE_LABEL_THRESHOLD || value <= dynamicSmallValueThreshold
      );

      // If any segment is too small for an inside label, move all labels for that month above the stack.
      const renderAllOutsideForMonth = smallValueSeries.length > 0;
      const monthOutsideSeries = renderAllOutsideForMonth ? monthSeries : smallValueSeries;
      outsideSeriesByMonth[monthIndex] = new Set(
        monthOutsideSeries.map(({ seriesIndex }) => seriesIndex)
      );

      const labelsToRender =
        monthOutsideSeries.length > 1 && monthOutsideSeries.every(({ value }) => value === 0)
          ? [{ value: 0 }]
          : monthOutsideSeries;

      // When multiple labels are above a stack, start higher so the first label does not crowd the bar top.
      const startStep = labelsToRender.length > 1 ? 1 : 0;
      const stepSize =
        labelsToRender.length > 1 ? Math.max(1, Math.ceil(annotationStep * 1.3)) : annotationStep;

      labelsToRender.forEach(({ value }, labelIndex) => {
        outsideAnnotations.push({
          x: month,
          y: monthlyTotals[monthIndex] + annotationBaseOffset + (startStep + labelIndex) * stepSize,
          text: value.toString(),
          showarrow: false,
          font: { color: colors.baseDarkest, size: 10 },
          xanchor: 'center',
          yanchor: 'bottom',
        });
      });
    });

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
        annotations: [],
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

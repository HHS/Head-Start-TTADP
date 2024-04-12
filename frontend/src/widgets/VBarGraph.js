import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
// https://github.com/plotly/react-plotly.js/issues/135#issuecomment-501398125
import Plotly from 'plotly.js-basic-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import colors from '../colors';
import Container from '../components/Container';
import AccessibleWidgetData from './AccessibleWidgetData';
import MediaCaptureButton from '../components/MediaCaptureButton';
import WidgetH2 from '../components/WidgetH2';
import useSize from '../hooks/useSize';
import './VBarGraph.css';

const Plot = createPlotlyComponent(Plotly);

function VBarGraph({
  data,
  yAxisLabel,
  xAxisLabel,
  title,
  subtitle,
  loading,
  loadingLabel,
}) {
  const [plot, updatePlot] = useState({});
  const bars = useRef(null);
  const [showAccessibleData, updateShowAccessibleData] = useState(false);
  // toggle the data table
  function toggleAccessibleData() {
    updateShowAccessibleData((current) => !current);
  }

  const size = useSize(bars);

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
      width: size.width - 40,
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
  }, [data, xAxisLabel, size, yAxisLabel]);

  const tableData = data.map((row) => ({ data: [row.name, row.count] }));

  return (
    <Container className="smarthub-vbar-graph shadow-2" loading={loading} loadingLabel={loadingLabel} ref={bars}>
      <Grid row className="position-relative margin-bottom-2 flex-align-start">
        <div className="ttahub-widget-heading-grid">
          <div className="ttahub-widget-heading-grid--title">
            <WidgetH2>
              {title}
            </WidgetH2>
            <p className="usa-prose margin-0">{subtitle}</p>
          </div>
          {!showAccessibleData
            ? (
              <MediaCaptureButton
                reference={bars}
                buttonText="Save screenshot"
                id="rd-save-screenshot-vbars"
                title={title}
              />
            )
            : null}
          <button
            type="button"
            className="usa-button usa-button--unstyled"
            onClick={toggleAccessibleData}
            aria-label={showAccessibleData ? `Display ${title} as graph` : `Display ${title} as table`}
          >
            {showAccessibleData ? 'Display graph' : 'Display table'}
          </button>
        </div>

      </Grid>
      { showAccessibleData
        ? (
          <AccessibleWidgetData
            caption="Hours of training by National Center Table"
            columnHeadings={['National Center', 'Hours']}
            rows={tableData}
          />
        )
        : (
          <>
            <div className="display-flex flex-align-center position-relative">
              <Plot
                data={plot.data}
                layout={plot.layout}
                config={plot.config}
              />

            </div>
          </>
        )}
    </Container>

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
  title: PropTypes.string,
  subtitle: PropTypes.string,
  loading: PropTypes.bool,
  loadingLabel: PropTypes.string,
};

VBarGraph.defaultProps = {
  data: [],
  title: 'Vertical Bar Graph',
  subtitle: '',
  loading: false,
  loadingLabel: 'Vertical Bar Graph Loading',
};

export default VBarGraph;

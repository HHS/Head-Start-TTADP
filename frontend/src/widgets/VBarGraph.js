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

  useEffect(() => {
    if (!data || !Array.isArray(data)) {
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
      height: 300,
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
        fixedrange: true,
        tickangle: 0,
      },
      yaxis: {
        tickformat: ',.0d',
        fixedrange: true,
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
  }, [data]);

  return (
    <Container className="smarthub-table-widget shadow-2" loading={loading} loadingLabel={loadingLabel} ref={bars}>
      <Grid row className="position-relative margin-bottom-2">
        <Grid className="flex-align-self-center desktop:display-flex flex-align-center" desktop={{ col: 'auto' }} mobileLg={{ col: 10 }}>
          <h2 className="display-inline desktop:margin-y-0 margin-left-1" aria-live="polite">
            {title}
          </h2>
          <p className="usa-prose">{subtitle}</p>
        </Grid>
        <Grid desktop={{ col: 'auto' }} className="ttahub--show-accessible-data-button flex-align-self-center">
          <button
            type="button"
            className="usa-button--unstyled"
            aria-label={showAccessibleData ? 'display number of activity reports by  data as graph' : 'display number of activity reports by data as table'}
            onClick={toggleAccessibleData}
          >
            {showAccessibleData ? 'Display graph' : 'Display table'}
          </button>
          <MediaCaptureButton
            reference={bars}
            buttonText="Save screenshot"
            id="rd-save-screenshot-tr-hours-by-national-center"
            className="margin-x-2"
          />
        </Grid>
      </Grid>
      { showAccessibleData
        ? (
          <AccessibleWidgetData
            caption="Number of Activity Reports by Table"
            columnHeadings={[]}
            rows={[]}
          />
        )
        : (
          <>
            <div className="display-flex flex-align-center">
              <div className="margin-right-1 smart-hub--vertical-text">
                { yAxisLabel }
              </div>

              <Plot
                data={plot.data}
                layout={plot.layout}
                config={plot.config}
              />

            </div>
            <div className="display-flex flex-justify-center margin-top-1">
              { xAxisLabel }
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

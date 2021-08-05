import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Plotly from 'plotly.js-basic-dist';
import { Grid } from '@trussworks/react-uswds';
import withWidgetData from './withWidgetData';
import DateTime from '../components/DateTime';
import './TotalHrsAndGranteeGraph.css';

export function TotalHrsAndGranteeGraph({ data, dateTime }) {
  // the dom el for drawing the chart
  const lines = useRef();

  useEffect(() => {
    if (!lines || !data || !Array.isArray(data)) {
      return;
    }

    /*
      Data: The below is a breakdown of the Traces widget data array.
      data[0]: Grantee Rec TTA
      data[1]: Hours of Training
      data[2]: Hours of Technical Assistance
      data[3]: Hours of Both
    */

    const traces = [
      /*
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: data[0].x,
        y: data[0].y,
        hovertemplate: ' %{y}<extra></extra> ',
        hoverinfo: 'y',
        line: {
          dash: 'dot',
          width: 3,
          color: '#0166ab',
        },
        marker: {
          size: 7,
        },
        hoverlabel: {
          font: { color: '#ffffff', size: '16' },
          bgcolor: '#21272d',
        },
      },
      */
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: data[1].x,
        y: data[1].y,
        hovertemplate: ' %{y}<extra></extra> ',
        hoverinfo: 'y',
        line: {
          dash: 'solid',
          width: 3,
          color: '#e29f4d',
        },
        marker: {
          size: 7,
        },
        hoverlabel: {
          font: { color: '#ffffff', size: '16' },
          bgcolor: '#21272d',
        },
      },
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: data[2].x,
        y: data[2].y,
        hovertemplate: ' %{y}<extra></extra> ',
        hoverinfo: 'y',
        line: {
          dash: 'solid',
          width: 3,
          color: '#264a64',
        },
        marker: {
          size: 7,
        },
        hoverlabel: {
          font: { color: '#ffffff', size: '16' },
          bgcolor: '#21272d',
        },
      },
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: data[3].x,
        y: data[3].y,
        hovertemplate: ' %{y}<extra></extra> ',
        hoverinfo: 'y',
        line: {
          dash: 'solid',
          width: 3,
          color: '#148439',
        },
        marker: {
          size: 7,
        },
        hoverlabel: {
          font: { color: '#ffffff', size: '16' },
          bgcolor: '#21272d',
        },
      },

    ];

    // Specify Chart Layout.
    const layout = {
      height: 320,
      hoverlabel: {
        bgcolor: '#fff',
        bordercolor: '#fff',
        font: {
          color: '#fff',
        },
      },
      margin: {
        l: 50,
        t: 0,
        pad: 10,
        r: 0,
        b: 68,
      },
      showlegend: false,
      xaxis: {
        automargin: false,
        tickangle: 0,
        showgrid: false,
        b: 0,
        t: 0,
        autotypenumbers: 'strict',
        title: {
          text: 'Date Range',
          standoff: 40,
          font: {
            family: 'Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif',
            size: 18,
            color: '#7f7f7f',
          },
        },
      },
      yaxis: {
        automargin: true,
        tickformat: ',.0d',
        title: {
          standoff: 20,
          text: 'Number of Hours / Grants',
          font: {
            family: 'Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif',
            size: 18,
            color: '#7f7f7f',
          },
        },
      },
    };

    // draw the plot
    Plotly.newPlot(lines.current, traces, layout, { displayModeBar: false, hovermode: 'none', responsive: true });
  }, [data]);

  if (!data) {
    return <p>Loading...</p>;
  }

  return (
    <div className="ttahub--total-hrs-grantee-graph">
      <Grid row className="position-relative margin-bottom-4">
        <Grid col="auto"><h2 className="ttahub--dashboard-widget-heading margin-0">Total TTA Hours</h2></Grid>
        <Grid col="auto" className="ttahub--total-hours-graph-timestamp-container display-flex desktop:padding-x-2 flex-align-self-center">
          <DateTime classNames="display-flex flex-align-center padding-x-1 margin-left-1" timestamp={dateTime.timestamp} label={dateTime.label} />
        </Grid>
      </Grid>

      <Grid row className="position-relative margin-top-1 margin-bottom-3 ttahub--total-hrs-grantee-graph-legend">
        <Grid desktop={{ col: 4 }} col={6}>
          <span>TA</span>
        </Grid>
        <Grid desktop={{ col: 4 }} col={6}>
          <span>Training</span>
        </Grid>
        <Grid desktop={{ col: 4 }} col={6}>
          <span>Both</span>
        </Grid>
      </Grid>

      <div data-testid="lines" ref={lines} />
    </div>
  );
}

TotalHrsAndGranteeGraph.propTypes = {
  dateTime: PropTypes.shape({
    timestamp: PropTypes.string, label: PropTypes.string,
  }),
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        x: PropTypes.arrayOf(PropTypes.string),
        y: PropTypes.arrayOf(PropTypes.number),
      }),
    ), PropTypes.shape({}),
  ]).isRequired,
};

TotalHrsAndGranteeGraph.defaultProps = {
  dateTime: { timestamp: '', label: '' },
};
export default withWidgetData(TotalHrsAndGranteeGraph, 'totalHrsAndGranteeGraph');

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Plotly from 'plotly.js-basic-dist';
import { Grid } from '@trussworks/react-uswds';
import withWidgetData from './withWidgetData';
import AccessibleWidgetData from './AccessibleWidgetData';
import MediaCaptureButton from '../components/MediaCaptureButton';
import Container from '../components/Container';
import colors from '../colors';
import './TotalHrsAndRecipientGraph.scss';

export function TotalHrsAndRecipientGraph({ data, loading }) {
  // the state for which lines to show
  const [showTA, setShowTA] = useState(true);
  const [showTraining, setShowTraining] = useState(true);
  const [showBoth, setShowBoth] = useState(true);

  // the dom el for drawing the chart
  const lines = useRef();

  // the dom el for the widget
  const widget = useRef();

  const [showAccessibleData, setShowAccessibleData] = useState(false);
  const [columnHeadings, setColumnHeadings] = useState([]);
  const [tableRows, setTableRows] = useState([]);

  useEffect(() => {
    if (!lines || !data || !Array.isArray(data) || showAccessibleData) {
      return;
    }

    /*
      Data: The below is a breakdown of the Traces widget data array.
      data[0]: Hours of Training
      data[1]: Hours of Technical Assistance
      data[2]: Hours of Both
    */

    // these are ordered from left to right how they appear in the checkboxes/legend
    const traces = [
      {
        // Technical Assistance
        type: 'scatter',
        mode: 'lines+markers',
        x: data[1].x,
        y: data[1].y,
        hoverinfo: 'y',
        line: {
          dash: 'solid',
          width: 3,
          // color: '#2e4a62',
          color: colors.ttahubBlue,
        },
        marker: {
          size: 12,
        },
        hoverlabel: {
          font: { color: '#ffffff', size: '16' },
          bgcolor: colors.textInk,
        },
      },
      {
        // Training
        type: 'scatter',
        mode: 'lines+markers',
        x: data[0].x,
        y: data[0].y,
        hoverinfo: 'y',
        line: {
          dash: 'dash',
          width: 3,
          color: colors.ttahubOrange,
        },
        marker: {
          size: 14,
          symbol: 'triangle-up',
        },
        hoverlabel: {
          font: { color: '#ffffff', size: '16' },
          bgcolor: colors.textInk,
        },
      },

      // Both
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: data[2].x,
        y: data[2].y,
        hoverinfo: 'y',
        line: {
          dash: 'longdash',
          width: 3,
          color: colors.ttahubMediumDeepTeal,
        },
        marker: {
          symbol: 'square',
          size: 12,
        },
        hoverlabel: {
          font: { color: '#ffffff', size: '16' },
          bgcolor: colors.smartHubTextInk,
        },
      }];

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
      font: {
        color: colors.smartHubTextInk,
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
          text: 'Date range',
          standoff: 40,
          font: {
            family: 'Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif',
            size: 18,
            color: colors.smartHubTextInk,
          },
        },
      },
      yaxis: {
        automargin: true,
        tickformat: (n) => {
          // if not a whole number, round to 1 decimal place
          if (n % 1 !== 0) {
            return '.1f';
          }
          return ',';
        },
        title: {
          standoff: 20,
          text: 'Number of hours',
          font: {
            family: 'Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif',
            size: 18,
            color: colors.smartHubTextInk,
          },
        },
      },
    };

    //  showTA, showTraining, showBoth
    // if false, then its a null for me dude
    // and then away it goes
    // these are ordered in the same order as the legend
    const tracesToDraw = [showTA, showTraining, showBoth]
      .map((trace, index) => (trace ? traces[index] : null))
      .filter((trace) => trace !== null);

    // draw the plot
    Plotly.newPlot(lines.current, tracesToDraw, layout, { displayModeBar: false, hovermode: 'none', responsive: true });
  }, [data, showAccessibleData, showBoth, showTA, showTraining]);

  useEffect(() => {
    if (!lines || !data || !Array.isArray(data) || !showAccessibleData) {
      return;
    }

    const headings = ['TTA Provided', ...data[0].x.map((x, index) => {
      if (data[0].month[index]) {
        return `${data[0].month[index]} ${x}`;
      }
      return x;
    })];

    const rows = data.map((row) => ({
      heading: row.name,
      data: row.y.map((y) => `${(Math.round(y * 10) / 10).toString()}`),
    }));

    setColumnHeadings(headings);
    setTableRows(rows);
  }, [data, showAccessibleData]);

  function toggleType() {
    setShowAccessibleData(!showAccessibleData);
  }

  return (
    <Container ref={widget} className="ttahub-total-hours-container shadow-2" paddingX={3} paddingY={3} loading={loading} loadingLabel="Total hours loading">
      <div className="ttahub--total-hrs-recipient-graph">
        <Grid row className="position-relative margin-bottom-2">
          <Grid desktop={{ col: 'auto' }} mobileLg={{ col: 8 }}><h2 className="ttahub--dashboard-widget-heading margin-0">Total TTA hours</h2></Grid>
          <Grid desktop={{ col: 'auto' }} className="ttahub--show-accessible-data-button desktop:margin-y-0 mobile-lg:margin-y-1">
            { !showAccessibleData && <MediaCaptureButton className="margin-x-2" reference={widget} /> }
            <button
              type="button"
              className="usa-button--unstyled"
              aria-label={showAccessibleData ? 'display total training and technical assistance hours as graph' : 'display total training and technical assistance hours as table'}
              onClick={toggleType}
              data-html2canvas-ignore
            >
              {showAccessibleData ? 'Display graph' : 'Display table'}
            </button>
          </Grid>
        </Grid>

        { showAccessibleData
          ? <AccessibleWidgetData caption="Total TTA hours by date and type" columnHeadings={columnHeadings} rows={tableRows} />
          : (
            <div aria-hidden="true">
              <fieldset className="grid-row ttahub--total-hrs-recipient-graph-legend text-align-center margin-bottom-3 border-0 padding-0">
                <legend className="margin-bottom-2">Toggle individual lines by checking or unchecking a legend item.</legend>
                <LegendControl id="show-ta-checkbox" label="Technical Assistance" selected={showTA} setSelected={setShowTA} shape="circle" />
                <LegendControl id="show-training-checkbox" label="Training" selected={showTraining} setSelected={setShowTraining} shape="triangle" />
                <LegendControl id="show-both-checkbox" label="Both" selected={showBoth} setSelected={setShowBoth} shape="square" />
              </fieldset>
              <div data-testid="lines" ref={lines} />
            </div>
          )}
      </div>
    </Container>
  );
}

TotalHrsAndRecipientGraph.propTypes = {
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
  ]),
  loading: PropTypes.bool.isRequired,
};

TotalHrsAndRecipientGraph.defaultProps = {
  dateTime: { timestamp: '', label: '' },
  data: [
    {
      name: 'Hours of Training', x: [], y: [], month: '',
    },
    {
      name: 'Hours of Technical Assistance', x: [], y: [], month: '',
    },
    {
      name: 'Hours of Both', x: [], y: [], month: '',
    },
  ],
};

/**
   * the legend control for the graph (input, span, line)
   * @param {props} object
   * @returns A jsx element
   */
export function LegendControl({
  label, id, selected, setSelected, shape,
}) {
  function handleChange() {
    setSelected(!selected);
  }

  return (
    <div className={`usa-checkbox grid-col flex-auto ${shape}`}>
      <input
        className="usa-checkbox__input"
        id={id}
        type="checkbox"
        name={id}
        checked={selected}
        onChange={handleChange}
        data-html2canvas-ignore
      />
      <label
        className="usa-checkbox__label padding-right-3"
        htmlFor={id}
      >
        {' '}
        {label}
      </label>
    </div>
  );
}

LegendControl.propTypes = {
  label: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  setSelected: PropTypes.func.isRequired,
  shape: PropTypes.string.isRequired,
};

export default withWidgetData(TotalHrsAndRecipientGraph, 'totalHrsAndRecipientGraph');

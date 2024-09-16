import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Plotly from 'plotly.js-basic-dist';
import { Grid } from '@trussworks/react-uswds';
import { DECIMAL_BASE } from '@ttahub/common';
import withWidgetData from './withWidgetData';
import AccessibleWidgetData from './AccessibleWidgetData';
import MediaCaptureButton from '../components/MediaCaptureButton';
import Container from '../components/Container';
import colors from '../colors';
import './TotalHrsAndRecipientGraph.scss';

const HOVER_TEMPLATE = '(%{x}, %{y})<extra></extra>';

export function DeliveryMethodGraph({ data, loading, hideYAxis }) {
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
        hovertemplate: HOVER_TEMPLATE,
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
        hovertemplate: HOVER_TEMPLATE,
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
        hovertemplate: HOVER_TEMPLATE,
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
          bgcolor: colors.textInk,
        },
      }];

    const xTickStep = (() => {
      const value = data[0].x.length;
      let divisor = value;
      if (value > 12) {
        divisor = 6;
      }

      if (value > 24) {
        divisor = 4;
      }

      return parseInt(value / divisor, DECIMAL_BASE);
    }
    )();

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
        r: 0,
        b: 68,
      },
      showlegend: false,
      xaxis: {
        showgrid: false,
        hovermode: 'closest',
        autotick: false,
        ticks: 'outside',
        tick0: 0,
        dtick: xTickStep,
        ticklen: 5,
        tickwidth: 1,
        tickcolor: '#000',
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
        rangemode: 'tozero',
        tickwidth: 1,
        tickcolor: 'transparent',
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

    if (hideYAxis) {
      layout.yaxis = {
        ...layout.yaxis,
        showline: false,
        autotick: true,
        ticks: '',
        showticklabels: false,
      };
    }

    //  showTA, showTraining, showBoth
    // if false, then its a null for me dude
    // and then away it goes
    // these are ordered in the same order as the legend
    const tracesToDraw = [showTA, showTraining, showBoth]
      .map((trace, index) => (trace ? traces[index] : null))
      .filter((trace) => trace !== null);

    // draw the plot
    Plotly.newPlot(lines.current, tracesToDraw, layout, { displayModeBar: false, hovermode: 'none', responsive: true });
  }, [data, hideYAxis, showAccessibleData, showBoth, showTA, showTraining]);

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
    <Container ref={widget} className="ttahub-delivery-method-container shadow-2" loading={loading} loadingLabel="Total hours loading">
      <div className="ttahub--total-hrs-recipient-graph">
        <Grid row className="position-relative margin-bottom-2">
          <Grid desktop={{ col: 'auto' }} mobileLg={{ col: 8 }}><h2 className="ttahub--dashboard-widget-heading margin-0">Total TTA hours</h2></Grid>
          <Grid desktop={{ col: 'auto' }} className="ttahub--show-accessible-data-button desktop:margin-y-0 mobile-lg:margin-y-1">
            { !showAccessibleData && <MediaCaptureButton id="rd-save-screenshot" title="Total TTA hours" className="margin-x-2" reference={widget} buttonText="Save screenshot" /> }
            <button
              type="button"
              className="usa-button--unstyled"
              aria-label={showAccessibleData ? 'display delivery method hours as graph' : 'display delivery method hours as table'}
              onClick={toggleType}
              data-html2canvas-ignore
              id="rd-display-table-delivery-method"
            >
              {showAccessibleData ? 'Display graph' : 'Display table'}
            </button>
          </Grid>
        </Grid>

        { showAccessibleData
          ? <AccessibleWidgetData caption="Total TTA hours by date and type" columnHeadings={columnHeadings} rows={tableRows} />
          : (
            <div>
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

DeliveryMethodGraph.propTypes = {
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
  hideYAxis: PropTypes.bool,
};

DeliveryMethodGraph.defaultProps = {
  hideYAxis: false,
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
    <div className={`usa-checkbox grid-col flex-auto ${shape} ttahub-legend-control`}>
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

export default withWidgetData(DeliveryMethodGraph, 'totalHrsAndRecipientGraph');

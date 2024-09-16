import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import Plotly from 'plotly.js-basic-dist';
import { DECIMAL_BASE } from '@ttahub/common';
import colors from '../colors';
import LegendControl from './LegendControl';
import LegendControlFieldset from './LegendControlFieldset';
import HorizontalTableWidget from './HorizontalTableWidget';

const HOVER_TEMPLATE = '(%{x}, %{y})<extra></extra>';

export default function LineGraph({
  data,
  hideYAxis,
  xAxisTitle,
  yAxisTitle,
  legendConfig,
  tableConfig,
  widgetRef,
  showTabularData,
}) {
  // the state for the legend and which traces are visible
  const [legends, setLegends] = useState(legendConfig);

  // the dom el for drawing the chart
  const lines = useRef();

  const [columnHeadings, setColumnHeadings] = useState([]);
  const [tableRows, setTableRows] = useState([]);

  useEffect(() => {
    if (!lines || !data || !Array.isArray(data) || showTabularData) {
      return;
    }

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
    })();

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
          text: xAxisTitle,
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
          text: yAxisTitle,
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

    ];

    const tracesToDraw = legends.map((legend, index) => (legend.selected ? traces[index] : null))
      .filter((trace) => trace !== null);

    // draw the plot
    Plotly.newPlot(lines.current, tracesToDraw, layout, { displayModeBar: false, hovermode: 'none', responsive: true });
  }, [data, hideYAxis, legends, showTabularData, xAxisTitle, yAxisTitle]);

  useEffect(() => {
    if (!lines || !data || !Array.isArray(data) || !showTabularData) {
      return;
    }

    const headings = data[0].x.map((x, index) => {
      if (data[0].month[index]) {
        return `${data[0].month[index]} ${x}`;
      }
      return x;
    });

    const rows = data.map((row) => ({
      heading: row.name,
      data: row.y.map((y) => ({
        value: `${(Math.round(y * 10) / 10).toString()}`,
        title: row.name,
      })),
    }));

    setColumnHeadings(headings);
    setTableRows(rows);
  }, [data, showTabularData, tableConfig.title]);

  return (
    <div className="ttahub-three-trace-line-graph padding-3" ref={widgetRef}>
      { showTabularData
        ? (
          // <AccessibleWidgetData
          //   caption={tableConfig.}
          //   columnHeadings={columnHeadings}
          //   rows={tableRows}
          // />
          <HorizontalTableWidget
            headers={columnHeadings}
            data={tableRows}
            caption={tableConfig.caption}
            firstHeading={tableConfig.title}
            enableSorting={tableConfig.enableSorting}
          // lastHeading,
          // sortConfig,
          // requestSort,
            enableCheckboxes={tableConfig.enableCheckboxes}
          // checkboxes,
          // setCheckboxes,
            showTotalColumn={tableConfig.showTotalColumn}
            hideFirstColumnBorder
          />
        )
        : (
          <div>
            <LegendControlFieldset legend="Toggle individual lines by checking or unchecking a legend item.">
              {legends.map((legend) => (
                <LegendControl
                  key={legend.id}
                  id={legend.id}
                  label={legend.label}
                  selected={legend.selected}
                  setSelected={(selected) => {
                    const updatedLegends = legends.map((l) => {
                      if (l.id === legend.id) {
                        return { ...l, selected };
                      }
                      return l;
                    });
                    setLegends(updatedLegends);
                  }}
                  shape={legend.shape}
                />
              ))}
            </LegendControlFieldset>
            <div data-testid="lines" ref={lines} />
          </div>
        )}
    </div>

  );
}

LineGraph.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      x: PropTypes.arrayOf(PropTypes.string),
      y: PropTypes.arrayOf(PropTypes.number),
      month: PropTypes.string,
    }),
  ),
  hideYAxis: PropTypes.bool,
  xAxisTitle: PropTypes.string,
  yAxisTitle: PropTypes.string,
  legendConfig: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    selected: PropTypes.bool.isRequired,
    shape: PropTypes.oneOf(['circle', 'triangle', 'square']).isRequired,
  })),
  tableConfig: PropTypes.shape({
    title: PropTypes.string.isRequired,
    caption: PropTypes.string.isRequired,
    enableCheckboxes: PropTypes.bool.isRequired,
    enableSorting: PropTypes.bool.isRequired,
    showTotalColumn: PropTypes.bool.isRequired,
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  widgetRef: PropTypes.object.isRequired,
  showTabularData: PropTypes.bool.isRequired,
};

LineGraph.defaultProps = {
  xAxisTitle: '',
  yAxisTitle: '',
  hideYAxis: false,
  data: null,
  legendConfig: [
    {
      label: 'Technical Assistance',
      id: 'show-ta-checkbox',
      selected: true,
      shape: 'circle',
    },
    {
      label: 'Training',
      id: 'show-training-checkbox',
      selected: true,
      shape: 'triangle',
    },
    {
      label: 'Both',
      id: 'show-both-checkbox',
      selected: true,
      shape: 'square',
    },
  ],
//   data: [
//     {
//       name: 'Hours of Training', x: [], y: [], month: '',
//     },
//     {
//       name: 'Hours of Technical Assistance', x: [], y: [], month: '',
//     },
//     {
//       name: 'Hours of Both', x: [], y: [], month: '',
//     },
//   ],
};

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { DECIMAL_BASE } from '@ttahub/common';
import { useMediaQuery } from 'react-responsive';
import colors from '../colors';
import LegendControl from './LegendControl';
import LegendControlFieldset from './LegendControlFieldset';
import HorizontalTableWidget from './HorizontalTableWidget';
import { arrayExistsAndHasLength } from '../Constants';
import NoResultsFound from '../components/NoResultsFound';

const HOVER_TEMPLATE = '(%{x}, %{y})<extra></extra>';
const MAX_WIDTH_MEDIUM = 1200;
const MAX_WIDTH_SMALL = 850;

const TRACE_CONFIG = {
  circle: (data) => ({
    id: data.id,
    // Technical Assistance
    type: 'scatter',
    mode: 'lines+markers',
    x: data.x,
    y: data.y,
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
  }),
  square: (data) => ({
    id: data.id,
    type: 'scatter',
    mode: 'lines+markers',
    x: data.x,
    y: data.y,
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
  }),
  triangle: (data) => ({
    // Training
    id: data.id,
    type: 'scatter',
    mode: 'lines+markers',
    x: data.x,
    y: data.y,
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
  }),
};

export default function LineGraph({
  data,
  hideYAxis,
  xAxisTitle,
  yAxisTitle,
  yAxisTickStep,
  onChartClick,
  legendConfig,
  tableConfig,
  widgetRef,
  showTabularData,
  drawerConfig,
}) {
  // the state for the legend and which traces are visible
  const [legends, setLegends] = useState(legendConfig);

  // the dom el for drawing the chart
  const lines = useRef();

  const hasData = data && data.length && data.some((d) => d.x.length > 0);

  const isMediumWidget = useMediaQuery({ maxWidth: MAX_WIDTH_MEDIUM });
  const isSmallWidget = useMediaQuery({ maxWidth: MAX_WIDTH_SMALL });

  useEffect(() => {
    const chartElement = lines.current;
    const handleChartClick = onChartClick
      ? (event) => onChartClick(event)
      : null;

    if (chartElement && handleChartClick) {
      chartElement.addEventListener('click', handleChartClick);
    }

    return () => {
      if (chartElement && handleChartClick) {
        chartElement.removeEventListener('click', handleChartClick);
      }
    };
  }, [data, hasData, onChartClick, showTabularData]);

  useEffect(() => {
    if (!lines || showTabularData || !arrayExistsAndHasLength(data) || !hasData) {
      return;
    }

    const xAxisConfig = (() => {
      if (isSmallWidget) {
        return { autotick: true, nticks: 4 };
      }

      if (isMediumWidget) {
        return { nticks: 8, autotick: true };
      }

      const value = data[0].x.length;
      let divisor = value;
      if (value > 12) {
        divisor = 6;
      }

      if (value > 24) {
        divisor = 4;
      }

      const xTickStep = parseInt(value / divisor, DECIMAL_BASE);

      return { autotick: false, tick0: 0, dtick: xTickStep };
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
        ...xAxisConfig,
        showgrid: false,
        hovermode: 'closest',
        ticks: 'outside',
        ticklen: 5,
        tickwidth: 1,
        tickcolor: '#000',
        tickangle: 0,
        automargin: true,
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
        dtick: yAxisTickStep,
        tick0: 0,
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

    const traces = data.map((d) => TRACE_CONFIG[d.trace](d));

    const tracesToDraw = legends
      .map((legend) => (legend.selected ? traces.find(({ id }) => id === legend.traceId) : null))
      .filter((trace) => Boolean(trace));

    // draw the plot
    import('plotly.js-basic-dist').then((Plotly) => {
      if (lines.current) Plotly.newPlot(lines.current, tracesToDraw, layout, { displayModeBar: false, hovermode: 'none', responsive: true });
    });
  }, [
    data,
    hasData,
    hideYAxis,
    isMediumWidget,
    isSmallWidget,
    legends,
    onChartClick,
    showTabularData,
    xAxisTitle,
    yAxisTickStep,
    yAxisTitle,
  ]);

  if (!hasData) {
    return <NoResultsFound drawerConfig={drawerConfig} />;
  }

  return (
    <div className="ttahub-three-trace-line-graph" ref={widgetRef}>
      { showTabularData
        ? (
          <HorizontalTableWidget
            headers={tableConfig.headings}
            data={tableConfig.data}
            caption={tableConfig.caption}
            firstHeading={tableConfig.firstHeading}
            enableSorting={tableConfig.enableSorting}
            sortConfig={tableConfig.sortConfig}
            requestSort={tableConfig.requestSort}
            enableCheckboxes={tableConfig.enableCheckboxes}
            checkboxes={tableConfig.checkboxes}
            setCheckboxes={tableConfig.setCheckboxes}
            showTotalColumn={tableConfig.showTotalColumn}
            footerData={tableConfig.footer.showFooter ? tableConfig.footer.data : false}
            selectAllIdPrefix={tableConfig.selectAllIdPrefix}
            stickyLastDataColumn={tableConfig.stickyLastDataColumn}
          />
        )
        : (
          <div className="padding-3">
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
      month: PropTypes.oneOfType([
        PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.arrayOf(PropTypes.bool),
      ]),
      id: PropTypes.string,
    }),
  ),
  hideYAxis: PropTypes.bool,
  xAxisTitle: PropTypes.string,
  yAxisTitle: PropTypes.string,
  yAxisTickStep: PropTypes.number,
  onChartClick: PropTypes.func,
  legendConfig: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    selected: PropTypes.bool.isRequired,
    shape: PropTypes.oneOf(['circle', 'triangle', 'square']).isRequired,
  })),
  tableConfig: PropTypes.shape({
    headings: PropTypes.arrayOf(PropTypes.string).isRequired,
    firstHeading: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    requestSort: PropTypes.func,
    sortConfig: PropTypes.shape({
      sortBy: PropTypes.string,
      direction: PropTypes.string,
      activePage: PropTypes.number,
    }),
    caption: PropTypes.string.isRequired,
    enableCheckboxes: PropTypes.bool.isRequired,
    enableSorting: PropTypes.bool.isRequired,
    showTotalColumn: PropTypes.bool.isRequired,
    stickyLastDataColumn: PropTypes.bool,
    checkboxes: PropTypes.shape({}),
    setCheckboxes: PropTypes.func,
    footer: PropTypes.shape({
      data: PropTypes.arrayOf(PropTypes.string),
      showFooter: PropTypes.bool.isRequired,
    }),
    selectAllIdPrefix: PropTypes.string,
    data: PropTypes.arrayOf(PropTypes.shape({
      heading: PropTypes.string.isRequired,
      data: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        title: PropTypes.string.isRequired,
      })).isRequired,
    })).isRequired,
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  widgetRef: PropTypes.object.isRequired,
  showTabularData: PropTypes.bool.isRequired,
  drawerConfig: PropTypes.shape({
    title: PropTypes.string,
    tagName: PropTypes.string,
  }),
};

LineGraph.defaultProps = {
  xAxisTitle: '',
  yAxisTitle: '',
  hideYAxis: false,
  yAxisTickStep: null,
  onChartClick: null,
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
  drawerConfig: {
    title: 'QA dashboard filters',
    tagName: 'ttahub-qa-dash-filters',
  },
};

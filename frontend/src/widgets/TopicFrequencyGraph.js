import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Plotly from 'plotly.js-basic-dist';
import { Grid } from '@trussworks/react-uswds';
import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import AccessibleWidgetData from './AccessibleWidgetData';
import ButtonSelect from '../components/ButtonSelect';
import colors from '../colors';
import MediaCaptureButton from '../components/MediaCaptureButton';

export const SORT_ORDER = {
  DESC: 1,
  ALPHA: 2,
};

export function sortData(data, order, tabular = false) {
  if (order === SORT_ORDER.ALPHA) {
    data.sort((a, b) => a.topic.localeCompare(b.topic));
  } else {
    data.sort((a, b) => b.count - a.count);
  }

  if (!tabular) {
    data.reverse();
  }
}

/**
 *
 * Takes a string, a reason (or topic, if you prefer)
 * provided for an activity report and intersperses it with line breaks
 * depending on the length
 *
 * @param {string} topic
 * @returns string with line breaks
 */
export function topicsWithLineBreaks(reason) {
  const arrayOfTopics = reason.split(' ');

  return arrayOfTopics.reduce((accumulator, currentValue) => {
    const lineBreaks = accumulator.match(/<br \/>/g);
    const allowedLength = lineBreaks ? lineBreaks.length * 6 : 6;

    // we don't want slashes on their own lines
    if (currentValue === '/') {
      return `${accumulator} ${currentValue}`;
    }

    if (accumulator.length > allowedLength) {
      return `${accumulator}<br />${currentValue}`;
    }

    return `${accumulator} ${currentValue}`;
  }, '');
}

export function TopicFrequencyGraphWidget({
  data, loading,
}) {
  // whether to show the data as accessible widget data or not
  const [showAccessibleData, setShowAccessibleData] = useState(false);

  // where the table data lives
  const [columnHeadings, setColumnHeadings] = useState([]);
  const [tableRows, setTableRows] = useState([]);

  // the order the data is displayed in the chart
  const [order, setOrder] = useState(SORT_ORDER.DESC);

  // the dom element for drawing the chart
  const bars = useRef();

  useEffect(() => {
    if (!bars || !data || !Array.isArray(data)) {
      return;
    }

    // sort the api response based on the dropdown choices
    sortData(data, order, showAccessibleData);

    const topics = [];
    const counts = [];
    const rows = [];

    data.forEach((dataPoint) => {
      if (!showAccessibleData) {
        topics.push(dataPoint.topic);
        counts.push(dataPoint.count);
      } else {
        rows.push({
          data: [dataPoint.topic, dataPoint.count],
        });
      }
    });

    if (showAccessibleData) {
      setColumnHeadings(['Topic', 'Count']);
      setTableRows(rows);
      return;
    }

    const trace = {
      type: 'bar',
      orientation: 'h',
      x: counts,
      y: topics,
      marker: {
        color: colors.ttahubMediumBlue,
      },
      width: 0.75,
      hovertemplate: '%{y}: %{x}<extra></extra>',
    };

    const layout = {
      bargap: 0.5,
      height: 1000,
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
        automargin: true,
        autorange: true,
        tickangle: 0,
        title: {
          font: {
            color: colors.textInk,
          },
        },
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

    // draw the plot
    Plotly.newPlot(bars.current, [trace], layout, { displayModeBar: false, responsive: true });
  }, [data, order, setOrder, showAccessibleData]);

  /**
   * takes in the react-select style data structure and extracts the number value
   * which is how we want it in our component
   * @param {{
   *   value: number,
   *   label: string
   * }} selected
   */
  const onApplySort = (selected) => {
    setOrder(selected.value);
  };

  // toggle the data table
  function toggleType() {
    setShowAccessibleData(!showAccessibleData);
  }

  return (
    <Container className="ttahub--topic-frequency-graph width-full" loading={loading} loadingLabel="Topic frequency loading">
      <Grid row className="margin-bottom-2 bg-white">
        <Grid className="flex-align-self-center" desktop={{ col: 'auto' }} mobileLg={{ col: 8 }}>
          <h2 className="ttahub--dashboard-widget-heading margin-0">Number of Activity Reports by Topic</h2>
        </Grid>
        <Grid col="auto" gap={1} className="ttahub--topic-frequency-graph-control-row desktop:display-flex bg-white desktop:padding-x-2">
          <ButtonSelect
            styleAsSelect
            labelId="tfGraphOrder"
            labelText="Change topic graph order"
            ariaName="Change topic graph order menu"
            initialValue={{
              value: SORT_ORDER.DESC,
              label: 'High to low',
            }}
            applied={order}
            onApply={onApplySort}
            options={
              [
                {
                  value: SORT_ORDER.DESC,
                  label: 'High to low',
                },
                {
                  value: SORT_ORDER.ALPHA,
                  label: 'A to Z',
                },
              ]
            }
          />
        </Grid>
        <Grid desktop={{ col: 'auto' }} className="ttahub--show-accessible-data-button desktop:margin-y-0 mobile-lg:margin-y-1">
          {!showAccessibleData
            ? (
              <MediaCaptureButton
                reference={bars}
                buttonText="Save screenshot"
                id="rd-save-screenshot-topic-frequency"
                className="margin-x-2"
              />
            )
            : null}
          <button
            type="button"
            className="usa-button--unstyled margin-top-2"
            aria-label={showAccessibleData ? 'display number of activity reports by topic data as graph' : 'display number of activity reports by topic data as table'}
            onClick={toggleType}
            data-html2canvas-ignore
            id="rd-display-table-topic-frequency"
          >
            {showAccessibleData ? 'Display graph' : 'Display table'}
          </button>
        </Grid>

      </Grid>

      { showAccessibleData
        ? <AccessibleWidgetData caption="Number of Activity Reports by Topic Table" columnHeadings={columnHeadings} rows={tableRows} />
        : (
          <div className="tta-dashboard--bar-graph-container" ref={bars} data-testid="bars" />
        ) }

    </Container>
  );
}

TopicFrequencyGraphWidget.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        topic: PropTypes.string,
        count: PropTypes.number,
      }),
    ), PropTypes.shape({}),
  ]),
  loading: PropTypes.bool.isRequired,
};

TopicFrequencyGraphWidget.defaultProps = {

  data: [],
};

export default withWidgetData(TopicFrequencyGraphWidget, 'topicFrequencyGraph');

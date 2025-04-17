import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Grid } from '@trussworks/react-uswds';
import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import AccessibleWidgetData from './AccessibleWidgetData';
import ButtonSelect from '../components/ButtonSelect';
import colors from '../colors';
import MediaCaptureButton from '../components/MediaCaptureButton';
import DisplayTableToggle from '../components/DisplayTableToggleButton';

export const SORT_ORDER = {
  DESC: 1,
  ALPHA: 2,
};

export function sortData(data, order, tabular = false) {
  // if order === SORT_ORDER.ALPHA, sort alphabetically
  if (order === SORT_ORDER.ALPHA) {
    data.sort((a, b) => a.topic.localeCompare(b.topic));
  } else {
    // sort by count and then alphabetically
    data.sort((a, b) => {
      if (a.count === b.count) {
        return a.topic.localeCompare(b.topic);
      }
      return b.count - a.count;
    });
  }

  // the orientation is reversed visually in the table
  if (!tabular) {
    data.reverse();
  }
}

export function TopicFrequencyGraphWidget({
  data,
  loading,
  title,
}) {
  const exportName = useMemo(() => {
    const TODAY = moment().format('YYYY-MM-DD');
    return `${TODAY} ${title}`;
  }, [title]);

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
    import('plotly.js-basic-dist').then((Plotly) => {
      if (bars.current) {
        Plotly.newPlot(bars.current, [trace], layout, { displayModeBar: false, responsive: true });
      }
    });
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

  return (
    <Container className="ttahub--topic-frequency-graph width-full" loading={loading} loadingLabel="Topic frequency loading">
      <Grid row className="margin-bottom-2 bg-white">
        <Grid className="flex-align-self-center" desktop={{ col: 'auto' }} mobileLg={{ col: 8 }}>
          <h2 className="ttahub--dashboard-widget-heading margin-0">{title}</h2>
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
                title={exportName}
              />
            )
            : null}
          <DisplayTableToggle
            title={title}
            displayTable={showAccessibleData}
            setDisplayTable={setShowAccessibleData}
          />
        </Grid>

      </Grid>

      { showAccessibleData
        ? <AccessibleWidgetData caption={`${title} table`} columnHeadings={columnHeadings} rows={tableRows} />
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
  title: PropTypes.string,
};

TopicFrequencyGraphWidget.defaultProps = {
  title: 'Number of Activity Reports by Topic',
  data: [],
};

export default withWidgetData(TopicFrequencyGraphWidget, 'topicFrequencyGraph');

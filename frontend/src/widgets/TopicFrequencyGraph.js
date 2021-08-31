import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Plotly from 'plotly.js-basic-dist';
import { Grid } from '@trussworks/react-uswds';
import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import DateTime from '../components/DateTime';
import AccessibleWidgetData from './AccessibleWidgetData';
import './TopicFrequencyGraph.css';
import ButtonSelect from '../components/ButtonSelect';
import CheckboxSelect from '../components/CheckboxSelect';

export const ROLES_MAP = [
  {
    selectValue: 1,
    value: 'Early Childhood Specialist',
    label: 'Early Childhood Specialist (ECS)',
  },
  {
    selectValue: 2,
    value: 'Family Engagement Specialist',
    label: 'Family Engagement Specialist (FES)',
  },
  {
    selectValue: 3,
    value: 'Grantee Specialist',
    label: 'Grantee Specialist (GS)',
  },
  {
    selectValue: 4,
    value: 'Health Specialist',
    label: 'Health Specialist (HS)',
  },
  {
    selectValue: 5,
    value: 'System Specialist',
    label: 'System Specialist (SS)',
  },
];

export const SORT_ORDER = {
  DESC: 1,
  ALPHA: 2,
};

export function sortData(data, order) {
  if (order === SORT_ORDER.ALPHA) {
    data.sort((a, b) => a.topic.localeCompare(b.topic));
  } else {
    data.sort((a, b) => b.count - a.count);
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
  data, dateTime, updateRoles, loading,
}) {
  // whether to show the data as accessible widget data or not
  const [showAccessibleData, setShowAccessibleData] = useState(false);

  // where the table data lives
  const [columnHeadings, setColumnHeadings] = useState([]);
  const [tableRows, setTableRows] = useState([]);

  // the order the data is displayed in the chart
  const [order, setOrder] = useState(SORT_ORDER.DESC);

  // the dom el for drawing the chart
  const bars = useRef();

  useEffect(() => {
    if (!bars || !data || !Array.isArray(data)) {
      return;
    }

    // sort the api response based on the dropdown choices
    sortData(data, order);

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
      x: topics.map((topic) => topicsWithLineBreaks(topic)),
      y: counts,
      hoverinfo: 'y',
    };

    const width = topics.length * 180;

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
      width,
      margin: {
        l: 80,
        pad: 20,
        t: 24,
      },
      xaxis: {
        automargin: true,
        tickangle: 0,
      },
      yaxis: {
        tickformat: ',.0d',
        title: {
          standoff: 60,
          text: 'Number of Activity Reports',
        },
      },
      hovermode: 'none',
    };

    // draw the plot
    Plotly.newPlot(bars.current, [trace], layout, { displayModeBar: false, hovermode: 'none' });
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

  const onApplyRoles = (selected) => {
    // we may get these as a string, so we cast them to ints
    updateRoles(selected.map((s) => parseInt(s, 10)));
  };

  // toggle the data table
  function toggleType() {
    setShowAccessibleData(!showAccessibleData);
  }

  return (
    <Container className="ttahub--topic-frequency-graph overflow-x-scroll" padding={3} loading={loading} loadingLabel="Topic frequency loading">
      <Grid row className="position-relative margin-bottom-2">
        <Grid className="flex-align-self-center" desktop={{ col: 'auto' }} mobileLg={{ col: 8 }}>
          <h2 className="ttahub--dashboard-widget-heading margin-0">Number of Activity Reports by Topic</h2>
        </Grid>
        <Grid desktop={{ col: 'auto' }} mobileLg={{ col: 4 }} className="display-flex desktop:padding-x-1 desktop:margin-y-0 margin-y-2 flex-align-self-center">
          <DateTime classNames="display-flex flex-align-center padding-x-1" timestamp={dateTime.timestamp} label={dateTime.label} />
        </Grid>
        <Grid col="auto" className="ttahub--topic-frequency-graph-control-row display-flex desktop:padding-x-2">
          <ButtonSelect
            styleAsSelect
            labelId="tfGraphOrder"
            labelText="Change topic graph order"
            ariaLabel="Change topic graph order"
            initialValue={{
              value: SORT_ORDER.DESC,
              label: 'High to Low',
            }}
            applied={order}
            onApply={onApplySort}
            options={
              [
                {
                  value: SORT_ORDER.DESC,
                  label: 'High to Low',
                },
                {
                  value: SORT_ORDER.ALPHA,
                  label: 'A to Z',
                },
              ]
            }
          />
          <CheckboxSelect
            styleAsSelect
            toggleAllText="All Specialists"
            toggleAllInitial
            labelId="tfRoleFilter"
            labelText="Filter by specialists"
            ariaLabel="Change filter by specialists"
            onApply={onApplyRoles}
            options={
              ROLES_MAP.map((role) => ({
                value: role.selectValue,
                label: role.label,
              }))
            }
          />
        </Grid>
        <Grid desktop={{ col: 'auto' }} className="ttahub--show-accessible-data-button desktop:margin-y-0 mobile-lg:margin-y-1">
          <button type="button" className="usa-button--unstyled margin-top-2" onClick={toggleType}>{showAccessibleData ? 'View Graph' : 'Show Accessible Data'}</button>
        </Grid>

      </Grid>
      { showAccessibleData
        ? <AccessibleWidgetData caption="Number of Activity Reports by Topic Table" columnHeadings={columnHeadings} rows={tableRows} />
        : <div data-testid="bars" className="tta-dashboard--bar-graph-container" ref={bars} /> }

    </Container>
  );
}

TopicFrequencyGraphWidget.propTypes = {
  dateTime: PropTypes.shape({
    timestamp: PropTypes.string, label: PropTypes.string,
  }),
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        topic: PropTypes.string,
        count: PropTypes.number,
      }),
    ), PropTypes.shape({}),
  ]).isRequired,
  loading: PropTypes.bool.isRequired,
  updateRoles: PropTypes.func.isRequired,
};

TopicFrequencyGraphWidget.defaultProps = {
  dateTime: { timestamp: '', label: '' },
};

export default withWidgetData(TopicFrequencyGraphWidget, 'topicFrequencyGraph');

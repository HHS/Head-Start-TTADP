import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Plotly from 'plotly.js-basic-dist';
import { Grid } from '@trussworks/react-uswds';
import Select, { components } from 'react-select';
import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import arrowBoth from '../images/arrow-both.svg';
import DateTime from '../components/DateTime';
import './TopicFrequencyGraph.css';
import FormatNumber from './WidgetHelper';

export function filterData(data, selectedRoles) {
  return data.filter((dataPoint) => {
    if (selectedRoles.length > 0) {
      let include = false;
      // eslint-disable-next-line consistent-return
      selectedRoles.forEach((selectedRole) => {
        if (dataPoint.roles.includes(selectedRole.value)) {
          include = true;
        }
      });

      return include;
    }
    return true;
  });
}

export function sortData(data, order) {
  data.sort((a, b) => {
    if (order === 'desc') {
      return b.count - a.count;
    }

    return a.count - b.count;
  });
}

export function Tooltip(props) {
  const {
    show, x, y, text,
  } = props;
  return show ? <span className="ttahub--topic-frequency-graph-tooltip" style={{ left: x, top: y - 50 }}>{text}</span> : null;
}

Tooltip.propTypes = {
  show: PropTypes.bool.isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  text: PropTypes.number.isRequired,
};

/**
 *
 * Takes a string, a reason (or topic, if you prefer)
 * provided for an activity report and intersperses it with line breaks
 * depending on the length
 *
 * @param {string} reason
 * @returns string with line breaks
 */
export function reasonsWithLineBreaks(reason) {
  const arrayOfReasons = reason.split(' ');

  return arrayOfReasons.reduce((accumulator, currentValue) => {
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

/**
 * This is a component for use inside the react select, to match the USDS look
 * https://react-select.com/components
 */
export const DropdownIndicator = (props) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <components.DropdownIndicator {...props}>
    <img aria-hidden="true" alt="" style={{ width: '8px' }} src={arrowBoth} />
  </components.DropdownIndicator>
);

/**
 * this is the styles object for react select
 * https://react-select.com/styles
 * */

const styles = {
  container: (provided, state) => {
    // To match the focus indicator provided by uswds
    const outline = state.isFocused ? '0.25rem solid #2491ff;' : '';
    return {
      ...provided,
      outline,
      height: state.isFocused ? 'auto' : '40px',
      // zIndex: '2',
    };
  },
  control: (provided) => ({
    ...provided,
    borderColor: '#565c65',
    backgroundColor: 'white',
    borderRadius: '5px',
    '&:hover': {
      borderColor: '#565c65',
    },
    height: '100%',
    width: '180px',
  }),
  menu: (provided) => ({
    ...provided,
    marginTop: 0,
    top: 'auto',
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    // The arrow dropdown icon is too far to the right, this pushes it back to the left
    marginRight: '4px',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  valueContainer: (provided) => ({
    ...provided,
    height: 'auto',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'black',
  }),
};

export function TopicFrequencyGraphWidget({ data, dateTime }) {
  const [selectedOrder, setSelectedOrder] = useState('desc');
  // the order the data is displayed in the chart
  const [order, setOrder] = useState('desc');
  // this is roles selected in the multiselect
  const [selectedRoles, setSelectedRoles] = useState([]);
  // this is the roles to filter on
  const [filteredRoles, setFilteredRoles] = useState([]);
  // whether or not to show the tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  // set x position of tooltip
  const [tooltipX, setTooltipX] = useState(0);
  // set y position of tooltip
  const [tooltipY, setTooltipY] = useState(0);
  // set tooltip text
  const [tooltipText, setTooltipText] = useState(0);

  // the dom el for drawing the chart
  const bars = useRef();

  useEffect(() => {
    if (!bars || !data || !Array.isArray(data)) {
      return;
    }

    // here is where we can filter array for participants
    const filteredData = filterData(data, filteredRoles);

    // sort the api response based on the dropdown choices
    sortData(filteredData, order);

    const reasons = [];
    const counts = [];

    filteredData.forEach((dataPoint) => {
      reasons.push(dataPoint.reason);
      counts.push(dataPoint.count);
    });

    const trace = {
      type: 'bar',
      x: reasons.map((reason) => reasonsWithLineBreaks(reason)),
      y: counts,
      hoverinfo: 'y',
    };

    const width = reasons.length > 1 ? reasons.length * 180 : 330;

    const layout = {
      bargap: 0.5,
      height: 300,
      hoverlabel: {
        bgcolor: '#fff',
        bordercolor: '#fff',
        font: {
          color: '#fff',
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

    bars.current.on('plotly_hover', (e) => {
      if (e.points && e.points[0]) {
        const rect = bars.current.querySelectorAll('.point')[e.points[0].pointIndex].getBoundingClientRect();
        const x = rect.left;
        const y = rect.top;
        setShowTooltip(true);
        setTooltipX(x);
        setTooltipY(y);
        setTooltipText(FormatNumber(counts[e.points[0].pointIndex]));
      }
    });

    bars.current.on('plotly_unhover', () => {
      setShowTooltip(false);
    });
  }, [data, filteredRoles, order, selectedRoles]);

  if (!data) {
    return <p>Loading...</p>;
  }

  const applyFilters = () => {
    setOrder(selectedOrder);
    setFilteredRoles(selectedRoles);
  };

  // handle the order select
  const handleSelect = (e) => {
    setSelectedOrder(e.target.value); // test
  };

  return (
    <Container className="ttahub--topic-frequency-graph overflow-x-scroll" padding={3}>
      <Grid row className="position-relative margin-bottom-2">
        <Tooltip show={showTooltip} x={tooltipX} y={tooltipY} text={tooltipText} />
        <Grid className="flex-align-self-center" desktop={{ col: 'auto' }} mobileLg={{ col: 8 }}>
          <h2 className="ttahub--dashboard-widget-heading margin-0">Number of Activity Reports by Topic</h2>
        </Grid>
        <Grid desktop={{ col: 'auto' }} mobileLg={{ col: 4 }} className="display-flex desktop:padding-x-1 desktop:margin-y-0 margin-y-2 flex-align-self-center">
          <DateTime classNames="display-flex flex-align-center padding-x-1" timestamp={dateTime.timestamp} label={dateTime.label} />
        </Grid>
        <Grid col="auto" className="ttahub--topic-frequency-graph-control-row display-flex desktop:padding-x-2">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="usa-label sr-only" htmlFor="tfGraphOrder">Change topic data order</label>
          <select className="usa-select radius-md margin-right-2" id="tfGraphOrder" name="tfGraphOrder" value={order} onChange={handleSelect}>
            <option value="desc">High To Low</option>
            <option value="asc">Low to High</option>
          </select>
          <Select
            classNamePrefix="ar"
            id="arGraphRoles"
            value={selectedRoles}
            onChange={(selected) => {
              setSelectedRoles(selected);
            }}
            className="margin-top-1 margin-right-2 ttahub-dashboard--participant-select"
            components={DropdownIndicator}
            options={[
              {
                value: 'Early Childhood Specialist',
                label: 'Early Childhood Specialist (ECS)',
              },
              {
                value: 'Family Engagement Specialist',
                label: 'Family Engagement Specialist (FES)',
              },
              {
                value: 'Grantee Specialist',
                label: 'Grantee Specialist (GS)',
              },
              {
                value: 'Health Specialist',
                label: 'Health Specialist (HS)',
              },
              {
                value: 'System Specialist',
                label: 'System Specialist (SS)',
              },
            ]}
            tabSelectsValue={false}
            placeholder="All Specialists"
            isMulti
            isClearable={false}
            styles={styles}
            data-testid="tfGraphSpecialists"
          />
          <button type="button" className="usa-button tta-dashboard--topic-frequency-graph-apply-filters padding-0 margin-top-1" onClick={applyFilters}>
            Apply filters
          </button>
        </Grid>
      </Grid>
      <div data-testid="bars" className="tta-dashboard--bar-graph-container" ref={bars} />
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
        reason: PropTypes.string,
        count: PropTypes.number,
        roles: PropTypes.arrayOf(PropTypes.string),
      }),
    ), PropTypes.shape({}),
  ]).isRequired,
};

TopicFrequencyGraphWidget.defaultProps = {
  dateTime: { timestamp: '', label: '' },
};

export default withWidgetData(TopicFrequencyGraphWidget, 'topicFrequencyGraph');

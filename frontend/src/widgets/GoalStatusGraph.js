import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import AccessibleWidgetData from './AccessibleWidgetData';

const GOAL_STATUSES = [
  'Not Started',
  'In Progress',
  'Closed',
  'Ceased/Suspended',
];

const STATUS_COLORS = [
  '#e2a04d',
  '#0166ab',
  '#148439',
  '#b50908',
];

function Bar({
  count, percentage, label, color, ratio, total,
}) {
  const style = {
    // 0/0 is NaN
    width: Number.isNaN(percentage) ? '0%' : `${percentage * 100}%`,
    backgroundColor: color,
  };

  const readablePercentage = `${(
    percentage * 100).toLocaleString('en-us', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  } percent of goals are ${label}`;

  const readableRatio = `That's ${count} of ${total} goals`;

  return (
    <div className="ttahub-goal-bar-container display-flex flex-justify margin-y-2">
      <span className="flex-2 margin-right-1 flex-align-self-center" aria-label={readablePercentage}>
        {label}
      </span>
      <div className="ttahub-goal-bar height-3 bg-base-lightest flex-6 margin-right-1 width-full" aria-hidden="true">
        <div className="ttahub-goal-bar-color height-full width-full" style={style} />
      </div>
      <span aria-label={readableRatio} className="width-10 flex-align-self-center text-right padding-left-1">{ratio}</span>
    </div>
  );
}

Bar.propTypes = {
  count: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  percentage: PropTypes.number.isRequired,
  ratio: PropTypes.string.isRequired,
  total: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
};

export function GoalStatusChart({ data, loading }) {
  // whether to show the data as accessible widget data or not
  const [showAccessibleData, updateShowAccessibleData] = useState(false);

  // the lil bar objects that we'll render to the DOM
  const [bars, setBars] = useState([]);

  // we only need to recompute this when the data changes, not when the
  // bars or display type are changed
  const accessibleRows = useMemo(
    () => GOAL_STATUSES.map((status) => ({ data: [status, data[status]] })), [data],
  );

  useEffect(() => {
    if (!data) {
      return;
    }

    const newBars = GOAL_STATUSES.map((status, index) => ({
      ratio: `${data[status]}/${data.total}`,
      percentage: data[status] / data.total,
      label: status === 'Ceased/Suspended' ? 'Suspended' : status,
      color: STATUS_COLORS[index],
      count: data[status],
      total: data.total,
    }));

    setBars(newBars);
  }, [data]);

  // toggle the data table
  function toggleAccessibleData() {
    updateShowAccessibleData((current) => !current);
  }

  return (
    <Container className="ttahub--goal-status-graph" padding={3} loading={loading} loadingLabel="goal statuses by number loading">
      <Grid row className="position-relative margin-bottom-2">
        <Grid className="flex-align-self-center desktop:display-flex flex-align-center" desktop={{ col: 'auto' }} mobileLg={{ col: 10 }}>
          <h2 className="margin-0">
            Number of goals by status
          </h2>
        </Grid>
        <Grid desktop={{ col: 'auto' }} className="ttahub--show-accessible-data-button flex-align-self-center">
          <button
            type="button"
            className="usa-button--unstyled"
            aria-label={showAccessibleData ? 'display goal statuses by number as a graph' : 'display goal statuses by number as a table'}
            onClick={toggleAccessibleData}
          >
            {showAccessibleData ? 'Display graph' : 'Display table'}
          </button>
        </Grid>
      </Grid>
      { showAccessibleData
        ? (
          <AccessibleWidgetData
            caption="Goal Statuses By Number"
            columnHeadings={['Status', 'Count']}
            rows={accessibleRows}
          />
        )
        : (
          <>
            <div className="border-top border-gray-5">
              <h3>
                {data.total}
                {' '}
                goals
              </h3>
              {bars.map(({
                count, percentage, label, color, ratio, total,
              }) => (
                <Bar
                  key={color}
                  count={count}
                  percentage={percentage}
                  label={label}
                  color={color}
                  ratio={ratio}
                  total={total}
                />
              ))}
            </div>
          </>
        )}
    </Container>
  );
}

GoalStatusChart.propTypes = {
  data: PropTypes.shape({
    total: PropTypes.number,
    'Not Started': PropTypes.number,
    'In Progress': PropTypes.number,
    Closed: PropTypes.number,
    'Ceased/Suspended': PropTypes.number,
  }),
  loading: PropTypes.bool.isRequired,
};

GoalStatusChart.defaultProps = {
  data: {
    total: 0,
    'Not Started': 0,
    'In Progress': 0,
    Closed: 0,
    'Ceased/Suspended': 0,
  },
};

export default withWidgetData(GoalStatusChart, 'goalStatusGraph');

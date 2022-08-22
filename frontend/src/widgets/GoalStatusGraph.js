import React, {
  useEffect, useMemo, useState, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Grid, ModalToggleButton } from '@trussworks/react-uswds';
import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import AccessibleWidgetData from './AccessibleWidgetData';
import colors from '../colors';
import VanillaModal from '../components/VanillaModal';

const GOAL_STATUSES = [
  'Not started',
  'In progress',
  'Closed',
  'Suspended',
];

const STATUS_COLORS = [
  colors.ttahubOrange,
  colors.ttahubMediumBlue,
  colors.success,
  colors.error,
];

function Bar({
  count,
  percentage,
  label,
  color,
  ratio,
  total,
}) {
  // 0/0 is NaN
  const percent = Number.isNaN(percentage) ? 0 : percentage * 100;

  const style = {
    width: `${percent}%`,
    backgroundColor: color,
  };

  const readablePercentage = `${
    (percent).toLocaleString('en-us', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  } percent of goals are ${label}`;

  const readableRatio = `That's ${count} of ${total} goals`;

  return (
    <div className="ttahub-goal-bar-container display-flex flex-justify margin-y-2">
      <span className="width-10 margin-right-4 flex-align-self-center" aria-label={readablePercentage}>
        {label}
      </span>
      <div className="ttahub-goal-bar height-3 bg-base-lightest flex-6 margin-right-1 width-full" aria-hidden="true">
        <div className="ttahub-goal-bar-color height-full width-full" style={style} />
      </div>
      <span aria-label={readableRatio} className="width-8 flex-align-self-center text-right padding-left-1">{ratio}</span>
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

  const modalRef = useRef();

  useEffect(() => {
    if (!data) {
      return;
    }

    const newBars = GOAL_STATUSES.map((status, index) => ({
      ratio: `${data[status]}/${data.total}`,
      percentage: data[status] / data.total,
      label: status,
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
    <Container className="ttahub--goal-status-graph" paddingX={3} paddingY={3} loading={loading} loadingLabel="goal statuses by number loading">
      <Grid row className="position-relative margin-bottom-1">
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
      <Grid row className="margin-bottom-2">
        <ModalToggleButton unstyled className="usa-button usa-button--unstyled usa-prose" modalRef={modalRef} opener>
          What does each status mean?
        </ModalToggleButton>
        <VanillaModal modalRef={modalRef} heading="Goal status guide">
          <>
            <h3 className="margin-bottom-0">Not started</h3>
            <p className="usa-prose margin-0">Goal is approved, but TTA hasn&apos;t begun. Goal cannot be edited.</p>
            <h3 className="margin-bottom-0">In progress</h3>
            <p className="usa-prose margin-0">
              TTA is being provided to the recipient. More TTA related to this goal is anticipated.
            </p>
            <h3 className="margin-bottom-0">Suspended</h3>
            <p className="usa-prose margin-0">One of the following conditions exists:</p>
            <ul className="usa-list margin-0">
              <li>TTA paused due to staff changes</li>
              <li>Recipient requested RO pause TTA</li>
              <li>Recipient not responding</li>
              <li>Regional office and recipient agree to pause TTA</li>
            </ul>
            <h3 className="margin-bottom-0">Closed</h3>
            <p className="usa-prose margin-0">One of the following conditions exists:</p>
            <ul className="usa-list margin-0">
              <li>TTA for goal is complete</li>
              <li>Recipient discontinues TTA for goal</li>
              <li>Recipient and RO agree to end TTA for goal</li>
              <li>Goal is a duplicate of another goal</li>
            </ul>
          </>
        </VanillaModal>
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
              <p className="usa-prose text-bold">
                {data.total}
                {' '}
                goals
              </p>
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
    'Not started': 0,
    'In progress': 0,
    Closed: 0,
    Suspended: 0,
  },
};

export default withWidgetData(GoalStatusChart, 'goalStatusGraph');

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
import DisplayTableToggle from '../components/DisplayTableToggleButton';

const GOAL_STATUSES = [
  'Not started',
  'In progress',
  'Suspended',
  'Closed',
];

const STATUS_COLORS = [
  colors.ttahubOrange,
  colors.ttahubMediumBlue,
  colors.error,
  colors.success,
];

function Bar({
  percentage,
  color,
}) {
  // 0/0 is NaN
  const percent = Number.isNaN(percentage) ? 0 : percentage * 100;

  const style = {
    width: `${percent}%`,
    backgroundColor: color,
  };

  return (
    <div className="ttahub-goal-bar-container display-flex flex-justify flex-1" aria-hidden="true">
      <div className="ttahub-goal-bar height-3 bg-base-lightest width-full">
        <div className="ttahub-goal-bar-color height-full width-full" style={style} />
      </div>
    </div>
  );
}

Bar.propTypes = {
  percentage: PropTypes.number.isRequired,
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
    () => {
      if (!data) {
        return [];
      }
      return GOAL_STATUSES.map((status) => ({ data: [status, data[status]] }));
    }, [data],
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
      readableRatio: `${data[status]} of ${data.total} goals`,
    }));

    setBars(newBars);
  }, [data]);

  if (!data) {
    return null;
  }

  return (
    <Container className="ttahub--goal-status-graph width-full" loading={loading} loadingLabel="goal statuses by number loading">
      <Grid row className="position-relative margin-bottom-1">
        <Grid className="flex-align-self-center desktop:display-flex flex-align-center" desktop={{ col: 'auto' }} mobileLg={{ col: 10 }}>
          <h2 className="ttahub--dashboard-widget-heading margin-0">
            Number of goals by status
          </h2>
        </Grid>
        <Grid desktop={{ col: 'auto' }} className="ttahub--show-accessible-data-button flex-align-self-center">
          <DisplayTableToggle
            title="goal statuses by number"
            displayTable={showAccessibleData}
            setDisplayTable={updateShowAccessibleData}
          />
        </Grid>
      </Grid>
      <Grid row className="margin-bottom-2">
        <ModalToggleButton unstyled className="usa-button usa-button--unstyled usa-prose" modalRef={modalRef} opener>
          What does each status mean?
        </ModalToggleButton>
        <VanillaModal modalRef={modalRef} heading="Goal status guide" className="maxw-tablet">
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
            <div className="border-top border-gray-5" data-testid="goalStatusGraph">
              <p className="usa-prose text-bold">
                {data.total}
                {' '}
                goals
              </p>
              <div className="display-flex flex-justify">
                <div>
                  {bars.map(({ label, readableRatio }) => (
                    <div key={label} className="display-flex height-6 margin-right-1">
                      <span>{label}</span>
                      <span className="usa-sr-only">{readableRatio}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1" aria-hidden="true">
                  {bars.map(({ label, percentage, color }) => (
                    <div key={label} className="display-flex height-6">
                      <div className="display-flex width-full" key={color}>
                        <Bar
                          key={color}
                          percentage={percentage}
                          color={color}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div aria-hidden="true">
                  {bars.map(({ label, ratio }) => (
                    <div key={label} className="display-flex height-6 margin-left-1">
                      <span>{ratio}</span>
                    </div>
                  ))}
                </div>
              </div>
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
  loading: PropTypes.bool,
};

GoalStatusChart.defaultProps = {
  data: {
    total: 0,
    'Not started': 0,
    'In progress': 0,
    Closed: 0,
    Suspended: 0,
  },
  loading: false,
};

export default withWidgetData(GoalStatusChart, 'goalStatusByGoalName');

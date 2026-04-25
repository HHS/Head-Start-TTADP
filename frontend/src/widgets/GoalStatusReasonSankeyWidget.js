import React, { useMemo, useRef, useState } from 'react';
import './GoalStatusReasonSankeyWidget.scss';
import PropTypes from 'prop-types';
import WidgetContainer from '../components/WidgetContainer';
import NoResultsFound from '../components/NoResultsFound';
import useMediaCapture from '../hooks/useMediaCapture';
import GoalStatusReasonSankey from './GoalStatusReasonSankey';
import colors from '../colors';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import Drawer from '../components/Drawer';
import ContentFromFeedByTag from '../components/ContentFromFeedByTag';

const STATUS_LEGEND_ITEMS = [
  { label: 'Goals', color: colors.ttahubGrayBlue, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--goals' },
  { label: 'Not started', color: colors.ttahubOrangeMedium, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--not-started' },
  { label: 'In progress', color: colors.ttahubSteelBlue, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--in-progress' },
  { label: 'Closed', color: colors.ttahubTeal, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--closed' },
  { label: 'Suspended', color: colors.ttahubMagentaMedium, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--suspended' },
];

function GoalStatusReasonSankeyWidget({ data, loading }) {
  const widgetRef = useRef(null);
  const drawerTriggerRef = useRef(null);
  const capture = useMediaCapture(widgetRef, 'goal-status-suspension-closure-reasons');
  const hasSankeyData = Boolean(data?.sankey?.nodes?.length && data?.sankey?.links?.length);
  const dataStartDateDisplay = data?.dataStartDateDisplay;

  /* istanbul ignore next */
  const [showNoResults, setShowNoResults] = useState(false);

  /* istanbul ignore next */
  const effectiveHasData = process.env.NODE_ENV !== 'production'
    ? hasSankeyData && !showNoResults
    : hasSankeyData;

  /* istanbul ignore next */
  const DevToggle = () => (process.env.NODE_ENV !== 'production' ? (
    <button
      type="button"
      className="usa-button usa-button--unstyled font-sans-xs margin-bottom-1"
      onClick={() => setShowNoResults((v) => !v)}
    >
      {showNoResults ? 'Show chart' : 'Preview no-results view'}
    </button>
  ) : null);

  const menuItems = useMemo(() => ([
    {
      label: 'Save screenshot',
      onClick: capture,
      id: 'goal-status-reason-sankey-save-screenshot',
    },
  ]), [capture]);

  const subtitle = (
    <>
      {dataStartDateDisplay && (
      <p className="margin-top-0 margin-bottom-1 text-base">
        Data reflects standard goals created on or after
        {' '}
        {dataStartDateDisplay}
        .
      </p>
      )}
      <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
        About this data
      </DrawerTriggerButton>
    </>
  );

  return (
    <>
      <Drawer triggerRef={drawerTriggerRef} title="Goal status with suspension and closure reasons">
        <ContentFromFeedByTag tagName="ttahub-goal-sankey" />
      </Drawer>
      <WidgetContainer
        title="Goal status with suspension and closure reasons"
        subtitle={subtitle}
        loading={loading}
        loadingLabel="Goal status with reasons loading"
        menuItems={menuItems}
        showHeaderBorder
        titleGroupClassNames="padding-3 position-relative desktop:display-flex flex-justify flex-align-center flex-gap-2"
        titleMargin={{ bottom: 1 }}
      >
        <div className="ttahub-goal-sankey-widget padding-x-3 padding-bottom-3 margin-top-2" ref={widgetRef}>
          <DevToggle />
          {effectiveHasData ? (
            <>
              <ul className="ttahub-goal-sankey-widget__legend add-list-reset display-flex flex-wrap padding-y-3 padding-x-2 margin-0" aria-label="Goal status legend">
                {STATUS_LEGEND_ITEMS.map(({ label, color, patternClass }) => (
                  <li className="ttahub-goal-sankey-widget__legend-item display-inline-flex flex-align-center" key={label}>
                    <span
                      aria-hidden="true"
                      className={`ttahub-goal-sankey-widget__legend-swatch ${patternClass} display-inline-block`}
                      style={{ backgroundColor: color }}
                    />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>

              <GoalStatusReasonSankey sankey={data?.sankey} className="ttahub-goal-sankey-widget__plot" />
            </>
          ) : !loading && (
            <NoResultsFound hideFilterHelp />
          )}
        </div>
      </WidgetContainer>
    </>
  );
}

GoalStatusReasonSankeyWidget.propTypes = {
  loading: PropTypes.bool,
  data: PropTypes.shape({
    dataStartDate: PropTypes.string,
    dataStartDateDisplay: PropTypes.string,
    total: PropTypes.number,
    sankey: PropTypes.shape({
      nodes: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string,
        count: PropTypes.number,
        percentage: PropTypes.number,
      })),
      links: PropTypes.arrayOf(PropTypes.shape({
        source: PropTypes.string,
        target: PropTypes.string,
        value: PropTypes.number,
      })),
    }),
  }),
};

GoalStatusReasonSankeyWidget.defaultProps = {
  loading: false,
  data: {
    dataStartDate: '',
    dataStartDateDisplay: '',
    total: 0,
    sankey: {
      nodes: [],
      links: [],
    },
  },
};

export default GoalStatusReasonSankeyWidget;

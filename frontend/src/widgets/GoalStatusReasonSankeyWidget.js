import React, { useMemo, useRef } from 'react';
import './GoalStatusReasonSankeyWidget.scss';
import PropTypes from 'prop-types';
import WidgetContainer from '../components/WidgetContainer';
import NoResultsFound from '../components/NoResultsFound';
import useMediaCapture from '../hooks/useMediaCapture';
import GoalStatusReasonSankey from './GoalStatusReasonSankey';
import colors from '../colors';

const STATUS_LEGEND_ITEMS = [
  { label: 'Goals', color: colors.ttahubGrayBlue, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--goals' },
  { label: 'Not started', color: colors.ttahubOrangeMedium, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--not-started' },
  { label: 'In progress', color: colors.ttahubSteelBlue, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--in-progress' },
  { label: 'Closed', color: colors.ttahubTeal, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--closed' },
  { label: 'Suspended', color: colors.ttahubMagentaMedium, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--suspended' },
];

function GoalStatusReasonSankeyWidget({ data, loading }) {
  const widgetRef = useRef(null);
  const capture = useMediaCapture(widgetRef, 'goal-status-suspension-closure-reasons');
  const hasSankeyData = Boolean(data?.sankey?.nodes?.length && data?.sankey?.links?.length);

  const menuItems = useMemo(() => ([
    {
      label: 'Save screenshot',
      onClick: capture,
      id: 'goal-status-reason-sankey-save-screenshot',
    },
  ]), [capture]);

  const subtitle = (
    <>
      <p className="margin-top-0 margin-bottom-1 text-base">
        Data reflects activity starting on 09/09/2025.
      </p>
      <p className="margin-top-0 margin-bottom-0">
        <a className="usa-link" href="/docs/openapi/" target="_blank" rel="noreferrer">About this data</a>
      </p>
    </>
  );

  return (
    <WidgetContainer
      title="Goal status with suspension and closure reasons"
      subtitle={subtitle}
      loading={loading}
      loadingLabel="Goal status with reasons loading"
      menuItems={menuItems}
      showHeaderBorder={false}
      titleGroupClassNames="padding-3 position-relative desktop:display-flex flex-justify flex-align-center flex-gap-2"
      titleMargin={{ bottom: 1 }}
    >
      <div className="ttahub-goal-sankey-widget padding-x-3 padding-bottom-3 margin-top-2" ref={widgetRef}>
        {hasSankeyData ? (
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
  );
}

GoalStatusReasonSankeyWidget.propTypes = {
  loading: PropTypes.bool,
  data: PropTypes.shape({
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
    total: 0,
    sankey: {
      nodes: [],
      links: [],
    },
  },
};

export default GoalStatusReasonSankeyWidget;

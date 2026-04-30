import React, { useMemo, useRef, useState } from 'react';
import './GoalStatusReasonSankeyWidget.scss';
import PropTypes from 'prop-types';
import WidgetContainer from '../components/WidgetContainer';
import NoResultsFound from '../components/NoResultsFound';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetSorting from '../hooks/useWidgetSorting';
import GoalStatusReasonSankey from './GoalStatusReasonSankey';
import HorizontalTableWidget from './HorizontalTableWidget';
import colors from '../colors';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import Drawer from '../components/Drawer';
import ContentFromFeedByTag from '../components/ContentFromFeedByTag';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';

const DEFAULT_SORT_CONFIG = { sortBy: 'Number', direction: 'asc', activePage: 1 };

const TABLE_HEADINGS = ['Number', 'Percentage'];

const REASON_STATUSES = new Set(['Closed', 'Suspended']);

const STATUS_LEGEND_ITEMS = [
  { label: 'Goals', color: colors.ttahubGrayBlue, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--goals' },
  { label: 'Not started', color: colors.ttahubOrangeMedium, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--not-started' },
  { label: 'In progress', color: colors.ttahubSteelBlue, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--in-progress' },
  { label: 'Closed', color: colors.ttahubSankeyGreen, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--closed' },
  { label: 'Suspended', color: colors.ttahubSankeyRed, patternClass: 'ttahub-goal-sankey-widget__legend-swatch--suspended' },
];

/* istanbul ignore next */
const DATASET_PRESETS = [
  { value: 'live', label: 'Live data' },
  { value: 'low', label: 'Low-volume mix' },
  { value: 'amplified', label: 'Amplified mix' },
  { value: 'reason-heavy', label: 'Reason-heavy mix' },
  { value: 'atypical', label: 'Atypical mix' },
];

const normalizeCount = (count, factor, minPositive = 1) => {
  const value = Number(count || 0);
  if (value <= 0) {
    return 0;
  }

  return Math.max(minPositive, Math.round(value * factor));
};

const recalcPercentages = (rows, total) => rows.map((row) => {
  const count = Number(row.count || 0);
  const percentage = total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0;
  return { ...row, percentage };
});

/* istanbul ignore next */
function applyDatasetPreset(baseData, preset) {
  if (!baseData) {
    return baseData;
  }

  if (preset === 'live') {
    return baseData;
  }

  const total = Number(baseData.total || 0);
  const factorsByPreset = {
    low: {
      defaultFactor: 0.2,
      reasonFactor: 0.3,
    },
    amplified: {
      defaultFactor: 1.6,
      reasonFactor: 1.8,
    },
    'reason-heavy': {
      defaultFactor: 1,
      reasonFactor: 2.4,
      statusOverrides: {
        Closed: 1.4,
        Suspended: 1.5,
      },
    },
    // Not Started > Suspended > Closed > In Progress
    atypical: {
      defaultFactor: 1,
      reasonFactor: 1,
      statusOverrides: {
        'Not Started': 4.0,
        'In Progress': 0.1,
        Closed: 1.5,
        Suspended: 3.0,
      },
    },
  };

  const config = factorsByPreset[preset] || factorsByPreset.low;

  const statusRows = (baseData.statusRows || []).map((row) => {
    const statusFactor = config.statusOverrides?.[row.status] || config.defaultFactor;
    return {
      ...row,
      count: normalizeCount(row.count, statusFactor),
    };
  });

  const reasonRows = (baseData.reasonRows || []).map((row) => {
    const statusFactor = config.statusOverrides?.[row.status] || 1;
    return {
      ...row,
      count: normalizeCount(row.count, config.reasonFactor * statusFactor),
    };
  });

  const transformedTotal = normalizeCount(total, config.defaultFactor, total > 0 ? 1 : 0);

  const statusRowsWithPct = recalcPercentages(statusRows, transformedTotal);
  const reasonRowsWithPct = recalcPercentages(reasonRows, transformedTotal);

  const sinkByTarget = new Map();
  statusRowsWithPct.forEach((row) => sinkByTarget.set(`status:${row.status}`, row.count));
  reasonRowsWithPct.forEach((row) => sinkByTarget.set(`reason:${row.status}:${row.reason}`, row.count));

  const transformedSankeyNodes = (baseData.sankey?.nodes || []).map((node) => {
    const derivedCount = sinkByTarget.get(node.id);
    let count;

    if (typeof derivedCount === 'number') {
      count = derivedCount;
    } else if (node.id === 'goals') {
      count = transformedTotal;
    } else {
      count = normalizeCount(node.count, config.defaultFactor);
    }

    return {
      ...node,
      count,
      percentage: transformedTotal > 0 ? Number(((count / transformedTotal) * 100).toFixed(2)) : 0,
    };
  });

  const transformedLinks = (baseData.sankey?.links || []).map((link) => {
    const targetCount = sinkByTarget.get(link.target);
    const fallbackFactor = link.target.startsWith('reason:') ? config.reasonFactor : config.defaultFactor;

    return {
      ...link,
      value: typeof targetCount === 'number'
        ? targetCount
        : normalizeCount(link.value, fallbackFactor),
    };
  });

  // For the reason-heavy preset, pad Closed and Suspended to at least 4 reasons each.
  if (preset === 'reason-heavy') {
    const REASON_TARGET = 4;
    ['Closed', 'Suspended'].forEach((status) => {
      const existing = reasonRowsWithPct.filter((r) => r.status === status);
      const needed = REASON_TARGET - existing.length;
      if (needed <= 0) return;

      const statusCount = sinkByTarget.get(`status:${status}`) || 0;
      const syntheticCount = Math.max(1, Math.round(statusCount / REASON_TARGET));
      const statusLabel = existing[0]?.statusLabel || status;

      for (let i = existing.length + 1; i <= REASON_TARGET; i += 1) {
        const reasonLabel = `Sample reason ${i}`;
        const nodeId = `reason:${status}:${reasonLabel}`;

        reasonRowsWithPct.push({
          status,
          statusLabel,
          reason: reasonLabel,
          count: syntheticCount,
          percentage: transformedTotal > 0
            ? Number(((syntheticCount / transformedTotal) * 100).toFixed(2))
            : 0,
        });
        transformedSankeyNodes.push({
          id: nodeId,
          label: reasonLabel,
          count: syntheticCount,
          percentage: transformedTotal > 0
            ? Number(((syntheticCount / transformedTotal) * 100).toFixed(2))
            : 0,
        });
        transformedLinks.push({
          source: `status:${status}`,
          target: nodeId,
          value: syntheticCount,
        });
      }
    });
  }

  return {
    ...baseData,
    total: transformedTotal,
    statusRows: statusRowsWithPct,
    reasonRows: reasonRowsWithPct,
    sankey: {
      nodes: transformedSankeyNodes,
      links: transformedLinks,
    },
  };
}

function GoalStatusReasonSankeyWidget({ data, loading }) {
  const widgetRef = useRef(null);
  const drawerTriggerRef = useRef(null);
  const capture = useMediaCapture(widgetRef, 'goal-status-suspension-closure-reasons');
  /* istanbul ignore next */
  const [datasetPreset, setDatasetPreset] = useState('live');
  /* istanbul ignore next */
  const activeData = useMemo(
    () => applyDatasetPreset(data, datasetPreset),
    [data, datasetPreset],
  );
  const hasSankeyData = Boolean(
    activeData?.sankey?.nodes?.length && activeData?.sankey?.links?.length,
  );
  const [showTabularData, setShowTabularData] = useState(false);
  const [tabularData, setTabularData] = useState([]);

  const rawTableData = useMemo(() => {
    const statusRows = activeData?.statusRows || [];
    const reasonRows = activeData?.reasonRows || [];
    const total = activeData?.total || 0;

    const statusTableRows = statusRows
      .filter((row) => !REASON_STATUSES.has(row.status) && row.count > 0)
      .map((row, index) => {
        const pct = total > 0 ? ((row.count / total) * 100).toFixed(2) : '0.00';
        return {
          heading: row.label,
          id: `status-${row.status}-${index}`,
          data: [
            {
              value: row.label, title: 'Status', sortKey: 'Status', hidden: true,
            },
            {
              value: row.count, title: 'Number', sortKey: 'Number',
            },
            {
              value: `${pct}%`, title: 'Percentage', sortKey: 'Percentage',
            },
          ],
        };
      });

    const reasonTableRows = reasonRows
      .filter((row) => row.count > 0)
      .map((row, index) => {
        const label = `${row.statusLabel} - ${row.reason}`;
        const pct = total > 0 ? ((row.count / total) * 100).toFixed(2) : '0.00';
        return {
          heading: label,
          id: `reason-${row.status}-${row.reason}-${index}`,
          data: [
            {
              value: label, title: 'Status', sortKey: 'Status', hidden: true,
            },
            {
              value: row.count, title: 'Number', sortKey: 'Number',
            },
            {
              value: `${pct}%`, title: 'Percentage', sortKey: 'Percentage',
            },
          ],
        };
      });

    return [...statusTableRows, ...reasonTableRows].sort((a, b) => {
      const aNumber = Number(a.data.find((cell) => cell.title === 'Number')?.value || 0);
      const bNumber = Number(b.data.find((cell) => cell.title === 'Number')?.value || 0);

      if (aNumber === bNumber) {
        return a.heading.localeCompare(b.heading);
      }

      return aNumber - bNumber;
    });
  }, [activeData?.statusRows, activeData?.reasonRows, activeData?.total]);

  const footerData = useMemo(() => {
    const total = activeData?.total || 0;
    const visibleCountTotal = rawTableData.reduce((sum, row) => {
      const numberCell = row.data.find((cell) => cell.title === 'Number');
      const count = Number(numberCell?.value || 0);
      return sum + count;
    }, 0);
    const footerPct = total > 0 ? ((visibleCountTotal / total) * 100).toFixed(2) : '0.00';

    return ['Total', String(total), `${footerPct}%`];
  }, [activeData?.total, rawTableData]);

  const firstColumnWidth = 'max-content';

  const { requestSort, sortConfig } = useWidgetSorting(
    'goal-dashboard-sankey-table',
    DEFAULT_SORT_CONFIG,
    rawTableData,
    setTabularData,
    ['Status'],
    [],
    [],
  );

  // Seed tabularData whenever the source data changes (useWidgetSorting only
  // updates state on sort actions, not on initialization).
  React.useEffect(() => {
    setTabularData(rawTableData);
  }, [rawTableData]);

  const menuItems = useMemo(() => {
    const items = [{
      label: showTabularData ? 'Display graph' : 'Display table',
      onClick: () => setShowTabularData((v) => !v),
    }];
    if (!showTabularData) {
      items.push({
        label: 'Save screenshot',
        onClick: capture,
        id: 'goal-status-reason-sankey-save-screenshot',
      });
    }
    return items;
  }, [capture, showTabularData]);

  const subtitle = (
    <>
      <WidgetContainerSubtitle customCss="margin-bottom-1 margin-top-0">
        Data reflects standard goals created on or after 09/09/2025.
      </WidgetContainerSubtitle>
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
      >
        <div className="ttahub-goal-sankey-widget padding-x-3 padding-bottom-3 margin-top-2" ref={widgetRef}>
          {/* istanbul ignore next */}
          {hasSankeyData && (
            <fieldset
              className="ttahub-goal-sankey-widget__dataset-radios margin-top-2"
              aria-label="Sankey test datasets"
            >
              <legend className="margin-bottom-1 text-bold">Sankey test datasets</legend>
              <div className="display-flex flex-wrap flex-gap-2">
                {DATASET_PRESETS.map((preset) => (
                  <label
                    className="display-flex flex-align-center"
                    key={preset.value}
                    htmlFor={`goal-sankey-preset-${preset.value}`}
                  >
                    <input
                      checked={datasetPreset === preset.value}
                      className="margin-right-1"
                      id={`goal-sankey-preset-${preset.value}`}
                      name="goal-sankey-dataset-preset"
                      onChange={() => setDatasetPreset(preset.value)}
                      type="radio"
                      value={preset.value}
                    />
                    {preset.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {showTabularData ? (
            <>
              <h3 className="font-serif-md text-bold margin-top-3 margin-bottom-3">
                Number of goals by status and reason
              </h3>
              <HorizontalTableWidget
                headers={TABLE_HEADINGS}
                data={tabularData}
                firstHeading="Status"
                caption="Number of goals by status and reason"
                enableSorting
                sortConfig={sortConfig}
                requestSort={requestSort}
                enableCheckboxes={false}
                checkboxes={{}}
                setCheckboxes={() => {}}
                showTotalColumn={false}
                footerData={footerData}
                hideFirstColumnBorder
                firstColumnMaxWidth={firstColumnWidth}
                fullWidth
                showSpacerColumn
                anchorColumns
              />
            </>
          ) : (
            <>
              {hasSankeyData ? (
                <>
                  <ul className="ttahub-goal-sankey-widget__legend add-list-reset display-flex flex-wrap padding-top-3 padding-bottom-1 padding-x-2 margin-0" aria-label="Goal status legend">
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

                  <GoalStatusReasonSankey sankey={activeData?.sankey} className="ttahub-goal-sankey-widget__plot" />
                </>
              ) : !loading && (
                <NoResultsFound hideFilterHelp />
              )}
            </>
          )}
        </div>
      </WidgetContainer>
    </>
  );
}

GoalStatusReasonSankeyWidget.propTypes = {
  loading: PropTypes.bool,
  data: PropTypes.shape({
    total: PropTypes.number,
    statusRows: PropTypes.arrayOf(PropTypes.shape({
      status: PropTypes.string,
      label: PropTypes.string,
      count: PropTypes.number,
      percentage: PropTypes.number,
    })),
    reasonRows: PropTypes.arrayOf(PropTypes.shape({
      status: PropTypes.string,
      statusLabel: PropTypes.string,
      reason: PropTypes.string,
      count: PropTypes.number,
      percentage: PropTypes.number,
    })),
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
    statusRows: [],
    reasonRows: [],
    sankey: {
      nodes: [],
      links: [],
    },
  },
};

export default GoalStatusReasonSankeyWidget;

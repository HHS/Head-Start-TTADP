import React, { useMemo, useRef, useState } from 'react';
import './GoalStatusReasonSankeyWidget.scss';
import PropTypes from 'prop-types';
import colors from '../colors';
import ContentFromFeedByTag from '../components/ContentFromFeedByTag';
import Drawer from '../components/Drawer';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import NoResultsFound from '../components/NoResultsFound';
import WidgetContainer from '../components/WidgetContainer';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetExport from '../hooks/useWidgetExport';
import useWidgetSorting from '../hooks/useWidgetSorting';
import GoalStatusReasonSankey from './GoalStatusReasonSankey';
import HorizontalTableWidget from './HorizontalTableWidget';

const DEFAULT_SORT_CONFIG = { sortBy: 'Number', direction: 'asc', activePage: 1 };

const EXPORT_NAME = 'goal-status-suspension-closure-reasons';

const TABLE_HEADINGS = ['Number', 'Percentage'];

const REASON_STATUSES = new Set(['Closed', 'Suspended']);

const STATUS_LEGEND_ITEMS = [
  {
    label: 'Goals',
    color: colors.ttahubGrayBlue,
    patternClass: 'ttahub-goal-sankey-widget__legend-swatch--goals',
  },
  {
    label: 'Not started',
    color: colors.ttahubOrangeMedium,
    patternClass: 'ttahub-goal-sankey-widget__legend-swatch--not-started',
  },
  {
    label: 'In progress',
    color: colors.ttahubSteelBlue,
    patternClass: 'ttahub-goal-sankey-widget__legend-swatch--in-progress',
  },
  {
    label: 'Closed',
    color: colors.ttahubTeal,
    patternClass: 'ttahub-goal-sankey-widget__legend-swatch--closed',
  },
  {
    label: 'Suspended',
    color: colors.ttahubMagentaMedium,
    patternClass: 'ttahub-goal-sankey-widget__legend-swatch--suspended',
  },
];

function GoalStatusReasonSankeyWidget({ data, loading }) {
  const widgetRef = useRef(null);
  const drawerTriggerRef = useRef(null);
  const capture = useMediaCapture(widgetRef, EXPORT_NAME);
  const hasSankeyData = Boolean(data?.sankey?.nodes?.length && data?.sankey?.links?.length);
  const dataStartDateDisplay = data?.dataStartDateDisplay;
  const [showTabularData, setShowTabularData] = useState(false);
  const [tabularData, setTabularData] = useState([]);

  const rawTableData = useMemo(() => {
    const statusRows = data?.statusRows || [];
    const reasonRows = data?.reasonRows || [];
    const total = data?.total || 0;

    const statusTableRows = statusRows
      .filter((row) => !REASON_STATUSES.has(row.status) && row.count > 0)
      .map((row, index) => {
        const pct = total > 0 ? ((row.count / total) * 100).toFixed(2) : '0.00';
        return {
          heading: row.label,
          id: `status-${row.status}-${index}`,
          data: [
            {
              value: row.label,
              title: 'Status',
              sortKey: 'Status',
              hidden: true,
            },
            {
              value: row.count,
              title: 'Number',
              sortKey: 'Number',
            },
            {
              value: `${pct}%`,
              title: 'Percentage',
              sortKey: 'Percentage',
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
              value: label,
              title: 'Status',
              sortKey: 'Status',
              hidden: true,
            },
            {
              value: row.count,
              title: 'Number',
              sortKey: 'Number',
            },
            {
              value: `${pct}%`,
              title: 'Percentage',
              sortKey: 'Percentage',
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
  }, [data?.statusRows, data?.reasonRows, data?.total]);

  const footerData = useMemo(() => {
    const total = data?.total || 0;
    const visibleCountTotal = rawTableData.reduce((sum, row) => {
      const numberCell = row.data.find((cell) => cell.title === 'Number');
      const count = Number(numberCell?.value || 0);
      return sum + count;
    }, 0);
    const footerPct = total > 0 ? ((visibleCountTotal / total) * 100).toFixed(2) : '0.00';

    return ['Total', String(total), `${footerPct}%`];
  }, [data?.total, rawTableData]);

  const exportRowsForTable = useMemo(() => {
    const rows = tabularData.map((row) => ({
      ...row,
      data: (row.data || []).filter((cell) => !cell.hidden),
    }));

    const [footerHeading, footerNumber, footerPercentage] = footerData;
    rows.push({
      heading: footerHeading,
      id: 'goal-status-reason-sankey-total-row',
      data: [
        { title: 'Number', value: footerNumber },
        { title: 'Percentage', value: footerPercentage },
      ],
    });

    return rows;
  }, [footerData, tabularData]);

  const { exportRows } = useWidgetExport(
    exportRowsForTable,
    TABLE_HEADINGS,
    {},
    'Status',
    EXPORT_NAME
  );

  const firstColumnWidth = 'max-content';

  const { requestSort, sortConfig } = useWidgetSorting(
    'goal-dashboard-sankey-table',
    DEFAULT_SORT_CONFIG,
    rawTableData,
    setTabularData,
    ['Status'],
    [],
    []
  );

  // Seed tabularData whenever the source data changes (useWidgetSorting only
  // updates state on sort actions, not on initialization).
  React.useEffect(() => {
    setTabularData(rawTableData);
  }, [rawTableData]);

  const menuItems = useMemo(() => {
    const items = [];

    if (showTabularData) {
      items.push({
        label: 'Display graph',
        onClick: () => setShowTabularData(false),
        id: 'goal-status-reason-sankey-display-graph',
      });
      items.push({
        label: 'Export table',
        onClick: () => exportRows('all'),
        id: 'goal-status-reason-sankey-export-table',
      });
      return items;
    }

    items.push({
      label: 'Display table',
      onClick: () => setShowTabularData((v) => !v),
    });

    if (!showTabularData) {
      items.push({
        label: 'Save screenshot',
        onClick: capture,
        id: 'goal-status-reason-sankey-save-screenshot',
      });
    }
    return items;
  }, [capture, exportRows, showTabularData]);

  const subtitle = (
    <>
      {dataStartDateDisplay && (
        <WidgetContainerSubtitle customCss="margin-bottom-1 margin-top-0">
          {`Data reflects standard goals created on or after ${dataStartDateDisplay}.`}
        </WidgetContainerSubtitle>
      )}
      <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>About this data</DrawerTriggerButton>
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
        <div
          className="ttahub-goal-sankey-widget padding-x-3 padding-bottom-3 margin-top-2"
          ref={widgetRef}
        >
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
                  <ul
                    className="ttahub-goal-sankey-widget__legend add-list-reset display-flex flex-wrap padding-top-3 padding-bottom-1 padding-x-2 margin-0"
                    aria-label="Goal status legend"
                  >
                    {STATUS_LEGEND_ITEMS.map(({ label, color, patternClass }) => (
                      <li
                        className="ttahub-goal-sankey-widget__legend-item display-inline-flex flex-align-center"
                        key={label}
                      >
                        <span
                          aria-hidden="true"
                          className={`ttahub-goal-sankey-widget__legend-swatch ${patternClass} display-inline-block`}
                          style={{ backgroundColor: color }}
                        />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>

                  <GoalStatusReasonSankey
                    sankey={data?.sankey}
                    className="ttahub-goal-sankey-widget__plot"
                  />
                </>
              ) : (
                !loading && <NoResultsFound hideFilterHelp />
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
    dataStartDate: PropTypes.string,
    dataStartDateDisplay: PropTypes.string,
    total: PropTypes.number,
    statusRows: PropTypes.arrayOf(
      PropTypes.shape({
        status: PropTypes.string,
        label: PropTypes.string,
        count: PropTypes.number,
        percentage: PropTypes.number,
      })
    ),
    reasonRows: PropTypes.arrayOf(
      PropTypes.shape({
        status: PropTypes.string,
        statusLabel: PropTypes.string,
        reason: PropTypes.string,
        count: PropTypes.number,
        percentage: PropTypes.number,
      })
    ),
    sankey: PropTypes.shape({
      nodes: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string,
          label: PropTypes.string,
          count: PropTypes.number,
          percentage: PropTypes.number,
        })
      ),
      links: PropTypes.arrayOf(
        PropTypes.shape({
          source: PropTypes.string,
          target: PropTypes.string,
          value: PropTypes.number,
        })
      ),
    }),
  }),
};

GoalStatusReasonSankeyWidget.defaultProps = {
  loading: false,
  data: {
    dataStartDate: '',
    dataStartDateDisplay: '',
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

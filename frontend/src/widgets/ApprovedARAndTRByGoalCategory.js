import { Checkbox, Dropdown, Label } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ContentFromFeedByTag from '../components/ContentFromFeedByTag';
import Drawer from '../components/Drawer';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import NoResultsFound from '../components/NoResultsFound';
import WidgetContainer from '../components/WidgetContainer';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetExport from '../hooks/useWidgetExport';
import useWidgetSorting from '../hooks/useWidgetSorting';
import HorizontalTableWidget from './HorizontalTableWidget';
import withWidgetData from './withWidgetData';
import {
  buildPlotlyBottomAxisLayout,
  buildPlotlyChartLayout,
  buildPlotlyTraces,
  buildTabularData,
  computeChartDimensions,
  FIRST_COLUMN,
  LEFT_MARGIN,
  SORT_OPTIONS,
  sortDataForChart,
  TABLE_HEADINGS,
  WIDGET_HEADINGS,
} from './approvedARAndTRByGoalCategoryHelpers';
import './ApprovedARAndTRByGoalCategory.css';

const WIDGET_TITLE = 'Approved Activity Reports and Training Session Reports by goal category';
const EXPORT_NAME = 'Approved ARs and TRs by Goal Category';
const DRAWER_TAG = 'ttahub-approved-ar-and-tr-by-goal-category';
const DEFAULT_SORT_CONFIG = { sortBy: 'Total', direction: 'desc', activePage: 1 };

export function ApprovedARAndTRByGoalCategory({ data, loading }) {
  const widgetRef = useRef(null);
  const drawerTriggerRef = useRef(null);
  const parentRef = useRef(null);
  const chartRef = useRef(null);
  const bottomAxisRef = useRef(null);
  const plotlyRef = useRef(null);
  const capture = useMediaCapture(widgetRef, EXPORT_NAME);

  const [showTabularData, setShowTabularData] = useState(false);
  const [sortOption, setSortOption] = useState('total-desc');
  const [showAR, setShowAR] = useState(true);
  const [showTR, setShowTR] = useState(true);
  const [width, setWidth] = useState(850);
  const [tabularData, setTabularData] = useState([]);

  const { requestSort: widgetRequestSort, sortConfig, setSortConfig } = useWidgetSorting(
    'approved-ar-tr-by-goal-category',
    DEFAULT_SORT_CONFIG,
    tabularData,
    setTabularData,
    [],
    [],
    [],
  );

  // Returns the numeric value of a data cell by its sortKey.
  const getCellValue = useCallback((row, sortKey) => {
    const cell = row.data.find((d) => d.sortKey === sortKey);
    return cell ? Number(cell.value) : 0;
  }, []);

  // Goal category is the row heading, not a data item, so handle its sort separately.
  // Numeric columns get a secondary A-Z tiebreaker to match the graph sort order.
  const requestSort = useCallback(
    (sortBy) => {
      if (sortBy === 'Goal_category') {
        const direction =
          sortConfig.sortBy === 'Goal_category' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        const sorted = [...tabularData].sort((a, b) => {
          const cmp = a.heading.toLowerCase().localeCompare(b.heading.toLowerCase());
          return direction === 'asc' ? cmp : -cmp;
        });
        setTabularData(sorted);
        setSortConfig({ sortBy: 'Goal_category', direction, activePage: 1 });
        return;
      }
      if (['Total', 'Number_of_Activity_Reports', 'Number_of_Training_Report_Sessions'].includes(sortBy)) {
        const direction =
          sortConfig.sortBy === sortBy && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        const sorted = [...tabularData].sort((a, b) => {
          const primaryCmp =
            direction === 'desc'
              ? getCellValue(b, sortBy) - getCellValue(a, sortBy)
              : getCellValue(a, sortBy) - getCellValue(b, sortBy);
          return primaryCmp || a.heading.toLowerCase().localeCompare(b.heading.toLowerCase());
        });
        setTabularData(sorted);
        setSortConfig({ sortBy, direction, activePage: 1 });
        return;
      }
      widgetRequestSort(sortBy);
    },
    [sortConfig, tabularData, setSortConfig, widgetRequestSort, getCellValue],
  );

  useLayoutEffect(() => {
    function updateSize() {
      if (parentRef.current) {
        setWidth(parentRef.current.offsetWidth - 24);
      }
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const sortedDataForChart = useMemo(
    () => sortDataForChart(data, sortOption),
    [data, sortOption],
  );

  useEffect(() => {
    const built = buildTabularData(data);
    // Pre-sort by total desc + A-Z to match DEFAULT_SORT_CONFIG and the graph's default order.
    built.sort((a, b) => {
      const getTotal = (row) => {
        const cell = row.data.find((d) => d.sortKey === 'Total');
        return cell ? Number(cell.value) : 0;
      };
      return (getTotal(b) - getTotal(a)) || a.heading.toLowerCase().localeCompare(b.heading.toLowerCase());
    });
    setTabularData(built);
  }, [data]);

  const { exportRows } = useWidgetExport(
    tabularData,
    TABLE_HEADINGS,
    {},
    FIRST_COLUMN,
    EXPORT_NAME,
  );

  const menuItems = useMemo(() => {
    const items = [
      {
        label: showTabularData ? 'Display graph' : 'Display table',
        onClick: () => setShowTabularData((prev) => !prev),
      },
    ];
    if (!showTabularData) {
      items.push({ label: 'Save screenshot', onClick: capture });
    }
    if (showTabularData) {
      items.push({ label: 'Export table', onClick: () => exportRows('all') });
    }
    return items;
  }, [showTabularData, capture, exportRows]);

  useEffect(() => {
    if (showTabularData || !data || data.length === 0) return undefined;

    let cancelled = false;
    const traces = buildPlotlyTraces(sortedDataForChart, showAR, showTR);
    const { height, xRangeMax } = computeChartDimensions(sortedDataForChart, showAR, showTR);
    const layout = buildPlotlyChartLayout(xRangeMax, width, height);
    const bottomAxisLayout = buildPlotlyBottomAxisLayout(xRangeMax, width);

    import('plotly.js-basic-dist').then((Plotly) => {
      if (cancelled) return;
      plotlyRef.current = Plotly;
      if (chartRef.current) {
        Plotly.react(chartRef.current, traces, layout, { displayModeBar: false });
      }
      if (bottomAxisRef.current) {
        Plotly.react(bottomAxisRef.current, [{ mode: 'bar' }], bottomAxisLayout, {
          displayModeBar: false,
          responsive: true,
        });
      }
    });

    return () => { cancelled = true; };
  }, [data, sortedDataForChart, showAR, showTR, width, showTabularData]);

  useEffect(() => () => {
    if (plotlyRef.current) {
      if (chartRef.current) plotlyRef.current.purge(chartRef.current);
      if (bottomAxisRef.current) plotlyRef.current.purge(bottomAxisRef.current);
    }
  }, []);

  const subtitle = (
    <div>
      <WidgetContainerSubtitle marginY={0}>
        Data reflects activity starting on 09/01/2025.
      </WidgetContainerSubtitle>
      <div className="margin-top-1">
        <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
          About this data
        </DrawerTriggerButton>
      </div>
      {!showTabularData && (
        <div
          className="display-flex flex-align-center margin-top-2"
          data-testid="goal-category-sort-container"
        >
          <Label
            htmlFor="goal-category-sort"
            className="margin-y-0 margin-right-1 text-no-wrap"
          >
            Sort by
          </Label>
          <Dropdown
            id="goal-category-sort"
            name="goal-category-sort"
            onChange={(e) => setSortOption(e.target.value)}
            value={sortOption}
            className="margin-top-0 width-auto"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Dropdown>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Drawer triggerRef={drawerTriggerRef} title={WIDGET_TITLE}>
        <ContentFromFeedByTag tagName={DRAWER_TAG} />
      </Drawer>
      <WidgetContainer
        title={WIDGET_TITLE}
        subtitle={subtitle}
        loading={loading}
        loadingLabel="Approved ARs and TRs by goal category loading"
        menuItems={menuItems}
        showHeaderBorder
        titleGroupClassNames="padding-3 position-relative"
      >
        <div>
          {showTabularData ? (
            <div className="approved-ar-tr-goal-category-table">
              <HorizontalTableWidget
                headers={WIDGET_HEADINGS}
                data={tabularData}
                caption={WIDGET_TITLE}
                firstHeading={FIRST_COLUMN}
                enableSorting
                sortConfig={sortConfig}
                requestSort={requestSort}
                footerData={false}
                hideFirstColumnBorder
                stickyLastColumn={false}
                firstColumnMaxWidth="max-content"
                showSpacerColumn
                anchorColumns
              />
            </div>
          ) : (
            <div className="padding-3" ref={widgetRef}>
              {(!data || data.every((d) => d.total === 0)) && !loading ? (
                <NoResultsFound />
              ) : (
                <>
                  <div className="display-flex flex-row flex-wrap margin-bottom-2 margin-top-0 flex-gap-1" style={{ paddingLeft: `min(${LEFT_MARGIN}px, calc(100% - 290px))`, rowGap: '0.5rem' }} data-testid="graph-checkboxes">
                    <Checkbox
                      id="show-ar"
                      name="show-ar"
                      label="Activity Reports"
                      checked={showAR}
                      onChange={(e) => setShowAR(e.target.checked)}
                      className="margin-right-3"
                    />
                    <Checkbox
                      id="show-tr"
                      name="show-tr"
                      label="Training Sessions"
                      checked={showTR}
                      onChange={(e) => setShowTR(e.target.checked)}
                    />
                  </div>
                  <div ref={parentRef}>
                    <div
                      // biome-ignore lint/a11y/noNoninteractiveTabindex: requires focusable
                      tabIndex={0}
                      ref={chartRef}
                    >
                      <span className="usa-sr-only">
                        Use the arrow keys to scroll graph
                      </span>
                    </div>
                  </div>
                  <div className="height-card-sm width-full" ref={bottomAxisRef} />
                </>
              )}
            </div>
          )}
        </div>
      </WidgetContainer>
    </>
  );
}

ApprovedARAndTRByGoalCategory.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string,
      activityReportCount: PropTypes.number,
      sessionReportCount: PropTypes.number,
      total: PropTypes.number,
    }),
  ),
  loading: PropTypes.bool.isRequired,
};

ApprovedARAndTRByGoalCategory.defaultProps = {
  data: [],
};

export default withWidgetData(
  ApprovedARAndTRByGoalCategory,
  'approvedARAndTRByGoalCategory',
);

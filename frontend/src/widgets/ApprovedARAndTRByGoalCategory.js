import { Checkbox, Dropdown, Label } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ContentFromFeedByTag from '../components/ContentFromFeedByTag';
import Drawer from '../components/Drawer';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import NoResultsFound from '../components/NoResultsFound';
import WidgetContainer from '../components/WidgetContainer';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import colors from '../colors';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetExport from '../hooks/useWidgetExport';
import HorizontalTableWidget from './HorizontalTableWidget';
import withWidgetData from './withWidgetData';
import './BarGraph.css';

const WIDGET_TITLE =
  'Approved Activity Reports and Training Session Reports by goal category';
const EXPORT_NAME = 'Approved ARs and TRs by Goal Category';
const DRAWER_TAG = 'ttahub-approved-ar-and-tr-by-goal-category';
const AR_COLOR = colors.ttahubBlue; // #264a64
const TR_COLOR = colors.ttahubMediumBlue; // #336A90

const SORT_OPTIONS = [
  { value: 'total-desc', label: 'Total (high to low)' },
  { value: 'total-asc', label: 'Total (low to high)' },
  { value: 'category-asc', label: 'Goal Category (A-Z)' },
  { value: 'category-desc', label: 'Goal Category (Z-A)' },
];

const TABLE_HEADINGS = ['Activity Reports', 'Training Sessions', 'Total'];
const FIRST_COLUMN = 'Goal category';
const LEFT_MARGIN = 200;

export function ApprovedARAndTRByGoalCategory({ data, loading }) {
  // TEMP: mock data to verify AR vs TR colors
  const mockData = [
    { category: 'School Readiness', activityReportCount: 12, sessionReportCount: 5, total: 17 },
    { category: 'Equity', activityReportCount: 8, sessionReportCount: 3, total: 11 },
    { category: 'Health', activityReportCount: 6, sessionReportCount: 9, total: 15 },
    { category: 'Family Engagement', activityReportCount: 4, sessionReportCount: 7, total: 11 },
  ];
  const [useMockData, setUseMockData] = useState(false);
  const effectiveData = useMockData ? mockData : data;
  const widgetRef = useRef(null);
  const drawerTriggerRef = useRef(null);
  const parentRef = useRef(null);
  const chartRef = useRef(null);
  const bottomAxisRef = useRef(null);
  const capture = useMediaCapture(widgetRef, EXPORT_NAME);

  const [showTabularData, setShowTabularData] = useState(false);
  const [sortOption, setSortOption] = useState('total-desc');
  const [showAR, setShowAR] = useState(true);
  const [showTR, setShowTR] = useState(true);
  const [checkboxes, setCheckboxes] = useState({});
  const [width, setWidth] = useState(850);

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

  // Sort data for chart display.
  // In Plotly horizontal bar charts the y-axis renders bottom-to-top,
  // so to show the "first" item (e.g. highest total) at the TOP, we put
  // it at the END of the array.
  const sortedDataForChart = useMemo(() => {
    if (!effectiveData || !Array.isArray(effectiveData)) return [];
    const sorted = [...effectiveData];
    switch (sortOption) {
      case 'total-desc':
        sorted.sort((a, b) => a.total - b.total); // lowest first → highest at top
        break;
      case 'total-asc':
        sorted.sort((a, b) => b.total - a.total); // highest first → lowest at top
        break;
      case 'category-asc':
        sorted.sort((a, b) => b.category.localeCompare(a.category)); // Z first → A at top
        break;
      case 'category-desc':
        sorted.sort((a, b) => a.category.localeCompare(b.category)); // A first → Z at top
        break;
      default:
        sorted.sort((a, b) => a.total - b.total);
    }
    return sorted;
  }, [effectiveData, sortOption]);

  // Sort data for the table view (matches visual reading order).
  const sortedDataForTable = useMemo(() => {
    if (!effectiveData || !Array.isArray(effectiveData)) return [];
    const sorted = [...effectiveData];
    switch (sortOption) {
      case 'total-desc':
        sorted.sort((a, b) => b.total - a.total);
        break;
      case 'total-asc':
        sorted.sort((a, b) => a.total - b.total);
        break;
      case 'category-asc':
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'category-desc':
        sorted.sort((a, b) => b.category.localeCompare(a.category));
        break;
      default:
        sorted.sort((a, b) => b.total - a.total);
    }
    return sorted;
  }, [effectiveData, sortOption]);

  const tabularData = useMemo(
    () =>
      sortedDataForTable.map((row, index) => ({
        heading: row.category,
        id: `${row.category.replace(/\s+/g, '-').toLowerCase()}-${index}`,
        data: [
          {
            value: row.activityReportCount,
            title: 'Activity Reports',
            sortKey: 'activity_reports',
          },
          {
            value: row.sessionReportCount,
            title: 'Training Sessions',
            sortKey: 'training_sessions',
          },
          {
            value: row.total,
            title: 'Total',
            sortKey: 'total',
          },
        ],
      })),
    [sortedDataForTable],
  );

  const { exportRows } = useWidgetExport(
    tabularData,
    TABLE_HEADINGS,
    checkboxes,
    FIRST_COLUMN,
    EXPORT_NAME,
  );

  const menuItems = useMemo(() => {
    const items = [
      {
        label: showTabularData ? 'Display graph' : 'View table',
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
    if (showTabularData || !effectiveData || effectiveData.length === 0) return;

    const currentCategories = sortedDataForChart.map((d) => d.category);
    const currentTraces = [];
    if (showTR) {
      currentTraces.push({
        type: 'bar',
        orientation: 'h',
        name: 'Training Sessions',
        x: sortedDataForChart.map((d) => d.sessionReportCount),
        y: currentCategories,
        marker: { color: TR_COLOR },
        hovertemplate: '%{x}<extra></extra>',
      });
    }
    if (showAR) {
      currentTraces.push({
        type: 'bar',
        orientation: 'h',
        name: 'Activity Reports',
        x: sortedDataForChart.map((d) => d.activityReportCount),
        y: currentCategories,
        marker: { color: AR_COLOR },
        hovertemplate: '%{x}<extra></extra>',
      });
    }

    const currentSeriesCount = (showAR ? 1 : 0) + (showTR ? 1 : 0);
    const currentHeight = currentCategories.length * (currentSeriesCount * 24 + 20) + 40;
    const currentMaxCount = sortedDataForChart.reduce(
      (acc, d) =>
        Math.max(acc, showAR ? d.activityReportCount : 0, showTR ? d.sessionReportCount : 0),
      1,
    );
    const currentXRangeMax = currentMaxCount + Math.ceil(currentMaxCount * 0.1) + 1;

    const currentLayout = {
      barmode: 'group',
      bargap: 0.5,
      bargroupgap: 0.2,
      height: currentHeight,
      width,
      hoverlabel: { bgcolor: '#000', bordercolor: '#000', font: { color: '#fff', size: 16 } },
      font: { color: colors.textInk },
      margin: { l: LEFT_MARGIN, r: 20, t: 10, b: 0 },
      xaxis: { range: [0, currentXRangeMax] },
      yaxis: {
        zeroline: false,
        ticklen: 4,
        tickwidth: 1,
        tickcolor: 'transparent',
        title: { text: 'Goal category', standoff: 20 },
      },
      showlegend: false,
    };

    const currentBottomAxisLayout = {
      width,
      height: 80,
      margin: { l: LEFT_MARGIN, t: 0, r: 20, b: 40 },
      yaxis: { tickmode: 'array', tickvals: [] },
      xaxis: {
        range: [0, currentXRangeMax],
        title: { text: 'Number of approved reports' },
      },
    };

    import('plotly.js-basic-dist').then((Plotly) => {
      if (chartRef.current) {
        Plotly.newPlot(chartRef.current, currentTraces, currentLayout, { displayModeBar: false });
      }
      if (bottomAxisRef.current) {
        Plotly.newPlot(bottomAxisRef.current, [{ mode: 'bar' }], currentBottomAxisLayout, {
          displayModeBar: false,
          responsive: true,
        });
      }
    });
  }, [effectiveData, sortedDataForChart, showAR, showTR, width, showTabularData]);

  const subtitle = (
    <>
      <WidgetContainerSubtitle>
        Data reflects activity starting on 09/01/2025.
      </WidgetContainerSubtitle>
      <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef} customClass="margin-left-1 margin-bottom-2">
        About this data
      </DrawerTriggerButton>
      <div
        className="display-flex flex-align-center"
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
          className="margin-top-0"
          style={{ width: 'auto' }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Dropdown>
      </div>
    </>
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
        <div className="padding-3">
          {showTabularData ? (
            <HorizontalTableWidget
              headers={TABLE_HEADINGS}
              data={tabularData}
              caption={WIDGET_TITLE}
              firstHeading={FIRST_COLUMN}
              enableSorting={false}
              enableCheckboxes
              checkboxes={checkboxes}
              setCheckboxes={setCheckboxes}
              showTotalColumn={false}
              footerData={false}
              requestSort={() => {}}
              sortConfig={{ sortBy: '', direction: '', activePage: 1 }}
              selectAllIdPrefix="approved-ar-tr-goal-category"
            />
          ) : (
            <div ref={widgetRef}>
              {(!effectiveData || effectiveData.length === 0) && !loading ? (
                <NoResultsFound />
              ) : (
                <>
                  <div className="display-flex flex-row margin-bottom-2" style={{ paddingLeft: LEFT_MARGIN }} data-testid="graph-checkboxes">
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
                  <div className="display-flex flex-row margin-bottom-2" style={{ paddingLeft: LEFT_MARGIN }}>
                    <Checkbox
                      id="use-mock-data"
                      name="use-mock-data"
                      label="Use mock data (dev)"
                      checked={useMockData}
                      onChange={(e) => setUseMockData(e.target.checked)}
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

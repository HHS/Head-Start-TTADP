import { Checkbox, Dropdown, Label } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ContentFromFeedByTag from '../components/ContentFromFeedByTag';
import Drawer from '../components/Drawer';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import NoResultsFound from '../components/NoResultsFound';
import WidgetContainer from '../components/WidgetContainer';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetExport from '../hooks/useWidgetExport';
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
  sortTabularData,
  TABLE_HEADINGS,
  WIDGET_HEADINGS,
} from './approvedARAndTRByGoalCategoryHelpers';
import './ApprovedARAndTRByGoalCategory.css';

const WIDGET_TITLE = 'Approved Activity Reports and Training Session Reports by goal category';
const EXPORT_NAME = 'Approved ARs and TRs by Goal Category';
const DRAWER_TAG = 'ttahub-reports-by-goalcategory';

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

  // Tabular data is derived from the raw data + the shared sortOption so both views stay in sync.
  const tabularData = useMemo(
    () => sortTabularData(buildTabularData(data), sortOption),
    [data, sortOption],
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
    </div>
  );

  return (
    <>
      <Drawer triggerRef={drawerTriggerRef} title={WIDGET_TITLE}>
        <ContentFromFeedByTag tagName={DRAWER_TAG} hideEmptyParagraphs />
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
                sortConfig={{ sortBy: '', direction: '' }}
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
                <NoResultsFound hideFilterHelp />
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

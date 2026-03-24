/* global globalThis */

import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { arrayExistsAndHasLength, EMPTY_ARRAY, NOOP } from '../Constants';
import FiltersNotApplicable from '../components/FiltersNotApplicable';
import WidgetContainer from '../components/WidgetContainer';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetExport from '../hooks/useWidgetExport';
import useWidgetMenuItems from '../hooks/useWidgetMenuItems';
import {
  APPROVAL_RATE_BY_DEADLINE_EXPORT_NAME,
  APPROVAL_RATE_BY_DEADLINE_FIRST_COLUMN,
  APPROVAL_RATE_BY_DEADLINE_LEGEND_CONFIG,
  APPROVAL_RATE_BY_DEADLINE_TABLE_CAPTION,
  APPROVAL_RATE_BY_DEADLINE_TRACE_IDS,
} from './constants';
import HorizontalTableWidget from './HorizontalTableWidget';
import LineGraph from './LineGraph';
import withWidgetData from './withWidgetData';
import './ApprovalRateByDeadlineWidget.css';

function ApprovalRateSubtitle({ showFilterWarning }) {
  return (
    <div className="approval-rate-subtitle margin-bottom-3">
      <div className="display-flex flex-wrap flex-align-center">
        <WidgetContainerSubtitle marginY={0}>
          Percentage of activity reports approved by the expected deadline.
        </WidgetContainerSubtitle>
        {showFilterWarning && <FiltersNotApplicable showLeadingDash={false} />}
      </div>
    </div>
  );
}

function ApprovalRateCarousel({
  activeRegionId,
  announcement,
  carouselFrameRef,
  hasMultipleRegions,
  hasPreviousRegion,
  hasNextRegion,
  isAnimating,
  lockedFrameHeight,
  goToPreviousRegion,
  goToNextRegion,
  transition,
  regions,
  getTraceDataForRegion,
  renderLineGraph,
  traceData,
  activeRegionIndex,
  handleRegionChange,
  onDotRef,
}) {
  return (
    <div>
      <h3 className="text-center text-bold font-sans-md margin-0 margin-top-2 margin-bottom-1">
        {activeRegionId ? `Region ${activeRegionId}` : 'Region'}
      </h3>
      <span className="usa-sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      {hasMultipleRegions && (
        <p className="usa-sr-only">
          Click left side of the chart for previous region, right side for next region.
        </p>
      )}
      <div className="approval-rate-carousel-shell position-relative">
        <div
          ref={carouselFrameRef}
          className={[
            'approval-rate-carousel-frame',
            'position-relative',
            'overflow-hidden',
            isAnimating ? 'is-animating' : '',
          ].join(' ')}
          style={lockedFrameHeight ? { minHeight: `${lockedFrameHeight}px` } : undefined}
        >
          {hasMultipleRegions && (
            <button
              type="button"
              className={[
                'approval-rate-carousel-nav',
                'approval-rate-carousel-nav--prev',
                hasPreviousRegion ? '' : 'is-hidden',
              ].join(' ')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={goToPreviousRegion}
              aria-label="Previous region"
              tabIndex={hasPreviousRegion ? 0 : -1}
            >
              <span
                className="approval-rate-carousel-nav-icon approval-rate-carousel-nav-icon--left"
                aria-hidden="true"
              />
            </button>
          )}
          {transition ? (
            <>
              <div
                className={`approval-rate-carousel-slide approval-rate-carousel-slide--outgoing approval-rate-carousel-slide--${transition.direction}`}
              >
                {renderLineGraph(
                  getTraceDataForRegion(regions[transition.from]),
                  `approval-rate-outgoing-${transition.from}`
                )}
              </div>
              <div
                className={`approval-rate-carousel-slide approval-rate-carousel-slide--incoming approval-rate-carousel-slide--${transition.direction}`}
              >
                {renderLineGraph(
                  getTraceDataForRegion(regions[transition.to]),
                  `approval-rate-incoming-${transition.to}`
                )}
              </div>
            </>
          ) : (
            <div className="approval-rate-carousel-slide approval-rate-carousel-slide--current">
              {renderLineGraph(traceData, `approval-rate-region-${activeRegionId}`)}
            </div>
          )}
          {hasMultipleRegions && (
            <button
              type="button"
              className={[
                'approval-rate-carousel-nav',
                'approval-rate-carousel-nav--next',
                hasNextRegion ? '' : 'is-hidden',
              ].join(' ')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={goToNextRegion}
              aria-label="Next region"
              tabIndex={hasNextRegion ? 0 : -1}
            >
              <span
                className="approval-rate-carousel-nav-icon approval-rate-carousel-nav-icon--right"
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </div>
      {hasMultipleRegions && (
        <div className="display-flex flex-justify-center flex-gap-1 margin-top-1">
          {regions.map((regionId, index) => (
            <button
              key={`approval-rate-dot-${regionId}`}
              type="button"
              ref={(element) => onDotRef(index, element)}
              className={[
                'approval-rate-carousel-dot',
                index === activeRegionIndex ? 'text-ink' : 'text-base-lightest',
              ].join(' ')}
              onClick={() => handleRegionChange(index, 'dot')}
              aria-label={`Show Region ${regionId}`}
              aria-current={index === activeRegionIndex ? 'true' : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

ApprovalRateSubtitle.propTypes = {
  showFilterWarning: PropTypes.bool.isRequired,
};

ApprovalRateCarousel.propTypes = {
  activeRegionId: PropTypes.number,
  announcement: PropTypes.string.isRequired,
  carouselFrameRef: PropTypes.shape({
    current: PropTypes.oneOfType([PropTypes.object, PropTypes.oneOf([null])]),
  }).isRequired,
  hasMultipleRegions: PropTypes.bool.isRequired,
  hasPreviousRegion: PropTypes.bool.isRequired,
  hasNextRegion: PropTypes.bool.isRequired,
  isAnimating: PropTypes.bool.isRequired,
  lockedFrameHeight: PropTypes.number,
  goToPreviousRegion: PropTypes.func.isRequired,
  goToNextRegion: PropTypes.func.isRequired,
  transition: PropTypes.shape({
    from: PropTypes.number.isRequired,
    to: PropTypes.number.isRequired,
    direction: PropTypes.oneOf(['next', 'prev']).isRequired,
  }),
  regions: PropTypes.arrayOf(PropTypes.number).isRequired,
  getTraceDataForRegion: PropTypes.func.isRequired,
  renderLineGraph: PropTypes.func.isRequired,
  traceData: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      x: PropTypes.arrayOf(PropTypes.string),
      y: PropTypes.arrayOf(PropTypes.number),
      trace: PropTypes.string,
      id: PropTypes.string,
    })
  ).isRequired,
  activeRegionIndex: PropTypes.number.isRequired,
  handleRegionChange: PropTypes.func.isRequired,
  onDotRef: PropTypes.func.isRequired,
};

ApprovalRateCarousel.defaultProps = {
  activeRegionId: null,
  lockedFrameHeight: null,
  transition: null,
};

export function ApprovalRateByDeadlineWidget({ data, loading, showFiltersNotApplicable }) {
  const widgetRef = useRef(null);
  const carouselFrameRef = useRef(null);
  const dotButtonRefs = useRef([]);
  const shouldFocusActiveDotRef = useRef(false);
  const [showTabularData, setShowTabularData] = useState(false);
  const [checkboxes, setCheckboxes] = useState({});
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);
  const [transition, setTransition] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lockedFrameHeight, setLockedFrameHeight] = useState(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (typeof globalThis === 'undefined' || typeof globalThis.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mediaQuery) {
      return undefined;
    }

    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();

    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  const widgetData = useMemo(() => data || { regions: EMPTY_ARRAY, records: EMPTY_ARRAY }, [data]);

  useEffect(() => {
    if (!widgetData || !arrayExistsAndHasLength(widgetData.regions)) {
      return;
    }

    const defaultIndex = widgetData.regions.indexOf(1);
    setActiveRegionIndex(Math.max(defaultIndex, 0));
  }, [widgetData]);

  useEffect(() => {
    if (!transition) {
      return undefined;
    }

    const animationTimer = setTimeout(() => {
      setIsAnimating(true);
    }, 0);

    const cleanupTimer = setTimeout(() => {
      setTransition(null);
      setIsAnimating(false);
    }, 320);

    return () => {
      clearTimeout(animationTimer);
      clearTimeout(cleanupTimer);
    };
  }, [transition]);

  useEffect(() => {
    if (!shouldFocusActiveDotRef.current) {
      return;
    }
    const activeDot = dotButtonRefs.current[activeRegionIndex];
    if (activeDot && typeof activeDot.focus === 'function') {
      activeDot.focus();
    }
    shouldFocusActiveDotRef.current = false;
  }, [activeRegionIndex]);

  const regions = useMemo(
    () => (widgetData && Array.isArray(widgetData.regions) ? widgetData.regions : []),
    [widgetData]
  );

  const activeRegionId = regions[activeRegionIndex];
  const screenshotTitle = Number.isInteger(activeRegionId)
    ? `${APPROVAL_RATE_BY_DEADLINE_EXPORT_NAME} - Region ${activeRegionId}`
    : APPROVAL_RATE_BY_DEADLINE_EXPORT_NAME;
  const capture = useMediaCapture(widgetRef, screenshotTitle);

  const formatPctWithCounts = (pct, onTime, total) => {
    const safePct = Number.isFinite(pct) ? pct : Number(pct) || 0;
    const safeOnTime = Number.isFinite(onTime) ? onTime : Number(onTime) || 0;
    const safeTotal = Number.isFinite(total) ? total : Number(total) || 0;
    return `${safePct}% (${safeOnTime} of ${safeTotal})`;
  };

  const { columnHeadings, footerData, tableRows, monthLabels, nationalSeries, regionSeriesById } =
    useMemo(() => {
      if (!widgetData || !arrayExistsAndHasLength(widgetData.records)) {
        return {
          columnHeadings: [],
          footerData: [],
          tableRows: [],
          monthLabels: [],
          nationalSeries: [],
          regionSeriesById: new Map(),
        };
      }

      const months = widgetData.records.map((r) => r.month_label);
      const regionHeadings = regions.map((regionId) => `Region ${regionId}`);
      const tableHeadings = [...regionHeadings, 'National average'];
      const nationalValues = widgetData.records.map((record) => Number(record.national_pct) || 0);
      const regionSeriesMap = new Map();
      const regionTotalsMap = new Map();
      let nationalOnTimeTotal = 0;
      let nationalCountTotal = 0;

      regions.forEach((regionId) => {
        let regionOnTimeTotal = 0;
        let regionCountTotal = 0;
        regionSeriesMap.set(
          regionId,
          widgetData.records.map((record) => {
            const regionData =
              record.regions && record.regions[regionId] ? record.regions[regionId] : { pct: 0 };
            regionOnTimeTotal += Number(regionData.on_time) || 0;
            regionCountTotal += Number(regionData.total) || 0;
            return Number(regionData.pct) || 0;
          })
        );
        regionTotalsMap.set(regionId, { onTime: regionOnTimeTotal, total: regionCountTotal });
      });

      widgetData.records.forEach((record) => {
        nationalOnTimeTotal += Number(record.national_on_time) || 0;
        nationalCountTotal += Number(record.national_total) || 0;
      });

      const tableData = widgetData.records.map((record, index) => {
        const rowCells = regions.map((regionId) => {
          const regionData =
            record.regions && record.regions[regionId]
              ? record.regions[regionId]
              : { pct: 0, on_time: 0, total: 0 };
          return {
            value: formatPctWithCounts(regionData.pct, regionData.on_time, regionData.total),
            title: `Region ${regionId}`,
          };
        });

        rowCells.push({
          value: formatPctWithCounts(
            record.national_pct,
            record.national_on_time,
            record.national_total
          ),
          title: 'National average',
        });

        return {
          heading: record.month_label,
          id: `approval-rate-row-${index}`,
          data: rowCells,
        };
      });

      const formatTotalCell = (onTime, total) => {
        if (!total) {
          return formatPctWithCounts(0, 0, 0);
        }
        const pct = Math.round((onTime / total) * 100);
        return formatPctWithCounts(pct, onTime, total);
      };

      const totalsRow = [
        '',
        'Total',
        ...regions.map((regionId) => {
          const totals = regionTotalsMap.get(regionId) || { onTime: 0, total: 0 };
          return formatTotalCell(totals.onTime, totals.total);
        }),
        formatTotalCell(nationalOnTimeTotal, nationalCountTotal),
      ];

      return {
        columnHeadings: tableHeadings,
        footerData: totalsRow,
        tableRows: tableData,
        monthLabels: months,
        nationalSeries: nationalValues,
        regionSeriesById: regionSeriesMap,
      };
    }, [regions, widgetData]);

  const getTraceDataForRegion = useCallback(
    (regionId) => {
      if (!regionId) {
        return [];
      }
      const series = regionSeriesById.get(regionId) || [];
      return [
        {
          name: 'Region',
          x: monthLabels,
          y: series,
          trace: 'circle',
          id: APPROVAL_RATE_BY_DEADLINE_TRACE_IDS.REGION,
        },
        {
          name: 'National average',
          x: monthLabels,
          y: nationalSeries,
          trace: 'triangle',
          id: APPROVAL_RATE_BY_DEADLINE_TRACE_IDS.NATIONAL,
        },
      ];
    },
    [monthLabels, nationalSeries, regionSeriesById]
  );

  const traceData = activeRegionId ? getTraceDataForRegion(activeRegionId) : [];

  const { exportRows } = useWidgetExport(
    tableRows,
    columnHeadings,
    checkboxes,
    APPROVAL_RATE_BY_DEADLINE_FIRST_COLUMN,
    APPROVAL_RATE_BY_DEADLINE_EXPORT_NAME
  );

  const menuItems = useWidgetMenuItems(
    showTabularData,
    setShowTabularData,
    capture,
    checkboxes,
    exportRows
  );

  const tableConfig = useMemo(
    () => ({
      data: tableRows,
      title: 'Approval rate by deadline',
      firstHeading: APPROVAL_RATE_BY_DEADLINE_FIRST_COLUMN,
      caption: APPROVAL_RATE_BY_DEADLINE_TABLE_CAPTION,
      enableCheckboxes: true,
      enableSorting: false,
      showTotalColumn: false,
      requestSort: NOOP,
      headings: columnHeadings,
      checkboxes,
      setCheckboxes,
      selectAllIdPrefix: 'approval-rate-by-deadline-',
      footer: {
        showFooter: true,
        data: footerData,
      },
    }),
    [checkboxes, columnHeadings, footerData, setCheckboxes, tableRows]
  );

  const handleRegionChange = useCallback(
    (nextIndex, source = 'dot') => {
      if (nextIndex < 0 || nextIndex >= regions.length || nextIndex === activeRegionIndex) {
        return;
      }

      shouldFocusActiveDotRef.current = source !== 'dot';
      setAnnouncement(`Showing Region ${regions[nextIndex]}`);

      if (prefersReducedMotion) {
        setActiveRegionIndex(nextIndex);
        return;
      }

      if (carouselFrameRef.current) {
        setLockedFrameHeight(carouselFrameRef.current.getBoundingClientRect().height);
      }

      setTransition({
        from: activeRegionIndex,
        to: nextIndex,
        direction: nextIndex > activeRegionIndex ? 'next' : 'prev',
      });
      setActiveRegionIndex(nextIndex);
    },
    [activeRegionIndex, prefersReducedMotion, regions]
  );

  const hasMultipleRegions = regions.length > 1;
  const hasPreviousRegion = hasMultipleRegions && activeRegionIndex > 0;
  const hasNextRegion = hasMultipleRegions && activeRegionIndex < regions.length - 1;
  const goToPreviousRegion = useCallback(() => {
    if (!hasPreviousRegion) {
      return;
    }
    handleRegionChange(activeRegionIndex - 1, 'arrow');
  }, [activeRegionIndex, handleRegionChange, hasPreviousRegion]);

  const goToNextRegion = useCallback(() => {
    if (!hasNextRegion) {
      return;
    }
    handleRegionChange(activeRegionIndex + 1, 'arrow');
  }, [activeRegionIndex, handleRegionChange, hasNextRegion]);
  const handleDotRef = useCallback((index, element) => {
    dotButtonRefs.current[index] = element;
  }, []);
  const handleChartClick = useCallback(
    (event) => {
      if (!hasMultipleRegions || transition) {
        return;
      }

      const bounds = event.currentTarget.getBoundingClientRect();
      if (!bounds.width) {
        return;
      }

      const clickOffset = event.clientX - bounds.left;
      if (clickOffset < bounds.width / 2) {
        handleRegionChange(activeRegionIndex - 1, 'chart');
        return;
      }

      handleRegionChange(activeRegionIndex + 1, 'chart');
    },
    [activeRegionIndex, handleRegionChange, hasMultipleRegions, transition]
  );

  const widgetClassName = [
    'approval-rate-by-deadline-widget',
    hasMultipleRegions
      ? 'approval-rate-by-deadline-widget--multi'
      : 'approval-rate-by-deadline-widget--single',
  ].join(' ');

  const subtitle = (
    <ApprovalRateSubtitle
      showFilterWarning={
        showFiltersNotApplicable || Boolean(widgetData?.showDashboardFiltersNotApplicable)
      }
    />
  );

  const renderLineGraph = (graphData, key) => (
    <LineGraph
      key={key}
      showTabularData={false}
      data={graphData}
      xAxisTitle="Months"
      yAxisTitle="Percentage"
      yAxisTickStep={10}
      onChartClick={handleChartClick}
      legendConfig={APPROVAL_RATE_BY_DEADLINE_LEGEND_CONFIG}
      tableConfig={tableConfig}
      widgetRef={widgetRef}
    />
  );

  return (
    <WidgetContainer
      className={widgetClassName}
      loading={loading}
      title="Approval rate by deadline"
      subtitle={subtitle}
      menuItems={menuItems}
      titleMargin={{ bottom: 1 }}
    >
      {showTabularData ? (
        <HorizontalTableWidget
          headers={columnHeadings}
          data={tableRows}
          caption={APPROVAL_RATE_BY_DEADLINE_TABLE_CAPTION}
          firstHeading={APPROVAL_RATE_BY_DEADLINE_FIRST_COLUMN}
          enableSorting={false}
          requestSort={NOOP}
          enableCheckboxes
          checkboxes={checkboxes}
          setCheckboxes={setCheckboxes}
          showTotalColumn={false}
          footerData={footerData}
          hideFirstColumnBorder
          stickyLastDataColumn
          selectAllIdPrefix="approval-rate-by-deadline-"
        />
      ) : (
        <ApprovalRateCarousel
          activeRegionId={activeRegionId}
          announcement={announcement}
          carouselFrameRef={carouselFrameRef}
          hasMultipleRegions={hasMultipleRegions}
          hasPreviousRegion={hasPreviousRegion}
          hasNextRegion={hasNextRegion}
          isAnimating={isAnimating}
          lockedFrameHeight={lockedFrameHeight}
          goToPreviousRegion={goToPreviousRegion}
          goToNextRegion={goToNextRegion}
          transition={transition}
          regions={regions}
          getTraceDataForRegion={getTraceDataForRegion}
          renderLineGraph={renderLineGraph}
          traceData={traceData}
          activeRegionIndex={activeRegionIndex}
          handleRegionChange={handleRegionChange}
          onDotRef={handleDotRef}
        />
      )}
    </WidgetContainer>
  );
}

ApprovalRateByDeadlineWidget.propTypes = {
  data: PropTypes.shape({
    regions: PropTypes.arrayOf(PropTypes.number),
    showDashboardFiltersNotApplicable: PropTypes.bool,
    records: PropTypes.arrayOf(
      PropTypes.shape({
        month_label: PropTypes.string.isRequired,
        national_pct: PropTypes.number.isRequired,
        national_total: PropTypes.number.isRequired,
        national_on_time: PropTypes.number.isRequired,
        regions: PropTypes.shape({}),
      })
    ),
  }),
  loading: PropTypes.bool,
  showFiltersNotApplicable: PropTypes.bool,
};

ApprovalRateByDeadlineWidget.defaultProps = {
  data: {
    regions: EMPTY_ARRAY,
    showDashboardFiltersNotApplicable: false,
    records: EMPTY_ARRAY,
  },
  loading: false,
  showFiltersNotApplicable: false,
};

export default withWidgetData(ApprovalRateByDeadlineWidget, 'approvalRateByDeadline');

/* global globalThis */
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import WidgetContainer from '../components/WidgetContainer';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import FiltersNotApplicable from '../components/FiltersNotApplicable';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetMenuItems from '../hooks/useWidgetMenuItems';
import useWidgetExport from '../hooks/useWidgetExport';
import withWidgetData from './withWidgetData';
import LineGraph from './LineGraph';
import { arrayExistsAndHasLength, EMPTY_ARRAY, NOOP } from '../Constants';
import './ApprovalRateByDeadlineWidget.css';

const EXPORT_NAME = 'Approval rate by deadline';
const FIRST_COLUMN = 'Months';

const TRACE_IDS = {
  REGION: 'approval-rate-region',
  NATIONAL: 'approval-rate-national',
};

const TABLE_CAPTION = 'Approval rate by deadline by month';

export function ApprovalRateByDeadlineWidget({ data, loading }) {
  const widgetRef = useRef(null);
  const capture = useMediaCapture(widgetRef, EXPORT_NAME);
  const [showTabularData, setShowTabularData] = useState(false);
  const [checkboxes, setCheckboxes] = useState({});
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);
  const [transition, setTransition] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

  const widgetData = useMemo(
    () => (data || { regions: EMPTY_ARRAY, records: EMPTY_ARRAY }),
    [data],
  );

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

  const regions = useMemo(
    () => (widgetData && Array.isArray(widgetData.regions) ? widgetData.regions : []),
    [widgetData],
  );

  const activeRegionId = regions[activeRegionIndex];

  const formatPctWithCounts = (pct, onTime, total) => {
    const safePct = Number.isFinite(pct) ? pct : Number(pct) || 0;
    const safeOnTime = Number.isFinite(onTime) ? onTime : Number(onTime) || 0;
    const safeTotal = Number.isFinite(total) ? total : Number(total) || 0;
    return `${safePct}% (${safeOnTime} of ${safeTotal})`;
  };

  const {
    columnHeadings,
    footerData,
    tableRows,
    monthLabels,
    nationalSeries,
    regionSeriesById,
  } = useMemo(() => {
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
          const regionData = record.regions && record.regions[regionId]
            ? record.regions[regionId]
            : { pct: 0 };
          regionOnTimeTotal += Number(regionData.on_time) || 0;
          regionCountTotal += Number(regionData.total) || 0;
          return Number(regionData.pct) || 0;
        }),
      );
      regionTotalsMap.set(regionId, { onTime: regionOnTimeTotal, total: regionCountTotal });
    });

    widgetData.records.forEach((record) => {
      nationalOnTimeTotal += Number(record.national_on_time) || 0;
      nationalCountTotal += Number(record.national_total) || 0;
    });

    const tableData = widgetData.records.map((record, index) => {
      const rowCells = regions.map((regionId) => {
        const regionData = record.regions && record.regions[regionId]
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
          record.national_total,
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

  const getTraceDataForRegion = (regionId) => {
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
        id: TRACE_IDS.REGION,
      },
      {
        name: 'National average',
        x: monthLabels,
        y: nationalSeries,
        trace: 'triangle',
        id: TRACE_IDS.NATIONAL,
      },
    ];
  };

  const traceData = activeRegionId ? getTraceDataForRegion(activeRegionId) : [];

  const { exportRows } = useWidgetExport(
    tableRows,
    columnHeadings,
    checkboxes,
    FIRST_COLUMN,
    EXPORT_NAME,
  );

  const menuItems = useWidgetMenuItems(
    showTabularData,
    setShowTabularData,
    capture,
    checkboxes,
    exportRows,
  );

  const handleRegionChange = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= regions.length || nextIndex === activeRegionIndex) {
      return;
    }

    if (prefersReducedMotion) {
      setActiveRegionIndex(nextIndex);
      return;
    }

    setTransition({
      from: activeRegionIndex,
      to: nextIndex,
      direction: nextIndex > activeRegionIndex ? 'next' : 'prev',
    });
    setActiveRegionIndex(nextIndex);
  };

  const hasMultipleRegions = regions.length > 1;
  const widgetClassName = [
    'approval-rate-by-deadline-widget',
    hasMultipleRegions
      ? 'approval-rate-by-deadline-widget--multi'
      : 'approval-rate-by-deadline-widget--single',
  ].join(' ');

  const subtitle = (
    <div className="approval-rate-subtitle margin-bottom-3">
      <div className="display-flex flex-wrap flex-align-center">
        <WidgetContainerSubtitle marginY={0}>
          Percentage of activity reports approved by the expected deadline.
        </WidgetContainerSubtitle>
        <FiltersNotApplicable showLeadingDash={false} />
      </div>
    </div>
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
        <LineGraph
          key="approval-rate-table"
          showTabularData
          data={traceData}
          xAxisTitle="Months"
          yAxisTitle="Percentage"
          yAxisTickStep={10}
          legendConfig={[
            {
              label: 'Region',
              selected: true,
              shape: 'circle',
              id: 'show-approval-rate-region',
              traceId: TRACE_IDS.REGION,
            },
            {
              label: 'National average',
              selected: true,
              shape: 'triangle',
              id: 'show-approval-rate-national',
              traceId: TRACE_IDS.NATIONAL,
            },
          ]}
          tableConfig={{
            data: tableRows,
            title: 'Approval rate by deadline',
            firstHeading: FIRST_COLUMN,
            caption: TABLE_CAPTION,
            enableCheckboxes: true,
            enableSorting: false,
            showTotalColumn: false,
            requestSort: NOOP,
            headings: columnHeadings,
            checkboxes,
            setCheckboxes,
            footer: {
              showFooter: true,
              data: footerData,
            },
          }}
          widgetRef={widgetRef}
        />
      ) : (
        <div>
          <div className="text-center text-bold margin-top-2 margin-bottom-1">
            {activeRegionId ? `Region ${activeRegionId}` : 'Region'}
          </div>
          <div
            className={[
              'approval-rate-carousel-frame',
              'position-relative',
              'overflow-hidden',
              isAnimating ? 'is-animating' : '',
            ].join(' ')}
          >
            {transition ? (
              <>
                <div className={`approval-rate-carousel-slide approval-rate-carousel-slide--outgoing approval-rate-carousel-slide--${transition.direction}`}>
                  <LineGraph
                    key={`approval-rate-outgoing-${transition.from}`}
                    showTabularData={false}
                    data={getTraceDataForRegion(regions[transition.from])}
                    xAxisTitle="Months"
                    yAxisTitle="Percentage"
                    yAxisTickStep={10}
                    legendConfig={[
                      {
                        label: 'Region',
                        selected: true,
                        shape: 'circle',
                        id: 'show-approval-rate-region',
                        traceId: TRACE_IDS.REGION,
                      },
                      {
                        label: 'National average',
                        selected: true,
                        shape: 'triangle',
                        id: 'show-approval-rate-national',
                        traceId: TRACE_IDS.NATIONAL,
                      },
                    ]}
                    tableConfig={{
                      data: tableRows,
                      title: 'Approval rate by deadline',
                      firstHeading: FIRST_COLUMN,
                      caption: TABLE_CAPTION,
                      enableCheckboxes: true,
                      enableSorting: false,
                      showTotalColumn: false,
                      requestSort: NOOP,
                      headings: columnHeadings,
                      checkboxes,
                      setCheckboxes,
                      footer: {
                        showFooter: true,
                        data: footerData,
                      },
                    }}
                    widgetRef={widgetRef}
                  />
                </div>
                <div className={`approval-rate-carousel-slide approval-rate-carousel-slide--incoming approval-rate-carousel-slide--${transition.direction}`}>
                  <LineGraph
                    key={`approval-rate-incoming-${transition.to}`}
                    showTabularData={false}
                    data={getTraceDataForRegion(regions[transition.to])}
                    xAxisTitle="Months"
                    yAxisTitle="Percentage"
                    yAxisTickStep={10}
                    legendConfig={[
                      {
                        label: 'Region',
                        selected: true,
                        shape: 'circle',
                        id: 'show-approval-rate-region',
                        traceId: TRACE_IDS.REGION,
                      },
                      {
                        label: 'National average',
                        selected: true,
                        shape: 'triangle',
                        id: 'show-approval-rate-national',
                        traceId: TRACE_IDS.NATIONAL,
                      },
                    ]}
                    tableConfig={{
                      data: tableRows,
                      title: 'Approval rate by deadline',
                      firstHeading: FIRST_COLUMN,
                      caption: TABLE_CAPTION,
                      enableCheckboxes: true,
                      enableSorting: false,
                      showTotalColumn: false,
                      requestSort: NOOP,
                      headings: columnHeadings,
                      checkboxes,
                      setCheckboxes,
                      footer: {
                        showFooter: true,
                        data: footerData,
                      },
                    }}
                    widgetRef={widgetRef}
                  />
                </div>
              </>
            ) : (
              <div className="approval-rate-carousel-slide approval-rate-carousel-slide--current">
                <LineGraph
                  key={`approval-rate-region-${activeRegionId}`}
                  showTabularData={false}
                  data={traceData}
                  xAxisTitle="Months"
                  yAxisTitle="Percentage"
                  yAxisTickStep={10}
                  legendConfig={[
                    {
                      label: 'Region',
                      selected: true,
                      shape: 'circle',
                      id: 'show-approval-rate-region',
                      traceId: TRACE_IDS.REGION,
                    },
                    {
                      label: 'National average',
                      selected: true,
                      shape: 'triangle',
                      id: 'show-approval-rate-national',
                      traceId: TRACE_IDS.NATIONAL,
                    },
                  ]}
                  tableConfig={{
                    data: tableRows,
                    title: 'Approval rate by deadline',
                    firstHeading: FIRST_COLUMN,
                    caption: TABLE_CAPTION,
                    enableCheckboxes: true,
                    enableSorting: false,
                    showTotalColumn: false,
                    requestSort: NOOP,
                    headings: columnHeadings,
                    checkboxes,
                    setCheckboxes,
                    footer: {
                      showFooter: true,
                      data: footerData,
                    },
                  }}
                  widgetRef={widgetRef}
                />
              </div>
            )}
          </div>
          {hasMultipleRegions && (
            <div className="display-flex flex-justify-center flex-gap-1 margin-top-1" role="tablist" aria-label="Select region">
              {regions.map((regionId, index) => (
                <button
                  key={`approval-rate-dot-${regionId}`}
                  type="button"
                  className={[
                    'approval-rate-carousel-dot',
                    index === activeRegionIndex ? 'text-ink' : 'text-base-lightest',
                  ].join(' ')}
                  onClick={() => handleRegionChange(index)}
                  aria-label={`Show Region ${regionId}`}
                  aria-pressed={index === activeRegionIndex}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
}

ApprovalRateByDeadlineWidget.propTypes = {
  data: PropTypes.shape({
    regions: PropTypes.arrayOf(PropTypes.number),
    records: PropTypes.arrayOf(PropTypes.shape({
      month_label: PropTypes.string.isRequired,
      national_pct: PropTypes.number.isRequired,
      national_total: PropTypes.number.isRequired,
      national_on_time: PropTypes.number.isRequired,
      regions: PropTypes.shape({}),
    })),
  }),
  loading: PropTypes.bool,
};

ApprovalRateByDeadlineWidget.defaultProps = {
  data: {
    regions: EMPTY_ARRAY,
    records: EMPTY_ARRAY,
  },
  loading: false,
};

export default withWidgetData(ApprovalRateByDeadlineWidget, 'approvalRateByDeadline');

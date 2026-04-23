import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import AppLoadingContext from '../AppLoadingContext';
import WidgetContainer from '../components/WidgetContainer';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import HorizontalTableWidget from './HorizontalTableWidget';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import Drawer from '../components/Drawer';
import ContentFromFeedByTag from '../components/ContentFromFeedByTag';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetExport from '../hooks/useWidgetExport';
import useWidgetMenuItems from '../hooks/useWidgetMenuItems';
import colors from '../colors';
import TextTrim from '../components/TextTrim';
import './FindingCategoryHotspot.css';
import useSessionSort from '../hooks/useSessionSort';

const EXPORT_NAME = 'Finding category hotspots';
const BASE_COLOR = colors.ttahubMediumBlue; // #336A90
const DARK_COLOR = colors.ttahubBlue; // #264A64
const INK = colors.textInk; // #1b1b1b
const SORT_KEY = 'findingCategoryHotspot';

// Parse hex color into [r, g, b]
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

const BASE_RGB = hexToRgb(BASE_COLOR);

// 6-step color scale from coolest (level 0) to hottest (level 5)
const COLOR_SCALE = [
  { bg: '#FFFFFF', textColor: INK },
  { bg: `rgba(${BASE_RGB.join(',')}, 0.2)`, textColor: INK },
  { bg: `rgba(${BASE_RGB.join(',')}, 0.4)`, textColor: INK },
  { bg: `rgba(${BASE_RGB.join(',')}, 0.7)`, textColor: '#fff' },
  { bg: `rgba(${BASE_RGB.join(',')}, 1)`, textColor: '#fff' },
  { bg: DARK_COLOR, textColor: '#fff' },
];

// Return top 10 categories by total count (sum across months), descending
export function getTop10(data) {
  return [...data]
    .map((row) => ({
      ...row,
      total: row.total ?? (row.counts || []).reduce((sum, c) => sum + c, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

// Divide [1, max] into 5 equal buckets; returns strictly increasing
// upper-bound thresholds, collapsing duplicate buckets for small max values.
export function computeLegendRanges(max) {
  if (!max || max <= 0) return [0, 0, 0, 0, 0];
  const step = max / 5;
  return [1, 2, 3, 4, 5].reduce((ranges, i) => {
    const threshold = Math.ceil(step * i);
    if (ranges[ranges.length - 1] !== threshold) {
      ranges.push(threshold);
    }
    return ranges;
  }, []);
}

// Map a count value to a CSS background color using the 6-step color scale
export function getColorForValue(value, max) {
  if (!value || value === 0 || !max) return COLOR_SCALE[0].bg;
  const ratio = value / max;
  let level;
  if (ratio <= 0.2) level = 1;
  else if (ratio <= 0.4) level = 2;
  else if (ratio <= 0.6) level = 3;
  else if (ratio <= 0.8) level = 4;
  else level = 5;
  return COLOR_SCALE[level].bg;
}

// Build legend items {bg, textColor, label} aligned with getColorForValue's ratio buckets
export function buildLegendLabels(max) {
  if (!max || max <= 0) {
    return [{ bg: COLOR_SCALE[0].bg, textColor: COLOR_SCALE[0].textColor, label: '0' }];
  }

  const ratioThresholds = [0.2, 0.4, 0.6, 0.8];
  const items = [{ bg: COLOR_SCALE[0].bg, textColor: COLOR_SCALE[0].textColor, label: '0' }];
  let prevUpper = 0;

  ratioThresholds.forEach((ratio, index) => {
    const upper = Math.floor(ratio * max);
    if (upper > prevUpper) {
      const lower = prevUpper + 1;
      items.push({
        bg: COLOR_SCALE[index + 1].bg,
        textColor: COLOR_SCALE[index + 1].textColor,
        label: lower === upper ? `${lower}` : `${lower}\u2013${upper}`,
      });
      prevUpper = upper;
    }
  });

  const finalLower = prevUpper + 1;
  items.push({
    bg: COLOR_SCALE[5].bg,
    textColor: COLOR_SCALE[5].textColor,
    label: `${finalLower}+`,
  });

  return items;
}

// Text color based on color scale level
function getTextColorForLevel(value, max) {
  if (!value || !max) return COLOR_SCALE[0].textColor;
  const ratio = value / max;
  let level;
  if (ratio <= 0.2) level = 1;
  else if (ratio <= 0.4) level = 2;
  else if (ratio <= 0.6) level = 3;
  else if (ratio <= 0.8) level = 4;
  else level = 5;
  return COLOR_SCALE[level].textColor;
}

function HotspotLegend({ max }) {
  const items = buildLegendLabels(max);
  return (
    <div className="finding-category-hotspot-legend margin-bottom-1">
      <span className="finding-category-hotspot-legend-label padding-right-2">Frequency of finding categories:</span>
      {items.map((item, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="finding-category-hotspot-legend-item">
          <span
            className="finding-category-hotspot-legend-cell"
            style={{
              backgroundColor: item.bg,
              color: item.textColor,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

HotspotLegend.propTypes = {
  max: PropTypes.number.isRequired,
};

function HotspotGrid({ rows, months, widgetRef }) {
  const maxCount = useMemo(
    () => Math.max(0, ...rows.flatMap((r) => r.counts)),
    [rows],
  );

  const cellPadding = 'padding-x-2 padding-y-1';

  return (
    <div className="finding-category-hotspot-container margin-3" ref={widgetRef}>
      <HotspotLegend max={maxCount} />
      <div
        className="finding-category-hotspot-scroll margin-bottom-1"
        role="region"
        aria-label="Finding category hotspot"
      >
        <table className="finding-category-hotspot-table">
          <caption className="usa-sr-only">Finding category hotspot</caption>
          <thead>
            <tr className="finding-category-hotspot-axis-row">
              <th className={`finding-category-hotspot-first-col finding-category-hotspot-axis-header text-right ${cellPadding}`} scope="col">
                Finding category (Top 10)
              </th>
              <th
                className="finding-category-hotspot-axis-header finding-category-hotspot-axis-center text-left padding-x-0 padding-y-1"
                colSpan={months.length}
                scope="colgroup"
              >
                Number of activity reports with finding category
              </th>
              <th className={`finding-category-hotspot-total-col finding-category-hotspot-axis-header ${cellPadding}`} scope="col">
                Total
              </th>
            </tr>
            <tr className="usa-sr-only">
              <th scope="col">Finding category</th>
              {months.map((m) => (
                <th key={m} scope="col">{m}</th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th
                  className={`finding-category-hotspot-first-col ${cellPadding}`}
                  title={row.name}
                  scope="row"
                >
                  <TextTrim text={row.name} position="top" hideUnderline />
                </th>
                {row.counts.map((count, i) => {
                  const bg = getColorForValue(count, maxCount);
                  const textColor = getTextColorForLevel(count, maxCount);
                  return (
                    <td
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className="finding-category-hotspot-cell font-sans-3xs"
                      style={{ backgroundColor: bg, color: textColor }}
                    >
                      {count || '0'}
                    </td>
                  );
                })}
                <td className="finding-category-hotspot-total-col">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot aria-hidden="true">
            <tr>
              <td className="finding-category-hotspot-first-col finding-category-hotspot-tfoot-label" />
              {months.map((m) => (
                <td key={m} className="finding-category-hotspot-month-footer font-body-2xs">
                  {m}
                </td>
              ))}
              <td className="finding-category-hotspot-total-col" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="text-center">Activity report start date</div>
    </div>
  );
}

HotspotGrid.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      counts: PropTypes.arrayOf(PropTypes.number).isRequired,
      total: PropTypes.number.isRequired,
    }),
  ).isRequired,
  months: PropTypes.arrayOf(PropTypes.string).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  widgetRef: PropTypes.object.isRequired,
};

export function FindingCategoryHotspotWidget({ data, loading }) {
  const { setIsAppLoading } = useContext(AppLoadingContext);
  const widgetRef = useRef(null);
  const drawerTriggerRef = useRef(null);
  const capture = useMediaCapture(widgetRef, EXPORT_NAME);
  const [showTabularData, setShowTabularData] = useState(false);
  const [sortConfig, setSortConfig] = useSessionSort({
    sortBy: 'Total',
    direction: 'desc',
    activePage: 1,
    offset: 0,
    perPage: 10,
  }, SORT_KEY);

  const requestSort = useCallback((sortBy) => {
    let direction = 'asc';
    if (
      sortConfig.sortBy === sortBy
      && sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setSortConfig({ sortBy, direction });
  }, [sortConfig, setSortConfig]);

  useEffect(() => {
    setIsAppLoading(loading);
  }, [loading, setIsAppLoading]);

  const top10 = useMemo(() => getTop10(data || []), [data]);

  // All categories sorted by total, for the table view
  const allData = useMemo(
    () => [...(data || [])]
      .map((row) => ({
        ...row,
        total: row.total ?? (row.counts || []).reduce((sum, c) => sum + c, 0),
      }))
      .sort((a, b) => b.total - a.total),
    [data],
  );

  const months = useMemo(
    () => (top10.length > 0 ? top10[0].months || [] : []),
    [top10],
  );

  // Build rows for HorizontalTableWidget (table view / export) — all data, not just top 10
  const tableData = useMemo(
    () => {
      // sort allData by based on sortConfig
      // Either by 'Total' (default) or by 'Finding_category' (alphabetical)
      const sortedData = [...allData].sort((a, b) => {
        if (sortConfig.sortBy === 'Finding_category') {
          const cmp = a.name.localeCompare(b.name);
          return sortConfig.direction === 'asc' ? cmp : -cmp;
        }
        // Default: sort by Total (numeric)
        const diff = a.total - b.total;
        return sortConfig.direction === 'asc' ? diff : -diff;
      });

      return sortedData.map((row) => ({
        heading: row.name,
        id: row.name,
        hideSortingIndicator: true,
        data: [
          ...row.counts.map((count, i) => ({
            value: count,
            title: months[i] || '',
          })),
          { value: row.total, title: 'Total' },
        ],
      }));
    },
    [allData, months, sortConfig.direction, sortConfig.sortBy],
  );

  const { exportRows } = useWidgetExport(
    tableData,
    [...months, 'Total'],
    {},
    'Finding category',
    EXPORT_NAME,
  );

  const menuItems = useWidgetMenuItems(
    showTabularData,
    setShowTabularData,
    capture,
    {},
    exportRows,
  );

  const subtitle = (
    <div className="margin-bottom-3">
      <WidgetContainerSubtitle>
        Finding categories addressed in approved Activity Reports (AR) over time.
        The date filter applies to the activity start date.
      </WidgetContainerSubtitle>
      <div className="margin-top-1">
        <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
          About this data
        </DrawerTriggerButton>
      </div>
    </div>
  );

  return (
    <>
      <Drawer triggerRef={drawerTriggerRef} title="Finding category hotspots">
        <ContentFromFeedByTag tagName="ttahub-finding-category-hotspots" />
      </Drawer>
      <WidgetContainer
        title="Finding category hot spots"
        subtitle={subtitle}
        menuItems={menuItems}
        loading={loading}
        titleMargin={{ bottom: 1 }}
      >
        {showTabularData ? (
          <HorizontalTableWidget
            headers={months}
            sortConfig={{
              ...sortConfig,
              hiddenSortIndicators: months,
            }}
            requestSort={requestSort}
            data={tableData}
            caption="Finding category hotspots"
            firstHeading="Finding category"
            lastHeading="Total"
            showTotalColumn
            stickyFirstColumn
            stickyLastColumn
            enableCheckboxes={false}
            selectAllIdPrefix="finding-category-hotspot"
            hideFirstColumnBorder
            footerData={false}
            enableSorting
          />
        ) : (
          <HotspotGrid rows={top10} months={months} widgetRef={widgetRef} />
        )}
      </WidgetContainer>
    </>
  );
}

FindingCategoryHotspotWidget.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      months: PropTypes.arrayOf(PropTypes.string),
      counts: PropTypes.arrayOf(PropTypes.number),
    }),
  ),
  loading: PropTypes.bool.isRequired,
};

FindingCategoryHotspotWidget.defaultProps = {
  data: [],
};

export default withWidgetData(FindingCategoryHotspotWidget, 'reportCountByFindingCategory');

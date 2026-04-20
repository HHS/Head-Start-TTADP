import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
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
import './FindingCategoryHotspot.css';

const EXPORT_NAME = 'Finding category hotspots';
const BASE_COLOR = colors.ttahubMediumBlue; // #336A90

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
const COLOR_OPACITIES = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

// Return top 10 categories by total count (sum across months), descending
export function getTop10(data) {
  return [...data]
    .map((row) => ({
      ...row,
      total: (row.counts || []).reduce((sum, c) => sum + c, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

// Divide [1, max] into 5 equal buckets; returns 5 upper-bound thresholds
export function computeLegendRanges(max) {
  if (!max || max <= 0) return [0, 0, 0, 0, 0];
  const step = max / 5;
  return [1, 2, 3, 4, 5].map((i) => Math.ceil(step * i));
}

// Map a count value to a CSS rgba color using the 6-step opacity scale
export function getColorForValue(value, max) {
  if (!value || value === 0 || !max) return `rgba(${BASE_RGB.join(',')}, 0)`;
  const ratio = value / max;
  let level;
  if (ratio <= 0.2) level = 1;
  else if (ratio <= 0.4) level = 2;
  else if (ratio <= 0.6) level = 3;
  else if (ratio <= 0.8) level = 4;
  else level = 5;
  return `rgba(${BASE_RGB.join(',')}, ${COLOR_OPACITIES[level]})`;
}

// White text contrasts better on the two darkest color levels
function getTextColorForLevel(value, max) {
  if (!value || !max) return undefined;
  return value / max > 0.6 ? '#fff' : undefined;
}

function HotspotLegend({ max }) {
  const ranges = computeLegendRanges(max);
  const labels = [
    '0',
    `1\u2013${ranges[0]}`,
    `${ranges[0] + 1}\u2013${ranges[1]}`,
    `${ranges[1] + 1}\u2013${ranges[2]}`,
    `${ranges[2] + 1}\u2013${ranges[3]}`,
    `${ranges[3] + 1}\u2013${ranges[4]}`,
  ];

  return (
    <div className="finding-category-hotspot-legend">
      <span className="finding-category-hotspot-legend-label">Frequency of finding categories:</span>
      {COLOR_OPACITIES.map((opacity, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="finding-category-hotspot-legend-item">
          <span
            className="finding-category-hotspot-legend-cell"
            style={{
              backgroundColor: `rgba(${BASE_RGB.join(',')}, ${opacity})`,
              color: opacity > 0.6 ? '#fff' : undefined,
            }}
            aria-hidden="true"
          >
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

HotspotLegend.propTypes = {
  max: PropTypes.number.isRequired,
};

function HotspotGrid({ rows, months }) {
  const maxCount = useMemo(
    () => Math.max(0, ...rows.flatMap((r) => r.counts)),
    [rows],
  );

  return (
    <div className="finding-category-hotspot-container">
      <HotspotLegend max={maxCount} />
      <div
        className="finding-category-hotspot-scroll"
        role="region"
        aria-label="Finding category hotspot"
      >
        <table className="finding-category-hotspot-table">
          <caption className="usa-sr-only">Finding category hotspot</caption>
          <thead>
            <tr className="finding-category-hotspot-axis-row">
              <th className="finding-category-hotspot-first-col finding-category-hotspot-axis-header" scope="col">
                Finding category (Top 10)
              </th>
              <th
                className="finding-category-hotspot-axis-header finding-category-hotspot-axis-center"
                colSpan={months.length}
                scope="col"
              >
                Number of activity reports with finding category
              </th>
              <th className="finding-category-hotspot-total-col finding-category-hotspot-axis-header" scope="col">
                Total
              </th>
            </tr>
            <tr className="finding-category-hotspot-hidden-row" aria-hidden="true">
              <th className="finding-category-hotspot-first-col finding-category-hotspot-col-header" scope="col">
                &nbsp;
              </th>
              {months.map((m) => (
                <th key={m} className="finding-category-hotspot-col-header" scope="col">
                  {m}
                </th>
              ))}
              <th className="finding-category-hotspot-total-col finding-category-hotspot-col-header" scope="col">
                &nbsp;
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td
                  className="finding-category-hotspot-first-col"
                  title={row.name}
                >
                  {row.name}
                </td>
                {row.counts.map((count, i) => {
                  const bg = getColorForValue(count, maxCount);
                  const textColor = getTextColorForLevel(count, maxCount);
                  return (
                    <td
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className="finding-category-hotspot-cell"
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
          <tfoot>
            <tr>
              <td className="finding-category-hotspot-first-col finding-category-hotspot-tfoot-label" aria-hidden="true" />
              {months.map((m) => (
                <td key={m} className="finding-category-hotspot-month-footer">
                  {m}
                </td>
              ))}
              <td className="finding-category-hotspot-total-col" aria-hidden="true" />
            </tr>
            <tr>
              <td
                className="finding-category-hotspot-axis-label"
                colSpan={months.length + 2}
              >
                Activity report start date
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
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
};

export function FindingCategoryHotspotWidget({ data, loading }) {
  const { setIsAppLoading } = useContext(AppLoadingContext);
  const widgetRef = useRef(null);
  const drawerTriggerRef = useRef(null);
  const capture = useMediaCapture(widgetRef, EXPORT_NAME);
  const [showTabularData, setShowTabularData] = useState(false);
  const [checkboxes, setCheckboxes] = useState({});

  useEffect(() => {
    setIsAppLoading(loading);
  }, [loading, setIsAppLoading]);

  const top10 = useMemo(() => getTop10(data || []), [data]);

  const months = useMemo(
    () => (top10.length > 0 ? top10[0].months || [] : []),
    [top10],
  );

  // Build rows for HorizontalTableWidget (table view / export)
  const tableData = useMemo(
    () => top10.map((row) => ({
      heading: row.name,
      id: row.name,
      data: row.counts.map((count, i) => ({
        value: count,
        title: months[i] || '',
      })),
    })),
    [top10, months],
  );

  const { exportRows } = useWidgetExport(
    tableData,
    months,
    checkboxes,
    'Finding category',
    EXPORT_NAME,
  );

  const menuItems = useWidgetMenuItems(
    showTabularData,
    setShowTabularData,
    capture,
    checkboxes,
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
        <ContentFromFeedByTag tagName="ttahub-finding-category-hotspot" />
      </Drawer>
      <div ref={widgetRef}>
        <WidgetContainer
          title="Finding category hot spots"
          subtitle={subtitle}
          menuItems={menuItems}
          loading={loading}
          titleMargin={{ bottom: 1 }}
        >
          {showTabularData ? (
            <div className="finding-category-hotspot-table-view">
              <HorizontalTableWidget
                headers={months}
                data={tableData}
                caption="Finding category hotspots"
                firstHeading="Finding category"
                lastHeading="Total"
                showTotalColumn
                stickyFirstColumn
                stickyLastColumn
                enableCheckboxes
                checkboxes={checkboxes}
                setCheckboxes={setCheckboxes}
                selectAllIdPrefix="finding-category-hotspot"
                hideFirstColumnBorder
                footerData={false}
              />
            </div>
          ) : (
            <HotspotGrid rows={top10} months={months} />
          )}
        </WidgetContainer>
      </div>
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

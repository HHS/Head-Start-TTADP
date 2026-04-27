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
import useSessionSort from '../hooks/useSessionSort';
import HotspotGrid from './HotspotGrid';
import {
  getTop10,
  computeLegendRanges,
  getColorForValue,
  buildLegendLabels,
} from './FindingCategoryHotspotUtils';
import './FindingCategoryHotspot.css';

export {
  getTop10,
  computeLegendRanges,
  getColorForValue,
  buildLegendLabels,
};

const EXPORT_NAME = 'Finding category hotspots';
const SORT_KEY = 'findingCategoryHotspot';

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
        tooltip: true,
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

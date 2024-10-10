import React, {
  useRef, useEffect, useState,
} from 'react';
import PropTypes from 'prop-types';
import WidgetContainer from '../components/WidgetContainer';
import HorizontalTableWidget from './HorizontalTableWidget';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetSorting from '../hooks/useWidgetSorting';
import useWidgetExport from '../hooks/useWidgetExport';
import useWidgetMenuItems from '../hooks/useWidgetMenuItems';
import { EMPTY_ARRAY } from '../Constants';
import VBarGraph from './VBarGraph';

const FIRST_COLUMN = 'Specialist role';

const TABLE_HEADINGS = [
  'Number of activity reports',
  'Percentage of activity reports',
];

const DEFAULT_SORT_CONFIG = {
  sortBy: '1',
  direction: 'desc',
  activePage: 1,
};

export default function PercentageActivityReportByRole({ data }) {
  const widgetRef = useRef(null);
  const capture = useMediaCapture(widgetRef, 'Percentage of activity reports by role');
  const [showTabularData, setShowTabularData] = useState(false);
  const [checkboxes, setCheckboxes] = useState({});

  // we have to store this is in state, despite
  // it being a prop, because of other dependencies
  // in the react graph
  const [trace, setTrace] = useState([]);
  const [tabularData, setTabularData] = useState([]);
  const [totals, setTotals] = useState({
    totalNumberOfReports: 0,
    totalPercentage: 100,
  });

  const {
    requestSort,
    sortConfig,
  } = useWidgetSorting(
    'qa-dashboard-percentage-ars-by-role', // localStorageKey
    DEFAULT_SORT_CONFIG, // defaultSortConfig
    tabularData, // dataToUse
    setTabularData, // setDataToUse
    [FIRST_COLUMN], // stringColumns
    EMPTY_ARRAY, // dateColumns
    EMPTY_ARRAY, // keyColumns
  );

  const { exportRows } = useWidgetExport(
    tabularData,
    TABLE_HEADINGS,
    checkboxes,
    FIRST_COLUMN,
    'PercentageARSByRole',
  );

  // records is an array of objects
  // and the other fields need to be converted to camelCase
  useEffect(() => {
    // take the API data
    // and transform it into the format
    // that the LineGraph component expects
    // (an object for each trace)
    // and the table (an array of objects in the format defined by proptypes)
    const {
      records,
      totalNumberOfReports,
      totalPercentage,
    } = data;

    const tableData = [];
    const traceData = [];

    records.forEach((dataset, index) => {
      traceData.push({
        name: dataset.role_name,
        count: dataset.percentage,
      });

      tableData.push({
        heading: dataset.role_name,
        id: index + 1,
        data: [
          {
            value: dataset.role_count,
            title: 'Number of activity reports',
            sortKey: 'Number_of_activity_reports',
          },
          {
            value: dataset.percentage,
            title: 'Percentage of activity reports',
            sortKey: 'Percentage_of_activity_reports',
          },
        ],
      });
    });

    setTrace(traceData);
    setTabularData(tableData);
    setTotals({
      totalNumberOfReports,
      totalPercentage,
    });
  }, [data]);
  // end use effect

  const menuItems = useWidgetMenuItems(
    showTabularData,
    setShowTabularData,
    capture,
    checkboxes,
    exportRows,
  );

  return (
    <div>

      <WidgetContainer
        loading={false}
        title="Percentage of activity reports by role"
        subtitle="Activity report by specialist role"
        subtitle2="11,510 Activity reports"
        menuItems={menuItems}
      >
        {showTabularData ? (
          <HorizontalTableWidget
            headers={TABLE_HEADINGS}
            data={tabularData}
            caption="TTA broken down by delivery method into total hours and percentages"
            firstHeading={FIRST_COLUMN}
            enableSorting
            sortConfig={sortConfig}
            requestSort={requestSort}
            enableCheckboxes
            checkboxes={checkboxes}
            setCheckboxes={setCheckboxes}
            showTotalColumn={false}
            footerData={[
              '', // empty string for the first column, checkboxes
              'Total',
              String(totals.totalNumberOfReports),
              String(totals.totalPercentage),
            ]}
            hideFirstColumnBorder
          />
        ) : (
          <VBarGraph
            data={trace}
            widgetRef={widgetRef}
            xAxisLabel={FIRST_COLUMN}
            yAxisLabel="Percentage"
            widthOffset={0}
          />
        )}
      </WidgetContainer>
    </div>
  );
}

PercentageActivityReportByRole.propTypes = {
  data: PropTypes.shape({
    totalNumberOfReports: PropTypes.number,
    totalPercentage: PropTypes.number,
    records: PropTypes.arrayOf(PropTypes.shape({
      role_name: PropTypes.string,
      role_count: PropTypes.number,
      percentage: PropTypes.number,
    })),
  }).isRequired,
};

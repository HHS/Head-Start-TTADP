import React, {
  useRef,
  useEffect,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import WidgetContainer from '../components/WidgetContainer';
import HorizontalTableWidget from './HorizontalTableWidget';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetSorting from '../hooks/useWidgetSorting';
import useWidgetExport from '../hooks/useWidgetExport';
import useWidgetMenuItems from '../hooks/useWidgetMenuItems';
import { EMPTY_ARRAY } from '../Constants';
import BarGraph from './BarGraph';
import './RootCauseFeiGoals.css';

const FIRST_COLUMN = 'Root cause';

const TABLE_HEADINGS = [
  'Number',
  'Percentage',
];

const DEFAULT_SORT_CONFIG = {
  sortBy: '1',
  direction: 'desc',
  activePage: 1,
};

export default function RootCauseFeiGoals({ data }) {
  const widgetRef = useRef(null);
  const capture = useMediaCapture(widgetRef, 'RootCauseOnFeiGoals');
  const [showTabularData, setShowTabularData] = useState(false);
  const [checkboxes, setCheckboxes] = useState({});

  // we have to store this is in state, despite
  // it being a prop, because of other dependencies
  // in the react graph
  const [trace, setTrace] = useState([]);
  const [tabularData, setTabularData] = useState([]);
  const [totals, setTotals] = useState({
    totalNumberOfGoals: 0,
    totalNumberOfRootCauses: 0,
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
      totalNumberOfGoals,
      totalNumberOfRootCauses,
    } = data;

    const tableData = [];
    const traceData = [];

    records.forEach((dataset, index) => {
      traceData.push({
        category: dataset.rootCause,
        count: dataset.percentage,
      });

      tableData.push({
        heading: dataset.rootCause,
        id: index + 1,
        data: [
          {
            value: dataset.response_count,
            title: 'Root cause',
            sortKey: 'Root_cause',
          },
          {
            value: dataset.percentage,
            title: 'Number',
            sortKey: 'Number',
          },
        ],
      });
    });

    setTrace(traceData);
    setTabularData(tableData);
    setTotals({
      totalNumberOfGoals,
      totalNumberOfRootCauses,
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
        className="tta-qa-dashboard-percentage-ars-by-role"
        loading={false}
        title="Root cause on FEI goals"
        subtitle="Each goal can have up to 2 root causes"
        subtitle2={`Total of ${totals.totalNumberOfGoals} goals and ${totals.totalNumberOfRootCauses} root causes`}
        menuItems={menuItems}
      >
        {showTabularData ? (
          <HorizontalTableWidget
            headers={TABLE_HEADINGS}
            data={tabularData}
            caption="Root cause on FEI goals"
            firstHeading={FIRST_COLUMN}
            enableSorting
            sortConfig={sortConfig}
            requestSort={requestSort}
            enableCheckboxes
            checkboxes={checkboxes}
            setCheckboxes={setCheckboxes}
            showTotalColumn={false}
            footerData={false}
            hideFirstColumnBorder
          />
        ) : (
          <BarGraph
            data={trace}
            topMargin={24}
            leftMargin={200}
            barGraphTopHeight="auto"
            barHeightMultiplier={40}
            widgetRef={widgetRef}
          />
        )}
      </WidgetContainer>
    </div>
  );
}

RootCauseFeiGoals.propTypes = {
  data: PropTypes.shape({
    totalNumberOfGoals: PropTypes.number,
    totalNumberOfRootCauses: PropTypes.number,
    records: PropTypes.arrayOf(PropTypes.shape({
      rootCause: PropTypes.string,
      response_count: PropTypes.number,
      percentage: PropTypes.number,
    })),
  }).isRequired,
};

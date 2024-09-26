import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import LineGraph from './LineGraph';
import WidgetContainer from '../components/WidgetContainer';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetSorting from '../hooks/useWidgetSorting';
import useWidgetExport from '../hooks/useWidgetExport';
import { EMPTY_ARRAY } from '../Constants';
import useWidgetMenuItems from '../hooks/useWidgetMenuItems';

// the following constants are to configure the table
// we store them outside of the component to avoid
// re-creating them on every render, since they will not mutate
const TABLE_HEADINGS = [
  'In person (AR\'s)',
  'In person (Percentage)',
  'Virtual (AR\'s)',
  'Virtual (Percentage)',
  'Hybrid (AR\'s)',
  'Hybrid (Percentage)',
];

const DEFAULT_SORT_CONFIG = {
  sortBy: '1',
  direction: 'desc',
  activePage: 1,
};

const KEY_COLUMNS = ['Months'];

export default function DeliveryMethodGraph({ data }) {
  const widgetRef = useRef(null);
  const capture = useMediaCapture(widgetRef, 'Total TTA hours');
  const [showTabularData, setShowTabularData] = useState(false);
  const [checkboxes, setCheckboxes] = useState({});

  // we have to store this is in state, despite
  // it being a prop, because of other dependencies
  // in the react graph
  const [traces, setTraces] = useState([]);
  const [tabularData, setTabularData] = useState([]);
  const [totals, setTotals] = useState({
    totalInPerson: 0,
    averageInPersonPercentage: 0,
    totalVirtualCount: 0,
    averageVirtualPercentage: 0,
    totalHybridCount: 0,
    averageHybridPercentage: 0,
  });

  const {
    requestSort,
    sortConfig,
  } = useWidgetSorting(
    'qa-dashboard-delivery-method', // localStorageKey
    DEFAULT_SORT_CONFIG, // defaultSortConfig
    tabularData, // dataToUse
    setTabularData, // setDataToUse
    EMPTY_ARRAY, // stringColumns
    EMPTY_ARRAY, // dateColumns
    KEY_COLUMNS, // keyColumns
  );

  const { exportRows } = useWidgetExport(
    tabularData,
    TABLE_HEADINGS,
    checkboxes,
    'Months',
    'DeliveryMethod',
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
      total_in_person_count: totalInPerson,
      average_in_person_percentage: averageInPersonPercentage,
      total_virtual_count: totalVirtualCount,
      average_virtual_percentage: averageVirtualPercentage,
      total_hybrid_count: totalHybridCount,
      average_hybrid_percentage: averageHybridPercentage,
    } = data;

    const tableData = [];
    // use a map for quick lookup
    const traceMap = new Map();
    traceMap.set('In person', {
      x: [], y: [], name: 'In person', traceOrder: 1,
    });
    traceMap.set('Virtual', {
      x: [], y: [], name: 'Virtual', traceOrder: 2,
    });
    traceMap.set('Hybrid', {
      x: [], y: [], name: 'Hybrid', traceOrder: 3,
    });

    records.forEach((dataset, index) => {
      tableData.push({
        heading: dataset.month,
        sortKey: index + 1,
        id: index + 1,
        data: [
          {
            value: dataset.in_person_count,
            title: 'In person (AR\'s)',
            sortKey: 'In_person_(AR\'s)',
          },
          {
            value: dataset.in_person_percentage,
            title: ' In person (Percentage)',
            sortKey: 'In_person_(Percentage)',
          },
          {
            value: dataset.virtual_count,
            title: 'Virtual (AR\'s)',
            sortKey: 'Virtual_(AR\'s)',
          },
          {
            value: dataset.virtual_percentage,
            title: 'Virtual (Percentage)',
            sortKey: 'Virtual_(Percentage)',
          },
          {
            value: dataset.hybrid_count,
            title: 'Hybrid (AR\'s)',
            sortKey: 'Hybrid_(AR\'s)',
          },
          {
            value: dataset.hybrid_percentage,
            title: 'Hybrid (Percentage)',
            sortKey: 'Hybrid_(Percentage)',
          },
        ],
      });

      traceMap.get('In person').x.push(dataset.month);
      traceMap.get('In person').y.push(dataset.in_person_percentage);

      traceMap.get('Virtual').x.push(dataset.month);
      traceMap.get('Virtual').y.push(dataset.virtual_percentage);

      traceMap.get('Hybrid').x.push(dataset.month);
      traceMap.get('Hybrid').y.push(dataset.hybrid_percentage);
    });

    setTraces(Array.from(traceMap.values()));
    setTabularData(tableData);
    setTotals({
      totalInPerson,
      averageInPersonPercentage,
      totalVirtualCount,
      averageVirtualPercentage,
      totalHybridCount,
      averageHybridPercentage,
    });
  }, [data]);
  // end use effect

  const tableConfig = useMemo(() => ({
    title: 'Delivery method',
    caption: 'TTA broken down by delivery method into total hours and percentages',
    enableCheckboxes: true,
    enableSorting: true,
    showTotalColumn: false,
    data: tabularData,
    requestSort,
    sortConfig,
    checkboxes,
    setCheckboxes,
    firstHeading: 'Months',
    headings: TABLE_HEADINGS,
    footer: {
      showFooter: true,
      data: [
        '', // empty string for the first column, checkboxes
        'Total',
        String(totals.totalInPerson),
        String(totals.averageInPersonPercentage),
        String(totals.totalVirtualCount),
        String(totals.averageVirtualPercentage),
        String(totals.totalHybridCount),
        String(totals.averageHybridPercentage),
      ],
    },
  }), [
    checkboxes,
    requestSort,
    tabularData,
    totals.averageHybridPercentage,
    totals.averageInPersonPercentage,
    totals.averageVirtualPercentage,
    totals.totalHybridCount,
    totals.totalInPerson,
    totals.totalVirtualCount,
    sortConfig,
  ]);

  const menuItems = useWidgetMenuItems(
    showTabularData,
    setShowTabularData,
    capture,
    checkboxes,
    exportRows,
  );

  return (
    <WidgetContainer
      loading={false}
      title="Delivery method"
      subtitle="How much TTA is being delivered in-person, virtually, or hybrid as reported on Activity Reports"
      subtitle2="11,510 Activity reports"
      menuItems={menuItems}
    >
      <LineGraph
        showTabularData={showTabularData}
        data={traces}
        xAxisTitle="Months"
        yAxisTitle="Percentage"
        legendConfig={[
          {
            label: 'In person', selected: true, shape: 'circle', id: 'show-in-person-checkbox',
          },
          {
            label: 'Hybrid', selected: true, shape: 'square', id: 'show-hybrid-checkbox',
          },
          {
            label: 'Virtual', selected: true, shape: 'triangle', id: 'show-virtual-checkbox',
          },
        ]}
        tableConfig={tableConfig}
        widgetRef={widgetRef}
      />
    </WidgetContainer>
  );
}

DeliveryMethodGraph.propTypes = {
  data: PropTypes.shape({
    total_in_person_count: PropTypes.number,
    average_in_person_percentage: PropTypes.number,
    total_virtual_count: PropTypes.number,
    average_virtual_percentage: PropTypes.number,
    total_hybrid_count: PropTypes.number,
    average_hybrid_percentage: PropTypes.number,
    records: PropTypes.arrayOf(
      PropTypes.shape({
        month: PropTypes.string,
        in_person_count: PropTypes.number,
        virtual_count: PropTypes.number,
        hybrid_count: PropTypes.number,
        in_person_percentage: PropTypes.number,
        virtual_percentage: PropTypes.number,
        hybrid_percentage: PropTypes.number,
      }),
    ),
  }),
};

DeliveryMethodGraph.defaultProps = {
  data: null,
};

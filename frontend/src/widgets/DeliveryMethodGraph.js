import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { format, parse } from 'date-fns';
import LineGraph from './LineGraph';
import WidgetContainer from '../components/WidgetContainer';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetSorting from '../hooks/useWidgetSorting';
import useWidgetExport from '../hooks/useWidgetExport';
import { EMPTY_ARRAY } from '../Constants';
import useWidgetMenuItems from '../hooks/useWidgetMenuItems';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import SecondarySubtitleWithFilterWarning from '../components/WidgetContainer/SecondarySubtitleWithFilterWarning';

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
const EXPORT_NAME = 'Delivery Method';

const TRACE_IDS = {
  IN_PERSON: 'in-person',
  VIRTUAL: 'virtual',
  HYBRID: 'hybrid',
};

export default function DeliveryMethodGraph({ data }) {
  const widgetRef = useRef(null);
  const capture = useMediaCapture(widgetRef, EXPORT_NAME);
  const [showTabularData, setShowTabularData] = useState(false);
  const [checkboxes, setCheckboxes] = useState({});
  const [displayFilteredReports, setDisplayFilteredReports] = useState(0);
  const [showFiltersNotApplicable, setShowFiltersNotApplicable] = useState(false);

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
    EXPORT_NAME,
  );

  // records is an array of objects
  // and the other fields need to be converted to camelCase
  useEffect(() => {
    if (!data) {
      setTabularData([]);
      setTraces([]);
      setTotals({
        totalInPerson: 0,
        averageInPersonPercentage: 0,
        totalVirtualCount: 0,
        averageVirtualPercentage: 0,
        totalHybridCount: 0,
        averageHybridPercentage: 0,
      });

      return;
    }

    // take the API data
    // and transform it into the format
    // that the LineGraph component expects
    // (an object for each trace)
    // and the table (an array of objects in the format defined by proptypes)

    const {
      records: unfilteredRecords,
      filteredReports,
      showDashboardFiltersNotApplicable: showDashboardFiltersNotApplicableProp,
    } = data;
    const total = [...unfilteredRecords].pop();
    const records = unfilteredRecords.filter((record) => record.month !== 'Total');

    const {
      in_person_count: totalInPerson,
      in_person_percentage: averageInPersonPercentage,
      virtual_count: totalVirtualCount,
      virtual_percentage: averageVirtualPercentage,
      hybrid_count: totalHybridCount,
      hybrid_percentage: averageHybridPercentage,
    } = total;

    const tableData = [];
    // use a map for quick lookup
    const traceMap = new Map();
    traceMap.set('Virtual', {
      x: [], y: [], name: 'Virtual', traceOrder: 0, id: TRACE_IDS.VIRTUAL, trace: 'triangle',
    });
    traceMap.set('In person', {
      x: [], y: [], name: 'In person', traceOrder: 1, id: TRACE_IDS.IN_PERSON, trace: 'circle',
    });
    traceMap.set('Hybrid', {
      x: [], y: [], name: 'Hybrid', traceOrder: 2, id: TRACE_IDS.HYBRID, trace: 'square',
    });

    (records || []).forEach((dataset, index) => {
      tableData.push({
        heading: format(parse(dataset.month, 'yyyy-MM-dd', new Date()), 'MMM yyyy'),
        sortKey: index + 1,
        id: index + 1,
        data: [
          {
            value: dataset.in_person_count,
            title: 'In person (AR\'s)',
            sortKey: 'In_person_(AR\'s)',
          },
          {
            value: `${String(dataset.in_person_percentage)}%`,
            title: ' In person (Percentage)',
            sortKey: 'In_person_(Percentage)',
          },
          {
            value: dataset.virtual_count,
            title: 'Virtual (AR\'s)',
            sortKey: 'Virtual_(AR\'s)',
          },
          {
            value: `${String(dataset.virtual_percentage)}%`,
            title: 'Virtual (Percentage)',
            sortKey: 'Virtual_(Percentage)',
          },
          {
            value: dataset.hybrid_count,
            title: 'Hybrid (AR\'s)',
            sortKey: 'Hybrid_(AR\'s)',
          },
          {
            value: `${String(dataset.hybrid_percentage)}%`,
            title: 'Hybrid (Percentage)',
            sortKey: 'Hybrid_(Percentage)',
          },
        ],
      });

      traceMap.get('In person').x.push(format(parse(dataset.month, 'yyyy-MM-dd', new Date()), 'MMM yyyy'));
      traceMap.get('In person').y.push(dataset.in_person_percentage);

      traceMap.get('Virtual').x.push(format(parse(dataset.month, 'yyyy-MM-dd', new Date()), 'MMM yyyy'));
      traceMap.get('Virtual').y.push(dataset.virtual_percentage);

      traceMap.get('Hybrid').x.push(format(parse(dataset.month, 'yyyy-MM-dd', new Date()), 'MMM yyyy'));
      traceMap.get('Hybrid').y.push(dataset.hybrid_percentage);
    });
    setShowFiltersNotApplicable(showDashboardFiltersNotApplicableProp);
    const traceArray = Array.from(traceMap.values());
    traceArray.sort((a, b) => a.traceOrder - b.traceOrder);
    setTraces(traceArray);
    setDisplayFilteredReports(filteredReports);
    setTabularData(tableData);
    setTotals({
      totalInPerson: totalInPerson ? totalInPerson.toLocaleString('en-us') : 0,
      averageInPersonPercentage: `${averageInPersonPercentage}%`,
      totalVirtualCount: totalVirtualCount ? totalVirtualCount.toLocaleString('en-us') : 0,
      averageVirtualPercentage: `${averageVirtualPercentage}%`,
      totalHybridCount: totalHybridCount ? totalHybridCount.toLocaleString('en-us') : 0,
      averageHybridPercentage: `${averageHybridPercentage}%`,
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

  const subtitle = (
    <div className="margin-bottom-3">
      <WidgetContainerSubtitle marginY={0}>
        How much TTA is being delivered in-person, virtually,
        {' '}
        or hybrid as reported on Activity Reports
      </WidgetContainerSubtitle>
      <SecondarySubtitleWithFilterWarning showFiltersNotApplicable={showFiltersNotApplicable}>
        {`${displayFilteredReports ? displayFilteredReports.toLocaleString('en-us') : '0'} Activity reports`}
      </SecondarySubtitleWithFilterWarning>
    </div>
  );

  return (
    <WidgetContainer
      loading={false}
      title="Delivery method"
      subtitle={subtitle}
      menuItems={menuItems}
      titleMargin={{ bottom: 1 }}
    >
      <LineGraph
        showTabularData={showTabularData}
        data={traces}
        xAxisTitle="Months"
        yAxisTitle="Percentage"
        legendConfig={[
          {
            label: 'In person', selected: true, shape: 'circle', id: 'show-in-person-checkbox', traceId: TRACE_IDS.IN_PERSON,
          },
          {
            label: 'Virtual', selected: true, shape: 'triangle', id: 'show-virtual-checkbox', traceId: TRACE_IDS.VIRTUAL,
          },
          {
            label: 'Hybrid', selected: true, shape: 'square', id: 'show-hybrid-checkbox', traceId: TRACE_IDS.HYBRID,
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
    filteredReports: PropTypes.number,
    showDashboardFiltersNotApplicable: PropTypes.bool,
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

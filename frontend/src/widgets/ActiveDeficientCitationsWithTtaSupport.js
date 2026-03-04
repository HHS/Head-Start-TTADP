import React, {
  useRef,
  useState,
  useEffect,
} from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import LineGraph from './LineGraph';
import WidgetContainer from '../components/WidgetContainer';
import useMediaCapture from '../hooks/useMediaCapture';
import { arrayExistsAndHasLength, NOOP } from '../Constants';

const EXPORT_NAME = 'Active Deficient Citations with TTA Support';

// todo: publish in common
const TRACE_IDS = {
  ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT: 'active-deficiencies-with-tta-support',
  ALL_ACTIVE_DEFICIENCIES: 'all-active-deficiencies',
};

export function ActiveDeficientCitationsWithTtaSupportWidget({ data }) {
  const widgetRef = useRef(null);
  const capture = useMediaCapture(widgetRef, EXPORT_NAME);
  const [showTabularData, setShowTabularData] = useState(false);

  const [columnHeadings, setColumnHeadings] = useState([]);
  const [tableRows, setTableRows] = useState([]);

  useEffect(() => {
    if (!arrayExistsAndHasLength(data)) {
      return;
    }

    const headings = data[0].x.map((x, index) => {
      if (data[0].month[index]) {
        return `${data[0].month[index]} ${x}`;
      }
      return x;
    });

    const rows = data.map((row) => ({
      heading: row.name,
      data: row.y.map((y) => ({
        title: row.name,
        value: `${(Math.round(y * 10) / 10).toString()}`,
      })),
    }));

    setColumnHeadings(headings);
    setTableRows(rows);
  }, [data]);

  const menuItems = [{
    label: showTabularData ? 'Display graph' : 'Display table',
    onClick: () => setShowTabularData(!showTabularData),
  }];

  if (!showTabularData) {
    menuItems.push({
      label: 'Save screenshot',
      onClick: capture,
      id: 'rd-save-screenshot',
    });
  }

  return (
    <WidgetContainer
      loading={false}
      title="Active Deficient Citations with TTA Support"
      showHeaderBorder={false}
      menuItems={menuItems}
    >
      <LineGraph
        showTabularData={showTabularData}
        data={data}
        xAxisTitle="Date range"
        yAxisTitle="Number of hours"
        legendConfig={[
          {
            label: 'Active Deficiencies with TTA support', selected: true, shape: 'circle', id: `${TRACE_IDS.ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT}-checkbox`, traceId: TRACE_IDS.ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT,
          },
          {
            label: 'All active Deficiencies', selected: true, shape: 'square', id: `${TRACE_IDS.ALL_ACTIVE_DEFICIENCIES}-checkbox`, traceId: TRACE_IDS.ALL_ACTIVE_DEFICIENCIES,
          },
        ]}
        tableConfig={{
          data: tableRows,
          title: 'TTA Provided',
          firstHeading: 'TTA Provided',
          caption: 'Total TTA hours by date and type',
          enableCheckboxes: false,
          enableSorting: false,
          showTotalColumn: false,
          requestSort: NOOP,
          headings: columnHeadings,
          footer: {
            showFooter: false,
          },
        }}
        widgetRef={widgetRef}
      />
    </WidgetContainer>
  );
}

ActiveDeficientCitationsWithTtaSupportWidget.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        x: PropTypes.arrayOf(PropTypes.string),
        y: PropTypes.arrayOf(PropTypes.number),
      }),
    ), PropTypes.shape({}),
  ]),
};

ActiveDeficientCitationsWithTtaSupportWidget.defaultProps = {
  data: [
    {
      name: 'Active Deficiencies with TTA support', x: [], y: [], month: '',
    },
    {
      name: 'All active Deficiencies', x: [], y: [], month: '',
    },
  ],
};

export default withWidgetData(ActiveDeficientCitationsWithTtaSupportWidget, 'activeDeficientCitationsWithTtaSupport');

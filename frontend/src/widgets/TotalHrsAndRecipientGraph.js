import React, {
  useRef,
  useState,
  useEffect,
} from 'react';
import PropTypes from 'prop-types';
import { TOTAL_HOURS_AND_RECIPIENT_GRAPH_TRACE_IDS as TRACE_IDS } from '@ttahub/common';
import withWidgetData from './withWidgetData';
import LineGraph from './LineGraph';
import WidgetContainer from '../components/WidgetContainer';
import useMediaCapture from '../hooks/useMediaCapture';
import { arrayExistsAndHasLength, NOOP } from '../Constants';

const EXPORT_NAME = 'Total TTA hours';

export function TotalHrsAndRecipientGraph({ data, hideYAxis }) {
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
      title="Total TTA hours"
      showHeaderBorder={false}
      menuItems={menuItems}
    >
      <LineGraph
        showTabularData={showTabularData}
        data={data}
        hideYAxis={hideYAxis}
        xAxisTitle="Date range"
        yAxisTitle="Number of hours"
        legendConfig={[
          {
            label: 'Technical Assistance', selected: true, shape: 'circle', id: 'show-ta-checkbox', traceId: TRACE_IDS.TECHNICAL_ASSISTANCE,
          },
          {
            label: 'Training', selected: true, shape: 'square', id: 'show-training-checkbox', traceId: TRACE_IDS.TRAINING,
          },
          {
            label: 'Both', selected: true, shape: 'triangle', id: 'show-both-checkbox', traceId: TRACE_IDS.BOTH,
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

TotalHrsAndRecipientGraph.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        x: PropTypes.arrayOf(PropTypes.string),
        y: PropTypes.arrayOf(PropTypes.number),
      }),
    ), PropTypes.shape({}),
  ]),
  hideYAxis: PropTypes.bool,
};

TotalHrsAndRecipientGraph.defaultProps = {
  hideYAxis: false,
  data: [
    {
      name: 'Training', x: [], y: [], month: '',
    },
    {
      name: 'Technical Assistance', x: [], y: [], month: '',
    },
    {
      name: 'Both', x: [], y: [], month: '',
    },
  ],
};

export default withWidgetData(TotalHrsAndRecipientGraph, 'totalHrsAndRecipientGraph');

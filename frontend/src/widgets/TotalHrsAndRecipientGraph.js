import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import LineGraph from './LineGraph';
import WidgetContainer from '../components/WidgetContainer';
import useMediaCapture from '../hooks/useMediaCapture';

export function TotalHrsAndRecipientGraph({ data, hideYAxis }) {
  const widgetRef = useRef(null);
  const capture = useMediaCapture(widgetRef, 'Total TTA hours');
  const [showTabularData, setShowTabularData] = useState(false);

  const menuItems = [{
    label: showTabularData ? 'Display graph' : 'Display table',
    onClick: () => setShowTabularData(!showTabularData),
  }];

  if (!showTabularData) {
    menuItems.push({
      label: 'Save screenshot',
      onClick: capture,
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
            label: 'Technical Assistance', selected: true, shape: 'circle', id: 'show-ta-checkbox',
          },
          {
            label: 'Training', selected: true, shape: 'square', id: 'show-training-checkbox',
          },
          {
            label: 'Both', selected: true, shape: 'triangle', id: 'show-both-checkbox',
          },
        ]}
        tableConfig={{
          title: 'TTA Provided',
          caption: 'Total TTA hours by date and type',
          enableCheckboxes: false,
          enableSorting: false,
          showTotalColumn: false,
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

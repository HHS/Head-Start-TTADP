import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import LineGraph from './LineGraph';
import WidgetContainer from '../components/WidgetContainer';
import useMediaCapture from '../hooks/useMediaCapture';

export default function DeliveryMethodGraph({ data }) {
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
      title="Delivery method"
      subtitle="How much TTA is being delivered in-person, virtually, or hybrid as reported on Activity Reports"
      subtitle2="11,510 Activity reports"
      menuItems={menuItems}
    >
      <LineGraph
        showTabularData={showTabularData}
        data={data}
        xAxisTitle="Months"
        yAxisTitle="Percentage"
        legendConfig={[
          {
            label: 'In person', selected: true, shape: 'circle', id: 'show-in-person-checkbox',
          },
          {
            label: 'Virtual', selected: true, shape: 'triangle', id: 'show-virtual-checkbox',
          },
          {
            label: 'Hybrid', selected: true, shape: 'square', id: 'show-hybrid-checkbox',
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

DeliveryMethodGraph.propTypes = {
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

DeliveryMethodGraph.defaultProps = {
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

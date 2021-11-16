import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import formatNumber from './WidgetHelper';
import TableWidget from './TableWidget';

const renderTargetPopulationTable = (data) => {
  if (data && Array.isArray(data) && data.length > 0) {
    return data.map((population) => (
      <tr key={`population_row_${population.name}`}>
        <td>
          {population.name}
        </td>
        <td>
          {formatNumber(population.count)}
        </td>
      </tr>
    ));
  }
  return null;
};

export function TargetPopulationTable({ data, loading }) {
  return (
    <TableWidget
      data={data}
      headings={['Target Population', '# of Activities']}
      loading={loading}
      loadingLabel="Target populations in activity reports loading"
      title="Target Populations in Activity Reports"
      renderData={renderTargetPopulationTable}
      showDateTime={false}
    />
  );
}

TargetPopulationTable.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        count: PropTypes.number,
      }),
    ), PropTypes.shape({}),
  ]),
  dateTime: PropTypes.shape({
    timestamp: PropTypes.string,
    label: PropTypes.string,
  }),
  loading: PropTypes.bool.isRequired,
};

TargetPopulationTable.defaultProps = {
  dateTime: {
    timestamp: '',
    label: '',
  },
  data: [],
};

export default withWidgetData(TargetPopulationTable, 'targetPopulationTable');

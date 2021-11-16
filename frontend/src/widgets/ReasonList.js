import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import formatNumber from './WidgetHelper';
import TableWidget from './TableWidget';

const renderReasonList = (data) => {
  if (data && Array.isArray(data) && data.length > 0) {
    return data.map((reason) => (
      <tr key={`reason_list_row_${reason.name}`}>
        <td>
          {reason.name}
        </td>
        <td>
          {formatNumber(reason.count)}
        </td>
      </tr>
    ));
  }
  return null;
};

function ReasonList({ data, dateTime, loading }) {
  return (
    <TableWidget
      data={data}
      headings={['Reason', '# of Activities']}
      dateTime={dateTime}
      loading={loading}
      loadingLabel="Reason list loading"
      title="Reasons in Activity Reports"
      renderData={renderReasonList}
    />
  );
}

ReasonList.propTypes = {
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

ReasonList.defaultProps = {
  dateTime: {
    timestamp: '',
    label: '',
  },
  data: [],
};

export default withWidgetData(ReasonList, 'reasonList');

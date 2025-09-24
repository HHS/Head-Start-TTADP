import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import TableWidget from './TableWidget';
import './ReasonsList.scss';

const renderReasonList = (data) => {
  if (data && Array.isArray(data) && data.length > 0) {
    return data.map((reason) => (
      <tr key={`reason_list_row_${reason.name}`}>
        <td>
          {reason.name}
        </td>
        <td>
          {reason.count}
        </td>
      </tr>
    ));
  }
  return null;
};

export function ReasonListTable({
  data, loading, title,
}) {
  return (
    <div className="smarthub-reasons-list">
      <TableWidget
        className="height-full margin-bottom-0"
        data={data}
        headings={['Reason', 'Number of activities']}
        loading={loading}
        loadingLabel="Reason list loading"
        title={title}
        renderData={renderReasonList}
      />
    </div>
  );
}

ReasonListTable.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        count: PropTypes.number,
      }),
    ), PropTypes.shape({}),
  ]),
  loading: PropTypes.bool.isRequired,
  title: PropTypes.string,
};

ReasonListTable.defaultProps = {
  data: [],
  title: 'Reasons in Activity Reports',
};

export default withWidgetData(ReasonListTable, 'reasonList');

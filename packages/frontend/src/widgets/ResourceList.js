import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import TableWidget from './TableWidget';

const renderResourceList = (data) => {
  if (data && Array.isArray(data) && data.length > 0) {
    const limitTDWith = { 'word-wrap': 'break-word', 'max-width': '500px' };
    return data.map((resource) => (
      <tr key={`resource_list_row_${resource.url}`}>
        <td style={limitTDWith}>
          <a href={resource.url}>{resource.name}</a>
        </td>
        <td>
          {resource.reportCount}
        </td>
        <td>
          {resource.participantCount}
        </td>
        <td>
          {resource.recipientCount}
        </td>
      </tr>
    ));
  }
  return null;
};

function ResourceList({ data, loading }) {
  return (
    <TableWidget
      data={data}
      headings={['Resource', 'Number of activities', 'Number of participants', 'Number of recipients']}
      loading={loading}
      loadingLabel="Resource list loading"
      title="Resources in Activity Reports"
      renderData={renderResourceList}
    />
  );
}

ResourceList.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        count: PropTypes.number,
      }),
    ), PropTypes.shape({}),
  ]),
  loading: PropTypes.bool.isRequired,
};

ResourceList.defaultProps = {
  data: [],
};

export default withWidgetData(ResourceList, 'resourceList');

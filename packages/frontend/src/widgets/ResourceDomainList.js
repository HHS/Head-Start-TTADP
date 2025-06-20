import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import TableWidget from './TableWidget';

const renderResourceDomainList = (data) => {
  if (data && Array.isArray(data) && data.length > 0) {
    return data.map((resource) => (
      <tr key={`resource_domain_list_row_${resource.domain}`}>
        <td>
          {resource.domain}
        </td>
        <td>
          {resource.resourceCount}
        </td>
        <td>
          {resource.reportCount}
        </td>
        <td>
          {resource.recipientCount}
        </td>
      </tr>
    ));
  }
  return null;
};

function ResourceDomainList({ data, loading }) {
  return (
    <TableWidget
      data={data}
      headings={['Domain', 'Number of resources', 'Number of activities', 'Number of recipients']}
      loading={loading}
      loadingLabel="Resource domain list loading"
      title="Resource Domains in Activity Reports"
      renderData={renderResourceDomainList}
    />
  );
}

ResourceDomainList.propTypes = {
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

ResourceDomainList.defaultProps = {
  data: [],
};

export default withWidgetData(ResourceDomainList, 'resourceDomainList');

import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import HorizontalTableWidget from './HorizontalTableWidget';

function ResourceUse({ data, loading, headers }) {
  return (
    <HorizontalTableWidget
      title="Resource use"
      subtitle="Showing the 10 resources cited most often on Activity Reports"
      headers={headers}
      data={data}
      loading={loading}
      loadingLabel="Resource use loading"
      firstHeading="Resource URL:"
    />
  );
}

ResourceUse.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string,
        value: PropTypes.number,
      }),
    ), PropTypes.shape({}),
  ]),
  loading: PropTypes.bool.isRequired,
  headers: PropTypes.arrayOf(PropTypes.string),
};

ResourceUse.defaultProps = {
  data: [],
  headers: [],
};

export default withWidgetData(ResourceUse, 'resourceList');

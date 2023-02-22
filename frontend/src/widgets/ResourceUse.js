import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import HorizontalTableWidget from './HorizontalTableWidget';

function ResourceUse({ data, loading }) {
  return (
    <HorizontalTableWidget
      title="Resource use"
      subtitle="Showing the 10 resources cited most often on Activity Reports"
      headers={data.headers}
      data={data.resources}
      loading={loading}
      loadingLabel="Resource use loading"
      firstHeading="Resource URL:"
    />
  );
}

ResourceUse.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.shape({
      headers: PropTypes.arrayOf(PropTypes.string),
      resources: PropTypes.arrayOf(
        PropTypes.shape({
          title: PropTypes.string,
          value: PropTypes.number,
        }),
      ),
    }),
    PropTypes.shape({}),
  ]),
  loading: PropTypes.bool.isRequired,
};
ResourceUse.defaultProps = {
  data: { headers: [], resources: [] },
};

export default withWidgetData(ResourceUse, 'resourceUse');

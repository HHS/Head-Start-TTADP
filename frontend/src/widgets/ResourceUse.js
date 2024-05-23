import React from 'react';
import PropTypes from 'prop-types';
import HorizontalTableWidget from './HorizontalTableWidget';
import WidgetContainer from '../components/WidgetContainer';

function ResourceUse({ data, loading }) {
  return (
    <WidgetContainer
      title="Resource use"
      subtitle="Showing the 10 resources cited most often on Activity Reports"
      loading={loading}
      loadingLabel="Resource use loading"
      showPagingBottom={false}
    >
      <HorizontalTableWidget
        id="resourceUse"
        headers={data.headers}
        data={data.resources.map((d) => ({ ...d, heading: d.title || d.heading, link: d.heading }))}
        firstHeading="Resource URL"
      />
    </WidgetContainer>
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

export default ResourceUse;

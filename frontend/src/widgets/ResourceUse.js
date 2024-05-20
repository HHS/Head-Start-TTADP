import React from 'react';
import PropTypes from 'prop-types';
import HorizontalTableWidget from './HorizontalTableWidget';
import WidgetContainer from '../components/WidgetContainer';

const iPDLink = 'https://eclkc.ohs.acf.hhs.gov/professional-development/individualized-professional-development-ipd-portfolio/individualized-professional-development-ipd-portfolio';

function ResourceUse({ data, loading }) {
  const updatedData = { ...data };
  const iPDIndex = updatedData.resources.findIndex((d) => d.heading === iPDLink);
  if (iPDIndex > -1) {
    const ipdLink = 'course-dashboard';
    updatedData.resources[iPDIndex].internalRedirect = ipdLink;
  }

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
        data={updatedData.resources.map(
          (d) => ({ ...d, heading: d.title || d.heading, link: d.heading }),
        )}
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
          internalRedirect: PropTypes.string,
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

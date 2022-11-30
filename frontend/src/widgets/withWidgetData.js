/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import fetchWidget from '../fetchers/Widgets';
import { filtersToQueryString } from '../utils';

/*
  `withWidgetData` wraps widgets providing the widget with data
  when successfully retrieved from the API. It handles error and
  loading states.
*/
const withWidgetData = (Widget, widgetId) => {
  const WidgetWrapper = (props) => {
    const [loading, updateLoading] = useState(true);
    const [error, updateError] = useState('');
    const [data, updateData] = useState();

    const { filters } = props;

    useEffect(() => {
      const fetch = async () => {
        try {
          updateLoading(true);
          const query = filtersToQueryString(filters);
          /* let fetchedData;
          if (widgetId === 'resourcesDashboardOverview') {
            console.log('Path 1: ', widgetId);
            fetchedData = {
              numEclkc: '50',
              totalNumEclkc: '100',
              numEclkcPercentage: '50%',
              numNonEclkc: '40',
              totalNumNonEclkc: '200',
              numNonEclkcPercentage: '20%',
              numNoResources: '30',
              totalNumNoResources: '300',
              numNoResourcesPercentage: '10%',
            };
          } else if (widgetId === 'resourceList') {
            console.log('Path 2: ', widgetId);
            fetchedData = [
              { name: 'https://test1.gov', count: 20 },
              { name: 'https://test2.gov', count: 15 },
              { name: 'https://test3.gov', count: 10 },
              { name: 'https://test4.gov', count: 9 },
              { name: 'https://test5.gov', count: 8 },
              { name: 'https://test6.gov', count: 7 },
            ];
          } else {
            fetchedData = await fetchWidget(widgetId, query);
          } */
          const fetchedData = await fetchWidget(widgetId, query);
          updateData(fetchedData);
          updateError('');
        } catch (e) {
          updateError('Unable to load widget');
        } finally {
          updateLoading(false);
        }
      };

      fetch();
    }, [filters]);

    if (error) {
      return (
        <div>
          {error}
        </div>
      );
    }

    return <Widget data={data} loading={loading} {...props} />;
  };

  WidgetWrapper.propTypes = {
    filters: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string,
      topic: PropTypes.string,
      condition: PropTypes.string,
      query: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })),
  };

  WidgetWrapper.defaultProps = {
    filters: [],
  };

  return WidgetWrapper;
};

export default withWidgetData;

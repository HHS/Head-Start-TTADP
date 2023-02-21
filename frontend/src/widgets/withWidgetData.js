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
          let fetchedData;
          console.log('ID: ', widgetId);
          if (widgetId === 'resourceList') {
            fetchedData = {
              report: {
                numResources: '6,135',
                num: '17,914',
                percentResources: '1.65%',
              },
              resource: {
                numEclkc: '818',
                num: '365',
                percentEclkc: '.66%',
              },
              recipient: {
                numResources: '148',
              },
              participant: {
                numParticipants: '565',
              },
            };
          } else {
            fetchedData = await fetchWidget(widgetId, query);
          }
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

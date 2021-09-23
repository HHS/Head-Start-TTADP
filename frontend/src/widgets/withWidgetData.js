/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import fetchWidget from '../fetchers/Widgets';
import { filtersToQueryString } from '../pages/Landing/Filter';

/*
  `withWidgetData` wraps widgets providing the widget with data
  when successfully retrieved from the API. It handles error and
  loading states and (only temporarily) accepts loading and error
  overrides so loading and error states can be worked on.
*/
const withWidgetData = (Widget, widgetId) => {
  const WidgetWrapper = (props) => {
    const [loading, updateLoading] = useState(true);
    const [error, updateError] = useState('');
    const [data, updateData] = useState();

    const {
      filters, errorOverride,
    } = props;

    useEffect(() => {
      const fetch = async () => {
        try {
          updateLoading(true);
          const query = filtersToQueryString(filters);
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

    if (error || errorOverride) {
      return (
        <div>
          {error || 'Errors set to always show'}
        </div>
      );
    }

    return <Widget data={data} loading={loading} {...props} />;
  };

  WidgetWrapper.propTypes = {
    errorOverride: PropTypes.bool,
    filters: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string,
      topic: PropTypes.string,
      condition: PropTypes.string,
      query: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })),
  };

  WidgetWrapper.defaultProps = {
    errorOverride: false,
    filters: [],
  };

  return WidgetWrapper;
};

export default withWidgetData;

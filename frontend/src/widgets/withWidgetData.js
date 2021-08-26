/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import fetchWidget from '../fetchers/Widgets';

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
      dateRange, region, allRegions, errorOverride,
    } = props;

    const selectedRegion = region || allRegions[0];

    useEffect(() => {
      const fetch = async () => {
        try {
          updateLoading(true);
          const fetchedData = await fetchWidget(widgetId, selectedRegion, dateRange);
          updateData(fetchedData);
          updateError('');
        } catch (e) {
          updateError('Unable to load widget');
        } finally {
          updateLoading(false);
        }
      };

      fetch();
    }, [selectedRegion, dateRange]);

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
    region: PropTypes.number,
    allRegions: PropTypes.arrayOf(PropTypes.number).isRequired,
    errorOverride: PropTypes.bool,
    startDate: PropTypes.string,
    dateRange: PropTypes.string,
  };

  WidgetWrapper.defaultProps = {
    errorOverride: false,
    region: 0,
    startDate: '',
    dateRange: '',
  };

  return WidgetWrapper;
};

export default withWidgetData;

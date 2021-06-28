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
    const [data, updateData] = useState({});

    const {
      region, allRegions, loadingOverride, skipLoading, errorOverride,
    } = props;
    useEffect(() => {
      const fetch = async () => {
        try {
          updateLoading(true);
          const requestedRegion = region || allRegions[0];
          const fetchedData = await fetchWidget(widgetId, requestedRegion);
          updateData(fetchedData);
          updateError('');
        } catch (e) {
          updateError('Unable to load widget');
        } finally {
          updateLoading(false);
        }
      };
      fetch();
    }, [region, allRegions]);

    if ((loading || loadingOverride) && !skipLoading) {
      return (
        <div>
          loading...
        </div>
      );
    }

    if (error || errorOverride) {
      return (
        <div>
          {error || 'Errors set to always show'}
        </div>
      );
    }

    return <Widget data={data} {...props} />;
  };

  WidgetWrapper.propTypes = {
    region: PropTypes.number,
    allRegions: PropTypes.arrayOf(PropTypes.number).isRequired,
    errorOverride: PropTypes.bool,
    loadingOverride: PropTypes.bool,
    skipLoading: PropTypes.bool,
  };

  WidgetWrapper.defaultProps = {
    errorOverride: false,
    loadingOverride: false,
    skipLoading: false,
    region: 0,
  };

  return WidgetWrapper;
};

export default withWidgetData;

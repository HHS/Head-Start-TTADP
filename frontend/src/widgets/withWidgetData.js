/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import fetchWidget from '../fetchers/Widgets';
import { filtersToQueryString } from '../utils';/*
  `withWidgetData` wraps widgets providing the widget with data
  when successfully retrieved from the API. It handles error and
  loading states.
*/
const withWidgetData = (Widget, widgetId) => {
  const WidgetWrapper = (props) => {
    const [loading, updateLoading] = useState(true);
    const [error, updateError] = useState('');
    const [data, updateData] = useState(); const { filters } = props; useEffect(() => {
      const fetch = async () => {
        try {
          updateLoading(true);
          const query = filtersToQueryString(filters);
          let fetchedData;
          if (widgetId === 'resourceDashboardOverview') {
            fetchedData = {
              report: {
                numResources: '8,135',
                num: '19,914',
                percentResources: '40.85%',
              },
              resource: {
                numEclkc: '1,819',
                num: '2,365',
                percentEclkc: '79.91%',
              },
              recipient: {
                numResources: '248',
              },
              participant: {
                numParticipants: '765',
              },
            };
          } else if (widgetId === 'resourceUse') {
            fetchedData = {
              headers: ['Jan-22', 'Feb-22', 'Mar-22', 'Apr-22', 'May-22', 'Jun-22', 'Jul-22', 'Aug-22', 'Sep-22', 'Oct-22', 'Nov-22', 'Dec-22'],
              resources: [
                {
                  heading: 'https://eclkc.ohs.acf.hhs.gov/school-readiness/effective-practice-guides/effective-practice-guides',
                  isUrl: 'true',
                  data: [
                    {
                      title: 'Jan-22',
                      value: '17',
                    },
                    {
                      title: 'Feb-22',
                      value: '18',
                    },
                    {
                      title: 'Mar-22',
                      value: '19',
                    },
                    {
                      title: 'Apr-22',
                      value: '19',
                    },
                    {
                      title: 'May-22',
                      value: '20',
                    },
                    {
                      title: 'Jun-22',
                      value: '21',
                    },
                    {
                      title: 'Jul-22',
                      value: '22',
                    },
                    {
                      title: 'Aug-22',
                      value: '23',
                    },
                    {
                      title: 'Sep-22',
                      value: '24',
                    },
                    {
                      title: 'Oct-22',
                      value: '25',
                    },
                    {
                      title: 'Nov-22',
                      value: '26',
                    },
                    {
                      title: 'Dec-22',
                      value: '27',
                    },
                    {
                      title: 'total',
                      value: '100',
                    },
                  ],
                },
                {
                  heading: 'https://test1.gov',
                  isUrl: 'true',
                  data: [
                    {
                      title: 'Jan-22',
                      value: '21',
                    },
                    {
                      title: 'Feb-22',
                      value: '22',
                    },
                    {
                      title: 'Mar-22',
                      value: '23',
                    },
                    {
                      title: 'Apr-22',
                      value: '19',
                    },
                    {
                      title: 'May-22',
                      value: '20',
                    },
                    {
                      title: 'Jun-22',
                      value: '21',
                    },
                    {
                      title: 'Jul-22',
                      value: '22',
                    },
                    {
                      title: 'Aug-22',
                      value: '23',
                    },
                    {
                      title: 'Sep-22',
                      value: '24',
                    },
                    {
                      title: 'Oct-22',
                      value: '25',
                    },
                    {
                      title: 'Nov-22',
                      value: '26',
                    },
                    {
                      title: 'Dec-22',
                      value: '27',
                    },
                    {
                      title: 'total',
                      value: '100',
                    },
                  ],
                },
                {
                  heading: 'Non URL',
                  isUrl: 'false',
                  data: [
                    {
                      title: 'Jan-22',
                      value: '25',
                    },
                    {
                      title: 'Feb-22',
                      value: '26',
                    },
                    {
                      title: 'Mar-22',
                      value: '27',
                    },
                    {
                      title: 'Apr-22',
                      value: '19',
                    },
                    {
                      title: 'May-22',
                      value: '20',
                    },
                    {
                      title: 'Jun-22',
                      value: '21',
                    },
                    {
                      title: 'Jul-22',
                      value: '22',
                    },
                    {
                      title: 'Aug-22',
                      value: '23',
                    },
                    {
                      title: 'Sep-22',
                      value: '24',
                    },
                    {
                      title: 'Oct-22',
                      value: '25',
                    },
                    {
                      title: 'Nov-22',
                      value: '26',
                    },
                    {
                      title: 'Dec-22',
                      value: '27',
                    },
                    {
                      title: 'total',
                      value: '100',
                    },
                  ],
                },
              ],
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
      }; fetch();
    }, [filters]); if (error) {
      return (
        <div>
          {error}
        </div>
      );
    } return <Widget data={data} loading={loading} {...props} />;
  }; WidgetWrapper.propTypes = {
    filters: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string,
      topic: PropTypes.string,
      condition: PropTypes.string,
      query: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })),
  }; WidgetWrapper.defaultProps = {
    filters: [],
  }; return WidgetWrapper;
}; export default withWidgetData;
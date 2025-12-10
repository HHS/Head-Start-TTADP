import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { DashboardOverviewWidget } from '../../../widgets/DashboardOverview';
import { getRecipientSpotlight } from '../../../fetchers/recipientSpotlight';
import { filtersToQueryString } from '../../../utils';
import './RecipientSpotlightDashboard.scss';

export default function RecipientSpotlightDashboard({
  filtersToApply,
}) {
  const [overviewData, setOverviewData] = useState({
    numRecipients: '0',
    totalRecipients: '0',
    recipientPercentage: '0%',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useDeepCompareEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const filters = filtersToQueryString(filtersToApply);
        // Extract region from filters if available
        const regionMatch = filters.match(/region\.in\[\]=(\d+)/);
        const regionId = regionMatch ? regionMatch[1] : '';

        const data = await getRecipientSpotlight(
          '', // recipientId - empty for all recipients
          regionId,
          'recipientName',
          'asc',
          0,
          filters,
          undefined, // no limit - get all recipients
        );

        if (data && data.overview) {
          setOverviewData(data.overview);
        }
        setError('');
      } catch (e) {
        setError('Unable to load overview data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filtersToApply]);

  return (
    <>
      <Helmet>
        <title>Regional Dashboard - Recipient spotlight</title>
      </Helmet>

      {error && (
        <div className="usa-alert usa-alert--error margin-bottom-3">
          <div className="usa-alert__body">
            <p className="usa-alert__text">{error}</p>
          </div>
        </div>
      )}

      <div className="recipient-spotlight-overview">
        <DashboardOverviewWidget
          data={overviewData}
          loading={loading}
          fields={['Recipients with priority indicators']}
          showTooltips
        />
      </div>
    </>
  );
}

RecipientSpotlightDashboard.propTypes = {
  filtersToApply: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};

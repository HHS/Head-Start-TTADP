import PropTypes from 'prop-types';
import React from 'react';
import TabsNav from '../../../components/TabsNav';
import { TTA_TIMELINE_FEATURE_FLAG } from '../pages/constants';

export default function RecipientTabs({ region, recipientId, backLink }) {
  const links = [
    {
      to: `/recipient-tta-records/${recipientId}/region/${region}/profile`,
      label: 'Profile',
    },
    {
      to: `/recipient-tta-records/${recipientId}/region/${region}/rttapa`,
      label: 'RTTAPA',
    },
    {
      to: `/recipient-tta-records/${recipientId}/region/${region}/communication`,
      label: 'Communication',
    },
    {
      to: `/recipient-tta-records/${recipientId}/region/${region}/tta-history`,
      label: 'TTA History',
    },
    {
      to: `/recipient-tta-records/${recipientId}/region/${region}/monitoring/review`,
      label: 'Monitoring',
    },
    {
      to: `/recipient-tta-records/${recipientId}/region/${region}/timeline`,
      label: 'TTA Timeline',
      featureFlag: TTA_TIMELINE_FEATURE_FLAG,
    },
  ];

  return <TabsNav ariaLabel="Recipient tabs" links={links} backLink={backLink} />;
}

RecipientTabs.propTypes = {
  region: PropTypes.string.isRequired,
  recipientId: PropTypes.string.isRequired,
  backLink: PropTypes.node,
};

RecipientTabs.defaultProps = {
  backLink: null,
};

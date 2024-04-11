import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import RecipientSummary from '../components/RecipientSummary';
import GrantList from '../components/GrantsList';
import RecipientLeadership from '../components/RecipientLeadership';
import './Profile.css';
import FeatureFlag from '../../../components/FeatureFlag';
import ClassReview from './components/ClassReview';
import MonitoringReview from './components/MonitoringReview';
import { useGrantData } from './GrantDataContext';

export default function Profile({
  recipientSummary,
  regionId,
  recipientId,
}) {
  const activeGrants = recipientSummary.grants.filter((grant) => grant.status === 'Active');
  const { hasMonitoringData, hasClassData } = useGrantData();

  return (
    <>
      <Helmet>
        <title>Profile</title>
      </Helmet>
      <div className="maxw-widescreen">
        <Grid row gap={4}>
          <Grid desktop={{ col: 3 }} tabletLg={{ col: 12 }}>
            <RecipientSummary summary={recipientSummary} />
          </Grid>
          <Grid desktop={{ col: 9 }} tabletLg={{ col: 12 }}>
            <RecipientLeadership recipientId={recipientId} regionId={regionId} />
          </Grid>
          <Grid desktop={{ col: 12 }} tabletLg={{ col: 12 }}>
            <GrantList summary={recipientSummary} />
          </Grid>
          <FeatureFlag flag="monitoring">
            {activeGrants.map((grant) => (
              <React.Fragment key={grant.number}>
                {hasMonitoringData(grant.number) || hasClassData(grant.number) ? (
                  <Grid desktop={{ col: 12 }}>
                    <h2 className="smart-hub-title-big-serif">
                      Grant number
                      {' '}
                      {grant.number}
                    </h2>
                  </Grid>
                ) : null}
                <Grid desktop={{ col: 6 }} tabletLg={{ col: 12 }}>
                  <div>
                    <ClassReview
                      grantNumber={grant.number}
                      regionId={regionId}
                      recipientId={recipientId}
                    />
                  </div>
                </Grid>
                <Grid desktop={{ col: 6 }} tabletLg={{ col: 12 }}>
                  <div>
                    <MonitoringReview
                      grantNumber={grant.number}
                      regionId={regionId}
                      recipientId={recipientId}
                    />
                  </div>
                </Grid>
              </React.Fragment>
            ))}
          </FeatureFlag>
        </Grid>
      </div>
    </>
  );
}

Profile.propTypes = {
  recipientId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  recipientSummary:
    PropTypes.shape({
      grants: PropTypes.arrayOf(
        PropTypes.shape({
          number: PropTypes.string,
          status: PropTypes.string,
          endDate: PropTypes.string,
        }),
      ),
    }).isRequired,
};

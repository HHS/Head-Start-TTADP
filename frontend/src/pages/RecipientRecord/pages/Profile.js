import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import RecipientSummary from '../components/RecipientSummary';
import GrantList from '../components/GrantsList';
import RecipientLeadership from '../components/RecipientLeadership';
import './Profile.css';
import ClassReview from './components/ClassReview';
import MonitoringReview from './components/MonitoringReview';
import { useGrantData } from './GrantDataContext';
import RecipientSpotlight from '../components/RecipientSpotlight';

export default function Profile({
  recipientSummary,
  regionId,
  recipientId,
}) {
  const { hasMonitoringData, hasClassData } = useGrantData();
  return (
    <>
      <Helmet>
        <title>Profile</title>
      </Helmet>
      <div className="maxw-widescreen">
        <Grid row gap={4}>
          <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }}>
            <RecipientSummary summary={recipientSummary} />
          </Grid>
          <Grid desktop={{ col: 12 }} tabletLg={{ col: 12 }}>
            <RecipientLeadership recipientId={recipientId} regionId={regionId} />
          </Grid>
          <Grid desktop={{ col: 12 }} tabletLg={{ col: 12 }}>
            <GrantList summary={recipientSummary} />
          </Grid>
          {(recipientSummary.grants || []).map((grant) => {
            const hasLeftColumn = hasClassData(grant.number)
              || hasMonitoringData(grant.number);
            return (
              <React.Fragment key={grant.number}>
                <Grid desktop={{ col: 12 }}>
                  <h2 className="smart-hub-title-big-serif">
                    Grant number
                    {' '}
                    {grant.number}
                  </h2>
                </Grid>

                <Grid
                  desktop={{ col: 6 }}
                  tabletLg={{ col: 12 }}
                  hidden={!hasLeftColumn}
                >
                  <div>
                    <ClassReview
                      grantNumber={grant.number}
                      regionId={regionId}
                      recipientId={recipientId}
                    />
                  </div>
                  <div>
                    <MonitoringReview
                      grantNumber={grant.number}
                      regionId={regionId}
                      recipientId={recipientId}
                    />
                  </div>
                </Grid>

                <Grid desktop={{ col: 6 }} tabletLg={{ col: 12 }}>
                  <div>
                    <RecipientSpotlight
                      grantId={grant.id}
                      grantNumber={grant.number}
                      recipientId={recipientId}
                      regionId={regionId}
                    />
                  </div>
                </Grid>
              </React.Fragment>
            );
          })}
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

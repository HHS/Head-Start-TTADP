/* eslint-disable no-alert */
/* eslint-disable no-console */
import React, {
  useState,
  useRef,
} from 'react';
import moment from 'moment';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid, Alert } from '@trussworks/react-uswds';
import colors from '../../../colors';
import RecipientsWithOhsStandardFeiGoalWidget from '../../../widgets/RecipientsWithOhsStandardFeiGoalWidget';
import Drawer from '../../../components/Drawer';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';

export default function RecipientsWithOhsStandardFeiGoal() {
  const pageDrawerRef = useRef(null);
  const [error] = useState();

  return (
    <div className="ttahub-recipients-with-ohs-standard-fei-goal">
      <Helmet>
        <title>Recipients with OHS standard FEI goal</title>
      </Helmet>
      <FontAwesomeIcon className="margin-right-1" data-testid="back-link-icon" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
      <Link className="ttahub-recipient-record--tabs_back-to-search margin-bottom-2 display-inline-block" to="/dashboards/qa-dashboard">
        Back to Quality Assurance Dashboard
      </Link>
      <h1 className="landing margin-top-0">
        Recipients with OHS standard FEI goal
      </h1>
      <Grid row>
        {error && (
          <Alert className="margin-bottom-2" type="error" role="alert">
            {error}
          </Alert>
        )}
      </Grid>
      <DrawerTriggerButton customClass="margin-bottom-3" drawerTriggerRef={pageDrawerRef}>
        Learn how filters impact the data displayed
      </DrawerTriggerButton>
      <Drawer
        triggerRef={pageDrawerRef}
        stickyHeader
        stickyFooter
        title="QA dashboard filters"
      >
        <ContentFromFeedByTag tagName="ttahub-fei-root-causes" contentSelector="table" />
      </Drawer>
      <RecipientsWithOhsStandardFeiGoalWidget
        data={{
          headers: ['Goal created on', 'Goal number', 'Goal status', 'Root cause'],
          RecipientsWithOhsStandardFeiGoal: [
            {
              id: 1,
              heading: 'Test Recipient 1',
              name: 'Test Recipient 1',
              recipient: 'Test Recipient 1',
              isUrl: true,
              hideLinkIcon: true,
              link: '/recipient-tta-records/376/region/1/profile',
              data: [{
                title: 'Goal_created_on',
                value: moment('2021-09-01').format('MM/DD/YYYY'),
              },
              {
                title: 'Goal_number',
                value: 'G-20628',
              },
              {
                title: 'Goal_status',
                value: 'In progress',
              },
              {
                title: 'Root_cause',
                value: 'Community Partnership, Workforce',
              },
              ],
            },
            {
              id: 2,
              heading: 'Test Recipient 2',
              name: 'Test Recipient 2',
              recipient: 'Test Recipient 2',
              isUrl: true,
              hideLinkIcon: true,
              link: '/recipient-tta-records/376/region/1/profile',
              data: [{
                title: 'Goal_created_on',
                value: moment('2021-09-02').format('MM/DD/YYYY'),
              },
              {
                title: 'Goal_number',
                value: 'G-359813',
              },
              {
                title: 'Goal_status',
                value: 'Not started',
              },
              {
                title: 'Root_cause',
                value: 'Testing',
              }],
            },
            {
              id: 3,
              heading: 'Test Recipient 3',
              name: 'Test Recipient 3',
              recipient: 'Test Recipient 3',
              isUrl: true,
              hideLinkIcon: true,
              link: '/recipient-tta-records/376/region/1/profile',
              data: [{
                title: 'Goal_created_on',
                value: moment('2021-09-03').format('MM/DD/YYYY'),
              },
              {
                title: 'Goal_number',
                value: 'G-457825',
              },
              {
                title: 'Goal_status',
                value: 'In progress',
              },
              {
                title: 'Root_cause',
                value: 'Facilities',
              }],
            }],
        }}
        loading={false}
      />
    </div>
  );
}

RecipientsWithOhsStandardFeiGoal.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    homeRegionId: PropTypes.number,
    permissions: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
      scopeId: PropTypes.number,
      regionId: PropTypes.number,
    })),
  }),
};

RecipientsWithOhsStandardFeiGoal.defaultProps = {
  user: null,
};

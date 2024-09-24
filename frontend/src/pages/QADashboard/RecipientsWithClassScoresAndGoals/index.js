/* eslint-disable no-alert */
/* eslint-disable no-console */
import React, {
  useState,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Helmet } from 'react-helmet';
import {
  Grid, Alert,
} from '@trussworks/react-uswds';
import colors from '../../../colors';
import Drawer from '../../../components/Drawer';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import RecipientsWithClassScoresAndGoalsWidget from '../../../widgets/RecipientsWithClassScoresAndGoalsWidget';

const recipients = [{
  id: 1,
  name: 'Recipient 1',
  lastArStartDate: '01/02/2021',
  emotionalSupport: 6.0430,
  classroomOrganization: 5.0430,
  instructionalSupport: 4.0430,
  reportReceivedDate: '03/01/2022',
  goals: [
    {
      goalNumber: 'G-45641',
      status: 'In progress',
      creator: 'John Doe',
      collaborator: 'Jane Doe',
    },
    {
      goalNumber: 'G-25858',
      status: 'Suspended',
      creator: 'Bill Smith',
      collaborator: 'Bob Jones',
    },
  ],
},
{
  id: 2,
  name: 'Recipient 2',
  lastArStartDate: '04/02/2021',
  emotionalSupport: 5.254,
  classroomOrganization: 8.458,
  instructionalSupport: 1.214,
  reportReceivedDate: '05/01/2022',
  goals: [
    {
      goalNumber: 'G-68745',
      status: 'Complete',
      creator: 'Bill Parks',
      collaborator: 'Jack Jones',
    },
  ],
}];

export default function RecipientsWithClassScoresAndGoals() {
  const pageDrawerRef = useRef(null);
  const [error] = useState();
  return (
    <div className="ttahub-recipients-with-ohs-standard-fei-goal">
      <Helmet>
        <title>Recipients with CLASS&reg; scores and goals</title>
      </Helmet>
      <FontAwesomeIcon className="margin-right-1" data-testid="back-link-icon" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
      <Link className="ttahub-recipient-record--tabs_back-to-search margin-bottom-2 display-inline-block" to="/dashboards/qa-dashboard">
        Back to Quality Assurance Dashboard
      </Link>
      <h1 className="landing margin-top-0">
        Recipients with CLASS&reg; scores and goals
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
      <RecipientsWithClassScoresAndGoalsWidget
        data={
        {
          headers: ['Emotional Support', 'Classroom Organization', 'Instructional Support', 'Report Received Date', 'Goals'],
          RecipientsWithOhsStandardFeiGoal: recipients,
        }
      }
      />
    </div>
  );
}

RecipientsWithClassScoresAndGoals.propTypes = {
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

RecipientsWithClassScoresAndGoals.defaultProps = {
  user: null,
};

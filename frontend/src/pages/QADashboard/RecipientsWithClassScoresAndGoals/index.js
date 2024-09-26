import React, {
  useState,
  useRef,
  useContext,
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
import FilterPanel from '../../../components/filter/FilterPanel';
import FilterPanelContainer from '../../../components/filter/FilterPanelContainer';
import useFilters from '../../../hooks/useFilters';
import RecipientsWithClassScoresAndGoalsWidget from '../../../widgets/RecipientsWithClassScoresAndGoalsWidget';
import { QA_DASHBOARD_FILTER_KEY, QA_DASHBOARD_FILTER_CONFIG } from '../constants';
import UserContext from '../../../UserContext';

const ALLOWED_SUBFILTERS = [
  'domainClassroomOrganization',
  'domainInstructionalSupport',
  'domainEmotionalSupport',
  'createDate',
  'group',
  'grantNumber',
  'recipient',
  'status',
  'region',
  'stateCode',
];

const recipients = [{
  id: 1,
  name: 'Abernathy, Mraz and Bogan',
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
  const { user } = useContext(UserContext);
  const {
    // from useUserDefaultRegionFilters
    regions,

    // filter functionality
    filters,
    onApplyFilters,
    onRemoveFilter,
    filterConfig,
  } = useFilters(
    user,
    QA_DASHBOARD_FILTER_KEY,
    true,
    [],
    QA_DASHBOARD_FILTER_CONFIG,
  );

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
      <FilterPanelContainer>
        <FilterPanel
          applyButtonAria="apply filters for QA dashboard"
          filters={filters}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={filterConfig}
          allUserRegions={regions}
          allowedSubfilters={ALLOWED_SUBFILTERS}
        />
      </FilterPanelContainer>
      <DrawerTriggerButton customClass="margin-bottom-3" drawerTriggerRef={pageDrawerRef}>
        Learn how filters impact the data displayed
      </DrawerTriggerButton>
      <Drawer
        triggerRef={pageDrawerRef}
        stickyHeader
        stickyFooter
        title="QA dashboard filters"
      >
        <ContentFromFeedByTag tagName="ttahub-qa-dash-class-filters" />
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

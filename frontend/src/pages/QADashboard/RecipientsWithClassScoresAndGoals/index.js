/* eslint-disable no-alert */
/* eslint-disable no-console */
import React, {
  useState,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import { DECIMAL_BASE } from '@ttahub/common';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Helmet } from 'react-helmet';
import { Grid, Alert, Dropdown } from '@trussworks/react-uswds';
import useSessionSort from '../../../hooks/useSessionSort';
import colors from '../../../colors';
import RecipientCard from '../Components/RecipientCard';
import Drawer from '../../../components/Drawer';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import { RECIPIENTS_WITH_CLASS_SCORES_AND_GOALS_GOAL_PER_PAGE } from '../../../Constants';
import WidgetContainer from '../../../components/WidgetContainer';

const recipients = [
  {
    name: 'Action for Boston Community Development, Inc.',
    lastArStartDate: '01/01/2021',
    lastArEndDate: '01/01/2022',
    emotionalSupport: 6.0430,
    classroomOrganization: 5.0430,
    instructionalSupport: 4.0430,
    reportReceivedDate: '01/01/2022',
    goals: [
      {
        goalNumber: 'G-45641',
        status: 'In progress',
        creator: 'John Doe',
        collaborator: 'Jane Doe',
      },
      {
        goalNumber: 'G-25858',
        status: 'In progress',
        creator: 'John Doe',
        collaborator: 'Jane Doe',
      },
    ],
  },
];
export default function RecipientsWithClassScoresAndGoals() {
  const [loading] = useState(false);
  const [recipientsPerPage, setRecipientsPerPage] = useState(
    RECIPIENTS_WITH_CLASS_SCORES_AND_GOALS_GOAL_PER_PAGE,
  );

  /* start sort and paging */
  const defaultSort = {
    sortBy: 'Recipient',
    direction: 'asc',
  };

  const [sortConfig, setSortConfig] = useSessionSort({
    ...defaultSort,
    activePage: 1,
    offset: 0,
  }, 'recipientsWithClassScoresAndGoals');

  const pageDrawerRef = useRef(null);
  const [error] = useState();

  const handlePageChange = (pageNumber) => {
    setSortConfig({
      ...sortConfig, activePage: pageNumber, offset: (pageNumber - 1) * recipientsPerPage,
    });
  };

  const requestSort = (sortBy, direction) => {
    setSortConfig({
      ...sortConfig, sortBy, direction, activePage: 1, offset: 0,
    });
  };

  const perPageChange = (e) => {
    const perPageValue = parseInt(e.target.value, DECIMAL_BASE);
    setSortConfig({
      ...sortConfig,
      activePage: 1,
      offset: 0,
    });
    setRecipientsPerPage(perPageValue);
  };

  const setSortBy = (e) => {
    const [sortBy, direction] = e.target.value.split('-');
    requestSort(sortBy, direction);
  };

  /* end sort and paging */

  const numberOfGrants = 70;
  const getSubtitleWithPct = () => {
    const totalRecipients = 159;
    return `${recipients.length} of ${totalRecipients} (${((recipients.length / totalRecipients) * 100).toFixed(2)}%) recipients (${numberOfGrants} grants)`;
  };

  const exportRows = () => {
  };

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
      <WidgetContainer
        title="Recipients with CLASS&reg; scores"
        subtitle2={getSubtitleWithPct()}
        loading={loading}
        loadingLabel="Recipients with CLASS&reg; scores and goals loading"
        showPagingBottom
        currentPage={sortConfig.activePage}
        totalCount={recipients.length}
        offset={sortConfig.offset}
        perPage={10}
        handlePageChange={handlePageChange}
        enableCheckboxes
        exportRows={exportRows}
        titleDrawerText="OHS standard CLASS&reg; goals"
        titleDrawerTitle="OHS standard FEI goal"
        titleDrawerCssClass="ttahub-fei-root-causes"
        subtitle2DrawerLinkText="Learn about root causes"
        subtitle2DrawerTitle="FEI root cause"
        subtitle2DrawerCssClass="ttahub-fei-root-causes"
        className="padding-3"
        displayPaginationBoxOutline
      >
        <div className="bg-white padding-3">
          <div className="desktop:display-flex flex-justify">
            <div className="flex-align-center margin-bottom-3">
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="display-block margin-right-1" style={{ minWidth: 'max-content' }} htmlFor="sortBy">Sort by</label>
              <Dropdown
                onChange={setSortBy}
                value={`${sortConfig.sortBy}-${sortConfig.direction}`}
                className="margin-top-0"
                id="sortBy"
                name="sortBy"
                data-testid="sortGoalsBy"
              >
                <option value="recipientName-asc">Recipient name (A-Z) </option>
                <option value="recipientName-desc">Recipient name (Z-A) </option>
                <option value="reportReceived-asc">Report received (newest to oldest) </option>
                <option value="reportReceived-desc">Report received (oldest to newest) </option>
                <option value="LastArStartDate-asc">Last AR start date (newest to oldest) </option>
                <option value="LastArStartDate-desc">Last AR start date (oldest to newest) </option>
              </Dropdown>
            </div>
            <div className="smart-hub--table-nav">
              <Dropdown
                className="margin-top-0 margin-right-1 width-auto"
                id="perPage"
                name="perPage"
                data-testid="perPage"
                onChange={perPageChange}
                aria-label="Select recipients per page"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value={recipients.length}>all</option>
              </Dropdown>
            </div>
          </div>
          <div className="ttahub-recipients-with-ohs-standard-fei-goal---recipient-cards padding-y-3">
            {recipients.map((goal, index) => (
              <RecipientCard
                key={uuidv4()}
                recipient={goal}
                zIndex={recipients.length - index}
              />
            ))}
          </div>
        </div>
      </WidgetContainer>
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

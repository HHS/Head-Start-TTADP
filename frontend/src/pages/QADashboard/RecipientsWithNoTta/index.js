import React, {
  useContext,
  // useState,
  useRef,
} from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
// import { Grid, Alert } from '@trussworks/react-uswds';
import colors from '../../../colors';
import RecipientsWithNoTtaWidget from '../../../widgets/RecipientsWithNoTtaWidget';
import FilterPanel from '../../../components/filter/FilterPanel';
import FilterPanelContainer from '../../../components/filter/FilterPanelContainer';
import useFilters from '../../../hooks/useFilters';
import Drawer from '../../../components/Drawer';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import UserContext from '../../../UserContext';
import { QA_DASHBOARD_FILTER_KEY, QA_DASHBOARD_FILTER_CONFIG } from '../constants';

const ALLOWED_SUBFILTERS = [
  'region',
  'startDate',
  'endDate',
  'grantNumber',
  'recipient',
  'stateCode',
];

export default function RecipientsWithNoTta() {
  const pageDrawerRef = useRef(null);
  // const [error] = useState();
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
    <div className="ttahub-recipients-with-no-tta">
      <Helmet>
        <title>Recipients with no TTA</title>
      </Helmet>
      <FontAwesomeIcon className="margin-right-1" data-testid="back-link-icon" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
      <Link className="ttahub-recipient-record--tabs_back-to-search margin-bottom-2 display-inline-block" to="/dashboards/qa-dashboard">
        Back to Quality Assurance Dashboard
      </Link>
      <h1 className="landing margin-top-0">
        Recipients with no TTA
      </h1>
      {/* <Grid row>
        {error && (
        <Alert className="margin-bottom-2" type="error" role="alert">
          {error}
        </Alert>
        )}
      </Grid> */}
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
        <ContentFromFeedByTag tagName="ttahub-fei-root-causes" contentSelector="table" />
      </Drawer>
      <RecipientsWithNoTtaWidget
        data={{
          headers: ['Date of Last TTA', 'Days Since Last TTA'],
          RecipientsWithNoTta: [
            {
              heading: 'Test Recipient 1',
              name: 'Test Recipient 1',
              recipient: 'Test Recipient 1',
              isUrl: true,
              hideLinkIcon: true,
              link: '/recipient-tta-records/376/region/1/profile',
              data: [{
                title: 'Date_of_Last_TTA',
                value: '2021-09-01',
              },
              {
                title: 'Days_Since_Last_TTA',
                value: '90',
              }],
            },
            {
              heading: 'Test Recipient 2',
              name: 'Test Recipient 2',
              recipient: 'Test Recipient 2',
              isUrl: true,
              hideLinkIcon: true,
              link: '/recipient-tta-records/376/region/1/profile',
              data: [{
                title: 'Date_of_Last_TTA',
                value: '2021-09-02',
              },
              {
                title: 'Days_Since_Last_TTA',
                value: '91',
              }],
            },
            {
              heading: 'Test Recipient 3',
              name: 'Test Recipient 3',
              recipient: 'Test Recipient 3',
              isUrl: true,
              hideLinkIcon: true,
              link: '/recipient-tta-records/376/region/1/profile',
              data: [{
                title: 'Date_of_Last_TTA',
                value: '2021-09-03',
              },
              {
                title: 'Days_Since_Last_TTA',
                value: '92',
              }],
            }],
        }}
        loading={false}
      />
    </div>
  );
}

RecipientsWithNoTta.propTypes = {
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

RecipientsWithNoTta.defaultProps = {
  user: null,
};

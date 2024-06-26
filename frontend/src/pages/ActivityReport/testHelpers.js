/* eslint-disable react/prop-types */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import {
  MemoryRouter, Routes, Route, useLocation,
} from 'react-router-dom';
import { SCOPE_IDS, REPORT_STATUSES } from '@ttahub/common';
import {
  render,
} from '@testing-library/react';
import moment from 'moment';
import ActivityReport from './index';
import UserContext from '../../UserContext';
import AppLoadingContext from '../../AppLoadingContext';

const user = {
  id: 1,
  name: 'Walter Burns',
  roles: [{ fullName: 'Reporter' }],
  permissions: [
    { regionId: 1, scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS },
  ],
};

export const formData = () => ({
  regionId: 1,
  deliveryMethod: 'in-person',
  ttaType: ['training'],
  approvers: [],
  duration: '1',
  pageState: {
    1: 'in-progress',
    2: 'in-progress',
    3: 'in-progress',
    4: 'in-progress',
  },
  endDate: moment().format('MM/DD/YYYY'),
  activityRecipients: ['Recipient Name 1'],
  numberOfParticipants: '1',
  reason: ['reason 1'],
  activityRecipientType: 'recipient',
  collaborators: [],
  participants: ['CEO / CFO / Executive'],
  requester: 'recipient',
  calculatedStatus: REPORT_STATUSES.DRAFT,
  submissionStatus: REPORT_STATUSES.DRAFT,
  resourcesUsed: 'eclkcurl',
  startDate: moment().format('MM/DD/YYYY'),
  targetPopulations: ['target 1'],
  author: { name: 'test', roles: { fullName: 'Reporter' } },
  topics: 'first',
  userId: 1,
  goals: [],
  goalsAndObjectives: [],
  updatedAt: new Date().toISOString(),
  creatorRole: 'Reporter',
  files: [],
  creatorNameWithRole: 'test',
  objectivesWithoutGoals: [],
  recipientGroup: null,
});

let location;

const ARWithLocation = () => {
  location = useLocation();
  return <ActivityReport region={1} />;
};

export const ReportComponent = ({
  id,
  currentPage = 'activity-summary',
  showLastUpdatedTime = null,
  userId = 1,
}) => {
  const lx = {
    pathname: `/activity-reports/${id}/${currentPage}`,
    state: {
      showLastUpdatedTime,
    },
    hash: '',
    search: '',
  };

  return (
    <AppLoadingContext.Provider value={{
      setIsAppLoading: jest.fn(),
      setAppLoadingText: jest.fn(),
      isAppLoading: false,
    }}
    >
      <UserContext.Provider value={{ user: { ...user, id: userId, flags: [] } }}>
        <MemoryRouter initialEntries={[`/activity-reports/${id}/${currentPage}`]}>
          <Routes location={lx}>
            <Route
              path="/activity-reports/:activityReportId/:currentPage"
              element={<ARWithLocation />}
            />
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    </AppLoadingContext.Provider>
  );
};

export const renderActivityReport = (id, currentPage = 'activity-summary', showLastUpdatedTime = null, userId = 1) => {
  render(
    <ReportComponent
      id={id}
      currentPage={currentPage}
      showLastUpdatedTime={showLastUpdatedTime}
      userId={userId}
    />,
  );

  return location;
};

export const recipients = {
  grants: [{ name: 'recipient', grants: [{ activityRecipientId: 1, name: 'Recipient Name' }] }],
  otherEntities: [{ activityRecipientId: 1, name: 'otherEntity' }],
};

export const mockGoalsAndObjectives = (isActivelyEdited = false) => [
  {
    id: 37499,
    name: 'test',
    status: 'Draft',
    timeframe: null,
    isFromSmartsheetTtaPlan: null,
    endDate: '2022-12-06',
    grantId: 12539,
    goalTemplateId: null,
    onApprovedAR: false,
    isRttapa: 'Yes',
    createdVia: 'activityReport',
    statusChanges: [],
    createdAt: '2022-12-01T21:59:28.231Z',
    updatedAt: '2022-12-01T21:59:28.431Z',
    activityReportGoals: [
      {
        endDate: '12/06/2022',
        id: 75891,
        activityReportId: 1,
        goalId: 37499,
        isRttapa: 'Yes',
        name: 'test',
        status: 'Draft',
        timeframe: null,
        closeSuspendReason: null,
        closeSuspendContext: null,
        isActivelyEdited,
        createdAt: '2022-12-01T21:59:28.470Z',
        updatedAt: '2022-12-01T21:59:28.470Z',
      },
    ],
    grant: {
      programTypes: [],
      name: 'Barton LLC - 04bear012539 ',
      numberWithProgramTypes: '04bear012539 ',
      recipientInfo: 'Barton LLC - 04bear012539 - 1780',
      id: 12539,
      number: '04bear012539',
      annualFundingMonth: 'January',
      cdi: false,
      status: 'Active',
      grantSpecialistName: 'Marian Daugherty',
      grantSpecialistEmail: 'Effie.McCullough@gmail.com',
      programSpecialistName: 'Marian Daugherty',
      programSpecialistEmail: 'Effie.McCullough@gmail.com',
      stateCode: 'MA',
      startDate: '2021-01-01T00:00:00.000Z',
      endDate: '2025-12-31T00:00:00.000Z',
      recipientId: 1780,
      oldGrantId: 9554,
      createdAt: '2021-03-16T01:20:44.754Z',
      updatedAt: '2022-09-28T15:03:28.522Z',
      regionId: 1,
      recipient: {
        id: 1780,
        uei: 'SATQDSFFKQN3',
        name: 'Barton LLC',
        recipientType: 'Private/Public Non-Profit (Non-CAA) (e.g., church or non-profit hospital)',
        createdAt: '2021-03-16T01:20:43.530Z',
        updatedAt: '2022-09-28T15:03:26.225Z',
      },
    },
    objectives: [],
    goalNumbers: [
      'G-37499',
    ],
    goalIds: [
      37499,
    ],
    grants: [
      {
        id: 12539,
        number: '04bear012539',
        annualFundingMonth: 'January',
        cdi: false,
        status: 'Active',
        grantSpecialistName: 'Marian Daugherty',
        grantSpecialistEmail: 'Effie.McCullough@gmail.com',
        programSpecialistName: 'Marian Daugherty',
        programSpecialistEmail: 'Effie.McCullough@gmail.com',
        stateCode: 'MA',
        startDate: '2021-01-01T00:00:00.000Z',
        endDate: '2025-12-31T00:00:00.000Z',
        recipientId: 1780,
        oldGrantId: 9554,
        createdAt: '2021-03-16T01:20:44.754Z',
        updatedAt: '2022-09-28T15:03:28.522Z',
        regionId: 1,
        recipient: {
          id: 1780,
          uei: 'SATQDSFFKQN3',
          name: 'Barton LLC',
          recipientType: 'Private/Public Non-Profit (Non-CAA) (e.g., church or non-profit hospital)',
          createdAt: '2021-03-16T01:20:43.530Z',
          updatedAt: '2022-09-28T15:03:26.225Z',
        },
        name: 'Barton LLC - 04bear012539 ',
        goalId: 37499,
      },
    ],
    grantIds: [
      12539,
    ],
    isNew: false,
    initialRttapa: null,
  },
];

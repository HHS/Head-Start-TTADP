/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import {
  render,
} from '@testing-library/react';
import moment from 'moment';
import ActivityReport from './index';
import { SCOPE_IDS, REPORT_STATUSES } from '../../Constants';
import UserContext from '../../UserContext';
import AppLoadingContext from '../../AppLoadingContext';

export const history = createMemoryHistory();

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
});

export const renderActivityReport = (id, currentPage = 'activity-summary', showLastUpdatedTime = null, userId = 1) => {
  render(
    <Router history={history}>
      <AppLoadingContext.Provider value={{
        setIsAppLoading: jest.fn(),
        setAppLoadingText: jest.fn(),
      }}
      >
        <UserContext.Provider value={{ user: { ...user, id: userId } }}>
          <ActivityReport
            match={{ params: { currentPage, activityReportId: id }, path: '', url: '' }}
            location={{
              state: { showLastUpdatedTime }, hash: '', pathname: '', search: '',
            }}
            region={1}
          />
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    </Router>,
  );
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
    closeSuspendReason: null,
    closeSuspendContext: null,
    grantId: 12539,
    goalTemplateId: null,
    previousStatus: null,
    onApprovedAR: false,
    isRttapa: 'Yes',
    firstNotStartedAt: null,
    lastNotStartedAt: null,
    firstInProgressAt: null,
    lastInProgressAt: null,
    firstCeasedSuspendedAt: null,
    lastCeasedSuspendedAt: null,
    firstClosedAt: null,
    lastClosedAt: null,
    firstCompletedAt: null,
    lastCompletedAt: null,
    createdVia: 'activityReport',
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

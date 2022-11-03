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
  approval: {
    calculatedStatus: REPORT_STATUSES.DRAFT,
    submissionStatus: REPORT_STATUSES.DRAFT,
  },
  resourcesUsed: 'eclkcurl',
  startDate: moment().format('MM/DD/YYYY'),
  targetPopulations: ['target 1'],
  topics: 'first',
  owner: {
    userId: 1,
    user: { name: 'test', nameWithRole: 'test', roles: { fullName: 'Reporter' } },
    roles: [{ fullName: 'Reporter' }],
  },
  goals: [],
  goalsAndObjectives: [],
  updatedAt: new Date().toISOString(),
  files: [],
  objectivesWithoutGoals: [],
});

export const renderActivityReport = (id, location = 'activity-summary', showLastUpdatedTime = null, userId = 1) => {
  render(
    <Router history={history}>
      <UserContext.Provider value={{ user: { ...user, id: userId } }}>
        <ActivityReport
          match={{ params: { currentPage: location, activityReportId: id }, path: '', url: '' }}
          location={{
            state: { showLastUpdatedTime }, hash: '', pathname: '', search: '',
          }}
          region={1}
        />
      </UserContext.Provider>
    </Router>,
  );
};

export const recipients = {
  grants: [{ name: 'recipient', grants: [{ activityRecipientId: 1, name: 'Recipient Name' }] }],
  otherEntities: [{ activityRecipientId: 1, name: 'otherEntity' }],
};

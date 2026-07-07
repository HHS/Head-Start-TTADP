import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import { mockRSSData, mockWindowProperty } from '../../../../testHelpers';
import UserContext from '../../../../UserContext';
import RecipientsWithClassScoresAndGoals from '../index';

const createObjectURL = jest.fn(() => 'blob:recipients-with-class-page-export');
const revokeObjectURL = jest.fn();

mockWindowProperty('URL', {
  createObjectURL,
  revokeObjectURL,
});

const dashboardApi =
  '/api/ssdi/api/dashboards/qa/class.sql?&dataSetSelection[]=with_class_widget&dataSetSelection[]=with_class_page';

const recipientsWithClassScoresAndGoalsData = [
  {
    data_set: 'with_class_widget',
    records: 1,
    data: [
      {
        total: 2,
        'recipients with class': 2,
        '% recipients with class': 50,
        'grants with class': 3,
      },
    ],
  },
  {
    data_set: 'with_class_page',
    records: 3,
    data: [
      {
        classReviewCardId: '1:QA-REVIEW-A',
        classroomOrganization: 5.043,
        emotionalSupport: 6.043,
        grantNumber: '90CI010073',
        instructionalSupport: 4.043,
        lastARStartDate: '2021-01-02',
        recipientId: 1,
        recipientName: 'Abernathy, Mraz and Bogan',
        reportDeliveryDate: '2022-03-01T04:00:00+00:00',
        'region id': 1,
        collaborators: 'Jane Doe',
        creator: 'John Doe',
        goalCreatedAt: '2021-01-02T18:41:32.028+00:00',
        goalId: 45641,
        goalStatus: GOAL_STATUS.IN_PROGRESS,
      },
      {
        classReviewCardId: '1:QA-REVIEW-A',
        classroomOrganization: 5.043,
        emotionalSupport: 6.043,
        grantNumber: '90CI010073',
        instructionalSupport: 4.043,
        lastARStartDate: '2021-01-02',
        recipientId: 1,
        recipientName: 'Abernathy, Mraz and Bogan',
        reportDeliveryDate: '2022-03-01T04:00:00+00:00',
        'region id': 1,
        collaborators: 'Bob Jones',
        creator: 'Bill Smith',
        goalCreatedAt: '2021-01-02T18:41:32.028+00:00',
        goalId: 25858,
        goalStatus: GOAL_STATUS.SUSPENDED,
      },
      {
        classReviewCardId: '2:QA-REVIEW-A',
        classroomOrganization: 8.458,
        emotionalSupport: 5.254,
        grantNumber: '90CI010073',
        instructionalSupport: 1.214,
        lastARStartDate: '2021-04-02',
        recipientId: 2,
        recipientName: 'Recipient 2',
        reportDeliveryDate: '2022-05-01T04:00:00+00:00',
        'region id': 2,
        collaborators: 'Jack Jones',
        creator: 'Bill Parks',
        goalCreatedAt: '2021-04-02T18:41:32.028+00:00',
        goalId: 68745,
        goalStatus: GOAL_STATUS.CLOSED,
      },
      {
        classReviewCardId: '2:QA-REVIEW-B',
        classroomOrganization: 8.459,
        emotionalSupport: 5.256,
        grantNumber: '90CI010074',
        instructionalSupport: 1.215,
        lastARStartDate: null,
        recipientId: 2,
        recipientName: 'Recipient 2',
        reportDeliveryDate: '2022-05-01T04:00:00+00:00',
        'region id': 2,
        collaborators: 'Jill Jones',
        creator: 'Nadia Parks',
        goalCreatedAt: '2021-04-02T18:41:32.028+00:00',
        goalId: 68746,
        goalStatus: GOAL_STATUS.NOT_STARTED,
      },
      {
        classReviewCardId: '4:QA-REVIEW-C',
        classroomOrganization: 1.1,
        emotionalSupport: 2.2,
        grantNumber: '90CI010075',
        instructionalSupport: 3.3,
        lastARStartDate: null,
        recipientId: 4,
        recipientName: 'Recipient With Null Dates',
        reportDeliveryDate: null,
        'region id': 4,
        collaborators: 'Null Collaborator',
        creator: 'Null Creator',
        goalCreatedAt: '2023-01-01T18:41:32.028+00:00',
        goalId: 99999,
        goalStatus: GOAL_STATUS.DRAFT,
      },
    ],
  },
];

const renderRecipientsWithClassScoresAndGoals = () => {
  const history = createMemoryHistory();
  render(
    <UserContext.Provider value={{ user: { id: 1 } }}>
      <Router history={history}>
        <RecipientsWithClassScoresAndGoals />
      </Router>
    </UserContext.Provider>
  );
};

const readBlobAsText = (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(blob);
  });

describe('Recipients With Class and Scores and Goals', () => {
  afterEach(() => {
    fetchMock.restore();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  beforeEach(() => {
    fetchMock.get('/api/feeds/item?tag=ttahub-qa-dash-class-filters', mockRSSData());
    fetchMock.get('/api/feeds/item?tag=ttahub-class-thresholds', mockRSSData());
    fetchMock.get('/api/feeds/item?tag=ttahub-ohs-standard-class-goal', mockRSSData());
  });

  it('renders correctly with data', async () => {
    fetchMock.get(dashboardApi, recipientsWithClassScoresAndGoalsData);
    renderRecipientsWithClassScoresAndGoals();

    expect(screen.queryAllByText(/Recipients with CLASS® scores/i).length).toBe(2);

    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText(/1-4 of 4/i)).toBeInTheDocument();
      });
    });

    expect(screen.getByText('Abernathy, Mraz and Bogan')).toBeInTheDocument();
    expect(screen.getAllByText('90CI010073').length).toBeGreaterThan(0);
    expect(screen.getByText(/6\.043/i)).toBeInTheDocument();
    expect(screen.getByText(/5\.043/i)).toBeInTheDocument();
    expect(screen.getByText(/4\.043/i)).toBeInTheDocument();
    expect(screen.getByText('03/01/2022')).toBeInTheDocument();

    // Expand goals.
    let goalsButton = screen.getByRole('button', {
      name: /view goals for recipient Abernathy, Mraz and Bogan grant 90CI010073 report received 03\/01\/2022/i,
    });
    goalsButton.click();

    expect(screen.getByText('G-45641')).toBeInTheDocument();
    expect(screen.getAllByText('01/02/2021').length).toBeGreaterThan(0);
    expect(screen.getByText(GOAL_STATUS.IN_PROGRESS)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('G-25858')).toBeInTheDocument();
    expect(screen.getByText(GOAL_STATUS.SUSPENDED)).toBeInTheDocument();
    expect(screen.getByText('Bill Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();

    expect(screen.getAllByText('Recipient 2')).toHaveLength(2);
    expect(screen.getByText('5.254')).toBeInTheDocument();
    expect(screen.getByText('8.458')).toBeInTheDocument();
    expect(screen.getByText('1.214')).toBeInTheDocument();
    expect(screen.getAllByText('05/01/2022').length).toBeGreaterThan(0);

    // Expand goals.
    goalsButton = screen.getByRole('button', {
      name: /view goals for recipient recipient 2 grant 90CI010073 report received 05\/01\/2022/i,
    });
    goalsButton.click();

    expect(screen.getByText('G-68745')).toBeInTheDocument();
    expect(screen.getByText('04/02/2021')).toBeInTheDocument();
    expect(screen.getByText(GOAL_STATUS.CLOSED)).toBeInTheDocument();
    expect(screen.getByText('Bill Parks')).toBeInTheDocument();
    expect(screen.getByText('Jack Jones')).toBeInTheDocument();
  });

  it('selects and unselects all recipients', async () => {
    fetchMock.get(dashboardApi, recipientsWithClassScoresAndGoalsData);
    renderRecipientsWithClassScoresAndGoals();

    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText(/1-4 of 4/i)).toBeInTheDocument();
      });
    });

    const selectAllButton = screen.getByRole('checkbox', { name: /select all recipients/i });
    selectAllButton.click();
    expect(screen.getByText(/4 selected/i)).toBeInTheDocument();
    selectAllButton.click();
    expect(screen.queryAllByText(/4 selected/i).length).toBe(0);
  });

  it('Shows the selected pill and unselects when pill is removed', async () => {
    fetchMock.get(dashboardApi, recipientsWithClassScoresAndGoalsData);
    renderRecipientsWithClassScoresAndGoals();
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText(/1-4 of 4/i)).toBeInTheDocument();
      });
    });
    const selectAllButton = screen.getByRole('checkbox', { name: /select all recipients/i });
    selectAllButton.click();
    expect(screen.getByText(/4 selected/i)).toBeInTheDocument();
    const pillRemoveButton = screen.getByRole('button', { name: /deselect all goals/i });
    pillRemoveButton.click();
    expect(screen.queryAllByText(/4 selected/i).length).toBe(0);
  });

  it('exports grant and report received values for class review cards', async () => {
    fetchMock.get(dashboardApi, recipientsWithClassScoresAndGoalsData);
    renderRecipientsWithClassScoresAndGoals();

    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText(/1-4 of 4/i)).toBeInTheDocument();
      });
    });

    const recipientCheckbox = screen.getByRole('checkbox', {
      name: /select recipient Abernathy, Mraz and Bogan grant 90CI010073 report received 03\/01\/2022/i,
    });
    recipientCheckbox.click();

    screen.getByRole('button', { name: /export selected/i }).click();

    const [blob] = createObjectURL.mock.calls[0];
    await expect(readBlobAsText(blob)).resolves.toContain(
      'recipientsWithClassScoresAndGoals,Grant Number,Report Received Date,Last AR Start Date,Emotional Support,Classroom Organization,Instructional Support\n"Abernathy, Mraz and Bogan",90CI010073,03/01/2022,01/02/2021,6.043,5.043,4.043'
    );
  });

  it('handles error on fetch', async () => {
    fetchMock.get(dashboardApi, 500);
    renderRecipientsWithClassScoresAndGoals();

    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText(/Unable to fetch QA data/i)).toBeInTheDocument();
      });
    });
  });
});

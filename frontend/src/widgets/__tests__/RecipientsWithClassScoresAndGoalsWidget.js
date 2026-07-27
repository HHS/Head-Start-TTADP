import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import { createMemoryHistory } from 'history';
import moment from 'moment';
import React from 'react';
import { Router } from 'react-router';
import { mockWindowProperty } from '../../testHelpers';
import UserContext from '../../UserContext';
import RecipientsWithClassScoresAndGoalsWidget from '../RecipientsWithClassScoresAndGoalsWidget';

const createObjectURL = jest.fn(() => 'blob:recipients-with-class-export');
const revokeObjectURL = jest.fn();

mockWindowProperty('URL', {
  createObjectURL,
  revokeObjectURL,
});

const recipientData = {
  widgetData: {
    '% recipients with class': 18.26,
    'grants with class': 346,
    'recipients with class': 283,
    total: 1550,
  },
  pageData: [
    {
      id: '1:QA-REVIEW-A',
      recipientId: 1,
      regionId: 1,
      name: 'Action for Boston Community Development, Inc.',
      heading: 'Action for Boston Community Development, Inc.',
      grantNumber: '90CI010073',
      lastARStartDate: '01/02/2021',
      emotionalSupport: 6.043,
      classroomOrganization: 5.043,
      instructionalSupport: 4.043,
      reportDeliveryDate: '03/01/2022',
      dataForExport: [
        {
          title: 'Grant Number',
          value: '90CI010073',
        },
        {
          title: 'Report Received Date',
          value: '03/01/2022',
        },
        {
          title: 'Last AR Start Date',
          value: '01/02/2021',
        },
        {
          title: 'Emotional Support',
          value: 6.043,
        },
        {
          title: 'Classroom Organization',
          value: 5.043,
        },
        {
          title: 'Instructional Support',
          value: 4.043,
        },
      ],
      goals: [
        {
          id: 45641,
          goalNumber: 'G-45641',
          status: GOAL_STATUS.IN_PROGRESS,
          creator: 'John Doe',
          collaborator: 'Jane Doe',
          lastARStartDate: '01/02/2021',
        },
        {
          id: 25858,
          goalNumber: 'G-25858',
          status: GOAL_STATUS.SUSPENDED,
          creator: 'Bill Smith',
          collaborator: 'Bob Jones',
          lastARStartDate: '01/02/2021',
        },
      ],
    },
  ],
};

const renderRecipientsWithClassScoresAndGoalsWidget = (data) => {
  const history = createMemoryHistory();
  render(
    <UserContext.Provider value={{ user: { id: 1 } }}>
      <Router history={history}>
        <RecipientsWithClassScoresAndGoalsWidget data={data} parentLoading={false} />
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

describe('Recipients With Class and Scores and Goals Widget', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly without data', async () => {
    const emptyData = {
      widgetData: {
        '% recipients with class': 0,
        'grants with class': 0,
        'recipients with class': 0,
        total: 0,
      },
      pageData: [],
    };
    renderRecipientsWithClassScoresAndGoalsWidget(emptyData);

    expect(screen.getByText(/Recipients with CLASS® scores/i)).toBeInTheDocument();
    expect(screen.getByText(/0-0 of 0/i)).toBeInTheDocument();
  });

  it('renders correctly with data', async () => {
    renderRecipientsWithClassScoresAndGoalsWidget(recipientData);

    expect(screen.getByText(/Recipients with CLASS® scores/i)).toBeInTheDocument();
    expect(screen.getByText(/1-1 of 1/i)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].name)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].grantNumber)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].emotionalSupport)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].classroomOrganization)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].instructionalSupport)).toBeInTheDocument();
    expect(screen.getByText('03/01/2022')).toBeInTheDocument();

    // Expand the goals.
    const goalsButton = screen.getByRole('button', {
      name: /view goals for recipient action for boston community development, inc\. grant 90CI010073 report received 03\/01\/2022/i,
    });
    expect(goalsButton).toBeInTheDocument();
    goalsButton.click();

    expect(screen.getByText(recipientData.pageData[0].goals[0].goalNumber)).toBeInTheDocument();
    expect(screen.getAllByText(recipientData.pageData[0].lastARStartDate).length).toBeGreaterThan(
      0
    );
    expect(screen.getByText(recipientData.pageData[0].goals[0].status)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[0].creator)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[0].collaborator)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[1].goalNumber)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[1].status)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[1].creator)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[1].collaborator)).toBeInTheDocument();
  });

  it('exports grant and review identifying values', async () => {
    renderRecipientsWithClassScoresAndGoalsWidget(recipientData);

    const recipientCheckbox = screen.getByRole('checkbox', {
      name: /select recipient action for boston community development, inc\. grant 90CI010073 report received 03\/01\/2022/i,
    });
    recipientCheckbox.click();

    screen.getByRole('button', { name: /export selected/i }).click();

    const [blob] = createObjectURL.mock.calls[0];
    await expect(readBlobAsText(blob)).resolves.toContain(
      'recipientsWithClassScoresAndGoals,Grant Number,Report Received Date,Last AR Start Date,Emotional Support,Classroom Organization,Instructional Support\n"Action for Boston Community Development, Inc.",90CI010073,03/01/2022,01/02/2021,6.043,5.043,4.043'
    );
  });

  it('updates the page when the per page limit is changed', async () => {
    const numberOfRecipients = 15;
    const multipleRecipientData = {
      widgetData: {
        '% recipients with class': 18.26,
        'grants with class': 346,
        'recipients with class': 283,
        total: 1550,
      },
      pageData: Array.from({ length: numberOfRecipients }, (_, i) => ({
        ...recipientData.pageData[0],
        id: `${i + 1}:QA-REVIEW-A`,
        recipientId: i + 1,
        name: `recipient ${i + 1}`,
      })),
    };
    renderRecipientsWithClassScoresAndGoalsWidget(multipleRecipientData);

    expect(screen.getByText(/Recipients with CLASS® scores/i)).toBeInTheDocument();
    expect(screen.getByText(/1-10 of 15/i)).toBeInTheDocument();

    // Make sure we see 'recipient 1' but we do NOT see 'recipient 15'.
    expect(screen.getByText('recipient 1')).toBeInTheDocument();
    expect(screen.queryByText('recipient 15')).not.toBeInTheDocument();

    // Click the perPage dropdown and select 25.
    const perPageDropdown = screen.getByRole('combobox', { name: /select recipients per page/i });
    userEvent.selectOptions(perPageDropdown, '25');
    expect(screen.getByText(/1-15 of 15/i)).toBeInTheDocument();
    expect(screen.getByText('recipient 1')).toBeInTheDocument();
    expect(screen.getByText('recipient 15')).toBeInTheDocument();
  });

  it('sorts the recipients by name', async () => {
    const numberOfRecipients = 15;
    const multipleRecipientData = {
      widgetData: {
        '% recipients with class': 18.26,
        'grants with class': 346,
        'recipients with class': 283,
        total: 1550,
      },
      pageData: Array.from({ length: numberOfRecipients }, (_, i) => ({
        ...recipientData.pageData[0],
        id: `${i + 1}:QA-REVIEW-A`,
        recipientId: i + 1,
        name: `recipient ${i + 1}`,
      })),
    };

    renderRecipientsWithClassScoresAndGoalsWidget(multipleRecipientData);

    expect(screen.getByText(/Recipients with CLASS® scores/i)).toBeInTheDocument();
    expect(screen.getByText(/1-10 of 15/i)).toBeInTheDocument();

    // Make sure we see 'Apple' but we do NOT see 'Zebra'.
    expect(screen.getByText('recipient 1')).toBeInTheDocument();
    expect(screen.queryByText('recipient 15')).not.toBeInTheDocument();

    // Click the sort button.
    const sortButton = screen.getByRole('combobox', { name: /sort by/i });
    userEvent.selectOptions(sortButton, 'name-desc');

    // Make sure we see 'Zebra' but we do NOT see 'Apple'.
    expect(screen.getByText('recipient 15')).toBeInTheDocument();
    expect(screen.queryByText('recipient 1')).not.toBeInTheDocument();
  });

  it('sorts the recipients by date', async () => {
    const numberOfRecipients = 15;
    const multipleRecipientData = {
      widgetData: {
        '% recipients with class': 18.26,
        'grants with class': 346,
        'recipients with class': 283,
        total: 1550,
      },
      pageData: Array.from({ length: numberOfRecipients }, (_, i) => ({
        ...recipientData.pageData[0],
        id: `${i + 1}:QA-REVIEW-A`,
        recipientId: i + 1,
        name: `recipient ${i + 1}`,
        // Make the date of last TTA increment by 1 day for each recipient.
        lastARStartDate: moment(recipientData.pageData[0].lastARStartDate)
          .add(i, 'days')
          .format('MM/DD/YYYY'),
      })),
    };

    renderRecipientsWithClassScoresAndGoalsWidget(multipleRecipientData);

    expect(screen.getByText(/Recipients with CLASS® scores/i)).toBeInTheDocument();
    expect(screen.getByText(/1-10 of 15/i)).toBeInTheDocument();

    // Make sure we see 'Apple' but we do NOT see 'Zebra'.
    expect(screen.getByText('recipient 1')).toBeInTheDocument();
    expect(screen.queryByText('recipient 15')).not.toBeInTheDocument();

    // Click the sort button.
    const sortButton = screen.getByRole('combobox', { name: /sort by/i });
    userEvent.selectOptions(sortButton, 'lastARStartDate-desc');

    // Make sure we see 'Zebra' but we do NOT see 'Apple'.
    expect(screen.getByText('recipient 15')).toBeInTheDocument();
    expect(screen.queryByText('recipient 1')).not.toBeInTheDocument();

    // Click the sort button.
    userEvent.selectOptions(sortButton, 'lastARStartDate-asc');

    expect(screen.getByText('recipient 1')).toBeInTheDocument();
    expect(screen.queryByText('recipient 15')).not.toBeInTheDocument();
  });
});

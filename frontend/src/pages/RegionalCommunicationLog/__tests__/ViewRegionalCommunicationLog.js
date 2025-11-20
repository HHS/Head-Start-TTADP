import React from 'react';
import join from 'url-join';
import {
  render, screen, act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import ViewRegionalCommunicationLog from '../ViewRegionalCommunicationLog';

const REGION_ID = 1;
const LOG_ID = 1;

const communicationLogUrl = join(
  '/',
  'api',
  'communication-logs',
);

describe('ViewRegionalCommunicationLog', () => {
  const history = createMemoryHistory();

  const renderTest = (
    logId = '1',
  ) => render(
    <Router history={history}>
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
          <ViewRegionalCommunicationLog
            match={{
              params: {
                logId,
                regionId: REGION_ID,
              },
              path: '',
              url: '',
            }}
          />
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    </Router>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.reset();
  });

  it('should render the view', async () => {
    const logData = {
      id: 1,
      userId: '1',
      updatedAt: new Date(),
      author: {
        id: 1,
        name: 'Ted User',
      },
      data: {
        communicationDate: '11/01/2023',
        result: 'Next Steps identified',
        method: 'Phone',
        purpose: 'Monitoring',
        duration: '1',
        notes: '<p>This is a note</p>',
        specialistNextSteps: [
          {
            note: 'next step 1',
            completeDate: '11/23/2023',
          },
        ],
        recipientNextSteps: [
          {
            note: 'next step 2',
            completeDate: '11/16/2023',
          },
        ],
        otherStaff: [{ label: 'Me', value: 1 }],
      },
      files: [
        {
          id: 1,
          originalFileName: 'cat.png',
          url: {
            url: 'https://wikipedia.com/cats',
            error: null,
          },
        },
      ],
    };

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/${LOG_ID}`;
    fetchMock.get(url, logData);

    await act(async () => {
      renderTest();
    });

    expect(await screen.findByText('Ted User')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Edit' })).toBeInTheDocument();
  });

  it('shows error message', async () => {
    const url = `${communicationLogUrl}/region/${REGION_ID}/log/${LOG_ID}`;
    const spy = jest.spyOn(history, 'push');
    fetchMock.get(url, 500);
    await act(async () => {
      renderTest('1');
    });

    expect(spy).toHaveBeenCalledWith('/something-went-wrong/500');
  });

  it('should render the view without edit button', async () => {
    const logData = {
      id: 1,
      userId: '1',
      updatedAt: new Date(),
      files: [],
      author: {
        id: 2,
        name: 'Tedwina User',
      },
      data: {
        communicationDate: '11/01/2023',
        result: 'Next Steps identified',
        method: 'Phone',
        purpose: 'Monitoring',
        duration: '1',
        notes: '<p>This is a note</p>',
        specialistNextSteps: [
          {
            note: 'next step 1',
            completeDate: '11/23/2023',
          },
        ],
        recipientNextSteps: [
          {
            note: 'next step 2',
            completeDate: '11/16/2023',
          },
        ],
        otherStaff: [],
      },
    };

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/${LOG_ID}`;
    fetchMock.get(url, logData);

    await act(async () => {
      renderTest();
    });

    expect(await screen.findByText('Tedwina User')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('hides notes when empty', async () => {
    const logData = {
      id: 1,
      userId: '1',
      updatedAt: new Date(),
      files: [],
      author: {
        id: 1,
        name: 'Ted User',
      },
      data: {
        communicationDate: '11/01/2023',
        result: 'Next Steps identified',
        method: 'Phone',
        purpose: 'Monitoring',
        duration: '1',
        notes: '',
        specialistNextSteps: [],
        recipientNextSteps: [],
        otherStaff: [],
      },
    };

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/${LOG_ID}`;
    fetchMock.get(url, logData);

    await act(async () => {
      renderTest();
    });

    expect(await screen.findByText('Ted User')).toBeInTheDocument();
    expect(screen.queryByText('Notes')).toBeNull();
  });
});

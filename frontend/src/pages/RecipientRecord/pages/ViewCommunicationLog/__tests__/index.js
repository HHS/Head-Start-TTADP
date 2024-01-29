import React from 'react';
import join from 'url-join';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import UserContext from '../../../../../UserContext';
import AppLoadingContext from '../../../../../AppLoadingContext';
import { NOT_STARTED, COMPLETE } from '../../../../../components/Navigator/constants';
import ViewCommunicationForm from '../index';

const RECIPIENT_ID = 1;
const REGION_ID = 1;
const RECIPIENT_NAME = 'Little Lord Wigglytoes';

const communicationLogUrl = join(
  '/',
  'api',
  'communication-logs',
);

describe('ViewCommunicationForm', () => {
  const history = createMemoryHistory();

  const renderTest = (
    communicationLogId = '1',
  ) => render(
    <Router history={history}>
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
          <ViewCommunicationForm
            recipientName={RECIPIENT_NAME}
            match={{
              params: {
                communicationLogId,
                recipientId: RECIPIENT_ID,
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
    const formData = {
      id: 1,
      recipientId: RECIPIENT_ID,
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
        notes: 'This is a note',
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
        pageState: {
          1: COMPLETE,
          2: NOT_STARTED,
          3: NOT_STARTED,
        },
      },
    };

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`;
    fetchMock.get(url, formData);

    await act(() => waitFor(() => {
      renderTest();
    }));

    expect(await screen.findByText('Little Lord Wigglytoes')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Edit' })).toBeInTheDocument();
  });

  it('shows error message', async () => {
    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`;
    fetchMock.get(url, 500);

    await act(() => waitFor(() => {
      renderTest();
    }));

    expect(await screen.findByText(/There was an error fetching the communication log/i)).toBeInTheDocument();
  });

  it('should render the view without edit button', async () => {
    const formData = {
      id: 1,
      recipientId: RECIPIENT_ID,
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
        notes: 'This is a note',
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
        pageState: {
          1: COMPLETE,
          2: NOT_STARTED,
          3: NOT_STARTED,
        },
      },
    };

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`;
    fetchMock.get(url, formData);

    await act(() => waitFor(() => {
      renderTest();
    }));

    expect(await screen.findByText('Little Lord Wigglytoes')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
  });
});

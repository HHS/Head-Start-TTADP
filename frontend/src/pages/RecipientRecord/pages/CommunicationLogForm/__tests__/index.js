/* eslint-disable jest/no-disabled-tests */
import React from 'react';
import join from 'url-join';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import {
  MemoryRouter, Routes, Route, useLocation,
} from 'react-router-dom';
import UserContext from '../../../../../UserContext';
import AppLoadingContext from '../../../../../AppLoadingContext';
import { NOT_STARTED, COMPLETE } from '../../../../../components/Navigator/constants';
import CommunicationLogForm from '../index';

const RECIPIENT_ID = 1;
const REGION_ID = 1;
const RECIPIENT_NAME = 'Little Lord Wigglytoes';

const communicationLogUrl = join(
  '/',
  'api',
  'communication-logs',
);

let location;

const TestComponent = () => {
  location = useLocation();
  return (
    <AppLoadingContext.Provider
      value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}
    >
      <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
        <CommunicationLogForm
          recipientName={RECIPIENT_NAME}
        />
      </UserContext.Provider>
    </AppLoadingContext.Provider>
  );
};

describe('CommunicationLogForm', () => {
  const renderTest = (
    communicationLogId = 'new',
    currentPage = 'log',
  ) => {
    render(
      <MemoryRouter
        initialEntries={[`/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}/communication/${communicationLogId}/${currentPage}`]}
      >
        <Routes>
          <Route
            path="/recipient-tta-records/:recipientId/region/:regionId/communication/:communicationLogId/:currentPage"
            element={(
              <TestComponent />
              )}
          />
          <Route
            path="*"
            element={<div>hello</div>}
          />
        </Routes>
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.reset();
  });

  it('renders training report form', async () => {
    await act(() => waitFor(() => {
      renderTest();
    }));

    expect(screen.getByText(/Little Lord Wigglytoes/i)).toBeInTheDocument();
  });

  it('redirects to log', async () => {
    await act(() => waitFor(() => {
      renderTest('new', '');
    }));

    expect(location.pathname).toEqual(`/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}/communication/new/log`);
  });

  it('fetches log by id', async () => {
    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`;
    fetchMock.get(url, {
      id: 0,
      recipientId: '',
      userId: '',
      data: {
        pageState: {
          1: NOT_STARTED,
          2: NOT_STARTED,
          3: NOT_STARTED,
          4: NOT_STARTED,
        },
      },
    });

    await act(() => waitFor(() => {
      renderTest('1', 'log');
    }));

    expect(fetchMock.called(url)).toBe(true);

    expect(screen.getByText(/Little Lord Wigglytoes/i)).toBeInTheDocument();
  });

  it('handlers error fetching log by id', async () => {
    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`;
    fetchMock.get(url, 500);

    await act(() => waitFor(() => {
      renderTest('1', 'log');
    }));

    expect(fetchMock.called(url)).toBe(true);

    expect(screen.getByText(/Little Lord Wigglytoes/i)).toBeInTheDocument();
    expect(screen.getByText(/Error fetching communication log/i)).toBeInTheDocument();
  });

  it('Validates required fields', async () => {
    await act(() => waitFor(() => {
      renderTest('new', 'log');
    }));

    const onSaveButton = screen.getByText(/save and continue/i);
    await act(() => waitFor(() => {
      userEvent.click(onSaveButton);
    }));

    expect(fetchMock.called()).toBe(false);

    await Promise.all([
      /Select a communication method/i,
      /enter duration/i,
      /Select a purpose of communication/i,
    ].map(async (message) => {
      expect(await screen.findByText(message)).toBeInTheDocument();
    }));
  });

  it('allows a page to be completed', async () => {
    await act(() => waitFor(() => {
      renderTest('new', 'log');
    }));

    const communicationDate = document.querySelector('#communicationDate');
    userEvent.type(communicationDate, '11/01/2023');

    const duration = await screen.findByLabelText(/duration in hours/i);
    userEvent.type(duration, '1');

    const method = await screen.findByLabelText(/How was the communication conducted/i);
    userEvent.selectOptions(method, 'Phone');

    const purpose = await screen.findByLabelText(/purpose of communication/i);
    userEvent.selectOptions(purpose, 'Monitoring');

    const notes = await screen.findByLabelText(/notes/i);
    userEvent.type(notes, 'This is a note');

    const result = await screen.findByLabelText(/result/i);
    userEvent.selectOptions(result, 'Next Steps identified');

    const url = `${communicationLogUrl}/region/${REGION_ID}/recipient/${RECIPIENT_ID}`;
    fetchMock.post(url, {
      id: 0,
      recipientId: '',
      userId: '',
      data: {
        pageState: {
          1: COMPLETE,
          2: NOT_STARTED,
          3: NOT_STARTED,
        },
      },
      updatedAt: new Date(),
    });

    const onSaveButton = screen.getByText(/save and continue/i);
    await act(() => waitFor(() => {
      userEvent.click(onSaveButton);
    }));

    await waitFor(() => expect(fetchMock.called(url, { method: 'post' })).toBe(true));
  });

  it('handles an error saving page', async () => {
    await act(() => waitFor(() => {
      renderTest('new', 'log');
    }));

    const communicationDate = document.querySelector('#communicationDate');
    userEvent.type(communicationDate, '11/01/2023');

    const duration = await screen.findByLabelText(/duration in hours/i);
    userEvent.type(duration, '1');

    const method = await screen.findByLabelText(/How was the communication conducted/i);
    userEvent.selectOptions(method, 'Phone');

    const purpose = await screen.findByLabelText(/purpose of communication/i);
    userEvent.selectOptions(purpose, 'Monitoring');

    const notes = await screen.findByLabelText(/notes/i);
    userEvent.type(notes, 'This is a note');

    const result = await screen.findByLabelText(/result/i);
    userEvent.selectOptions(result, 'Next Steps identified');

    const url = `${communicationLogUrl}/region/${REGION_ID}/recipient/${RECIPIENT_ID}`;
    fetchMock.post(url, 500);

    const onSaveButton = screen.getByText(/save and continue/i);
    await act(() => waitFor(() => {
      userEvent.click(onSaveButton);
    }));

    await waitFor(() => expect(fetchMock.called(url, { method: 'post' })).toBe(true));
    await waitFor(() => expect(screen.getByText(/There was an error saving the communication log. Please try again later/i)).toBeInTheDocument());
  });

  it('you can complete support attachment', async () => {
    const formData = {
      id: 1,
      recipientId: RECIPIENT_ID,
      userId: '1',
      updatedAt: new Date(),
      files: [],
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
    const putUrl = `${communicationLogUrl}/log/1`;
    fetchMock.get(url, formData);
    fetchMock.put(putUrl, formData);

    await act(() => waitFor(() => {
      renderTest('1', 'supporting-attachments');
    }));

    expect(fetchMock.called(url, { method: 'get' })).toBe(true);
    const onSaveButton = screen.getByText(/save and continue/i);
    await act(() => waitFor(() => {
      userEvent.click(onSaveButton);
    }));
    await waitFor(() => expect(fetchMock.called(putUrl, { method: 'put' })).toBe(true));
    expect(location.pathname).toEqual(`/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}/communication/1/next-steps`);
  });

  it.skip('can submit the form', async () => {
    const formData = {
      id: 1,
      recipientId: RECIPIENT_ID,
      userId: '1',
      updatedAt: new Date(),
      files: [],
      data: {
        communicationDate: '11/01/2023',
        notes: 'adsf',
        method: 'Phone',
        result: 'New TTA accepted',
        purpose: "Program Specialist's site visit",
        duration: 1,
        regionId: '1',
        createdAt: '2023-11-15T16:15:55.134Z',
        pageState: {
          1: 'Complete',
          2: 'Complete',
          3: 'Complete',
        },
        pocComplete: false,
        recipientNextSteps: [
          {
            note: 'asdf',
            completeDate: '11/01/2023',
          },
        ],
        specialistNextSteps: [
          {
            note: 'asf',
            completeDate: '11/01/2023',
          },
        ],
        'pageVisited-supporting-attachments': 'true',
      },
    };

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`;
    const putUrl = `${communicationLogUrl}/log/1`;
    fetchMock.get(url, formData);
    fetchMock.put(putUrl, formData);

    await act(() => waitFor(() => {
      renderTest('1', 'next-steps');
    }));

    expect(fetchMock.called(url, { method: 'get' })).toBe(true);
    const submit = screen.getByText(/save log/i);
    await act(() => waitFor(() => {
      userEvent.click(submit);
    }));
    expect(fetchMock.called(putUrl, { method: 'put' })).toBe(true);
    expect(location.pathname).toEqual(`/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}/communication`);
  });

  it('handles error submitting the form', async () => {
    const formData = {
      id: 1,
      recipientId: RECIPIENT_ID,
      userId: '1',
      updatedAt: new Date(),
      files: [],
      data: {
        communicationDate: '11/01/2023',
        notes: 'adsf',
        method: 'Phone',
        result: 'New TTA accepted',
        purpose: "Program Specialist's site visit",
        duration: 1,
        regionId: '1',
        createdAt: '2023-11-15T16:15:55.134Z',
        pageState: {
          1: 'Complete',
          2: 'Complete',
          3: 'Complete',
        },
        pocComplete: false,
        recipientNextSteps: [
          {
            note: 'asdf',
            completeDate: '11/01/2023',
          },
        ],
        specialistNextSteps: [
          {
            note: 'asf',
            completeDate: '11/01/2023',
          },
        ],
        'pageVisited-supporting-attachments': 'true',
      },
    };

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`;
    const putUrl = `${communicationLogUrl}/log/1`;
    fetchMock.get(url, formData);
    fetchMock.put(putUrl, 500);

    await act(() => waitFor(() => {
      renderTest('1', 'next-steps');
    }));

    expect(fetchMock.called(url, { method: 'get' })).toBe(true);
    const submit = screen.getByText(/save log/i);
    await act(() => waitFor(() => {
      userEvent.click(submit);
    }));
    expect(fetchMock.called(putUrl, { method: 'put' })).toBe(true);
    await waitFor(() => expect(screen.getByText(/There was an error saving the communication log. Please try again later/i)).toBeInTheDocument());
  });

  it('can go back', async () => {
    const formData = {
      id: 1,
      recipientId: RECIPIENT_ID,
      userId: '1',
      updatedAt: new Date(),
      files: [],
      data: {
        communicationDate: '11/01/2023',
        notes: 'adsf',
        method: 'Phone',
        result: 'New TTA accepted',
        purpose: "Program Specialist's site visit",
        duration: 1,
        regionId: '1',
        createdAt: '2023-11-15T16:15:55.134Z',
        pageState: {
          1: 'Complete',
          2: 'Complete',
          3: 'Complete',
        },
        pocComplete: false,
        recipientNextSteps: [
          {
            note: 'asdf',
            completeDate: '11/01/2023',
          },
        ],
        specialistNextSteps: [
          {
            note: 'asf',
            completeDate: '11/01/2023',
          },
        ],
        'pageVisited-supporting-attachments': 'true',
      },
    };

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`;
    const putUrl = `${communicationLogUrl}/log/1`;
    fetchMock.get(url, formData);
    fetchMock.put(putUrl, formData);

    await act(() => waitFor(() => {
      renderTest('1', 'next-steps');
    }));

    expect(fetchMock.called(url, { method: 'get' })).toBe(true);
    const back = await screen.findByRole('button', { name: /back/i });
    await act(() => waitFor(() => {
      userEvent.click(back);
    }));
    expect(fetchMock.called(putUrl, { method: 'put' })).toBe(true);
    expect(location.pathname).toEqual(`/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}/communication/1/supporting-attachments`);
  });
});

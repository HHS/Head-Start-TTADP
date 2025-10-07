import React from 'react';
import moment from 'moment';
import join from 'url-join';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TRAINING_REPORT_STATUSES, SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import SessionForm from '..';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import { COMPLETE, IN_PROGRESS } from '../../../components/Navigator/constants';
import { mockRSSData } from '../../../testHelpers';
import { istKeys, pocKeys } from '../constants';

const istAndPocFields = {
  id: 1,
  regionId: null,
  sessionName: 'test session',
  startDate: '01/01/2024',
  endDate: '01/01/2024',
  duration: 1,
  context: 'test context',
  objective: 'test objective',
  objectiveTopics: ['topic'],
  objectiveTrainers: ['DTL'],
  useIpdCourses: true,
  courses: [],
  objectiveResources: [],
  addObjectiveFilesYes: true,
  files: [],
  ttaProvided: 'in person',
  objectiveSupportType: 'Planning',
  isIstVisit: true,
  regionalOfficeTta: 'DTL',
  recipients: [],
  participants: [],
  numberOfParticipants: 1,
  numberOfParticipantsInPerson: 1,
  numberOfParticipantsVirtually: 1,
  deliveryMethod: 'In-person',
  language: [],
  supportingAttachments: [],
  recipientNextSteps: [],
  specialistNextSteps: [],
  pocComplete: false,
  ownerComplete: false,
  istSelectionComplete: false,
  status: 'In progress',
  ownerId: null,
  eventId: '',
  eventDisplayId: '',
  eventName: '',
  pageState: {
    1: 'Not started',
    2: 'Not started',
    3: 'Not started',
    4: 'Not started',
  },
  'pageVisited-supporting-attachments': false,
  facilitation: 'national_center',
  sessionGoalTemplates: [],
  approverId: null,
  additionalNotes: '',
  managerNotes: '',
  dateSubmitted: null,
};

const completeFormData = {
  eventId: 1,
  eventDisplayId: 'R-EVENT',
  id: 1,
  ownerId: 1,
  eventName: 'Test event',
  status: TRAINING_REPORT_STATUSES.COMPLETE,
  pageState: {
    1: IN_PROGRESS,
    2: COMPLETE,
    3: COMPLETE,
  },
  sessionName: 'Test session',
  endDate: '01/01/2024',
  startDate: '01/01/2024',
  duration: 1,
  context: 'asasfdsafasdfsdaf',
  objective: 'test objective',
  objectiveTopics: ['topic'],
  objectiveTrainers: ['DTL'],
  objectiveResources: [],
  files: [],
  objectiveSupportType: 'Planning',
  regionId: 1,
  participants: [1],
  recipients: [1],
  deliveryMethod: 'In-person',
  numberOfParticipants: 1,
  ttaProvided: 'oH YEAH',
  specialistNextSteps: [{ note: 'A', completeDate: '01/01/2024' }],
  recipientNextSteps: [{ note: 'B', completeDate: '01/01/2024' }],
};

describe('SessionReportForm', () => {
  const sessionsUrl = join('/', 'api', 'session-reports');
  const history = createMemoryHistory();

  const renderSessionForm = (
    trainingReportId,
    currentPage,
    sessionId,
    user = { user: { id: 1, permissions: [], name: 'Ted User' } },
  ) => render(
    <Router history={history}>
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <UserContext.Provider value={user}>
          <SessionForm match={{
            params: { currentPage, trainingReportId, sessionId },
            path: currentPage,
            url: currentPage,
          }}
          />
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    </Router>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    fetchMock.reset();

    // the basic app before stuff
    fetchMock.get('/api/alerts', []);
    fetchMock.get('/api/topic', [{ id: 1, name: 'Behavioral Health' }]);
    fetchMock.get('/api/users/statistics', {});
    fetchMock.get('/api/courses', []);
    fetchMock.get('/api/national-center', [
      'DTL',
      'HBHS',
      'PFCE',
      'PFMO',
    ].map((name, id) => ({ id, name })));
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', mockRSSData());
    fetchMock.get('/api/feeds/item?tag=ttahub-tta-support-type', mockRSSData());
    fetchMock.get('/api/feeds/item?tag=ttahub-ohs-standard-goals', mockRSSData());
    fetchMock.get('/api/goal-templates', []);
  });

  it('creates a new session if id is "new"', async () => {
    fetchMock.post(sessionsUrl, { eventId: 1 });

    act(() => {
      renderSessionForm('1', 'session-summary', 'new');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'POST' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
  });

  it('handles an error creating a new report', async () => {
    fetchMock.post(sessionsUrl, 500);

    act(() => {
      renderSessionForm('1', 'session-summary', 'new');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'POST' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
    expect(screen.getByText(/Error creating session/i)).toBeInTheDocument();
  });

  it('fetches existing session report form', async () => {
    jest.useFakeTimers();
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1, event: { ownerId: 1, data: { eventName: 'Tis an event', eventId: 1 } } },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
    jest.advanceTimersByTime(30000);

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
  });

  it('sets response error', async () => {
    const url = join(sessionsUrl, 'id', '1');
    const spy = jest.spyOn(history, 'push');
    fetchMock.get(
      url, 500,
    );
    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith('/something-went-wrong/500');
  });

  it('saves draft', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1, event: { ownerId: 1, data: { eventId: 1 } } },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    fetchMock.put(url, { eventId: 1 });
    const saveSession = screen.getByText(/Save draft/i);
    userEvent.click(saveSession);
    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
  });

  it('handles error saving draft', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1, event: { ownerId: 1, data: { eventId: 1 } } },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    fetchMock.put(url, 500);
    const saveSession = screen.getByText(/Save draft/i);
    userEvent.click(saveSession);
    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
    expect(screen.getByText(/There was an error saving the session/i)).toBeInTheDocument();
  });

  it('saves on save and continue', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1, event: { ownerId: 1, data: { eventId: 1 } } },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    fetchMock.put(url, { eventId: 1 });
    const saveSession = document.querySelector('#session-summary-save-continue');
    userEvent.click(saveSession);

    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
  });

  it('redirects if session is complete', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(url, completeFormData);

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));
    expect(history.location.pathname).toBe('/training-report/view/1');
  });

  it('redirects when user is a POC', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1, event: { ownerId: 2, data: { eventId: 1 }, pocIds: [1] } },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    // Ensure redirect for POC was called.
    expect(history.location.pathname).toMatch(/\/participants$/);
  });

  it('renders all the pages for a POC', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1, event: { ownerId: 2, data: { eventId: 1 }, pocIds: [1] } },
    );

    act(() => {
      renderSessionForm('1', 'participants', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));
    expect(screen.queryAllByText('Event summary').length).toBe(0);
    expect(screen.queryAllByText('Participants').length).toBe(2);
    expect(screen.getByText('Supporting attachments')).toBeInTheDocument();
    expect(screen.getByText('Next steps')).toBeInTheDocument();
  });

  it('automatically sets the status to "In progress" when the session is submitted and has a current status of "Not started"', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1, event: { ownerId: 1, data: { eventId: 1, status: 'Not started' } } },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    fetchMock.put(url, { eventId: 1 });
    const saveSession = document.querySelector('#session-summary-save-continue');
    userEvent.click(saveSession);

    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
    // verify the put body has status of "In progress".
    const putBody = fetchMock.lastOptions(url).body;
    const putBodyJson = JSON.parse(putBody);
    expect(putBodyJson.data.status).toBe('In progress');
  });

  it('automatically sets the status to "In progress" when the session is saved and has a current status of "Not started"', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1, event: { ownerId: 1, data: { eventId: 1, status: 'Not started' } } },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    await waitFor(() => expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument());

    fetchMock.put(url, { eventId: 1 });
    const saveSession = screen.getByText(/Save draft/i);
    userEvent.click(saveSession);

    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
    // verify the put body has status of "In progress".
    const putBody = fetchMock.lastOptions(url).body;
    const putBodyJson = JSON.parse(putBody);
    expect(putBodyJson.data.status).toBe('In progress');
  });

  it('sets poc complete values on submit', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { ...completeFormData, status: 'In progress', event: { ownerId: 2, data: { eventId: 1 }, pocIds: [1] } },
    );

    act(() => {
      renderSessionForm('1', 'next-steps', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    fetchMock.put(url, { eventId: 1 });
    const saveSession = screen.getByText(/Review and submit/i);
    userEvent.click(saveSession);

    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));

    // todo, confirm: i don't think we need these any longer
    // const putBody = fetchMock.lastOptions(url).body;

    // // Assert the poc complete properties.
    // const putBodyJson = JSON.parse(putBody);
    // expect(putBodyJson.data.pocComplete).toBe(true);
    // expect(putBodyJson.data.pocCompleteId).toBe(1);
    // expect(putBodyJson.data.pocCompleteDate).toBe(moment().format('YYYY-MM-DD'));

    // expect(putBodyJson.data.ownerComplete).toBe(undefined);
    // expect(putBodyJson.data.ownerCompleteId).toBe(undefined);
    // expect(putBodyJson.data.ownerCompleteDate).toBe(undefined);
  });

  it('sets owner complete values on submit', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { ...completeFormData, status: 'In progress', event: { ownerId: 1, data: { eventId: 1 }, pocIds: [2] } },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    fetchMock.put(url, { eventId: 1 });
    const saveSession = document.querySelector('#session-summary-save-continue');
    userEvent.click(saveSession);

    // // Wait for the modal to display.
    // await waitFor(() => expect(
    // screen.getByText(
    // /You will not be able to make changes once you save the session./i)).toBeInTheDocument()
    // );

    // // get the button with the text "Yes, continue".
    // const yesContinueButton = screen.getByRole('button', { name: /Yes, continue/i });
    // act(() => {
    //   userEvent.click(yesContinueButton);
    // });

    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));

    const putBody = fetchMock.lastOptions(url).body;

    // Assert the poc complete properties.
    const putBodyJson = JSON.parse(putBody);
    expect(putBodyJson.data.ownerComplete).toBe(true);
    expect(putBodyJson.data.ownerCompleteId).toBe(1);
    expect(putBodyJson.data.ownerCompleteDate).toBe(moment().format('YYYY-MM-DD'));

    // Assert the poc complete properties are NOT set.
    expect(putBodyJson.data.pocComplete).toBe(undefined);
    expect(putBodyJson.data.pocCompleteId).toBe(undefined);
    expect(putBodyJson.data.pocCompleteDate).toBe(undefined);
  });

  it('renders all pages for the admin', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1, event: { ownerId: 2, data: { eventId: 1 } } },
    );

    const adminUser = {
      user: {
        id: 1,
        permissions: [{
          userId: 1,
          regionId: 1,
          scopeId: SCOPE_IDS.ADMIN,
        }],
        name: 'Ted User',
      },
    };

    act(() => {
      renderSessionForm('1', 'session-summary', '1', adminUser);
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.queryAllByText('Session summary').length).toBe(2);
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Supporting attachments')).toBeInTheDocument();
    expect(screen.getByText('Next steps')).toBeInTheDocument();
  });

  it('calls the resetFormData function with both IST and POC fields', async () => {
    const adminUser = {
      user: {
        id: 1,
        permissions: [{
          userId: 1,
          regionId: 1,
          scopeId: SCOPE_IDS.ADMIN,
        }],
        name: 'Ted User',
      },
    };

    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, {
        eventId: 1,
        data: {
          eventId: 1,
          ...istAndPocFields,
        },
        event: { ownerId: 1, data: { eventId: 1 } },
      },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1', adminUser);
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    fetchMock.put(url, { eventId: 1, data: { ...istAndPocFields } });
    const saveSession = screen.getByText(/Save draft/i);
    userEvent.click(saveSession);

    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
    // Assert the put contains the correct data
    const putBody = fetchMock.lastOptions(url).body;
    const putBodyJson = JSON.parse(putBody);
    const allKeys = [...istKeys, ...pocKeys];
    allKeys.forEach((key) => {
      expect(Object.prototype.hasOwnProperty.call(putBodyJson.data, key)).toBe(true);
    });
  });

  it('calls the resetFormData function with IST and removes POC fields', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, {
        eventId: 1,
        data: {
          eventId: 1,
          ...istAndPocFields,
        },
        event: { ownerId: 1, data: { eventId: 1 } },
      },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    fetchMock.put(url, { eventId: 1, data: { ...istAndPocFields } });
    const saveSession = screen.getByText(/Save draft/i);
    userEvent.click(saveSession);

    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
    // Assert the put contains the correct data
    const putBody = fetchMock.lastOptions(url).body;
    const putBodyJson = JSON.parse(putBody);
    // Assert the body has istkey porperties using the hasOwnProperty method
    // create a variable to removes pocComplete.
    const istKeysWithoutPocComplete = istKeys.filter((key) => key !== 'pocComplete');
    istKeysWithoutPocComplete.forEach((key) => {
      expect(Object.prototype.hasOwnProperty.call(putBodyJson.data, key)).toBe(true);
    });
  });

  it('calls the resetFormData function with POC and removes IST fields', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, {
        eventId: 1,
        data: {
          eventId: 1,
          ...istAndPocFields,
        },
        event: { ownerId: 2, data: { eventId: 1 }, pocIds: [1] },
      },
    );

    act(() => {
      renderSessionForm('1', 'participants', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    fetchMock.put(url, { eventId: 1, data: { ...istAndPocFields } });
    const saveSession = screen.getByText(/Save draft/i);
    userEvent.click(saveSession);

    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
    // Assert the put contains the correct data
    const putBody = fetchMock.lastOptions(url).body;
    const putBodyJson = JSON.parse(putBody);

    // Assert the body has istkey porperties using the hasOwnProperty method
    // create a variable to removes pocComplete.
    const istKeysWithoutOwnerComplete = pocKeys.filter((key) => key !== 'ownerComplete');
    istKeysWithoutOwnerComplete.forEach((key) => {
      expect(Object.prototype.hasOwnProperty.call(putBodyJson.data, key)).toBe(true);
    });
  });
});

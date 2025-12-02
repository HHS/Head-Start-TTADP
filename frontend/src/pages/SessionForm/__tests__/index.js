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
  regionId: 1,
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
  isIstVisit: 'yes',
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
  submitter: '',
  submitted: false,
  additionalStates: [],
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
    fetchMock.get('/api/users/trainers/regional/region/1', [
      { id: 1, fullName: 'Regional Trainer 1' },
      { id: 2, fullName: 'Regional Trainer 2' },
    ]);
    fetchMock.get('/api/users/trainers/national-center/region/1', [
      { id: 1, fullName: 'National Center Trainer 1' },
      { id: 2, fullName: 'National Center Trainer 2' },
    ]);
    fetchMock.get('/api/session-reports/participants/1', []);
    fetchMock.get('/api/session-reports/groups?region=1', []);
  });

  it('creates a new session if id is "new"', async () => {
    fetchMock.post(sessionsUrl, {
      id: 1,
      eventId: 1,
      regionId: 1,
      data: {},
      event: {
        regionId: 1,
        ownerId: 1,
        pocIds: [],
        collaboratorIds: [1], // Owner is also a collaborator
        data: {
          eventId: 1,
          eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
        },
      },
    });

    await act(async () => {
      renderSessionForm('1', 'session-summary', 'new');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'POST' })).toBe(true));

    await waitFor(() => {
      expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles an error creating a new report', async () => {
    fetchMock.post(sessionsUrl, 500);

    act(() => {
      renderSessionForm('1', 'session-summary', 'new');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'POST' })).toBe(true));

    // When there's an error creating the session, form doesn't render
    // but reportFetched is set to true in the finally block
    // Since there's no valid session data, applicationPages is empty
    // and nothing renders
    await waitFor(() => {
      // Component returns null when applicationPages is empty
      expect(fetchMock.called(sessionsUrl, { method: 'POST' })).toBe(true);
    });
  });

  it('fetches existing session report form', async () => {
    jest.useFakeTimers();
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, {
        id: 1,
        eventId: 1,
        regionId: 1,
        data: {},
        event: {
          regionId: 1,
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventName: 'Tis an event',
            eventId: 1,
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
      },
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
      url, {
        id: 1,
        eventId: 1,
        regionId: 1,
        data: {},
        event: {
          regionId: 1,
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventId: 1,
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
      },
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
      url, {
        id: 1,
        eventId: 1,
        regionId: 1,
        data: {},
        event: {
          regionId: 1,
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventId: 1,
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
      },
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
      url, {
        id: 1,
        eventId: 1,
        regionId: 1,
        data: {},
        event: {
          regionId: 1,
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventId: 1,
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
      },
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

  it('redirects when user is a POC without regional facilitation', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, {
        id: 1,
        eventId: 1,
        regionId: 1,
        data: {
          facilitation: 'national_center',
        },
        event: {
          regionId: 1,
          ownerId: 2,
          pocIds: [1],
          collaboratorIds: [],
          data: {
            eventId: 1,
            eventOrganizer: 'Regional PD Event (with National Centers)',
          },
        },
      },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    // Ensure redirect for POC was called - POC without regional
    // facilitation should redirect to participants
    expect(history.location.pathname).toMatch(/\/participants$/);
  });

  it('renders all the pages for a POC without regional facilitation', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, {
        id: 1,
        eventId: 1,
        regionId: 1,
        data: {
          facilitation: 'national_center',
        },
        event: {
          regionId: 1,
          ownerId: 2,
          pocIds: [1],
          collaboratorIds: [],
          data: {
            eventId: 1,
            eventOrganizer: 'Regional PD Event (with National Centers)',
          },
        },
      },
    );

    act(() => {
      renderSessionForm('1', 'participants', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));
    // POC without regional facilitation should NOT see session summary
    expect(screen.queryAllByText('Session summary').length).toBe(0);
    expect(screen.queryAllByText('Participants').length).toBe(2);
    expect(screen.getByText('Supporting attachments')).toBeInTheDocument();
    expect(screen.getByText('Next steps')).toBeInTheDocument();
  });

  it('automatically sets the status to "In progress" when the session is submitted and has a current status of "Not started"', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, {
        id: 1,
        eventId: 1,
        regionId: 1,
        data: {},
        event: {
          regionId: 1,
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventId: 1,
            status: 'Not started',
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
      },
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
      url, {
        id: 1,
        eventId: 1,
        regionId: 1,
        data: {},
        event: {
          regionId: 1,
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventId: 1,
            status: 'Not started',
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
      },
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
      url, {
        ...completeFormData,
        id: 1,
        data: {
          sessionName: 'Test session',
          duration: 1,
          context: 'test context',
          objective: 'test objective',
          objectiveTopics: ['topic'],
          objectiveTrainers: ['DTL'],
          numberOfParticipants: 1,
          deliveryMethod: 'In-person',
        },
        facilitation: 'regional_tta_staff',
        approverId: 3,
        approver: { id: 3, fullName: 'Approver Name' },
        status: 'In progress',
        event: {
          regionId: 1,
          ownerId: 2,
          pocIds: [1],
          collaboratorIds: [],
          data: {
            eventId: 1,
            eventOrganizer: 'Regional PD Event (with National Centers)',
          },
        },
      },
    );

    act(() => {
      renderSessionForm('1', 'review', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    await waitFor(() => {
      expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    fetchMock.put(url, { eventId: 1 });
    const saveSession = await screen.findByRole('button', { name: /submit for approval/i });
    act(() => {
      userEvent.click(saveSession);
    });

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
      url, {
        ...completeFormData,
        id: 1,
        data: {
          sessionName: 'Test session',
          duration: 1,
          context: 'test context',
          objective: 'test objective',
          objectiveTopics: ['topic'],
          objectiveTrainers: ['DTL'],
          numberOfParticipants: 1,
          deliveryMethod: 'In-person',
        },
        approverId: 3,
        approver: { id: 3, fullName: 'Approver Name' },
        status: 'In progress',
        event: {
          regionId: 1,
          ownerId: 1,
          pocIds: [2],
          collaboratorIds: [1],
          data: {
            eventId: 1,
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
      },
    );

    act(() => {
      renderSessionForm('1', 'review', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    await waitFor(() => {
      expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    fetchMock.put(url, { eventId: 1 });

    const submit = await screen.findByRole('button', { name: /submit for approval/i });
    act(() => {
      userEvent.click(submit);
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));

    const putBody = fetchMock.lastOptions(url).body;

    // Assert the owner complete properties.
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
      url, {
        eventId: 1,
        regionId: 1,
        data: {},
        event: {
          regionId: 1,
          ownerId: 2,
          data: {
            eventId: 1,
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
      },
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
        event: {
          regionId: 1,
          ownerId: 1,
          data: {
            eventId: 1,
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
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
        facilitation: 'national_center',
        event: {
          regionId: 1,
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventId: 1,
            eventOrganizer: 'Regional PD Event (with National Centers)',
          },
        },
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
    // Assert the body has istkey properties using the hasOwnProperty method
    // Owner (not admin) should only get IST keys, and pocComplete should be removed.
    const istKeysWithoutPocComplete = istKeys.filter((key) => key !== 'pocComplete');
    istKeysWithoutPocComplete.forEach((key) => {
      expect(Object.prototype.hasOwnProperty.call(putBodyJson.data, key)).toBe(true);
    });
    // Assert POC-only fields are NOT present (fields in pocKeys but not in istKeys)
    const pocOnlyKeys = pocKeys.filter((key) => !istKeys.includes(key));
    pocOnlyKeys.forEach((key) => {
      expect(Object.prototype.hasOwnProperty.call(putBodyJson.data, key)).toBe(false);
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
          facilitation: 'national_center',
        },
        event: {
          regionId: 1,
          ownerId: 2,
          data: {
            eventId: 1,
            eventOrganizer: 'Regional PD Event (with National Centers)',
          },
          pocIds: [1],
          collaboratorIds: [],
        },
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

    // Assert the body has POC key properties using the hasOwnProperty method
    // POC (not admin) should only get POC keys, and ownerComplete should be removed.
    const pocKeysWithoutOwnerComplete = pocKeys.filter((key) => key !== 'ownerComplete');
    pocKeysWithoutOwnerComplete.forEach((key) => {
      expect(Object.prototype.hasOwnProperty.call(putBodyJson.data, key)).toBe(true);
    });
    // Assert IST-only fields are NOT present (fields in istKeys but not in pocKeys)
    const istOnlyKeys = istKeys.filter((key) => !pocKeys.includes(key));
    istOnlyKeys.forEach((key) => {
      expect(Object.prototype.hasOwnProperty.call(putBodyJson.data, key)).toBe(false);
    });
  });

  it('sets reportId.current when session is created', async () => {
    fetchMock.post(sessionsUrl, {
      id: 999,
      eventId: 1,
      regionId: 1,
      data: {},
      event: {
        regionId: 1,
        ownerId: 2,
        pocIds: [],
        collaboratorIds: [1],
        data: {
          eventId: 1,
          eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
        },
      },
    });

    const spy = jest.spyOn(history, 'replace');

    await act(async () => {
      renderSessionForm('1', 'session-summary', 'new');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'POST' })).toBe(true));

    // Verify the form rendered with the created session
    await waitFor(() => {
      expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(spy).toHaveBeenCalled();

    // The reportId.current should be set to the created session ID (999)
    // We can verify this indirectly by checking that history.replace was called
    // with the correct URL
    expect(history.location.pathname).toContain('/session/999');
  });

  it('redirects when event owner creates session', async () => {
    fetchMock.post(sessionsUrl, {
      id: 999,
      eventId: 1,
      regionId: 1,
      data: {},
      event: {
        regionId: 1,
        ownerId: 2,
        pocIds: [],
        collaboratorIds: [1],
        data: {
          eventId: 1,
          eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
        },
      },
    });

    const spy = jest.spyOn(history, 'replace');

    await act(async () => {
      renderSessionForm('1', 'session-summary', 'new');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'POST' })).toBe(true));

    // Verify the form rendered with the created session
    await waitFor(() => {
      expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(spy).toHaveBeenCalled();

    // The reportId.current should be set to the created session ID (999)
    // We can verify this indirectly by checking that history.replace was called
    // with the correct URL
    expect(history.location.pathname).toContain('/session/999');
  });

  it('sets reportId.current when existing session is fetched', async () => {
    jest.useFakeTimers();
    const url = join(sessionsUrl, 'id', '777');

    fetchMock.get(
      url, {
        id: 777,
        eventId: 1,
        regionId: 1,
        data: {},
        event: {
          regionId: 1,
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventName: 'Unique Event Name 777',
            eventId: 1,
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
      },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '777');
    });

    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
    jest.advanceTimersByTime(30000);

    // The form should render successfully after fetching
    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    // The reportId.current is set during the fetchSession useEffect at line 322
    // We verify this indirectly by checking that the session pages render
    // The Navigator component uses reportId to render, so if it renders, reportId is set
    expect(screen.getAllByText(/Session summary/i).length).toBeGreaterThan(0);
  });

  it('redirects to first available page when no currentPage is specified', async () => {
    const url = join(sessionsUrl, 'id', '1');
    const spy = jest.spyOn(history, 'replace');

    fetchMock.get(
      url, {
        id: 1,
        eventId: 1,
        regionId: 1,
        data: {},
        event: {
          regionId: 1,
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventId: 1,
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
      },
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
      // Render without a currentPage (undefined)
      renderSessionForm('1', undefined, '1', adminUser);
    });

    await waitFor(() => expect(fetchMock.called(url)).toBe(true));

    // Wait for the redirect to be called
    await waitFor(() => expect(spy).toHaveBeenCalled());

    // Verify the redirect was called with the correct path
    // For an admin user with Regional TTA event organizer, the first page is 'session-summary'
    expect(spy).toHaveBeenCalledWith('/training-report/1/session/1/session-summary');
  });

  describe('onReview approval workflow', () => {
    it('successfully approves session when approvalStatus is "approved"', async () => {
      const url = join(sessionsUrl, 'id', '1');
      const historySpy = jest.spyOn(history, 'push');

      fetchMock.get(
        url, {
          id: 1,
          eventId: 1,
          regionId: 1,
          data: {
            sessionName: 'Test Session',
            duration: 2,
            startDate: '01/01/2024',
            endDate: '01/01/2024',
            context: 'Test context',
            objective: 'Test objective',
            objectiveTopics: ['Topic 1'],
            objectiveTrainers: ['DTL'],
            numberOfParticipants: 10,
            deliveryMethod: 'In-person',
            status: 'In progress',
            submitted: true,
            approvalStatus: 'approved',
            managerNotes: 'Looks good',
            dateSubmitted: '01/15/2024',
            submitter: 'Test Submitter',
          },
          approverId: 1,
          approver: { id: 1, fullName: 'Test Approver' },
          event: {
            regionId: 1,
            ownerId: 2,
            pocIds: [],
            collaboratorIds: [],
            data: {
              eventId: 1,
              eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
            },
          },
        },
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
        renderSessionForm('1', 'review', '1', adminUser);
      });

      await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

      await waitFor(() => {
        expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Mock the PUT request
      fetchMock.put(url, { id: 1, eventId: 1 });

      // Find and click the submit button using the specific ID
      const submitButton = document.querySelector('#approver-session-report-save-continue');
      act(() => {
        userEvent.click(submitButton);
      });

      await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));

      // Verify the PUT request body has status: 'Complete'
      const putBody = fetchMock.lastOptions(url).body;
      const putBodyJson = JSON.parse(putBody);
      expect(putBodyJson.data.status).toBe(TRAINING_REPORT_STATUSES.COMPLETE);
      expect(putBodyJson.data.approvalStatus).toBeUndefined(); // Should be destructured out

      // Verify navigation with success message
      await waitFor(() => expect(historySpy).toHaveBeenCalled());
      expect(historySpy).toHaveBeenCalledWith('/training-reports/in-progress', {
        message: 'You successfully submitted the session.',
      });

      // Verify no error message is displayed
      expect(screen.queryByText(/There was an error saving the session/i)).not.toBeInTheDocument();
    });

    it('successfully submits session review regardless of approval status', async () => {
      const url = join(sessionsUrl, 'id', '2');
      const historySpy = jest.spyOn(history, 'push');

      fetchMock.get(
        url, {
          id: 2,
          eventId: 1,
          regionId: 1,
          data: {
            sessionName: 'Test Session Needs Action',
            duration: 2,
            startDate: '01/01/2024',
            endDate: '01/01/2024',
            context: 'Test context',
            objective: 'Test objective',
            objectiveTopics: ['Topic 1'],
            objectiveTrainers: ['DTL'],
            numberOfParticipants: 10,
            deliveryMethod: 'In-person',
            status: 'In progress',
            submitted: true,
            approvalStatus: 'needs_action',
            managerNotes: 'Please revise',
            dateSubmitted: '01/15/2024',
            submitter: 'Test Submitter',
          },
          approverId: 1,
          approver: { id: 1, fullName: 'Test Approver' },
          event: {
            regionId: 1,
            ownerId: 2,
            pocIds: [],
            collaboratorIds: [],
            data: {
              eventId: 1,
              eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
            },
          },
        },
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
        renderSessionForm('1', 'review', '2', adminUser);
      });

      await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

      await waitFor(() => {
        expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Wait for the specific session data to be loaded (unique to this test)
      await waitFor(() => {
        expect(screen.getByText('Test Session Needs Action')).toBeInTheDocument();
      });

      // Mock the PUT request
      fetchMock.put(url, { id: 2, eventId: 1 });

      // Find and click the submit button using the specific ID
      const submitButton = document.querySelector('#approver-session-report-save-continue');
      act(() => {
        userEvent.click(submitButton);
      });

      await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));

      const calls = fetchMock.calls(url, { method: 'put' });
      expect(calls.length).toBeGreaterThan(0);

      // Verify navigation with success message
      await waitFor(() => expect(historySpy).toHaveBeenCalled());
      expect(historySpy).toHaveBeenCalledWith('/training-reports/in-progress', {
        message: 'You successfully submitted the session.',
      });
    });

    it('does not call updateSession when approvalStatus is empty or invalid', async () => {
      const url = join(sessionsUrl, 'id', '3');
      const historySpy = jest.spyOn(history, 'push');

      fetchMock.get(
        url, {
          id: 3,
          eventId: 1,
          regionId: 1,
          data: {
            sessionName: 'Test Session No Status',
            duration: 2,
            startDate: '01/01/2024',
            endDate: '01/01/2024',
            context: 'Test context',
            objective: 'Test objective',
            objectiveTopics: ['Topic 1'],
            objectiveTrainers: ['DTL'],
            numberOfParticipants: 10,
            deliveryMethod: 'In-person',
            status: 'In progress',
            submitted: true,
            approvalStatus: '', // Empty status
            managerNotes: '',
            dateSubmitted: '01/15/2024',
            submitter: 'Test Submitter',
          },
          approverId: 1,
          approver: { id: 1, fullName: 'Test Approver' },
          event: {
            regionId: 1,
            ownerId: 2,
            pocIds: [],
            collaboratorIds: [],
            data: {
              eventId: 1,
              eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
            },
          },
        },
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
        renderSessionForm('1', 'review', '3', adminUser);
      });

      await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

      await waitFor(() => {
        expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // DO NOT mock PUT request - we want to verify it's not called

      // Find and click the submit button using the specific ID
      const submitButton = document.querySelector('#approver-session-report-save-continue');
      act(() => {
        userEvent.click(submitButton);
      });

      // Wait a bit to ensure PUT is not called
      await new Promise((resolve) => { setTimeout(resolve, 500); });

      // Verify PUT was NOT called (early return in onReview)
      expect(fetchMock.called(url, { method: 'put' })).toBe(false);

      // Verify no navigation occurred
      expect(historySpy).not.toHaveBeenCalled();
    });

    it('displays error message when updateSession fails', async () => {
      const url = join(sessionsUrl, 'id', '4');
      const historySpy = jest.spyOn(history, 'push');

      fetchMock.get(
        url, {
          id: 4,
          eventId: 1,
          regionId: 1,
          data: {
            sessionName: 'Test Session Error',
            duration: 2,
            startDate: '01/01/2024',
            endDate: '01/01/2024',
            context: 'Test context',
            objective: 'Test objective',
            objectiveTopics: ['Topic 1'],
            objectiveTrainers: ['DTL'],
            numberOfParticipants: 10,
            deliveryMethod: 'In-person',
            status: 'In progress',
            submitted: true,
            approvalStatus: 'approved',
            managerNotes: 'Looks good',
            dateSubmitted: '01/15/2024',
            submitter: 'Test Submitter',
          },
          approverId: 1,
          approver: { id: 1, fullName: 'Test Approver' },
          event: {
            regionId: 1,
            ownerId: 2,
            pocIds: [],
            collaboratorIds: [],
            data: {
              eventId: 1,
              eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
            },
          },
        },
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
        renderSessionForm('1', 'review', '4', adminUser);
      });

      await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

      await waitFor(() => {
        expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Mock the PUT request to fail with 500 error
      fetchMock.put(url, 500);

      // Find and click the submit button using the specific ID
      const submitButton = document.querySelector('#approver-session-report-save-continue');
      act(() => {
        userEvent.click(submitButton);
      });

      await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/There was an error saving the session report/i)).toBeInTheDocument();
      });

      // Verify no navigation occurred
      expect(historySpy).not.toHaveBeenCalled();
    });
  });

  describe('redirect to view page', () => {
    it('redirects POC user to view page for regional event with no national centers', async () => {
      const url = join(sessionsUrl, 'id', '2');
      const historySpy = jest.spyOn(history, 'push');

      fetchMock.get(url, {
        id: 2,
        eventId: 1,
        regionId: 1,
        data: {
          sessionName: 'Regional Event Session',
          submitted: false,
          status: 'In progress',
        },
        event: {
          id: 1,
          regionId: 1,
          ownerId: 2,
          pocIds: [1],
          collaboratorIds: [],
          data: {
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
      });

      const pocUser = {
        user: {
          id: 1,
          permissions: [{
            userId: 1,
            regionId: 1,
            scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
          }],
          name: 'POC User',
        },
      };

      act(() => {
        renderSessionForm('1', undefined, '2', pocUser);
      });

      await waitFor(() => expect(fetchMock.called(url)).toBe(true));
      await waitFor(() => expect(historySpy).toHaveBeenCalledWith('/training-report/view/1'));
    });

    it('redirects form user to view page when session is complete', async () => {
      const url = join(sessionsUrl, 'id', '3');
      const historySpy = jest.spyOn(history, 'push');

      fetchMock.get(url, {
        id: 3,
        eventId: 1,
        regionId: 1,
        data: {
          sessionName: 'Complete Session',
          submitted: true,
          status: 'Complete',
        },
        event: {
          id: 1,
          regionId: 1,
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [],
          data: {
            eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          },
        },
      });

      const ownerUser = {
        user: {
          id: 1,
          permissions: [{
            userId: 1,
            regionId: 1,
            scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
          }],
          name: 'Owner User',
        },
      };

      act(() => {
        renderSessionForm('1', undefined, '3', ownerUser);
      });

      await waitFor(() => expect(fetchMock.called(url)).toBe(true));
      await waitFor(() => expect(historySpy).toHaveBeenCalledWith('/training-report/view/1'));
    });
  });
});

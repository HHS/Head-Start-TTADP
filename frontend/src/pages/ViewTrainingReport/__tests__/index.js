import React from 'react';
import { SUPPORT_TYPES } from '@ttahub/common';
import { render, screen, act } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { MemoryRouter } from 'react-router-dom';
import AppLoadingContext from '../../../AppLoadingContext';
import ViewTrainingReport from '..';

const mockEvent = (data = {}) => ({
  id: 1,
  ownerId: 999,
  pocIds: [1],
  collaboratorIds: [2],
  regionId: 1,
  data: {
    vision: 'Oral Health',
    creator: 'cucumber@hogwarts.com',
    eventId: 'R03-PD-23-1037',
    reasons: ['Ongoing Quality Improvement'],
    audience: 'Recipients',
    eventName: 'Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective',
    eventOrganizer: 'Regional PD Event (with National Centers)',
    'Full Event Title': 'R03 Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective',
    targetPopulations: ['None'],
    'Event Duration/# NC Days of Support': 'Series',
  },
  updatedAt: '2023-06-27T13:46:29.884Z',
  sessionReports: [{
    id: 7,
    eventId: 1,
    data: {
      id: 7,
      files: [{
        id: 25643,
        key: '57cdfafa-d93f-4d61-ae56-c7fbb0432a47pdf',
        url: {
          url: 'http://file-url',
          error: null,
        },
        status: 'UPLOADING',
        fileSize: 954060,
        createdAt: '2023-06-27T13:48:54.745Z',
        updatedAt: '2023-06-27T13:48:54.745Z',
        originalFileName: 'test-file.pdf',
      }],
      status: 'Complete',
      context: 'Session 1 context',
      endDate: '06/16/2023',
      eventId: 33,
      ownerId: null,
      duration: 1,
      regionId: 3,
      eventName: 'Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective',
      objective: 'Session 1 objective',
      pageState: { 1: 'Complete', 2: 'Complete', 3: 'Complete' },
      startDate: '06/12/2023',
      eventOwner: 355,
      recipients: [{ label: 'Altenwerth LLC - 05insect010586  - EHS, HS', value: 10586 }],
      sessionName: 'Session Name # 1',
      ttaProvided: 'Session 1 TTA provided',
      participants: ['Direct Service: Other'],
      deliveryMethod: 'in-person',
      eventDisplayId: 'R03-PD-23-1037',
      objectiveTopics: ['Behavioral / Mental Health / Trauma', 'CLASS: Emotional Support'],
      objectiveTrainers: ['HBHS', 'PFCE'],
      objectiveResources: [{ value: 'http://random-resource-url' }],
      recipientNextSteps: [{ note: 'r-step1session1', completeDate: '06/20/2025' }, { id: null, note: 'asdfasdf', completeDate: '06/21/2023' }],
      specialistNextSteps: [{ note: 's-step1session1', completeDate: '06/14/2026' }],
      numberOfParticipants: 3,
      objectiveSupportType: SUPPORT_TYPES[2],
      courses: [{ id: 1, name: 'course 1' }, { id: 2, name: 'course 2' }],
    },
    createdAt: '2023-06-27T13:48:31.490Z',
    updatedAt: '2023-06-27T13:49:18.579Z',
  }, {
    id: 8,
    eventId: 1,
    data: {
      id: 8,
      files: [],
      status: 'In progress',
      context: 'Session 2 context',
      endDate: '06/23/2023',
      eventId: 1,
      ownerId: null,
      duration: 0.5,
      regionId: 3,
      eventName: 'Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective',
      objective: 'Session 2 objective',
      pageState: { 1: 'Complete', 2: 'Complete', 3: 'Complete' },
      startDate: '06/14/2023',
      eventOwner: 355,
      recipients: [{ label: 'Anderson - Weimann - 08rabbit010238  - EHS', value: 10238 }],
      sessionName: 'Session name for # 2',
      ttaProvided: 'session 2 tta provided',
      participants: ['Fiscal Manager/Team'],
      deliveryMethod: 'virtual',
      eventDisplayId: 'R03-PD-23-1037',
      objectiveTopics: ['CLASS: Instructional Support', 'Coaching'],
      objectiveTrainers: ['PFCE'],
      objectiveResources: [],
      recipientNextSteps: [{ note: 'r1s2', completeDate: '06/30/2026' }],
      specialistNextSteps: [{ note: 's1s2', completeDate: '06/29/2027' }],
      numberOfParticipants: 3,
      objectiveSupportType: SUPPORT_TYPES[1],
      courses: [{ id: 3, name: 'course 3' }],
    },
    createdAt: '2023-06-27T13:49:23.985Z',
    updatedAt: '2023-06-27T13:49:59.039Z',
  }],
  ...data,
});

describe('ViewTrainingReport', () => {
  const renderTrainingReport = () => {
    act(() => {
      render(
        <MemoryRouter>
          <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
            <ViewTrainingReport match={{ params: { trainingReportId: 1 }, path: '', url: '' }} />
          </AppLoadingContext.Provider>
        </MemoryRouter>,
      );
    });
  };

  afterEach(() => {
    fetchMock.reset();
  });

  it('renders a basic report with sessions', async () => {
    fetchMock.getOnce('/api/events/id/1?readOnly=true', mockEvent());

    fetchMock.getOnce('/api/users/names?ids=1', ['USER 1']);
    fetchMock.getOnce('/api/users/names?ids=2', ['USER 2']);

    renderTrainingReport();

    expect(await screen.findByRole('heading', { name: 'Training event report R03-PD-23-1037' })).toBeInTheDocument();
    const backLink = await screen.findByRole('link', { name: /back to training reports/i });
    expect(backLink).toHaveAttribute('href', '/training-reports/not-started');

    // poc
    expect(screen.getByText('USER 1')).toBeInTheDocument();

    // collab
    expect(screen.getByText('USER 2')).toBeInTheDocument();

    // vision
    expect(screen.getByText('Oral Health')).toBeInTheDocument();

    // reasons
    expect(screen.getByText('Ongoing Quality Improvement')).toBeInTheDocument();

    // audience
    expect(screen.getByText('Recipients', { selector: '[data-text="true"]' })).toBeInTheDocument();

    // event name
    expect(screen.getByText('Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective')).toBeInTheDocument();

    // event organizer
    expect(screen.getByText('Regional PD Event (with National Centers)')).toBeInTheDocument();

    // target populations
    expect(screen.getByText('None')).toBeInTheDocument();

    // session 1
    expect(screen.getByText('Session 1')).toBeInTheDocument();
    expect(screen.getByText('Session Name # 1')).toBeInTheDocument();
    expect(screen.getByText('Session 1 objective')).toBeInTheDocument();
    expect(screen.getByText('Session 1 TTA provided')).toBeInTheDocument();
    expect(screen.getByText('Session 1 context')).toBeInTheDocument();
    expect(screen.getByText('1 hours')).toBeInTheDocument();
    expect(screen.getByText(/Altenwerth LLC/i)).toBeInTheDocument();
    expect(screen.getByText('Direct Service: Other')).toBeInTheDocument();
    expect(screen.getByText('In-person')).toBeInTheDocument();
    expect(screen.getByText('Behavioral / Mental Health / Trauma')).toBeInTheDocument();
    expect(screen.getByText('CLASS: Emotional Support')).toBeInTheDocument();
    expect(screen.getByText('HBHS')).toBeInTheDocument();
    expect(screen.getByText('http://random-resource-url')).toBeInTheDocument();
    expect(screen.getByText('r-step1session1')).toBeInTheDocument();
    expect(screen.getByText('06/20/2025')).toBeInTheDocument();
    expect(screen.getByText('s-step1session1')).toBeInTheDocument();
    expect(screen.getByText('06/14/2026')).toBeInTheDocument();
    expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
    expect(screen.getByText('Implementing')).toBeInTheDocument();
    expect(screen.getByText('course 1')).toBeInTheDocument();
    expect(screen.getByText('course 2')).toBeInTheDocument();

    // expect 2 of these (1 for each session)
    expect(screen.getAllByText('PFCE')).toHaveLength(2);

    // session 2
    expect(screen.getByText('Session 2')).toBeInTheDocument();
    expect(screen.getByText('Session name for # 2')).toBeInTheDocument();
    expect(screen.getByText('Session 2 objective')).toBeInTheDocument();
    expect(screen.getByText('session 2 tta provided')).toBeInTheDocument();
    expect(screen.getByText('Session 2 context')).toBeInTheDocument();
    expect(screen.getByText('0.5 hours')).toBeInTheDocument();
    expect(screen.getByText(/Anderson/i)).toBeInTheDocument();
    expect(screen.getByText(/Weimann/i)).toBeInTheDocument();
    expect(screen.getByText('Virtual')).toBeInTheDocument();
    expect(screen.getByText('Coaching')).toBeInTheDocument();
    expect(screen.getByText('CLASS: Instructional Support')).toBeInTheDocument();
    expect(screen.getByText('r1s2')).toBeInTheDocument();
    expect(screen.getByText('06/30/2026')).toBeInTheDocument();
    expect(screen.getByText('s1s2')).toBeInTheDocument();
    expect(screen.getByText('06/29/2027')).toBeInTheDocument();
    expect(screen.getByText(SUPPORT_TYPES[1])).toBeInTheDocument();
    expect(screen.getByText('course 3')).toBeInTheDocument();
  });

  it('renders the necessary buttons', async () => {
    global.navigator.clipboard = jest.fn();
    global.navigator.clipboard.writeText = jest.fn(() => Promise.resolve());

    fetchMock.getOnce('/api/events/id/1?readOnly=true', mockEvent());

    fetchMock.getOnce('/api/users/names?ids=1', ['USER 1']);
    fetchMock.getOnce('/api/users/names?ids=2', ['USER 2']);

    act(() => {
      renderTrainingReport();
    });

    expect(await screen.findByRole('button', { name: 'Copy URL Link' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Print to PDF' })).toBeInTheDocument();
  });

  it('handles an error fetching event', async () => {
    fetchMock.getOnce('/api/events/id/1?readOnly=true', 500);

    renderTrainingReport();

    expect(await screen.findByText('Sorry, something went wrong')).toBeInTheDocument();
  });

  it('handles a permissions error', async () => {
    fetchMock.getOnce('/api/events/id/1?readOnly=true', 403);

    renderTrainingReport();

    expect(await screen.findByText('You do not have permission to view this page')).toBeInTheDocument();
  });

  it('handles an error fetching collaborators', async () => {
    fetchMock.getOnce('/api/events/id/1?readOnly=true', mockEvent());

    fetchMock.getOnce('/api/users/names?ids=1', 500);
    fetchMock.getOnce('/api/users/names?ids=2', ['USER 2']);

    renderTrainingReport();

    expect(await screen.findByRole('heading', { name: 'Training event report R03-PD-23-1037' })).toBeInTheDocument();
  });

  it('handles an error fetching points of contact', async () => {
    fetchMock.getOnce('/api/events/id/1?readOnly=true', mockEvent());

    fetchMock.getOnce('/api/users/names?ids=1', ['USER 1']);
    fetchMock.getOnce('/api/users/names?ids=2', 500);

    renderTrainingReport();

    expect(await screen.findByRole('heading', { name: 'Training event report R03-PD-23-1037' })).toBeInTheDocument();
  });

  it('formats the back link correctly when there is a status', async () => {
    const e = mockEvent();
    e.data = {
      ...e.data,
      status: 'Complete',
    };

    fetchMock.getOnce('/api/events/id/1?readOnly=true', e);

    fetchMock.getOnce('/api/users/names?ids=1', ['USER 1']);
    fetchMock.getOnce('/api/users/names?ids=2', ['USER 2']);

    renderTrainingReport();

    expect(await screen.findByRole('heading', { name: 'Training event report R03-PD-23-1037' })).toBeInTheDocument();
    const backLink = await screen.findByRole('link', { name: /back to training reports/i });
    expect(backLink).toHaveAttribute('href', '/training-reports/complete');
  });

  it('handles a distinct lack of session reports', async () => {
    const e = mockEvent();
    delete e.sessionReports;

    fetchMock.getOnce('/api/events/id/1?readOnly=true', e);

    fetchMock.getOnce('/api/users/names?ids=1', ['USER 1']);
    fetchMock.getOnce('/api/users/names?ids=2', ['USER 2']);

    renderTrainingReport();

    expect(await screen.findByRole('heading', { name: 'Training event report R03-PD-23-1037' })).toBeInTheDocument();
  });

  it('handles a session report missing many fields', async () => {
    const e = mockEvent();
    e.sessionReports = [
      {
        id: 1,
        eventId: 1,
        data: {
          status: 'In progress',
          regionId: 3,
          eventName: 'Sample Session Report with no data',
          eventOwner: 355,
          eventDisplayId: 'R03-PD-23-1037',
        },
        createdAt: '2023-06-28T11:42:11.695Z',
        updatedAt: '2023-06-28T11:42:11.695Z',
      },
    ];

    fetchMock.getOnce('/api/events/id/1?readOnly=true', e);

    fetchMock.getOnce('/api/users/names?ids=1', ['USER 1']);
    fetchMock.getOnce('/api/users/names?ids=2', ['USER 2']);

    renderTrainingReport();

    expect(await screen.findByRole('heading', { name: 'Training event report R03-PD-23-1037' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Session 1' })).toBeInTheDocument();
  });
});

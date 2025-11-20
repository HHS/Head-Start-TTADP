import { sanitizeActivityReportPageState } from './activityReportPageState';

describe('sanitizeActivityReportPageState', () => {
  const buildBaseReport = (overrides = {}) => ({
    activityRecipientType: 'recipient',
    deliveryMethod: 'hybrid',
    activityReason: 'Support requested',
    activityRecipients: [{ id: 1 }],
    targetPopulations: ['Coaches'],
    ttaType: ['Training'],
    participants: ['Coach'],
    language: ['English'],
    duration: 2,
    numberOfParticipantsInPerson: 3,
    numberOfParticipantsVirtually: 2,
    numberOfParticipants: null,
    startDate: '2024-01-01',
    endDate: '2024-01-02',
    context: 'context',
    goalsAndObjectives: [
      {
        objectives: [
          {
            title: 'Goal One Objective',
            ttaProvided: '<p>Provided support</p>',
            topics: [{ id: 1 }],
            supportType: 'Implementing',
            resources: [{ value: 'https://example.com/resource' }],
          },
        ],
      },
    ],
    objectivesWithoutGoals: [],
    specialistNextSteps: [{ note: 'Do something', completeDate: '2024-01-10' }],
    recipientNextSteps: [{ note: 'Recipient action', completeDate: '2024-01-11' }],
    ...overrides,
  });

  it('marks every section complete when all data are present', () => {
    const report = buildBaseReport();

    const pageState = sanitizeActivityReportPageState(report, { 3: 'Complete' });

    expect(pageState).toEqual({
      1: 'Complete',
      2: 'Complete',
      3: 'Complete',
      4: 'Complete',
    });
  });

  it('returns "In progress" for summary when only partial data exist', () => {
    const report = buildBaseReport({
      startDate: null,
      endDate: null,
      duration: null,
    });

    const pageState = sanitizeActivityReportPageState(report, {});

    expect(pageState[1]).toBe('In progress');
    expect(pageState[2]).toBe('Complete');
    expect(pageState[4]).toBe('Complete');
  });

  it('returns "Not started" when there is no data for a section', () => {
    const report = buildBaseReport({
      goalsAndObjectives: [],
      objectivesWithoutGoals: [],
      specialistNextSteps: [],
      recipientNextSteps: [],
      activityRecipients: [],
      targetPopulations: [],
      ttaType: [],
      participants: [],
      language: [],
      duration: null,
      numberOfParticipantsInPerson: null,
      numberOfParticipantsVirtually: null,
      startDate: null,
      endDate: null,
      activityRecipientType: null,
      deliveryMethod: null,
      activityReason: null,
      context: null,
    });

    const pageState = sanitizeActivityReportPageState(report, { 3: 'Something Else' });

    expect(pageState).toEqual({
      1: 'Not started',
      2: 'Not started',
      3: 'Not started',
      4: 'Not started',
    });
  });

  it('treats invalid resources as incomplete goals', () => {
    const report = buildBaseReport({
      goalsAndObjectives: [
        {
          objectives: [
            {
              title: 'Goal objective with invalid resource',
              ttaProvided: '<p>Provided</p>',
              topics: [{ id: 2 }],
              supportType: 'Implementing',
              resources: [{ value: 'not-a-url' }],
            },
          ],
        },
      ],
    });

    const pageState = sanitizeActivityReportPageState(report, { 3: 'Complete' });

    expect(pageState[2]).toBe('In progress');
  });

  it('requires valid next steps notes and dates to mark section complete', () => {
    const report = buildBaseReport({
      specialistNextSteps: [{ note: ' ', completeDate: 'not-a-date' }],
      recipientNextSteps: [],
    });

    const pageState = sanitizeActivityReportPageState(report, {});

    expect(pageState[4]).toBe('In progress');
  });
});

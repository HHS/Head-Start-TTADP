/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import React from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import RecipientReviewSection from '../RecipientReviewSection'
import GoalFormContext from '../../../../../GoalFormContext'
import { OBJECTIVE_STATUS } from '../../../../../Constants'

const defaultGoalsAndObjectives = [
  {
    id: 1,
    name: 'This is my 1st goal title',
    goalNumber: '1234',
    endDate: '2023-10-02',
    source: 'Goal Source 1',
    objectives: [
      {
        id: 1,
        title: 'Goal 1 - Objective 1',
        topics: [],
        ttaProvided: '<p>TTA Provided for Goal 1 - Objective 1</p>',
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        courses: [],
        resources: [
          {
            value: 'https://www.govtest1.com',
          },
          {
            value: 'https://www.govtest2.com',
          },
        ],
        files: [
          {
            url: {
              url: 'https://www.file1.com',
            },
            originalFileName: 'test.txt',
          },
          {
            url: {
              url: 'https://www.file2.com',
            },
            originalFileName: 'test.csv',
          },
        ],
      },
      {
        id: 2,
        title: 'Goal 1 - Objective 2',
        topics: [],
        ttaProvided: '<p>TTA Provided for Goal 1 - Objective 2</p>',
        status: GOAL_STATUS.NOT_STARTED,
        courses: [],
        resources: [
          {
            value: 'https://www.govtest3.com',
          },
        ],
        files: [
          {
            url: {
              url: 'https://www.file4.com',
            },
            originalFileName: 'test4.txt',
          },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'This is my 2nd goal title',
    goalNumber: '1234',
    endDate: '2024-10-02',
    source: 'Goal Source 2',
    objectives: [
      {
        id: 3,
        title: 'Goal 2 - Objective 1',
        topics: [{ name: 'Topic 1' }, { name: 'Topic 2' }],
        ttaProvided: '<p>TTA Provided for Goal 2 - Objective 1</p>',
        status: OBJECTIVE_STATUS.SUSPENDED,
        courses: [],
        resources: [
          {
            value: 'https://www.govtest5.com',
          },
        ],
        files: [
          {
            url: {
              url: 'https://www.file5.com',
            },
            originalFileName: 'test5.txt',
          },
          {
            url: {
              url: 'https://www.file6.com',
            },
            originalFileName: 'test6.csv',
          },
        ],
      },
    ],
  },
  {
    id: 90740,
    name: '(Monitoring) The recipient will develop and implement a QIP/CAP to address monitoring findings.',
    status: GOAL_STATUS.IN_PROGRESS,
    endDate: '',
    isCurated: true,
    grantId: 11597,
    goalTemplateId: 24696,
    onAR: true,
    onApprovedAR: true,
    rtrOrder: 1,
    source: 'Federal monitoring issues, including CLASS and RANs',
    regionId: 1,
    recipientId: 1442,
    standard: 'Monitoring',
    prompts: [],
    statusChanges: [
      {
        oldStatus: GOAL_STATUS.NOT_STARTED,
      },
    ],
    activityReportGoals: [
      {
        endDate: null,
        id: 155612,
        activityReportId: 48418,
        goalId: 90740,
        isRttapa: null,
        name: '(Monitoring) The recipient will develop and implement a QIP/CAP to address monitoring findings.',
        status: GOAL_STATUS.IN_PROGRESS,
        timeframe: null,
        closeSuspendReason: null,
        closeSuspendContext: null,
        source: 'Federal monitoring issues, including CLASS and RANs',
        isActivelyEdited: false,
        originalGoalId: null,
      },
    ],
    objectives: [
      {
        id: 231994,
        otherEntityId: null,
        goalId: 90740,
        title: 'test',
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        objectiveTemplateId: 565,
        onAR: true,
        onApprovedAR: true,
        createdVia: 'activityReport',
        rtrOrder: 1,
        value: 231994,
        ids: [231994, 231995, 231996],
        ttaProvided: '<p>tta</p>\n',
        supportType: 'Planning',
        isNew: false,
        arOrder: 1,
        objectiveCreatedHere: true,
        topics: [],
        resources: [],
        files: [],
        courses: [],
        citations: [
          {
            id: 200205,
            activityReportObjectiveId: 241644,
            citation: '1302.12(k)',
            monitoringReferences: [
              {
                acro: 'AOC',
                name: 'AOC - 1302.12(k) - Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
                grantId: 11966,
                citation: '1302.12(k)',
                severity: 3,
                findingId: '8D18F077-CD6F-4869-AB21-E76EB682433B',
                reviewName: '230706F2',
                standardId: 200205,
                findingType: 'Area of Concern',
                grantNumber: '01CH011566',
                findingSource: 'Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
                reportDeliveryDate: '2023-06-26T04:00:00+00:00',
                monitoringFindingStatusName: 'Active',
              },
            ],
            name: 'AOC - 1302.12(k) - Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
          },
        ],
      },
    ],
    isSourceEditable: true,
    goalNumber: 'G-90740',
    promptsForReview: [],
    isNew: false,
    goalNumbers: ['G-90740', 'G-90683', 'G-90846'],
    goalIds: [90740, 90683, 90846],
    grantIds: [11597, 11074, 11966],
    collaborators: [
      {
        goalNumber: 'G-90683',
      },
    ],
    isReopenedGoal: false,
  },
]

const RenderRecipientReviewSection = ({ goalsAndObjectives }) => {
  const history = createMemoryHistory()
  const hookForm = useForm()

  hookForm.getValues = () => ({
    activityRecipients: [
      {
        id: 11074,
        activityRecipientId: 11074,
        name: 'R1 - GRANT1 - HS',
      },
      {
        id: 11966,
        activityRecipientId: 11966,
        name: 'R1 - GRANT2 - EHS',
      },
    ],
  })

  hookForm.watch = () => ({
    goalsAndObjectives,
    calculatedStatus: GOAL_STATUS.DRAFT,
  })

  return (
    <Router history={history}>
      <FormProvider {...hookForm}>
        <RecipientReviewSection />
      </FormProvider>
    </Router>
  )
}

const RenderReviewSection = (goalsAndObjectives) => {
  render(
    <GoalFormContext.Provider value={{ isGoalFormClosed: true, toggleGoalForm: jest.fn() }}>
      <RenderRecipientReviewSection goalsAndObjectives={goalsAndObjectives} />
    </GoalFormContext.Provider>
  )
}

describe('RecipientReviewSection', () => {
  beforeEach(async () => {})
  afterEach(() => fetchMock.restore())
  it('renders all values correctly', async () => {
    RenderReviewSection(defaultGoalsAndObjectives)

    // Make sure we have the correct number of goal and objective headers.
    expect(screen.queryAllByText(/Goal summary/i).length).toBe(3)
    expect(screen.queryAllByText(/Objective summary/i).length).toBe(4)

    // Goal 1
    expect(screen.getByText(/this is my 1st goal title/i)).toBeInTheDocument()

    // Goal 1 - Objective 1
    expect(screen.getByText('Goal 1 - Objective 1')).toBeInTheDocument()
    expect(screen.getByText('TTA Provided for Goal 1 - Objective 1')).toBeInTheDocument()
    expect(screen.getAllByText(/In Progress/)).toHaveLength(2)
    expect(screen.getByText(/test.txt/)).toBeInTheDocument()
    expect(screen.getByText(/test.csv/)).toBeInTheDocument()
    expect(screen.getByText(/https:\/\/www.govtest1.com/)).toBeInTheDocument()
    expect(screen.getByText(/https:\/\/www.govtest2.com/)).toBeInTheDocument()

    // Goal 1 - Objective 2
    expect(screen.getByText('Goal 1 - Objective 2')).toBeInTheDocument()
    expect(screen.getByText('TTA Provided for Goal 1 - Objective 2')).toBeInTheDocument()
    expect(screen.getByText(/Not Started/)).toBeInTheDocument()
    expect(screen.getByText(/test4.txt/)).toBeInTheDocument()
    expect(screen.queryByText(/test5.txt/)).toBeInTheDocument()
    expect(screen.getByText(/https:\/\/www.govtest3.com/)).toBeInTheDocument()

    // Goal 2
    expect(screen.getByText(/this is my 2nd goal title/i)).toBeInTheDocument()

    // Goal 2 - Objective 1
    expect(screen.getByText('Goal 2 - Objective 1')).toBeInTheDocument()
    expect(screen.getByText('TTA Provided for Goal 2 - Objective 1')).toBeInTheDocument()
    expect(screen.getByText(/Suspended/)).toBeInTheDocument()
    expect(screen.getByText(/test5.txt/)).toBeInTheDocument()
    expect(screen.getByText(/test6.csv/)).toBeInTheDocument()
    expect(screen.getByText(/https:\/\/www.govtest5.com/)).toBeInTheDocument()
    expect(screen.getByText(/Topic 1/)).toBeInTheDocument()
    expect(screen.getByText(/Topic 2/)).toBeInTheDocument()

    // Make sure we have the correct number of resources and files.
    expect(screen.queryAllByText(/Resource links/i).length).toBe(4)
    expect(screen.queryAllByText(/Resource attachments/i).length).toBe(4)

    // citation display
    expect(await screen.findByTestId('review-citation-label')).toHaveTextContent('R1 - GRANT2 - EHS')
    expect(await screen.findByTestId('review-citation-listitem')).toHaveTextContent(
      'AOC - 1302.12(k) - Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance'
    )
  })

  it('renders fei response correctly', async () => {
    RenderReviewSection([
      {
        ...defaultGoalsAndObjectives[0],
        promptsForReview: [
          {
            key: 'Root Cause 1',
            promptId: 1,
            prompt: 'Prompt 1',
            recipients: [
              { id: 1, name: 'Recipient 1' },
              { id: 2, name: 'Recipient 2' },
            ],
            responses: ['Response 1', 'Response 2'],
          },
          {
            key: 'Root Cause 2',
            promptId: 1,
            prompt: 'Prompt 2',
            recipients: [
              { id: 3, name: 'Recipient 3' },
              { id: 4, name: 'Recipient 4' },
            ],
            responses: ['Response 3'],
          },
          {
            key: 'Root Cause 3',
            promptId: 1,
            prompt: 'Prompt 3',
            recipients: [{ id: 3, name: 'Recipient 5' }],
            responses: [],
          },
        ],
      },
    ])

    // Assert generic goal information is displayed.
    expect(screen.queryAllByText(/Goal summary/i).length).toBe(1)
    expect(screen.getByText(/this is my 1st goal title/i)).toBeInTheDocument()

    // Expect the text 'Root cause' to be displayed once.
    expect(screen.queryAllByText(/Root cause/i).length).toBe(1)

    // Assert Response 1 and Response 2 are displayed.
    expect(screen.getByText(/response 1, response 2/i)).toBeInTheDocument()

    // Assert Response 3 is displayed.
    expect(screen.getByText('Response 3')).toBeInTheDocument()

    // Assert that the correct number of recipients are displayed.
    expect(screen.queryAllByText(/Recipient 1/).length).toBe(1)
    expect(screen.queryAllByText(/Recipient 2/).length).toBe(1)
    expect(screen.queryAllByText(/Recipient 3/).length).toBe(1)
    expect(screen.queryAllByText(/Recipient 5/).length).toBe(1)

    // Assert 'Missing information' is displayed once.
    expect(screen.queryAllByText(/Missing Information/).length).toBe(1)
  })

  it('prefers live goals over goalsAndObjectives (shows updated TTA provided)', async () => {
    const stale = [
      {
        id: 10,
        name: 'Goal A',
        goalNumbers: ['G-10'],
        objectives: [
          {
            id: 100,
            title: 'Obj A1',
            ttaProvided: '<p>Old TTA</p>',
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            topics: [],
            resources: [],
            files: [],
            courses: [],
            citations: [],
          },
        ],
      },
    ]

    const live = [
      {
        id: 10,
        name: 'Goal A',
        goalNumbers: ['G-10'],
        objectives: [
          {
            id: 100,
            title: 'Obj A1',
            ttaProvided: '<p>New TTA</p>',
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            topics: [],
            resources: [],
            files: [],
            courses: [],
            citations: [],
          },
        ],
      },
    ]

    // wrap useForm inside a function component to satisfy React Hooks rules
    const RenderWithLiveGoals = () => {
      const history = createMemoryHistory()
      const hookForm = useForm()
      hookForm.getValues = () => ({ activityRecipients: [] })
      hookForm.watch = () => ({
        goalsAndObjectives: stale,
        goals: live,
        calculatedStatus: GOAL_STATUS.DRAFT,
      })

      return (
        <Router history={history}>
          <FormProvider {...hookForm}>
            <RecipientReviewSection />
          </FormProvider>
        </Router>
      )
    }

    render(<RenderWithLiveGoals />)

    expect(await screen.findByText('New TTA')).toBeInTheDocument()
    expect(screen.queryByText('Old TTA')).not.toBeInTheDocument()
  })

  it('uses goalForEditing when present (even if selectedGoals are empty)', async () => {
    const stale = [
      {
        id: 20,
        name: 'Goal B',
        goalNumbers: ['G-20'],
        objectives: [
          {
            id: 200,
            title: 'Obj B1',
            ttaProvided: '<p>Old Edit</p>',
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            topics: [],
            resources: [],
            files: [],
            courses: [],
            citations: [],
          },
        ],
      },
    ]

    const editing = {
      id: 20,
      name: 'Goal B',
      goalNumbers: ['G-20'],
      objectives: [
        {
          id: 200,
          title: 'Obj B1',
          ttaProvided: '<p>Live Edit</p>',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          topics: [],
          resources: [],
          files: [],
          courses: [],
          citations: [],
        },
      ],
    }

    // wrap useForm inside a function component to satisfy React Hooks rules
    const RenderWithGoalForEditing = () => {
      const history = createMemoryHistory()
      const hookForm = useForm()
      hookForm.getValues = () => ({ activityRecipients: [] })
      hookForm.watch = () => ({
        goalsAndObjectives: stale,
        goals: [],
        goalForEditing: editing,
        calculatedStatus: GOAL_STATUS.DRAFT,
      })

      return (
        <Router history={history}>
          <FormProvider {...hookForm}>
            <RecipientReviewSection />
          </FormProvider>
        </Router>
      )
    }

    render(<RenderWithGoalForEditing />)

    expect(await screen.findByText('Live Edit')).toBeInTheDocument()
    expect(screen.queryByText('Old Edit')).not.toBeInTheDocument()
  })

  it('falls back to goalsAndObjectives when no live goals are present', async () => {
    const stale = [
      {
        id: 30,
        name: 'Goal C',
        goalNumbers: ['G-30'],
        objectives: [
          {
            id: 300,
            title: 'Obj C1',
            ttaProvided: '<p>Only Snapshot</p>',
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            topics: [],
            resources: [],
            files: [],
            courses: [],
            citations: [],
          },
        ],
      },
    ]

    // wrap useForm inside a function component to satisfy React Hooks rules
    const RenderWithFallback = () => {
      const history = createMemoryHistory()
      const hookForm = useForm()
      hookForm.getValues = () => ({ activityRecipients: [] })
      hookForm.watch = () => ({
        goalsAndObjectives: stale,
        goals: [],
        goalForEditing: null,
        calculatedStatus: GOAL_STATUS.DRAFT,
      })

      return (
        <Router history={history}>
          <FormProvider {...hookForm}>
            <RecipientReviewSection />
          </FormProvider>
        </Router>
      )
    }

    render(<RenderWithFallback />)

    expect(await screen.findByText('Only Snapshot')).toBeInTheDocument()
  })

  it('displays support type when present on objective', async () => {
    const goalsWithSupportType = [
      {
        id: 40,
        name: 'Goal with Support Type',
        goalNumbers: ['G-40'],
        objectives: [
          {
            id: 400,
            title: 'Objective with Support Type',
            ttaProvided: '<p>TTA Provided</p>',
            supportType: 'Planning',
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            topics: [],
            resources: [],
            files: [],
            courses: [],
            citations: [],
          },
        ],
      },
    ]

    RenderReviewSection(goalsWithSupportType)

    expect(await screen.findByText('Objective with Support Type')).toBeInTheDocument()
    expect(screen.getByText('Planning')).toBeInTheDocument()
  })

  it('displays "None provided" when support type is missing', async () => {
    const goalsWithoutSupportType = [
      {
        id: 50,
        name: 'Goal without Support Type',
        goalNumbers: ['G-50'],
        objectives: [
          {
            id: 500,
            title: 'Objective without Support Type',
            ttaProvided: '<p>TTA Provided</p>',
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            topics: [],
            resources: [],
            files: [],
            courses: [],
            citations: [],
          },
        ],
      },
    ]

    RenderReviewSection(goalsWithoutSupportType)

    expect(await screen.findByText('Objective without Support Type')).toBeInTheDocument()

    // Find all "None provided" elements and verify at least one exists
    // (there will be multiple for empty fields like topics, resources, etc.)
    const noneProvidedElements = screen.getAllByText('None provided')
    expect(noneProvidedElements.length).toBeGreaterThan(0)
  })
})

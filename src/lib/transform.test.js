import { REPORT_STATUSES } from '@ttahub/common'
import { CREATION_METHOD, OBJECTIVE_STATUS } from '../constants'
import {
  ActivityReport,
  User,
  ActivityRecipient,
  ActivityReportApprover,
  ActivityReportGoal,
  Grant,
  Goal,
  GoalFieldResponse,
  GoalTemplate,
  Recipient,
  ActivityReportCollaborator,
  ActivityReportObjective,
  Resource,
  Course,
  Topic,
  Objective,
  File,
} from '../models'
import { activityReportToCsvRecord, makeGoalsAndObjectivesObject, extractListOfGoalsAndObjectives, communicationLogToCsvRecord } from './transform'

describe('activityReportToCsvRecord', () => {
  const mockAuthor = {
    id: 2099,
    name: 'Arthur',
    hsesUserId: '2099',
    hsesUsername: 'arthur.author',
  }

  const mockCollaborators = [
    {
      user: {
        id: 2100,
        name: 'Collaborator 1',
        hsesUserId: '2100',
        hsesUsername: 'collaborator.one',
      },
    },
    {
      user: {
        id: 2101,
        name: 'Collaborator 2',
        hsesUserId: '2101',
        hsesUsername: 'collaborator.two',
        role: [],
      },
    },
  ]

  const mockGoals = [
    {
      name: 'Goal 1',
      id: 2080,
      status: 'Not Started',
      grantId: 1,
      timeframe: 'None',
      createdVia: 'activityReport',
      goalTemplate: {
        creationMethod: CREATION_METHOD.AUTOMATIC,
        id: 20_800,
      },
      source: 'RTTAPA development',
      responses: [],
    },
    {
      name: 'Goal 2',
      id: 2081,
      status: 'Not Started',
      grantId: 1,
      timeframe: 'None',
      createdVia: 'rtr',
      goalTemplate: {
        creationMethod: CREATION_METHOD.AUTOMATIC,
        id: 20_801,
      },
      source: 'RTTAPA development',
      responses: [],
    },
    {
      name: 'Goal 3',
      id: 2082,
      status: 'Not Started',
      grantId: 1,
      timeframe: 'None',
      createdVia: 'imported',
      goalTemplate: {
        creationMethod: CREATION_METHOD.AUTOMATIC,
        id: 20_802,
      },
      source: 'RTTAPA development',
      responses: [],
    },
    {
      name: 'Goal 3',
      id: 2083,
      status: 'Not Started',
      grantId: 2,
      timeframe: 'None',
      createdVia: 'activityReport',
      goalTemplate: {
        creationMethod: CREATION_METHOD.AUTOMATIC,
        id: 20_803,
      },
      source: 'RTTAPA development',
      responses: [],
    },
    {
      name: 'Goal 4',
      id: 2084,
      status: 'Not Started',
      grantId: 3,
      timeframe: 'None',
      createdVia: 'activityReport',
      goalTemplate: {
        creationMethod: CREATION_METHOD.AUTOMATIC,
        id: 20_804,
      },
      source: 'RTTAPA development',
      responses: [],
    },
    // Same goal different recipient.
    {
      name: 'Goal 1',
      id: 2085,
      status: 'Not Started',
      grantId: 4,
      timeframe: 'None',
      createdVia: 'activityReport',
      goalTemplate: {
        creationMethod: CREATION_METHOD.AUTOMATIC,
        id: 20_805,
      },
      source: 'RTTAPA development',
      responses: [],
    },
  ]

  const mockObjectives = [
    {
      id: 11,
      title: 'Objective 1.1',
      ttaProvided: 'Training',
      status: OBJECTIVE_STATUS.COMPLETE,
      goal: mockGoals[0],
      supportType: 'Maintaining',
    },
    {
      id: 12,
      title: 'Objective 1.2',
      ttaProvided: 'Training',
      status: OBJECTIVE_STATUS.COMPLETE,
      goal: mockGoals[0],
      supportType: 'Maintaining',
    },
    {
      id: 13,
      title: 'Objective 2.1',
      ttaProvided: 'Training',
      status: OBJECTIVE_STATUS.COMPLETE,
      goal: mockGoals[1],
      supportType: 'Maintaining',
    },
    {
      id: 14,
      title: 'Objective 2.2',
      ttaProvided: 'Training',
      status: OBJECTIVE_STATUS.COMPLETE,
      goal: mockGoals[1],
      supportType: 'Maintaining',
    },
    {
      id: 15,
      title: 'Objective 2.3',
      ttaProvided: 'Training',
      status: OBJECTIVE_STATUS.COMPLETE,
      goal: mockGoals[1],
      supportType: 'Maintaining',
    },
    {
      id: 16,
      title: 'Objective 3.1',
      ttaProvided: 'Training',
      status: OBJECTIVE_STATUS.COMPLETE,
      goal: mockGoals[2],
      supportType: 'Maintaining',
    },
    {
      id: 17,
      title: 'Objective 3.1',
      ttaProvided: 'Training',
      status: OBJECTIVE_STATUS.COMPLETE,
      goal: mockGoals[2],
      supportType: 'Maintaining',
    },
    // Duplicate Objective name for goal 4.
    {
      id: 18,
      title: 'Objective 3.1',
      ttaProvided: 'Training',
      status: OBJECTIVE_STATUS.COMPLETE,
      goal: mockGoals[4],
      supportType: 'Maintaining',
    },
    {
      id: 19,
      title: 'Objective 4.2',
      ttaProvided: 'Training',
      status: OBJECTIVE_STATUS.COMPLETE,
      goal: mockGoals[4],
      supportType: 'Maintaining',
    },
    // Same as goal 1 different recipient.
    {
      id: 20,
      title: 'Objective 1.1',
      ttaProvided: 'Training',
      status: OBJECTIVE_STATUS.COMPLETE,
      goal: mockGoals[5],
      supportType: 'Maintaining',
    },
    {
      id: 21,
      title: 'Objective 1.2',
      ttaProvided: 'Training',
      status: OBJECTIVE_STATUS.COMPLETE,
      goal: mockGoals[5],
      supportType: 'Maintaining',
    },
  ]

  const mockApprovers = [
    {
      activityReportId: 209914,
      status: 'approved',
      userId: 3,
      user: {
        name: 'Test Approver 1',
      },
    },
    {
      activityReportId: 209914,
      status: 'approved',
      userId: 4,
      user: {
        name: 'Test Approver 3',
      },
    },
    {
      activityReportId: 209914,
      status: 'approved',
      userId: 5,
      user: {
        name: 'Test Approver 2',
      },
    },
  ]

  const mockActivityRecipients = [
    {
      id: 4,
      grantId: 4,
      grant: {
        name: 'test4',
        programSpecialistName: 'Program Specialist 4',
        recipientId: 4,
        number: 'grant number 4',
        stateCode: 'NY',
        recipient: { id: 4, name: 'test4' },
      },
    },
    {
      id: 1,
      grantId: 1,
      grant: {
        name: 'test1',
        programSpecialistName: 'Program Specialist 1',
        recipientId: 1,
        number: 'grant number 1',
        stateCode: 'NY',
        recipient: { id: 1, name: 'test1' },
      },
    },
    {
      id: 2,
      grantId: 2,
      grant: {
        name: 'test2',
        programSpecialistName: 'Program Specialist 2',
        recipientId: 2,
        number: 'grant number 2',
        stateCode: 'CT',
        recipient: { id: 2, name: 'test2' },
      },
    },
    {
      id: 3,
      grantId: 3,
      grant: {
        name: 'test3',
        programSpecialistName: 'Program Specialist 1',
        recipientId: 3,
        number: 'grant number 3',
        stateCode: 'MA',
        recipient: { id: 3, name: 'test3' },
      },
    },
  ]

  const mockActivityReportObjective = [
    {
      id: 1,
      objectiveId: 1,
      activityReportId: 209914,
      status: OBJECTIVE_STATUS.NOT_STARTED,
      topics: [{ name: 'topic 1' }, { name: 'topic 2' }, { name: 'topic 3' }],
      resources: [{ url: 'https://test1.gov' }, { url: 'https://test2.gov' }],
      files: [{ originalFileName: 'file1.txt' }, { originalFileName: 'file2.pdf' }],
      objective: mockObjectives[0],
    },
  ]

  const mockReport = {
    id: 209914,
    regionId: 14,
    reason: ['Test CSV Export'],
    submissionStatus: 'approved',
    calculatedStatus: REPORT_STATUSES.APPROVED,
    numberOfParticipants: 12,
    deliveryMethod: 'virtual',
    duration: 4.5,
    startDate: '2021-10-31',
    endDate: '2021-11-03',
    ECLKCResourcesUsed: ['https://one.test', 'https://two.test'],
    nonECLKCResourcesUsed: ['one', 'two'],
    author: mockAuthor,
    lastUpdatedBy: mockAuthor,
    activityReportCollaborators: mockCollaborators,
    approvedAt: new Date(),
    activityRecipients: mockActivityRecipients,
    approvers: mockApprovers,
    activityReportObjectives: mockActivityReportObjective,
  }

  it('transforms arrays of strings into strings', async () => {
    const report = ActivityReport.build({
      ECLKCResourcesUsed: ['https://one.test', 'https://two.test'],
      nonECLKCResourcesUsed: ['one', 'two'],
    })
    const output = await activityReportToCsvRecord(report)
    const expectedOutput = {
      ECLKCResourcesUsed: 'https://one.test\nhttps://two.test',
      nonECLKCResourcesUsed: 'one\ntwo',
    }
    expect(output).toMatchObject(expectedOutput)
  })

  it('returns an empty string when a date is invalid', async () => {
    const report = ActivityReport.build({
      createdAt: 'not-a-real-date',
    })

    const output = await activityReportToCsvRecord(report)

    expect(output.createdAt).toBe('')
  })

  describe('HTML Tag removal', () => {
    it('removes tags from the context field', async () => {
      const report = ActivityReport.build({
        context: '<p data-attribute="test">test text</p>',
      })
      const output = await activityReportToCsvRecord(report)
      const expectedOutput = {
        context: 'test text',
      }
      expect(output).toMatchObject(expectedOutput)
    })

    it('handles ordered lists', async () => {
      const report = ActivityReport.build({
        context: `
        <ol>
          <li>first</li>
          <li>second</li>
        </ol>
        `,
      })
      const output = await activityReportToCsvRecord(report)
      const expectedOutput = {
        context: ' 1. first\n 2. second',
      }
      expect(output).toMatchObject(expectedOutput)
    })

    it('handles nested lists', async () => {
      const report = ActivityReport.build({
        context: `
        <ol>
          <li>
            <ol>
              <li>
                one
              </li>
              <li>
                two
              </li>
            </ol>
          </li>
          <li>second</li>
        </ol>
        `,
      })
      const output = await activityReportToCsvRecord(report)
      const expectedOutput = {
        context: ' 1. 1. one\n    2. two\n 2. second',
      }
      expect(output).toMatchObject(expectedOutput)
    })

    it('handles unordered lists', async () => {
      const report = ActivityReport.build({
        context: `
        <ul>
          <li>first</li>
          <li>second</li>
        </ul>
        `,
      })
      const output = await activityReportToCsvRecord(report)
      const expectedOutput = {
        context: ' * first\n * second',
      }
      expect(output).toMatchObject(expectedOutput)
    })

    it('handles tables', async () => {
      const report = ActivityReport.build({
        context: `
        <table>
          <thead>
            <tr>
              <td>First</td>
              <td>Second</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>One</td>
              <td>Two</td>
            </tr>
            <tr>
              <td>Three</td>
              <td>Four</td>
            </tr>
          </tbody>
        </table>
        `,
      })
      const output = await activityReportToCsvRecord(report)
      const expectedOutput = {
        context: 'First   Second\nOne     Two\nThree   Four',
      }
      expect(output).toMatchObject(expectedOutput)
    })
  })

  it('transforms related models into string values', async () => {
    const report = await ActivityReport.build(mockReport, {
      include: [
        { model: User, as: 'author' },
        { model: User, as: 'lastUpdatedBy' },
        {
          model: ActivityReportCollaborator,
          as: 'activityReportCollaborators',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'role', 'fullName'],
            },
          ],
        },
        {
          model: ActivityRecipient,
          as: 'activityRecipients',
          include: [{ model: Grant, as: 'grant', include: [{ model: Recipient, as: 'recipient' }] }],
        },
        {
          model: ActivityReportApprover,
          as: 'approvers',
          include: [{ model: User, as: 'user' }],
        },
        {
          model: ActivityReportObjective,
          as: 'activityReportObjectives',
          include: [
            {
              model: Objective,
              as: 'objective',
              include: [
                {
                  model: Goal,
                  as: 'goal',
                  include: [
                    {
                      model: GoalTemplate,
                      as: 'goalTemplate',
                    },
                    {
                      model: GoalFieldResponse,
                      as: 'responses',
                    },
                  ],
                },
              ],
            },
            {
              model: Resource,
              as: 'resources',
            },
            {
              model: Topic,
              as: 'topics',
            },
            {
              model: File,
              as: 'files',
            },
            {
              model: Course,
              as: 'courses',
            },
          ],
        },
      ],
    })

    const output = await activityReportToCsvRecord(report.toJSON())
    const {
      creatorName,
      lastUpdatedBy,
      collaborators,
      programSpecialistName,
      approvers,
      recipientInfo,
      'objective-1.1-topics': topics,
      'objective-1.1-resourcesLinks': resources,
      'objective-1.1-nonResourceLinks': files,
      stateCode,
    } = output
    expect(creatorName).toEqual('Arthur')
    expect(lastUpdatedBy).toEqual('Arthur')
    expect(collaborators).toEqual('Collaborator 1\nCollaborator 2')
    expect(programSpecialistName).toEqual('Program Specialist 1\nProgram Specialist 2\nProgram Specialist 4')
    expect(approvers).toEqual('Test Approver 1\nTest Approver 2\nTest Approver 3')
    expect(recipientInfo).toEqual('test1 - grant number 1 - 1\ntest2 - grant number 2 - 2\ntest3 - grant number 3 - 3\ntest4 - grant number 4 - 4')
    expect(topics).toEqual('topic 1\ntopic 2\ntopic 3')
    expect(resources).toEqual('https://test1.gov\nhttps://test2.gov')
    expect(files).toEqual('file1.txt\nfile2.pdf')
    expect(stateCode).toEqual('NY\nCT\nMA\nNY')
  })

  it('transforms goals and objectives into many values', () => {
    const objectives = mockObjectives.map((mo) => ({
      ...mo,
      topics: [{ name: 'Topic 1' }],
      resources: [{ url: 'https://test.gov' }],
      files: [{ originalFileName: 'TestFile.docx' }],
      courses: [{ name: 'Other' }],
    }))

    const output = makeGoalsAndObjectivesObject(objectives)
    expect(output).toEqual({
      'goal-1-id': '2080\n2085',
      'goal-1': 'Goal 1',
      'goal-1-status': 'Not Started',
      'goal-1-created-from': 'activityReport',
      'goal-1-fei-root-causes': '',
      'goal-1-source': 'RTTAPA development',
      'goal-1-standard-ohs-goal': 'No',
      'objective-1.1': 'Objective 1.1',
      'objective-1.1-topics': 'Topic 1',
      'objective-1.1-resourcesLinks': 'https://test.gov',
      'objective-1.1-nonResourceLinks': 'TestFile.docx',
      'objective-1.1-courses': 'Other',
      'objective-1.1-supportType': 'Maintaining',
      'objective-1.1-ttaProvided': 'Training',
      'objective-1.1-status': 'Complete',
      'objective-1.2': 'Objective 1.2',
      'objective-1.2-topics': 'Topic 1',
      'objective-1.2-resourcesLinks': 'https://test.gov',
      'objective-1.2-nonResourceLinks': 'TestFile.docx',
      'objective-1.2-ttaProvided': 'Training',
      'objective-1.2-status': 'Complete',
      'objective-1.2-courses': 'Other',
      'objective-1.2-supportType': 'Maintaining',
      'goal-2-id': '2081',
      'goal-2': 'Goal 2',
      'goal-2-status': 'Not Started',
      'goal-2-created-from': 'rtr',
      'goal-2-fei-root-causes': '',
      'goal-2-source': 'RTTAPA development',
      'goal-2-standard-ohs-goal': 'No',
      'objective-2.1': 'Objective 2.1',
      'objective-2.1-topics': 'Topic 1',
      'objective-2.1-resourcesLinks': 'https://test.gov',
      'objective-2.1-nonResourceLinks': 'TestFile.docx',
      'objective-2.1-ttaProvided': 'Training',
      'objective-2.1-status': 'Complete',
      'objective-2.1-courses': 'Other',
      'objective-2.1-supportType': 'Maintaining',
      'objective-2.2': 'Objective 2.2',
      'objective-2.2-topics': 'Topic 1',
      'objective-2.2-resourcesLinks': 'https://test.gov',
      'objective-2.2-nonResourceLinks': 'TestFile.docx',
      'objective-2.2-ttaProvided': 'Training',
      'objective-2.2-status': 'Complete',
      'objective-2.2-courses': 'Other',
      'objective-2.2-supportType': 'Maintaining',
      'objective-2.3': 'Objective 2.3',
      'objective-2.3-topics': 'Topic 1',
      'objective-2.3-resourcesLinks': 'https://test.gov',
      'objective-2.3-nonResourceLinks': 'TestFile.docx',
      'objective-2.3-ttaProvided': 'Training',
      'objective-2.3-status': 'Complete',
      'objective-2.3-courses': 'Other',
      'objective-2.3-supportType': 'Maintaining',
      'goal-3-id': '2082',
      'goal-3': 'Goal 3',
      'goal-3-status': 'Not Started',
      'goal-3-created-from': 'imported',
      'goal-3-fei-root-causes': '',
      'goal-3-source': 'RTTAPA development',
      'goal-3-standard-ohs-goal': 'No',
      'objective-3.1': 'Objective 3.1',
      'objective-3.1-topics': 'Topic 1',
      'objective-3.1-resourcesLinks': 'https://test.gov',
      'objective-3.1-nonResourceLinks': 'TestFile.docx',
      'objective-3.1-ttaProvided': 'Training',
      'objective-3.1-status': 'Complete',
      'objective-3.1-courses': 'Other',
      'objective-3.1-supportType': 'Maintaining',
      'goal-4-id': '2084',
      'goal-4': 'Goal 4',
      'goal-4-status': 'Not Started',
      'goal-4-created-from': 'activityReport',
      'goal-4-fei-root-causes': '',
      'goal-4-source': 'RTTAPA development',
      'goal-4-standard-ohs-goal': 'No',
      'objective-4.1': 'Objective 3.1',
      'objective-4.1-topics': 'Topic 1',
      'objective-4.1-resourcesLinks': 'https://test.gov',
      'objective-4.1-nonResourceLinks': 'TestFile.docx',
      'objective-4.1-ttaProvided': 'Training',
      'objective-4.1-status': 'Complete',
      'objective-4.1-courses': 'Other',
      'objective-4.1-supportType': 'Maintaining',
      'objective-4.2': 'Objective 4.2',
      'objective-4.2-topics': 'Topic 1',
      'objective-4.2-resourcesLinks': 'https://test.gov',
      'objective-4.2-nonResourceLinks': 'TestFile.docx',
      'objective-4.2-ttaProvided': 'Training',
      'objective-4.2-status': 'Complete',
      'objective-4.2-courses': 'Other',
      'objective-4.2-supportType': 'Maintaining',
    })
  })

  it('handles a null goal source', () => {
    const objectives = mockObjectives.map((mo, i) => {
      if (i === 0) {
        return {
          ...mo,
          title: 'same title',
          goal: {
            ...mo.goal,
            source: null,
            name: 'same name',
          },
          topics: [{ name: 'Topic 1' }],
          resources: [{ url: 'https://test.gov' }],
          files: [{ originalFileName: 'TestFile.docx' }],
          courses: [{ name: 'Other' }],
        }
      }

      return {
        ...mo,
        title: 'same title',
        goal: {
          ...mo.goal,
          name: 'same name',
        },
        topics: [{ name: 'Topic 1' }],
        resources: [{ url: 'https://test.gov' }],
        files: [{ originalFileName: 'TestFile.docx' }],
        courses: [{ name: 'Other' }],
      }
    })

    const output = makeGoalsAndObjectivesObject(objectives)
    expect(output).toEqual({
      'goal-1-id': '2080\n2081\n2082\n2084\n2085',
      'goal-1': 'same name',
      'goal-1-status': 'Not Started',
      'goal-1-created-from': 'activityReport',
      'goal-1-fei-root-causes': '',
      'goal-1-source': 'RTTAPA development',
      'goal-1-standard-ohs-goal': 'No',
      'objective-1.1': 'same title',
      'objective-1.1-topics': 'Topic 1',
      'objective-1.1-resourcesLinks': 'https://test.gov',
      'objective-1.1-nonResourceLinks': 'TestFile.docx',
      'objective-1.1-courses': 'Other',
      'objective-1.1-supportType': 'Maintaining',
      'objective-1.1-ttaProvided': 'Training',
      'objective-1.1-status': 'Complete',
    })
  })

  it('return a list of all keys that are a goal or objective and in the proper order', () => {
    const csvData = [
      {
        'goal-1-id': 123,
        'goal-1': 'butter',
        'objective-1': 'cream',
      },
      {
        'goal-1': 'butter',
        'objective-1': 'cream',
        'objective-1-topics': 'topic1',
        'objective-1-resourcesLinks': 'https"//test.gov',
        'objective-1-nonResourceLinks': 'file1.txt',
        'goal-2': 'cream',
        'goal-2-status': 'butter',
        'objective-2.1': 'eggs',
        'objective-2.1-ttaProvided': 'cream',
      },
      {
        'goal-3': 'butter',
        'objective-3.1-status': 'cream',
        kitchen: 'test',
      },
    ]

    const validated = extractListOfGoalsAndObjectives(csvData)

    expect(validated).toStrictEqual([
      'goal-1-id',
      'goal-1',
      'objective-1',
      'objective-1-topics',
      'objective-1-resourcesLinks',
      'objective-1-nonResourceLinks',
      'goal-2',
      'goal-2-status',
      'objective-2.1',
      'objective-2.1-ttaProvided',
      'goal-3',
      'objective-3.1-status',
    ])
  })

  it('adds goals to the CSV when there are no objectives', async () => {
    const activityReportGoals = [
      {
        status: 'Not Started',
        goal: {
          id: 1,
          name: 'Goal 1',
          createdVia: 'activityReport',
        },
      },
      {
        status: 'Not Started',
        goal: {
          id: 2,
          name: 'Goal 1',
          createdVia: 'activityReport',
        },
      },
      {
        status: 'Not Started',
        goal: {
          id: 3,
          name: 'Goal 3',
          createdVia: 'activityReport',
        },
      },
    ]

    const report = await ActivityReport.build(
      {
        ...mockReport,
        activityReportGoals,
      },
      {
        include: [
          {
            model: ActivityReportGoal,
            as: 'activityReportGoals',
            include: [
              {
                model: Goal,
                as: 'goal',
              },
            ],
          },
        ],
      }
    )

    const output = await activityReportToCsvRecord(report)
    expect(output).toMatchObject(
      expect.objectContaining({
        'goal-1-id': '1\n2',
        'goal-1': 'Goal 1',
        'goal-1-status': 'Not Started',
        'goal-1-created-from': 'activityReport',
        'goal-2-id': '3',
        'goal-2': 'Goal 3',
        'goal-2-status': 'Not Started',
        'goal-2-created-from': 'activityReport',
      })
    )
  })

  it('does not provide values for builders that are not strings or functions', async () => {
    const report = await ActivityReport.build(mockReport, {
      include: [
        { model: User, as: 'author' },
        { model: User, as: 'lastUpdatedBy' },
      ],
    })
    const output = await activityReportToCsvRecord(report, [1, true, 'regionId'])
    expect(output).toMatchObject({ regionId: 14 })
  })
})

describe('communicationLogToCsvRecord', () => {
  const log = {
    id: 1,
    author: {
      name: 'John Doe',
    },
    data: {
      communicationDate: '2021-01-01',
      duration: 30,
      method: 'Email',
      purpose: 'Inquiry',
      notes: '<p>Lorem ipsum</p>',
      result: 'Successful',
      recipientNextSteps: [
        {
          note: 'Follow up with client',
        },
      ],
      specialistNextSteps: [
        {
          note: 'Schedule a meeting',
        },
      ],
    },
    files: [{ originalFileName: 'file1.txt' }, { originalFileName: 'file2.txt' }],
  }

  it('should transform the log into a CSV record', () => {
    const expectedRecord = {
      id: 1,
      author: 'John Doe',
      communicationDate: '2021-01-01',
      duration: '30',
      method: 'Email',
      purpose: 'Inquiry',
      notes: 'Lorem ipsum',
      result: 'Successful',
      files: 'file1.txt\nfile2.txt',
      recipientNextSteps: 'Follow up with client',
      specialistNextSteps: 'Schedule a meeting',
      otherStaff: '',
      goals: '',
      regionId: '',
    }

    expect(communicationLogToCsvRecord(log)).toEqual(expectedRecord)
  })

  it('should return an empty record if log is empty', () => {
    const emptyLog = {}

    expect(communicationLogToCsvRecord(emptyLog)).toEqual({})
  })

  it('should return an empty record if log properties are missing', () => {
    const incompleteLog = {
      id: 1,
      data: {
        communicationDate: '2021-01-01',
      },
    }

    expect(communicationLogToCsvRecord(incompleteLog)).toEqual({
      communicationDate: '2021-01-01',
      duration: '',
      id: 1,
      method: '',
      notes: '',
      purpose: '',
      result: '',
      goals: '',
      otherStaff: '',
      recipientNextSteps: '',
      specialistNextSteps: '',
      regionId: '',
    })
  })
})

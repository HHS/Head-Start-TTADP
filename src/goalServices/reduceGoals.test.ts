import { reduceGoals, reduceObjectivesForActivityReport, reduceRelationThroughActivityReportObjectives } from './reduceGoals'

describe('reduceGoals', () => {
  const goals = [
    {
      id: 1,
      name: null, // branch coverage case
      status: 'Draft',
      isCurated: false,
      objectives: [],
      grant: {
        recipientId: 1,
        numberWithProgramTypes: 1,
        recipient: {
          dataValues: {},
        },
      },
      dataValues: {
        grant: {
          recipientId: 1,
          numberWithProgramTypes: 1,
        },
      },
      grantId: 1,
      createdVia: 'rtr',
      source: 'Source',
    },
    {
      id: 2,
      name: '',
      status: 'Draft',
      isCurated: false,
      objectives: [],
      grant: {
        recipientId: 1,
        numberWithProgramTypes: 1,
        recipient: {
          dataValues: {},
        },
      },
      dataValues: {
        grant: {
          recipientId: 1,
          numberWithProgramTypes: 1,
        },
      },
      grantId: 1,
      createdVia: 'rtr',
      source: 'Source',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return undefined if no goals are provided', () => {
    const result = reduceGoals([])
    expect(result).toEqual([])
  })

  it('should return ...something', () => {
    // @ts-expect-error
    const result = reduceGoals(goals)
    expect(result.length).toEqual(1)
  })

  it('should handle objectives with otherEntityId', () => {
    const goalsWithObjectives = [
      {
        id: 3,
        name: 'Goal with Objectives',
        status: 'Draft',
        isCurated: false,
        objectives: [
          {
            id: 1,
            otherEntityId: 123,
            title: 'Objective 1',
            status: 'Not Started',
            topics: [],
            resources: [],
            files: [],
            courses: [],
            goalId: 3,
            onApprovedAR: false,
            onAR: false,
            rtrOrder: 1,
          },
        ],
        grant: {
          recipientId: 1,
          numberWithProgramTypes: 1,
          recipient: {
            dataValues: {},
          },
        },
        dataValues: {
          grant: {
            recipientId: 1,
            numberWithProgramTypes: 1,
          },
        },
        grantId: 1,
        createdVia: 'rtr',
        source: 'Source',
      },
    ]

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    const result = reduceGoals(goalsWithObjectives as any)
    expect(result.length).toEqual(1)
    expect(result[0].objectives[0].recipientIds).toEqual([123])
  })

  it('should add otherEntityId to existing recipientIds', () => {
    const goalsWithExistingObjectives = [
      {
        id: 4,
        name: 'Goal with Existing Objectives',
        status: 'Draft',
        isCurated: false,
        objectives: [
          {
            id: 1,
            otherEntityId: 123,
            title: 'Objective 1',
            status: 'Not Started',
            topics: [],
            resources: [],
            files: [],
            courses: [],
            goalId: 4,
            onApprovedAR: false,
            onAR: false,
            rtrOrder: 1,
          },
          {
            id: 2,
            otherEntityId: 456,
            title: 'Objective 1',
            status: 'Not Started',
            topics: [],
            resources: [],
            files: [],
            courses: [],
            goalId: 4,
            onApprovedAR: false,
            onAR: false,
            rtrOrder: 1,
          },
        ],
        grant: {
          recipientId: 1,
          numberWithProgramTypes: 1,
          recipient: {
            dataValues: {},
          },
        },
        dataValues: {
          grant: {
            recipientId: 1,
            numberWithProgramTypes: 1,
          },
        },
        grantId: 1,
        createdVia: 'rtr',
        source: 'Source',
      },
    ]

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    const result = reduceGoals(goalsWithExistingObjectives as any)
    expect(result.length).toEqual(1)
    expect(result[0].objectives[0].recipientIds).toEqual([123, 456])
  })

  it('should set objectiveCreatedHere to true if objectiveCreatedHere is true and exists.objectiveCreatedHere is false', () => {
    const newObjectives = [
      {
        id: 1,
        otherEntityId: 123,
        title: 'Objective 1',
        status: 'Not Started',
        topics: [],
        resources: [],
        files: [],
        courses: [],
        goalId: 5,
        onApprovedAR: false,
        onAR: false,
        rtrOrder: 1,
        activityReportObjectives: [
          {
            status: 'Not Started',
            objectiveCreatedHere: true,
            activityReportObjectiveResources: [],
            activityReportObjectiveTopics: [],
            activityReportObjectiveCourses: [],
            activityReportObjectiveFiles: [],
            activityReportObjectiveCitations: [],
          },
        ],
      },
    ]

    const currentObjectives = [
      {
        status: 'Not Started',
        title: 'Objective 1',
        objectiveCreatedHere: false,
        ids: [],
        recipientIds: [],
        activityReports: [],
        topics: [],
        resources: [],
        files: [],
        courses: [],
        citations: [],
      },
    ]

    // @ts-expect-error
    const result = reduceObjectivesForActivityReport(newObjectives, currentObjectives)
    expect(result.length).toEqual(1)
    expect(result[0].objectiveCreatedHere).toEqual(true)
  })

  it('should properly reduce objectives for activity report with activityReportObjectiveCitations', () => {
    const newObjectives = [
      {
        id: 1,
        otherEntityId: 123,
        title: 'Objective 1',
        status: 'Not Started',
        topics: [],
        resources: [],
        files: [],
        courses: [],
        goalId: 6,
        onApprovedAR: false,
        onAR: false,
        rtrOrder: 1,
        activityReportObjectives: [
          {
            status: 'Not Started',
            objectiveCreatedHere: true,
            activityReportObjectiveResources: [],
            activityReportObjectiveTopics: [],
            activityReportObjectiveCourses: [],
            activityReportObjectiveFiles: [],
            activityReportObjectiveCitations: [
              {
                citation: 'Citation 1',
                monitoringReferences: [
                  {
                    standardId: 1,
                    findingSource: 'Source 1',
                    acro: 'DEF',
                  },
                ],
              },
              {
                citation: 'Citation 2',
                monitoringReferences: [
                  {
                    standardId: 2,
                    findingSource: 'Source 2',
                    acro: 'ANC',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 2,
        otherEntityId: 123,
        title: 'Objective 2',
        status: 'Not Started',
        topics: [],
        resources: [],
        files: [],
        courses: [],
        goalId: 6,
        onApprovedAR: false,
        onAR: false,
        rtrOrder: 1,
        activityReportObjectives: [
          {
            status: 'Not Started',
            objectiveCreatedHere: true,
            activityReportObjectiveResources: [],
            activityReportObjectiveTopics: [],
            activityReportObjectiveCourses: [],
            activityReportObjectiveFiles: [],
            activityReportObjectiveCitations: [
              {
                citation: 'Citation 3',
                monitoringReferences: [
                  {
                    standardId: 3,
                    findingSource: 'Source 3',
                    acro: 'ANC',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    const currentObjectives = [
      {
        status: 'Not Started',
        title: 'Objective 1',
        objectiveCreatedHere: false,
        ids: [],
        recipientIds: [],
        activityReports: [],
        topics: [],
        resources: [],
        files: [],
        courses: [],
        citations: [],
      },
    ]

    // @ts-expect-error
    const result = reduceObjectivesForActivityReport(newObjectives, currentObjectives)
    expect(result.length).toEqual(2)
    expect(result[0].citations).toEqual([
      {
        id: 1,
        name: 'DEF - Citation 1 - Source 1',
      },
      {
        id: 2,
        name: 'ANC - Citation 2 - Source 2',
      },
    ])

    expect(result[1].citations).toEqual([
      {
        id: 3,
        name: 'ANC - Citation 3 - Source 3',
      },
    ])
  })

  it('returns useIpdCourses and useFiles flags from activity report objectives', () => {
    const goalsWithFlags = [
      {
        id: 1,
        name: 'Goal with flags',
        objectives: [
          {
            id: 10,
            title: 'Objective flag',
            status: 'Not Started',
            useIpdCourses: true,
            useFiles: true,
            topics: [],
            resources: [],
            files: [],
            courses: [],
            goalId: 1,
            onApprovedAR: false,
            onAR: false,
            rtrOrder: 1,
            activityReportObjectives: [
              {
                status: 'Not Started',
                useIpdCourses: true,
                useFiles: true,
                dataValues: {
                  useIpdCourses: true,
                  useFiles: true,
                },
                activityReportObjectiveResources: [],
                activityReportObjectiveTopics: [],
                activityReportObjectiveCourses: [],
                activityReportObjectiveFiles: [],
                activityReportObjectiveCitations: [],
              },
            ],
          },
        ],
        activityReportGoals: [
          {
            id: 1,
            isActivelyEdited: false,
            createdAt: new Date(),
          },
        ],
        grant: {
          recipientId: 1,
          numberWithProgramTypes: 1,
          recipient: {
            dataValues: {},
          },
        },
        dataValues: {
          grant: {
            recipientId: 1,
            numberWithProgramTypes: 1,
          },
        },
        grantId: 1,
        createdVia: 'rtr',
        source: 'Source',
      },
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = reduceGoals(goalsWithFlags as any, true)
    expect(result[0].objectives[0].useIpdCourses).toBe(true)
    expect(result[0].objectives[0].useFiles).toBe(true)
  })
  describe('reduceRelationThroughActivityReportObjectives', () => {
    it('should handle null topic values without crashing', () => {
      // Mock objective with an activity report that has a null topic
      const objective = {
        id: 243577,
        otherEntityId: null,
        goalId: 94169,
        title: 'Objective Title',
        status: 'In Progress',
        objectiveTemplateId: 44484,
        onAR: true,
        onApprovedAR: true,
        createdVia: 'activityReport',
        rtrOrder: 1,
        createdAt: new Date('2025-01-15T14:24:08.065Z'),
        updatedAt: new Date('2025-01-15T14:48:11.857Z'),
        deletedAt: null,
        activityReportObjectives: [
          {
            id: 1,
            objectiveId: 101,
            activityReportId: 500,
            createdAt: new Date(),
            updatedAt: new Date(),
            name: 'Activity Report Objective 1',
            status: 'In Progress',
            endDate: '2025-01-01',
            isActivelyEdited: false,
            source: 'Some Source',
            arOrder: 1,
            objectiveCreatedHere: false,
            supportType: 'Technical Assistance',
            ttaProvided: 'Training',
            closeSuspendReason: 'Completed',
            closeSuspendContext: 'Closed due to completion',
            activityReportObjectiveResources: [],
            activityReportObjectiveTopics: [
              { topic: null }, // This simulates a topic that is null
              {
                topic: {
                  dataValues: { id: 73, name: 'Family Support Services' },
                  id: 73,
                  name: 'Family Support Services',
                },
              }, // Valid topic
            ],
            activityReportObjectiveFiles: [],
            activityReportObjectiveCourses: [],
            activityReportObjectiveCitations: [],
            toJSON() {
              return this
            },
            dataValues: this,
          },
        ],
        resources: [],
        topics: [{ id: 82, name: 'Parent and Family Engagement' }],
        files: [],
        courses: [],
      }

      const exists = {
        topics: [
          { id: 82, name: 'Parent and Family Engagement' }, // Pre-existing topic
        ],
      }

      // Call the function
      const result = reduceRelationThroughActivityReportObjectives(objective, 'activityReportObjectiveTopics', 'topic', exists)

      // Expected result should exclude null topics
      expect(result).toEqual([
        { id: 82, name: 'Parent and Family Engagement' }, // Existing
        { id: 73, name: 'Family Support Services' }, // From objective
      ])
    })
  })
})

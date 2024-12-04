import { reduceGoals, reduceObjectivesForActivityReport } from './reduceGoals';

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
        endDate: '2023-12-31',
        grant: {
          recipientId: 1,
          numberWithProgramTypes: 1,
        },
      },
      endDate: '2023-12-31',
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
        endDate: '2023-12-31',
        grant: {
          recipientId: 1,
          numberWithProgramTypes: 1,
        },
      },
      endDate: '2023-12-31',
      grantId: 1,
      createdVia: 'rtr',
      source: 'Source',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined if no goals are provided', () => {
    const result = reduceGoals([]);
    expect(result).toEqual([]);
  });

  it('should return ...something', () => {
    // @ts-ignore
    const result = reduceGoals(goals);
    expect(result.length).toEqual(1);
  });

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
          endDate: '2023-12-31',
          grant: {
            recipientId: 1,
            numberWithProgramTypes: 1,
          },
        },
        endDate: '2023-12-31',
        grantId: 1,
        createdVia: 'rtr',
        source: 'Source',
      },
    ];

    const result = reduceGoals(goalsWithObjectives as any);
    expect(result.length).toEqual(1);
    expect(result[0].objectives[0].recipientIds).toEqual([123]);
  });

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
          endDate: '2023-12-31',
          grant: {
            recipientId: 1,
            numberWithProgramTypes: 1,
          },
        },
        endDate: '2023-12-31',
        grantId: 1,
        createdVia: 'rtr',
        source: 'Source',
      },
    ];

    const result = reduceGoals(goalsWithExistingObjectives as any);
    expect(result.length).toEqual(1);
    expect(result[0].objectives[0].recipientIds).toEqual([123, 456]);
  });

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
          },
        ],
      },
    ];

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
      },
    ];

    // @ts-ignore
    const result = reduceObjectivesForActivityReport(newObjectives, currentObjectives);
    expect(result.length).toEqual(1);
    expect(result[0].objectiveCreatedHere).toEqual(true);
  });

});

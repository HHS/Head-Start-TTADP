import {
  ActivityReport,
  Goal,
  Objective,
  User,
} from '../models';
import { activityReportToCsvRecord, makeGoalsAndObjectivesObject, extractListOfGoalsAndObjectives } from './transform';

describe('activityReportToCsvRecord', () => {
  const mockAuthor = {
    id: 2099,
    name: 'Arthur',
    hsesUserId: '2099',
    hsesUsername: 'arthur.author',
  };

  const mockCollaborators = [
    {
      id: 2100,
      name: 'Collaborator 1',
      hsesUserId: '2100',
      hsesUsername: 'collaborator.one',
    },
    {
      id: 2101,
      name: 'Collaborator 2',
      hsesUserId: '2101',
      hsesUsername: 'collaborator.two',
    },
  ];

  const mockGoals = [
    {
      name: 'Goal 1',
      id: 2080,
      status: 'Fake',
      timeframe: 'None',
    },
    {
      name: 'Goal 2',
      id: 2081,
      status: 'Fake',
      timeframe: 'None',
    },
    {
      name: 'Goal 3',
      id: 2082,
      status: 'Fake',
      timeframe: 'None',
    },
  ];

  const mockObjectives = [
    {
      id: 11,
      title: 'Objective 1.1',
      ttaProvided: 'Training',
      status: 'Fake',
      goal: mockGoals[0],
    },
    {
      id: 12,
      title: 'Objective 1.2',
      ttaProvided: 'Training',
      status: 'Fake',
      goal: mockGoals[0],
    },
    {
      id: 13,
      title: 'Objective 2.1',
      ttaProvided: 'Training',
      status: '',
      goal: mockGoals[1],
    },
    {
      id: 14,
      title: 'Objective 2.2',
      ttaProvided: 'Training',
      status: '',
      goal: mockGoals[1],
    },
    {
      id: 15,
      title: 'Objective 2.3',
      ttaProvided: 'Training',
      status: '',
      goal: mockGoals[1],
    },
    {
      id: 16,
      title: 'Objective 3.1',
      ttaProvided: 'Training',
      status: '',
      goal: mockGoals[2],
    },
  ];

  const mockReport = {
    id: 209914,
    regionId: 14,
    reason: 'Test CSV Export',
    status: 'approved',
    numberOfParticipants: 12,
    deliveryMethod: 'virtual',
    duration: 4.5,
    startDate: '2021-10-31',
    endDate: '2021-11-03',
    ECLKCResourcesUsed: ['https://one.test', 'https://two.test'],
    nonECLKCResourcesUsed: ['one', 'two'],
    author: mockAuthor,
    lastUpdatedBy: mockAuthor,
    collaborators: mockCollaborators,
  };

  it('transforms arrays of strings into strings', async () => {
    const report = ActivityReport.build({
      ECLKCResourcesUsed: ['https://one.test', 'https://two.test'],
      nonECLKCResourcesUsed: ['one', 'two'],
    });
    const output = await activityReportToCsvRecord(report);
    const expectedOutput = {
      ECLKCResourcesUsed: 'https://one.test\nhttps://two.test',
      nonECLKCResourcesUsed: 'one\ntwo',
    };
    expect(output).toMatchObject(expectedOutput);
  });

  it('transforms related models into string values', async () => {
    const report = await ActivityReport.build(mockReport, {
      include: [{ model: User, as: 'author' }, { model: User, as: 'lastUpdatedBy' }, { model: User, as: 'collaborators' }],
    });
    const output = await activityReportToCsvRecord(report);
    const { author, lastUpdatedBy, collaborators } = output;
    expect(author).toEqual('Arthur');
    expect(lastUpdatedBy).toEqual('Arthur');
    expect(collaborators).toEqual('Collaborator 1\nCollaborator 2');
  });

  it('transforms goals and objectives into many values', async () => {
    const objectives = await Objective.build(mockObjectives, { include: [{ model: Goal, as: 'goal' }] });
    const output = makeGoalsAndObjectivesObject(objectives);
    expect(output).toEqual({
      'goal-1': 'Goal 1',
      'objective-1.1': 'Objective 1.1',
      'objective-1.1-ttaProvided': 'Training',
      'objective-1.1-status': 'Fake',
      'objective-1.2': 'Objective 1.2',
      'objective-1.2-ttaProvided': 'Training',
      'objective-1.2-status': 'Fake',
      'goal-2': 'Goal 2',
      'objective-2.1': 'Objective 2.1',
      'objective-2.1-ttaProvided': 'Training',
      'objective-2.1-status': '',
      'objective-2.2': 'Objective 2.2',
      'objective-2.2-ttaProvided': 'Training',
      'objective-2.2-status': '',
      'objective-2.3': 'Objective 2.3',
      'objective-2.3-ttaProvided': 'Training',
      'objective-2.3-status': '',
      'goal-3': 'Goal 3',
      'objective-3.1': 'Objective 3.1',
      'objective-3.1-ttaProvided': 'Training',
      'objective-3.1-status': '',
    });
  });

  it('return a list of all keys that are a goal or objective and in the proper order', () => {
    const csvData = [
      {
        'goal-1': 'butter',
        'objective-1': 'cream',
      },
      {
        'goal-1': 'butter',
        'objective-1': 'cream',
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
    ];

    const validated = extractListOfGoalsAndObjectives(csvData);

    expect(validated).toStrictEqual([
      'goal-1', 'objective-1', 'goal-2', 'goal-2-status', 'objective-2.1', 'objective-2.1-ttaProvided', 'goal-3', 'objective-3.1-status',
    ]);
  });

  it('does not provide values for builders that are not strings or functions', async () => {
    const report = await ActivityReport.build(mockReport, { include: [{ model: User, as: 'author' }, { model: User, as: 'lastUpdatedBy' }] });
    const output = await activityReportToCsvRecord(report, [1, true, 'regionId']);
    expect(output).toMatchObject({ regionId: 14 });
  });
});
